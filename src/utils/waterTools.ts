import type { SolarModule, Water } from "../types";
import { nextEntityId } from "./id";
import { waterSurfacePointLocal } from "./waterMath";

/**
 * Ferramentas de manuseio de águas: divisão única ao meio (comprimento) e
 * "cobrir o telhado" (fileiras automáticas de módulos). Módulos ancorados são
 * escravos da água — repartem-se mantendo a posição relativa.
 */

function nextWaterId(base: string, suffix: string): string {
  return `${base}${suffix}`;
}

export function splitWater(
  water: Water,
  axis: "length" | "rise",
): { first: Water; second: Water } {
  if (axis === "length") {
    const len1 = water.length_m / 2;
    const half = waterSurfacePointLocal(water, len1, 0);
    const first: Water = { ...water, length_m: len1, can_split: false };
    const second: Water = {
      ...water,
      id: nextWaterId(water.id, "b"),
      name: `${water.name} 2`,
      origin_x_m: half.x,
      origin_y_m: half.y,
      origin_z_m: half.z,
      length_m: water.length_m - len1,
      can_split: false,
    };
    return { first, second };
  }
  const d1 = water.depth_m / 2;
  const half = waterSurfacePointLocal(water, 0, d1);
  const first: Water = { ...water, depth_m: d1, can_split: false };
  const second: Water = {
    ...water,
    id: nextWaterId(water.id, "b"),
    name: `${water.name} 2`,
    origin_x_m: half.x,
    origin_y_m: half.y,
    origin_z_m: half.z,
    depth_m: water.depth_m - d1,
    can_split: false,
  };
  return { first, second };
}

export function repartitionAnchor(
  module: SolarModule,
  water: Water,
  axis: "length" | "rise",
  firstId: string,
  secondId: string,
): SolarModule {
  if (axis === "length") {
    const half = water.length_m / 2;
    if (module.anchor.u_m < half) {
      return { ...module, anchor: { ...module.anchor, water_id: firstId } };
    }
    return {
      ...module,
      anchor: {
        water_id: secondId,
        u_m: module.anchor.u_m - half,
        v_m: module.anchor.v_m,
      },
    };
  }
  const half = water.depth_m / 2;
  if (module.anchor.v_m < half) {
    return { ...module, anchor: { ...module.anchor, water_id: firstId } };
  }
  return {
    ...module,
    anchor: {
      water_id: secondId,
      u_m: module.anchor.u_m,
      v_m: module.anchor.v_m - half,
    },
  };
}

/** Primeira metade mantém o id original; segunda ganha sufixo. */
export function splitWaterWithIds(
  water: Water,
  axis: "length" | "rise",
): { first: Water; second: Water } {
  const { first, second } = splitWater(water, axis);
  return {
    first: { ...first, id: water.id, name: `${water.name} 1` },
    second: { ...second },
  };
}

export interface ModuleDims {
  length_m: number;
  width_m: number;
}

const COVER_MARGIN_M = 0.1;
export const COVER_GAP_M = 0.15;

/**
 * Fileiras automáticas que preenchem uma água (comprimento ‖ Û, largura na
 * subida): grade paramétrica (u,v) com margens e entre-eixos, âncoras no
 * centro de cada módulo. Uma única chamada cobre a água de uma vez.
 */
export function coverWaterModules(
  water: Water,
  dims: ModuleDims,
  gap_m: number = COVER_GAP_M,
): { water_id: string; u_m: number; v_m: number }[] {
  // Largura física na subida → extensão em v (projeção horizontal): width·cos(tilt).
  const widthSurf = dims.width_m * Math.max(Math.cos((water.tilt_deg * Math.PI) / 180), 0.2);
  const stepU = dims.length_m + gap_m;
  const stepV = widthSurf + gap_m;
  const margin = COVER_MARGIN_M;
  const countU = Math.max(1, Math.floor((water.length_m - 2 * margin + gap_m) / stepU));
  const countV = Math.max(1, Math.floor((water.depth_m - 2 * margin + gap_m) / stepV));
  const anchors: { water_id: string; u_m: number; v_m: number }[] = [];
  for (let i = 0; i < countU; i++) {
    const u = margin + dims.length_m / 2 + i * stepU;
    if (u + dims.length_m / 2 > water.length_m - margin) {
      continue;
    }
    for (let j = 0; j < countV; j++) {
      const v = margin + widthSurf / 2 + j * stepV;
      if (v + widthSurf / 2 > water.depth_m - margin) {
        continue;
      }
      anchors.push({ water_id: water.id, u_m: u, v_m: v });
    }
  }
  return anchors;
}

/**
 * "Cobrir todo o telhado": fileiras automáticas em TODAS as águas existentes
 * do bloco, com ids sequenciais frescos a partir de existingIds.
 */
export function coverBlockModules(
  waters: Water[],
  catalogId: string,
  dims: ModuleDims,
  existingIds: string[],
  gap_m: number = COVER_GAP_M,
): SolarModule[] {
  const taken = [...existingIds];
  const rows: SolarModule[] = [];
  for (const water of waters) {
    for (const anchor of coverWaterModules(water, dims, gap_m)) {
      const id = nextEntityId("mod-", taken);
      taken.push(id);
      rows.push({
        id,
        catalog_id: catalogId,
        block_id: water.block_id,
        anchor: { water_id: anchor.water_id, u_m: anchor.u_m, v_m: anchor.v_m },
        yaw_deg: 0,
        mppt_id: null,
        external_refs: [],
      });
    }
  }
  return rows;
}
