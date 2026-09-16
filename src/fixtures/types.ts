export type CatalogStatus =
  | "planned"
  | "captured"
  | "validated"
  | "fixture-ready"
  | "building";

export type FamilyKind =
  | "module-family"
  | "roof-template"
  | "mppt-preset"
  | "irradiance-profile";

export interface ItemMeta {
  kind: FamilyKind;
  tags: string[];
  status: CatalogStatus;
  target: "prototype";
  next: string;
  evidence: string;
}

export interface ModuleFixture extends ItemMeta {
  id: string;
  name: string;
  nominal_wp: number;
  vmp_v: number;
  imp_a: number;
  efficiency_pct: number;
  length_m: number;
  width_m: number;
  note: string;
}

export type RoofShape = "gable" | "shed";

export interface RoofDefaults {
  orientation_deg: number;
  tilt_deg: number;
  width_m: number;
  depth_m: number;
  height_m: number;
}

export interface RoofTemplate extends ItemMeta {
  id: string;
  name: string;
  shape: RoofShape;
  defaults: RoofDefaults;
}

export interface MpptPreset extends ItemMeta {
  id: string;
  name: string;
  v_max_v: number;
  i_max_a: number;
}

export interface IrradianceProfile extends ItemMeta {
  id: string;
  name: string;
  hourly_w_m2: number[];
}
