import type { Block } from "../types";

/**
 * Encaixes "lego" (guias) para blocos e águas.
 * Prioridade: borda/centro de outro bloco > grid fino > nada. Um "snap" só é
 * reportado quando há correção não-nula.
 */

export const SNAP_TOLERANCE_M = 0.3;
const GRID_M = 0.25;

export interface SnapResult {
  dx: number;
  dz: number;
  snapX: boolean;
  snapZ: boolean;
}

interface AxisCandidates {
  edges: number[];
  grid: boolean;
}

function pickDelta(
  value: number,
  candidates: AxisCandidates,
  tolerance: number,
): { delta: number; edge: boolean } {
  let bestEdge: number | null = null;
  for (const c of candidates.edges) {
    const d = c - value;
    if (Math.abs(d) < tolerance) {
      if (bestEdge === null || Math.abs(d) < Math.abs(bestEdge)) {
        bestEdge = d;
      }
    }
  }
  if (bestEdge !== null) {
    return { delta: bestEdge, edge: true };
  }
  if (candidates.grid) {
    const g = Math.round(value / GRID_M) * GRID_M;
    const d = g - value;
    if (Math.abs(d) < tolerance / 2) {
      return { delta: d, edge: false };
    }
  }
  return { delta: 0, edge: false };
}

function worldBox(block: Block): { x: number; z: number; w: number; d: number } | null {
  const yaw = ((block.orientation_deg % 360) + 360) % 360;
  if (yaw % 90 !== 0) {
    return null;
  }
  const square = yaw % 180 === 90;
  return {
    x: block.place?.x ?? 0,
    z: block.place?.z ?? 0,
    w: square ? block.depth_m : block.width_m,
    d: square ? block.width_m : block.depth_m,
  };
}

/**
 * Encaixa um bloco em movimento (x/z de place) contra bordas/centros dos
 * demais blocos alinhados ao mundo e ao grid fino.
 */
export function snapBlockPlace(
  moving: Block,
  others: Block[],
  tolerance: number = SNAP_TOLERANCE_M,
): SnapResult {
  const box = worldBox(moving);
  if (!box) {
    return { dx: 0, dz: 0, snapX: false, snapZ: false };
  }
  const halfW = box.w / 2;
  const halfD = box.d / 2;
  const xs: number[] = [];
  const zs: number[] = [];
  for (const other of others) {
    if (other.id === moving.id) {
      continue;
    }
    const ob = worldBox(other);
    if (!ob) {
      continue;
    }
    xs.push(ob.x - ob.w / 2, ob.x + ob.w / 2, ob.x);
    zs.push(ob.z - ob.d / 2, ob.z + ob.d / 2, ob.z);
  }
  const resultsX = [
    pickDelta(box.x - halfW, { edges: xs, grid: true }, tolerance),
    pickDelta(box.x + halfW, { edges: xs, grid: true }, tolerance),
    pickDelta(box.x, { edges: xs, grid: true }, tolerance),
  ];
  const hasEdge = resultsX.some((r) => r.edge);
  const bestX = resultsX
    .filter((r) => (hasEdge ? r.edge : true))
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  const resultsZ = [
    pickDelta(box.z - halfD, { edges: zs, grid: true }, tolerance),
    pickDelta(box.z + halfD, { edges: zs, grid: true }, tolerance),
    pickDelta(box.z, { edges: zs, grid: true }, tolerance),
  ];
  const hasEdgeZ = resultsZ.some((r) => r.edge);
  const bestZ = resultsZ
    .filter((r) => (hasEdgeZ ? r.edge : true))
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  return {
    dx: bestX.delta,
    dz: bestZ.delta,
    snapX: bestX.delta !== 0,
    snapZ: bestZ.delta !== 0,
  };
}

export interface WaterShape {
  yaw_deg: number;
  length_m: number;
  depth_m: number;
}

function bestFeatureDelta(
  features: number[],
  edges: number[],
  tolerance: number,
): number {
  const results = features.map((f) =>
    pickDelta(f, { edges, grid: false }, tolerance),
  );
  const edgesOnly = results.some((r) => r.edge);
  const pool = edgesOnly ? results.filter((r) => r.edge) : results;
  pool.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
  return pool.length > 0 ? pool[0].delta : 0;
}

/**
 * Encaixa a água (arrastada pelo CENTRO) nos limites do bloco (bordas/centro):
 * cantos da pegada (x/z) e o centro contra [-w/2, 0, w/2] × [-d/2, 0, d/2].
 * A correção move o centro como um todo (rígida).
 */
export function snapWaterToBlock(
  block: Block,
  shape: WaterShape,
  center: { x: number; z: number },
  tolerance: number = SNAP_TOLERANCE_M,
): SnapResult {
  const theta = (shape.yaw_deg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const hu = shape.length_m / 2;
  const hv = shape.depth_m / 2;
  // Cantos da pegada relativos ao centro: U·(±hu) + V·(±hv).
  const xs: number[] = [center.x];
  const zs: number[] = [center.z];
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      xs.push(center.x + cos * su * hu - sin * sv * hv);
      zs.push(center.z - sin * su * hu - cos * sv * hv);
    }
  }
  const bx = [-block.width_m / 2, 0, block.width_m / 2];
  const bz = [-block.depth_m / 2, 0, block.depth_m / 2];
  const dx = bestFeatureDelta(xs, bx, tolerance);
  const dz = bestFeatureDelta(zs, bz, tolerance);
  return { dx, dz, snapX: dx !== 0, snapZ: dz !== 0 };
}
