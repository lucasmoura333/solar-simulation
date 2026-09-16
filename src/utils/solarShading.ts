import type { Block, SolarModule, Vec3, Water } from "../types";
import type { ShadingAnalysisResult } from "../core/providers";
import { moduleDimensions } from "./calculations";
import {
  blockLocalToWorld,
  modulePoseLocal,
  rotateLocalToWorld,
  waterSurfacePointLocal,
} from "./waterMath";
import { hourlyWOf } from "./shading";
import { sunDirectionWorld, sunPositionAt } from "./sun";

/**
 * Sombreamento direcional v2 por raycast na CPU (sem GPU, determinístico).
 *
 * Núcleo 100% injetado (`computeShadingFactors`): recebe blocos/águas/módulos
 * ancorados, o perfil de irradiância e a direção do sol por hora — nada de
 * biblioteca ou local fixo. `runSolarShading` é apenas o wrapper de referência
 * (perfil do catálogo + suncalc).
 *
 * Tudo é convertido para coordenadas de mundo (place + yaw dos blocos):
 * oclusores = paredes dos blocos + faces das águas + células dos módulos;
 * fator por hora por módulo = luz média (amostras 3×3) × cos de incidência.
 */

export const OCCLUDER_LIGHT = 0.001;
const MAX_CELL_M = 1.9;

interface Tri {
  a: number[];
  b: number[];
  c: number[];
}

function trianglesFromFlat(flat: number[]): Tri[] {
  const tris: Tri[] = [];
  for (let i = 0; i + 8 < flat.length; i += 9) {
    tris.push({
      a: [flat[i], flat[i + 1], flat[i + 2]],
      b: [flat[i + 3], flat[i + 4], flat[i + 5]],
      c: [flat[i + 6], flat[i + 7], flat[i + 8]],
    });
  }
  return tris;
}

function pushTriWorld(flat: number[], block: Block, p: Vec3[]): void {
  for (const v of p) {
    const w = blockLocalToWorld(block, v);
    flat.push(w.x, w.y, w.z);
  }
}

/** Paredes do bloco (4 faces verticais) em triângulos de mundo. */
function wallTriangles(block: Block): Tri[] {
  const hw = block.width_m / 2;
  const hd = block.depth_m / 2;
  const h = block.wall_height_m;
  const faces: Vec3[][] = [
    [{ x: -hw, y: 0, z: hd }, { x: -hw, y: h, z: hd }, { x: hw, y: h, z: hd }, { x: hw, y: 0, z: hd }],
    [{ x: hw, y: 0, z: -hd }, { x: hw, y: h, z: -hd }, { x: -hw, y: h, z: -hd }, { x: -hw, y: 0, z: -hd }],
    [{ x: hw, y: 0, z: hd }, { x: hw, y: h, z: hd }, { x: hw, y: h, z: -hd }, { x: hw, y: 0, z: -hd }],
    [{ x: -hw, y: 0, z: -hd }, { x: -hw, y: h, z: -hd }, { x: -hw, y: h, z: hd }, { x: -hw, y: 0, z: hd }],
  ];
  const flat: number[] = [];
  for (const face of faces) {
    pushTriWorld(flat, block, [face[0], face[1], face[2]]);
    pushTriWorld(flat, block, [face[0], face[2], face[3]]);
  }
  return trianglesFromFlat(flat);
}

/** Faces das águas (plano paramétrico) em triângulos de mundo. */
function waterTriangles(water: Water, block: Block): Tri[] {
  const corner = (u: number, v: number): Vec3 =>
    blockLocalToWorld(block, waterSurfacePointLocal(water, u, v));
  const p00 = corner(0, 0);
  const pL0 = corner(water.length_m, 0);
  const pLD = corner(water.length_m, water.depth_m);
  const p0D = corner(0, water.depth_m);
  const flat: number[] = [];
  const push = (pts: Vec3[]) => {
    for (const p of pts) {
      flat.push(p.x, p.y, p.z);
    }
  };
  push([p00, pL0, pLD]);
  push([p00, pLD, p0D]);
  return trianglesFromFlat(flat);
}

function moduleDims(module: SolarModule): { length_m: number; width_m: number } | null {
  return moduleDimensions(module);
}

/**
 * Células do módulo (slab fino sobre o plano do módulo, pose derivada da âncora)
 * em triângulos de mundo — sombreiam uns aos outros.
 */
function moduleTriangles(
  module: SolarModule,
  water: Water,
  block: Block,
): Tri[] {
  const dims = moduleDims(module);
  if (!dims) {
    return [];
  }
  const pose = modulePoseLocal(module, water);
  const flat: number[] = [];
  const nx = Math.max(1, Math.ceil(dims.length_m / MAX_CELL_M));
  const nz = Math.max(1, Math.ceil(dims.width_m / MAX_CELL_M));
  const dl = dims.length_m / nx;
  const dw = dims.width_m / nz;
  const toLocal = (x: number, z: number): Vec3 => ({
    x: pose.position.x + pose.lengthAxis.x * x + pose.widthAxis.x * z,
    y: pose.position.y + pose.lengthAxis.y * x + pose.widthAxis.y * z,
    z: pose.position.z + pose.lengthAxis.z * x + pose.widthAxis.z * z,
  });
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const x0 = -dims.length_m / 2 + ix * dl;
      const z0 = -dims.width_m / 2 + iz * dw;
      const a = toLocal(x0, z0);
      const b = toLocal(x0 + dl, z0);
      const c = toLocal(x0 + dl, z0 + dw);
      const d = toLocal(x0, z0 + dw);
      pushTriWorld(flat, block, [a, b, c]);
      pushTriWorld(flat, block, [a, c, d]);
    }
  }
  return trianglesFromFlat(flat);
}

export interface ShadingInput {
  blocks: Block[];
  waters: Water[];
  modules: SolarModule[];
  radianceHourly: number[];
  directionAtHour: (hour: number) => Vec3;
}

export function computeShadingFactors(input: ShadingInput): ShadingAnalysisResult {
  const { blocks, waters, modules, radianceHourly } = input;
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const waterById = new Map(waters.map((w) => [w.id, w]));

  const occluders: Tri[] = [];
  for (const block of blocks) {
    occluders.push(...wallTriangles(block));
  }
  for (const water of waters) {
    const block = blockById.get(water.block_id);
    if (block) {
      occluders.push(...waterTriangles(water, block));
    }
  }
  const moduleCells: { module: SolarModule; block: Block; tris: Tri[] }[] = [];
  for (const module of modules) {
    const block = blockById.get(module.block_id);
    const water = waterById.get(module.anchor.water_id);
    if (!block || !water) {
      continue;
    }
    const tris = moduleTriangles(module, water, block);
    moduleCells.push({ module, block, tris });
    occluders.push(...tris);
  }

  const M = moduleCells.length;
  const moduleOrder = moduleCells.map((c) => c.module.id);
  const factorByModuleHour = new Float32Array(24 * M);

  for (let m = 0; m < M; m++) {
    const { module, block } = moduleCells[m];
    const water = waterById.get(module.anchor.water_id)!;
    const pose = modulePoseLocal(module, water);
    const normalWorld = rotateLocalToWorld(block, pose.normal);
    for (let h = 0; h < 24; h++) {
      const radiance = radianceHourly[h];
      if (radiance <= 0) {
        factorByModuleHour[h * M + m] = 0;
        continue;
      }
      const dir = input.directionAtHour(h);
      const cos =
        normalWorld.x * dir.x + normalWorld.y * dir.y + normalWorld.z * dir.z;
      if (cos <= 0) {
        factorByModuleHour[h * M + m] = 0;
        continue;
      }
      const lit = sampleModule(module, block, pose, dir, occluders);
      factorByModuleHour[h * M + m] = lit * cos;
    }
  }

  return {
    moduleOrder,
    triPerModule: moduleCells.map(() => 0),
    factorByModuleHour,
    radianceHourly,
    totalTriangles: occluders.length,
  };
}

function sampleModule(
  module: SolarModule,
  block: Block,
  pose: ReturnType<typeof modulePoseLocal>,
  dir: Vec3,
  occluders: Tri[],
): number {
  const dims = moduleDims(module);
  if (!dims) {
    return 0;
  }
  const nx = 3;
  const nz = 3;
  const pad = 0.12;
  const originAt = (x: number, z: number): number[] => {
    const p = {
      x: pose.position.x + pose.lengthAxis.x * x + pose.widthAxis.x * z,
      y: pose.position.y + pose.lengthAxis.y * x + pose.widthAxis.y * z,
      z: pose.position.z + pose.lengthAxis.z * x + pose.widthAxis.z * z,
    };
    const w = blockLocalToWorld(block, p);
    return [
      w.x + dir.x * OCCLUDER_LIGHT,
      w.y + dir.y * OCCLUDER_LIGHT,
      w.z + dir.z * OCCLUDER_LIGHT,
    ];
  };
  let hits = 0;
  let count = 0;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const x = (-dims.length_m / 2 + dims.length_m * (pad + (1 - 2 * pad) * ((ix + 0.5) / nx)));
      const z = (-dims.width_m / 2 + dims.width_m * (pad + (1 - 2 * pad) * ((iz + 0.5) / nz)));
      const origin = originAt(x, z);
      count++;
      if (!isOccluded(origin, [dir.x, dir.y, dir.z], occluders)) {
        hits++;
      }
    }
  }
  return count > 0 ? hits / count : 0;
}

/** Teste de interseção raio × triângulo (Möller–Trumbore). */
export function rayTriangle(
  origin: number[],
  dir: number[],
  tri: Tri,
  maxDistance: number,
): number | null {
  const [ax, ay, az] = tri.a;
  const [bx, by, bz] = tri.b;
  const [cx, cy, cz] = tri.c;
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  const pvx = dir[1] * e2z - dir[2] * e2y;
  const pvy = dir[2] * e2x - dir[0] * e2z;
  const pvz = dir[0] * e2y - dir[1] * e2x;
  const det = e1x * pvx + e1y * pvy + e1z * pvz;
  if (Math.abs(det) < 1e-9) {
    return null;
  }
  const inv = 1 / det;
  const tx = origin[0] - ax;
  const ty = origin[1] - ay;
  const tz = origin[2] - az;
  const u = (tx * pvx + ty * pvy + tz * pvz) * inv;
  if (u < 0 || u > 1) {
    return null;
  }
  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
  if (v < 0 || u + v > 1) {
    return null;
  }
  const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return t > 0.001 && t < maxDistance ? t : null;
}

export function isOccluded(
  origin: number[],
  dir: number[],
  occluders: Tri[],
): boolean {
  for (const tri of occluders) {
    if (rayTriangle(origin, dir, tri, Infinity) !== null) {
      return true;
    }
  }
  return false;
}

/** Wrapper de referência: perfil do catálogo + suncalc (sem provedores plugados). */
export async function runSolarShading(input: {
  blocks: Block[];
  waters: Water[];
  modules: SolarModule[];
}): Promise<ShadingAnalysisResult> {
  return computeShadingFactors({
    blocks: input.blocks,
    waters: input.waters,
    modules: input.modules,
    radianceHourly: hourlyWOf(),
    directionAtHour: (h) => sunDirectionWorld(sunPositionAt(h + 0.5)),
  });
}
