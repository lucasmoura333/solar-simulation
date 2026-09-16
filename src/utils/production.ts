import type { Block, Mppt, SolarModule, Water } from "../types";
import type {
  ShadingAnalysisResult,
  SolarPositionProvider,
} from "../core/providers";
import {
  moduleDimensions,
  moduleEffectiveValues,
} from "./calculations";
import {
  modulePoseLocal,
  rotateLocalToWorld,
} from "./waterMath";
import { directionFromDegrees, sunPositionAt } from "./sun";

export const HOURS = 24;

/** Dias do ano no estudo mockado (dia limpo repetido). */
export const DAYS_PER_YEAR = 365;

export interface ModuleProduction {
  moduleId: string;
  catalogId: string;
  blockId: string;
  waterId: string;
  mpptId: string | null;
  areaM2: number;
  efficiencyPct: number;
  /** Energia por hora em kWh (24 passos, com sombra). */
  hourlyKwh: number[];
  dailyKWh: number;
}

export interface ProductionTotals {
  perModule: ModuleProduction[];
  /** Energia total por hora (kWh) com sombra. */
  hourlyKwh: number[];
  /** Energia total por hora (kWh) sem sombra (potencial geométrico). */
  hourlyPotentialKwh: number[];
  dailyKWh: number;
  annualKWh: number;
  byMppt: {
    mpptId: string | null;
    name: string;
    dailyKWh: number;
    moduleCount: number;
  }[];
}

interface ProductionInput {
  blocks: Block[];
  waters: Water[];
  modules: SolarModule[];
  mppts: Mppt[];
  shading: ShadingAnalysisResult | null;
}

/** Cosseno do ângulo de incidência (direção até o sol × normal do módulo), ≥ 0. */
export function moduleIncidenceCos(
  block: Block,
  water: Water,
  module: SolarModule,
  toSun: { x: number; y: number; z: number },
): number {
  const pose = modulePoseLocal(module, water);
  const normal = rotateLocalToWorld(block, pose.normal);
  const dot = normal.x * toSun.x + normal.y * toSun.y + normal.z * toSun.z;
  return Math.max(0, dot);
}

function directionFor(
  hourFraction: number,
  solarPosition?: SolarPositionProvider,
): { x: number; y: number; z: number } {
  const pos = solarPosition
    ? solarPosition.getPosition({ hourFraction })
    : sunPositionAt(hourFraction);
  return directionFromDegrees(pos.azimuthDeg, pos.elevationDeg);
}

/**
 * Produção v2 (mock, ordem de grandeza): energia é resultado derivado da
 * simulação — equipamento (Wp/kWp) vive em `ratings.ts`.
 * E_h (kWh) = irradiância horária (W/m²) × área × eficiência × fator.
 */
export function computeProduction(
  { blocks, waters, modules, mppts, shading }: ProductionInput,
  context?: { solarPosition?: SolarPositionProvider },
): ProductionTotals {
  const hourlyKwh = new Array(HOURS).fill(0) as number[];
  const hourlyPotentialKwh = new Array(HOURS).fill(0) as number[];
  const perModule: ModuleProduction[] = [];

  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const waterById = new Map(waters.map((w) => [w.id, w]));
  const radiance = shading?.radianceHourly ?? [];
  const moduleCount = shading?.moduleOrder.length ?? 0;

  for (const module of modules) {
    const block = blockById.get(module.block_id);
    const water = waterById.get(module.anchor.water_id);
    if (!block || !water) {
      continue;
    }
    const spec = moduleEffectiveValues(module.catalog_id, module.overrides);
    const dims = moduleDimensions(module);
    if (!spec || !dims) {
      continue;
    }
    const area = dims.length_m * dims.width_m;
    const eff = spec.efficiency_pct / 100;
    const factorIndex = shading
      ? shading.moduleOrder.indexOf(module.id)
      : -1;

    const hourly: number[] = [];
    let daily = 0;
    for (let h = 0; h < HOURS; h++) {
      const rad = radiance[h] ?? 0;
      if (rad <= 0) {
        hourly.push(0);
        continue;
      }
      const dir = directionFor(h + 0.5, context?.solarPosition);
      const cos = moduleIncidenceCos(block, water, module, dir);
      const potential = (rad * area * eff * cos) / 1000;
      let actual = potential;
      if (factorIndex >= 0) {
        const factor = shading!.factorByModuleHour[h * moduleCount + factorIndex];
        actual = (rad * area * eff * Math.min(Math.max(factor, 0), 1)) / 1000;
      }
      if (!Number.isFinite(actual)) {
        actual = 0;
      }
      hourly.push(actual);
      daily += actual;
      hourlyPotentialKwh[h] += potential;
      hourlyKwh[h] += actual;
    }

    perModule.push({
      moduleId: module.id,
      catalogId: module.catalog_id,
      blockId: module.block_id,
      waterId: water.id,
      mpptId: module.mppt_id,
      areaM2: area,
      efficiencyPct: spec.efficiency_pct,
      hourlyKwh: hourly,
      dailyKWh: daily,
    });
  }

  const dailyKWh = perModule.reduce((s, m) => s + m.dailyKWh, 0);

  const byMppt: ProductionTotals["byMppt"] = [];
  for (const mppt of mppts) {
    const rows = perModule.filter((m) => m.mpptId === mppt.id);
    if (rows.length > 0) {
      byMppt.push({
        mpptId: mppt.id,
        name: mppt.name,
        dailyKWh: rows.reduce((s, m) => s + m.dailyKWh, 0),
        moduleCount: rows.length,
      });
    }
  }
  const loose = perModule.filter((m) => m.mpptId === null);
  if (loose.length > 0) {
    byMppt.push({
      mpptId: null,
      name: "sem MPPT",
      dailyKWh: loose.reduce((s, m) => s + m.dailyKWh, 0),
      moduleCount: loose.length,
    });
  }

  return {
    perModule,
    hourlyKwh,
    hourlyPotentialKwh,
    dailyKWh,
    annualKWh: dailyKWh * DAYS_PER_YEAR,
    byMppt,
  };
}
