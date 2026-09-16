export type WebGLStatus = "checking" | "webgl2" | "unsupported";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ExternalRef {
  system: string;
  id: string;
}

/* ------------------------------------------------------------------ *
 * v2 — blocos + águas + módulos ancorados (modelo atual)
 * ------------------------------------------------------------------ */

export interface Place2D {
  x: number;
  z: number;
}

/** Edificação-mestre da cena (uma por cena no piloto). */
export interface Building {
  id: string;
  name: string;
  external_refs: ExternalRef[];
}

/** Volume (caixa de paredes) que recebe águas. */
export interface Block {
  id: string;
  name: string;
  /** Posição do centro no terreno (mundo). */
  place?: Place2D;
  /** Rotação (yaw) do bloco em graus; norte do mundo = −z. */
  orientation_deg: number;
  /** Dimensões do volume ao longo do eixo x local. */
  width_m: number;
  /** Dimensões do volume ao longo do eixo z local. */
  depth_m: number;
  /** Altura das paredes (pé-direito). */
  wall_height_m: number;
  external_refs: ExternalRef[];
}

/**
 * Água: plano retangular inclinado independente, ancorada a um bloco.
 * Sistema local do bloco: origem no piso, x/y/z como a caixa (y para cima).
 *
 * Superfície paramétrica (u = comprimento, v = subida):
 *  A  = (origin_x_m, origin_y_m, origin_z_m)        → canto do beirado baixo (u=0, v=0)
 *  Û  = direção do comprimento (horizontal, ⊥ V)
 *  V̂  = direção projetada da subida (horizontal)
 *  P(u,v) = A + Û·u + V̂·v + (0, v·tan(tilt), 0)
 *  yaw_deg = 0 → subida em −z local (beirado na frente, sobe para trás).
 */
export interface Water {
  id: string;
  block_id: string;
  name: string;
  origin_x_m: number;
  origin_y_m: number;
  origin_z_m: number;
  /** Extensão ao longo da direção do comprimento (eixo da cumeeira/beirado). */
  length_m: number;
  /** Projeção horizontal da subida. */
  depth_m: number;
  /** Inclinação em graus (0 = laje). */
  tilt_deg: number;
  /** Rotação no plano do topo (direção da subida projetada), graus. */
  yaw_deg: number;
  /**
   * Falso após uma divisão — cada água só pode ser dividida uma única vez.
   * Ausente (undefined) = pode dividir (compatibilidade com cenas antigas).
   */
  can_split?: boolean;
  external_refs: ExternalRef[];
}

/** Âncora do módulo na água (u/v = centro da superfície). */
export interface ModuleAnchor {
  water_id: string;
  /** Ao longo do comprimento da água (0..length_m). */
  u_m: number;
  /** Ao longo da subida (0..depth_m). */
  v_m: number;
}

/** Dimensões próprias do módulo (override da família). */
export interface ModuleSizeOverride {
  length_m?: number;
  width_m?: number;
}

export interface Mppt {
  id: string;
  preset_id: string;
  name: string;
  /** Posição local da edificação; opcional por compatibilidade do export v1. */
  place?: Vec3;
  external_refs: ExternalRef[];
}

export interface ModuleOverrides {
  nominal_wp?: number;
  vmp_v?: number;
  efficiency_pct?: number;
}

export interface SolarModule {
  id: string;
  catalog_id: string;
  block_id: string;
  /** Âncora na água (colada). A pose 3D é derivada da água + parâmetros. */
  anchor: ModuleAnchor;
  /** Rotação no plano da água, em graus (0 = comprimento ‖ Û). */
  yaw_deg: number;
  /** Inclinação própria (graus); ausente = colada ao tilt da água. */
  pitch_override_deg?: number;
  size_override?: ModuleSizeOverride;
  mppt_id: string | null;
  overrides?: ModuleOverrides;
  external_refs: ExternalRef[];
}

export interface SceneState {
  building: Building | null;
  blocks: Block[];
  waters: Water[];
  mppts: Mppt[];
  modules: SolarModule[];
}

/* ------------------------------------------------------------------ *
 * v1 (legado) — usada apenas na migração para v2 e leitura de export v1
 * ------------------------------------------------------------------ */

export interface BuildingV1 {
  id: string;
  name: string;
  external_refs: ExternalRef[];
  roof_ids: string[];
}

export interface RoofPlace {
  x: number;
  z: number;
}

export interface Roof {
  id: string;
  template_id: string;
  orientation_deg: number;
  tilt_deg: number;
  width_m: number;
  depth_m: number;
  height_m: number;
  place?: RoofPlace;
  external_refs: ExternalRef[];
}

export interface SolarModuleV1 {
  id: string;
  catalog_id: string;
  roof_id: string;
  position_m: Vec3;
  rotation_deg: Vec3;
  mppt_id: string | null;
  overrides?: ModuleOverrides;
  external_refs: ExternalRef[];
}

export interface SceneStateV1 {
  building: BuildingV1 | null;
  roofs: Roof[];
  mppts: Mppt[];
  modules: SolarModuleV1[];
}

/* ------------------------------------------------------------------ */

export type ToolMode = "translate" | "rotate";
