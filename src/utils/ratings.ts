import type { Mppt, SolarModule } from "../types";
import { moduleEffectiveValues } from "./calculations";

/**
 * Camada de EQUIPAMENTO (fatos): potência pico em Wp/kWp.
 * Potência é dado de equipamento (catálogo + overrides) e NÃO depende da
 * simulação — energia (kWh) é resultado derivado e vive em outra camada.
 */

/** Formata potência pico: "550 Wp" abaixo de 1 kWp; "1,10 kWp" acima. */
export function formatWp(wattsPico: number): string {
  const safe = Number.isFinite(wattsPico) ? wattsPico : 0;
  if (safe >= 1000) {
    return `${(safe / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kWp`;
  }
  return `${Math.round(safe)} Wp`;
}

/** Wp efetivo de um módulo da cena (família + override elétrico). */
export function moduleWp(module: SolarModule): number | null {
  const spec = moduleEffectiveValues(module.catalog_id, module.overrides);
  return spec ? spec.nominal_wp : null;
}

export interface InstalledRatings {
  totalWp: number;
  moduleCount: number;
  byMppt: {
    mpptId: string | null;
    name: string;
    moduleCount: number;
    wp: number;
  }[];
}

/** Potência instalada da cena (e por MPPT) — fatos de equipamento. */
export function installedRatings(
  modules: SolarModule[],
  mppts: Mppt[],
): InstalledRatings {
  let totalWp = 0;
  const perMppt = new Map<string | null, number>();
  const count = new Map<string | null, number>();
  for (const module of modules) {
    const wp = moduleWp(module);
    if (wp === null) {
      continue;
    }
    totalWp += wp;
    const key = module.mppt_id;
    perMppt.set(key, (perMppt.get(key) ?? 0) + wp);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  const byMppt: InstalledRatings["byMppt"] = [];
  for (const mppt of mppts) {
    if ((count.get(mppt.id) ?? 0) > 0) {
      byMppt.push({
        mpptId: mppt.id,
        name: mppt.name,
        moduleCount: count.get(mppt.id)!,
        wp: perMppt.get(mppt.id)!,
      });
    }
  }
  const loose = count.get(null) ?? 0;
  if (loose > 0) {
    byMppt.push({
      mpptId: null,
      name: "sem MPPT",
      moduleCount: loose,
      wp: perMppt.get(null)!,
    });
  }
  return { totalWp, moduleCount: modules.length, byMppt };
}
