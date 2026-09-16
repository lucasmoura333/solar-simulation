import type {
  ModuleAnchor,
  Place2D,
  SolarModule,
  Vec3,
  Water,
} from "../types";

/**
 * Matemática geométrica v2 — blocos e águas.
 *
 * Água = plano retangular inclinado no frame local do bloco (origem no piso):
 *  A(u=0,v=0) = canto do beirado baixo (origin_*)
 *  Û = (cos θ, 0, −sin θ)   → direção do comprimento (horizontal, ‖ beirado)
 *  V̂ = (−sin θ, 0, −cos θ)  → direção projetada da subida (horizontal)
 *  P(u,v) = A + Û·u + V̂·v + (0, v·tan(tilt), 0)
 * θ = yaw_deg: 0 → beirado na frente (+z) subindo para o fundo (−z);
 * 180 → subida +z (origem do outro lado do bloco).
 */

export const DEG = Math.PI / 180;
export const MODULE_THICKNESS_M = 0.035;

export interface WaterBasis {
  a: Vec3; // origem (canto u=0,v=0), local do bloco
  u: Vec3; // direção unitária do comprimento (horizontal)
  v: Vec3; // direção unitária projetada da subida (horizontal)
  tan: number;
}

export function waterBasis(water: Water): WaterBasis {
  const theta = water.yaw_deg * DEG;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    a: { x: water.origin_x_m, y: water.origin_y_m, z: water.origin_z_m },
    u: { x: cos, y: 0, z: -sin },
    v: { x: -sin, y: 0, z: -cos },
    tan: Math.tan(water.tilt_deg * DEG),
  };
}

/** Ponto na superfície da água (frame local do bloco). */
export function waterSurfacePointLocal(
  water: Water,
  u: number,
  v: number,
): Vec3 {
  const b = waterBasis(water);
  return {
    x: b.a.x + b.u.x * u + b.v.x * v,
    y: b.a.y + v * b.tan,
    z: b.a.z + b.u.z * u + b.v.z * v,
  };
}

/** Centro geométrico da água (u=length_m/2, v=depth_m/2) na superfície. */
export function waterCenterPointLocal(water: Water): Vec3 {
  return waterSurfacePointLocal(
    water,
    water.length_m / 2,
    water.depth_m / 2,
  );
}

export interface WaterShape {
  length_m: number;
  depth_m: number;
  yaw_deg: number;
  tilt_deg: number;
}

/**
 * Recalcula a origem (canto u=0,v=0) que mantém o centro local no lugar após
 * mudar yaw/tilt — pivô no centro da água ("girar no próprio eixo").
 * Roundtrip: waterOriginForCenter(water, waterCenterPointLocal(water)) ≈ origem.
 */
export function waterOriginForCenterLocal(
  shape: WaterShape,
  center: Vec3,
): Vec3 {
  const theta = shape.yaw_deg * DEG;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const tan = Math.tan(shape.tilt_deg * DEG);
  const hu = shape.length_m / 2;
  const hv = shape.depth_m / 2;
  return {
    x: center.x - cos * hu + sin * hv,
    y: center.y - tan * hv,
    z: center.z + sin * hu + cos * hv,
  };
}

/** Normal unitária da água (frame local do bloco). */
export function waterNormalLocal(water: Water): Vec3 {
  const b = waterBasis(water);
  // dirT = V + up·tan → direção da subida na superfície; n = U × dirT
  const tx = b.v.x;
  const ty = b.tan;
  const tz = b.v.z;
  let nx = b.u.y * tz - b.u.z * ty;
  let ny = b.u.z * tx - b.u.x * tz;
  let nz = b.u.x * ty - b.u.y * tx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  return { x: nx, y: ny, z: nz };
}

/** Rotaciona um vetor em torno de outro (unitário), ângulo em radianos. */
export function rotateAround(
  vector: Vec3,
  axis: Vec3,
  angleRad: number,
): Vec3 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dot = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
  const cross = {
    x: axis.y * vector.z - axis.z * vector.y,
    y: axis.z * vector.x - axis.x * vector.z,
    z: axis.x * vector.y - axis.y * vector.x,
  };
  return {
    x: vector.x * cos + cross.x * sin + axis.x * dot * (1 - cos),
    y: vector.y * cos + cross.y * sin + axis.y * dot * (1 - cos),
    z: vector.z * cos + cross.z * sin + axis.z * dot * (1 - cos),
  };
}

export interface ModulePose {
  /** Centro da face frontal do módulo (offset acima da superfície), local do bloco. */
  position: Vec3;
  /** Normal do plano do módulo (local do bloco). */
  normal: Vec3;
  /** Eixo do comprimento do módulo (local do bloco). */
  lengthAxis: Vec3;
  /** Eixo transversal (largura) do módulo (local do bloco). */
  widthAxis: Vec3;
}

/**
 * Pose do módulo ancorado: colado → normal da água; pitch_override → inclinação
 * própria (rotação em torno do eixo horizontal do comprimento da água);
 * yaw_deg gira o módulo no plano em torno da normal.
 */
export function modulePoseLocal(
  module: SolarModule,
  water: Water,
): ModulePose {
  const b = waterBasis(water);
  const u = b.u;
  const surface = waterSurfacePointLocal(water, module.anchor.u_m, module.anchor.v_m);
  const waterNormal = waterNormalLocal(water);

  let normal = waterNormal;
  if (module.pitch_override_deg !== undefined) {
    const delta = (module.pitch_override_deg - water.tilt_deg) * DEG;
    normal = rotateAround(waterNormal, u, delta);
  }

  const lift = MODULE_THICKNESS_M / 2 / Math.max(Math.cos(water.tilt_deg * DEG), 1e-6) + 0.001;
  const position = {
    x: surface.x + waterNormal.x * lift,
    y: surface.y + waterNormal.y * lift,
    z: surface.z + waterNormal.z * lift,
  };

  const lengthAxis = rotateAround(u, normal, module.yaw_deg * DEG);
  // Triedro DESTRO (det +1): widthAxis = lengthAxis × normal. Essencial para
  // as matrizes de rotação (render/gizmos) — a ordem inversa gerava det −1 e
  // quaternions inválidos (placas planas/gizmo quebrado).
  const widthAxis = {
    x: lengthAxis.y * normal.z - lengthAxis.z * normal.y,
    y: lengthAxis.z * normal.x - lengthAxis.x * normal.z,
    z: lengthAxis.x * normal.y - lengthAxis.y * normal.x,
  };

  return { position, normal, lengthAxis, widthAxis };
}

/**
 * Eixos locais do box 3D do módulo (`BoxGeometry(comprimento, espessura, largura)`):
 *  x = comprimento (lengthAxis), y = espessura (normal), z = largura (widthAxis).
 * Expõe o mapeamento esperado pelo render — teste travado para não regredir na
 * troca de eixos que deixava a placa perpendicular à água.
 */
export interface ModuleBoxBasis {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

export function moduleBoxBasis(pose: ModulePose): ModuleBoxBasis {
  return { x: pose.lengthAxis, y: pose.normal, z: pose.widthAxis };
}

/** Projeta um ponto local do bloco na água → (u, v). Null se fora do retângulo. */
export function projectToWaterLocal(
  water: Water,
  point: Vec3,
): ModuleAnchor | null {
  const b = waterBasis(water);
  const dx = point.x - b.a.x;
  const dy = point.y - b.a.y;
  const dz = point.z - b.a.z;
  const u = dx * b.u.x + dz * b.u.z;
  // Direção 3D da subida W = (V.x, tan, V.z); |W|² = 1 + tan²
  const v = (dx * b.v.x + dy * b.tan + dz * b.v.z) / (1 + b.tan * b.tan);
  if (u < 0 || u > water.length_m || v < 0 || v > water.depth_m) {
    return null;
  }
  return { water_id: water.id, u_m: u, v_m: v };
}

/**
 * Projeta horizontalmente um ponto (x,z) local no plano da água (resolve u/v
 * ignorando a altura) — permite posicionar a partir de cliques na parede ou
 * em outro ponto do prédio. Null se fora do retângulo.
 */
export function projectToWaterFromGround(
  water: Water,
  point: { x: number; z: number },
): ModuleAnchor | null {
  const b = waterBasis(water);
  const dx = point.x - b.a.x;
  const dz = point.z - b.a.z;
  const det = b.u.x * b.v.z - b.u.z * b.v.x;
  if (Math.abs(det) < 1e-9) {
    return null;
  }
  const u = (dx * b.v.z - b.v.x * dz) / det;
  const v = (b.u.x * dz - dx * b.u.z) / det;
  if (u < 0 || u > water.length_m || v < 0 || v > water.depth_m) {
    return null;
  }
  return { water_id: water.id, u_m: u, v_m: v };
}

/** Forma mínima com yaw (para funções de rotação). */
export interface YawShape {
  orientation_deg: number;
}

/** Converte um ponto do frame local do bloco para o mundo (place + yaw). */
export function blockLocalToWorld(
  block: { place?: Place2D; orientation_deg: number },
  p: Vec3,
): Vec3 {
  const yaw = block.orientation_deg * DEG;
  const px = block.place?.x ?? 0;
  const pz = block.place?.z ?? 0;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: p.x * cos + p.z * sin + px,
    y: p.y,
    z: -p.x * sin + p.z * cos + pz,
  };
}

/** Inverso de blockLocalToWorld. */
export function worldToBlockLocal(
  block: { place?: Place2D; orientation_deg: number },
  w: Vec3,
): Vec3 {
  const yaw = block.orientation_deg * DEG;
  const px = block.place?.x ?? 0;
  const pz = block.place?.z ?? 0;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const dx = w.x - px;
  const dz = w.z - pz;
  return {
    x: dx * cos - dz * sin,
    y: w.y,
    z: dx * sin + dz * cos,
  };
}

/** Roda um vetor local para o mundo (apenas yaw do bloco). */
export function rotateLocalToWorld(block: YawShape, v: Vec3): Vec3 {
  const yaw = block.orientation_deg * DEG;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  };
}

export function toPlace2D(v: Vec3): Place2D {
  return { x: v.x, z: v.z };
}
