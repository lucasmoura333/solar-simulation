import * as THREE from "three";
import type { Block, Water } from "../types";
import { DEG, waterSurfacePointLocal } from "./waterMath";

/**
 * Malhas de exibição v2 (frame local do bloco). Parâmetros (bloco/água) são a
 * fonte de verdade; malha é sempre derivada.
 */

function waterCorners(water: Water): THREE.Vector3[] {
  const corners = [
    waterSurfacePointLocal(water, 0, 0),
    waterSurfacePointLocal(water, water.length_m, 0),
    waterSurfacePointLocal(water, water.length_m, water.depth_m),
    waterSurfacePointLocal(water, 0, water.depth_m),
  ];
  return corners.map((c) => new THREE.Vector3(c.x, c.y, c.z));
}

/** Plano retangular da água (2 triângulos, face para cima/fora). */
export function buildWaterGeometry(water: Water): THREE.BufferGeometry {
  const [a, b, c, d] = waterCorners(water);
  const positions = [
    ...a.toArray(), ...b.toArray(), ...c.toArray(),
    ...a.toArray(), ...c.toArray(), ...d.toArray(),
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

/** Caixa de paredes do bloco (4 faces verticais; topo/fundo abertos para render). */
export function buildBlockWallsGeometry(block: Block): THREE.BufferGeometry {
  const w = block.width_m;
  const d = block.depth_m;
  const h = block.wall_height_m;
  const hw = w / 2;
  const hd = d / 2;
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d2: THREE.Vector3) => [
    ...a.toArray(), ...b.toArray(), ...c.toArray(),
    ...a.toArray(), ...c.toArray(), ...d2.toArray(),
  ];
  const positions = [
    ...quad(p(-hw, 0, hd), p(-hw, h, hd), p(hw, h, hd), p(hw, 0, hd)),
    ...quad(p(hw, 0, -hd), p(hw, h, -hd), p(-hw, h, -hd), p(-hw, 0, -hd)),
    ...quad(p(hw, 0, hd), p(hw, h, hd), p(hw, h, -hd), p(hw, 0, -hd)),
    ...quad(p(-hw, 0, -hd), p(-hw, h, -hd), p(-hw, h, hd), p(-hw, 0, hd)),
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export { DEG };
