import type {
  Block,
  Building,
  ExternalRef,
  Mppt,
  Place2D,
  SceneState,
  SceneStateV1,
  SolarModule,
  Water,
} from "../types";
import { migrateSceneStateV1toV2 } from "../utils/sceneMigration";

export const EXPORT_FORMAT = "solar-sim/export";
export const EXPORT_VERSION = 2;

export interface ExportScenario {
  id: string;
  name: string;
  idempotency_key: string;
  graph_snapshot_hash: string;
  catalog_refs: CatalogRef[];
}

export interface CatalogRef {
  item: string;
  hash: string | null;
  status?: string;
}

export interface ExportResults {
  kind: "derived";
  note: string;
  last_run: null;
}

export interface ExportDocument {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exported_at: string;
  correlation_id: string;
  scenario: ExportScenario;
  building: Building | null;
  blocks: Block[];
  waters: Water[];
  mppts: Mppt[];
  modules: SolarModule[];
  results?: ExportResults;
}

/** Documento v1 (legado) — aceito na importação; exportado sempre como v2. */
export interface ExportDocumentV1 {
  format: string;
  version: 1;
  scenario: ExportScenario;
  building: SceneStateV1["building"];
  roofs: SceneStateV1["roofs"];
  mppts: Mppt[];
  modules: SceneStateV1["modules"];
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function catalogRefsOf(scene: SceneState): CatalogRef[] {
  const refs = new Map<string, string>();
  for (const module of scene.modules) {
    refs.set(`fixture:${module.catalog_id}`, module.catalog_id);
  }
  for (const mppt of scene.mppts) {
    refs.set(`fixture:${mppt.preset_id}`, mppt.preset_id);
  }
  return Array.from(refs.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([item]) => ({ item, hash: null }));
}

export async function buildExportDocument(
  scene: SceneState,
  scenarioId: string,
  scenarioName: string,
  now: Date = new Date(),
): Promise<ExportDocument> {
  const canonical = JSON.stringify({
    building: scene.building,
    blocks: scene.blocks,
    waters: scene.waters,
    mppts: scene.mppts,
    modules: scene.modules,
  });
  const graphSnapshotHash = `sha256:${await sha256Hex(canonical)}`;

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: now.toISOString(),
    correlation_id: crypto.randomUUID(),
    scenario: {
      id: scenarioId,
      name: scenarioName,
      idempotency_key: `${scenarioId}/${scenarioName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`,
      graph_snapshot_hash: graphSnapshotHash,
      catalog_refs: catalogRefsOf(scene),
    },
    building: scene.building,
    blocks: scene.blocks,
    waters: scene.waters,
    mppts: scene.mppts,
    modules: scene.modules,
    results: {
      kind: "derived",
      note: "Regenerável; nunca tratado como fato de engenharia.",
      last_run: null,
    },
  };
}

/* ----------------------------- guards comuns ----------------------------- */

function isExternalRefs(value: unknown): value is ExternalRef[] {
  return (
    Array.isArray(value) &&
    value.every(
      (ref) =>
        typeof ref === "object" &&
        ref !== null &&
        typeof (ref as ExternalRef).system === "string" &&
        typeof (ref as ExternalRef).id === "string",
    )
  );
}

function isVec3(value: unknown): value is { x: number; y: number; z: number } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number"
  );
}

function isPlace2D(value: unknown): value is Place2D {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v.x === "number" && typeof v.z === "number";
}

/* ----------------------------- guards v2 ----------------------------- */

export function isBlock(value: unknown): value is Block {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const b = value as Record<string, unknown>;
  if (
    typeof b.id !== "string" ||
    typeof b.name !== "string" ||
    typeof b.orientation_deg !== "number" ||
    typeof b.width_m !== "number" ||
    typeof b.depth_m !== "number" ||
    typeof b.wall_height_m !== "number" ||
    !isExternalRefs(b.external_refs)
  ) {
    return false;
  }
  if (b.place !== undefined && !isPlace2D(b.place)) {
    return false;
  }
  return true;
}

export function isWater(value: unknown): value is Water {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const w = value as Record<string, unknown>;
  return (
    typeof w.id === "string" &&
    typeof w.block_id === "string" &&
    typeof w.name === "string" &&
    typeof w.origin_x_m === "number" &&
    typeof w.origin_y_m === "number" &&
    typeof w.origin_z_m === "number" &&
    typeof w.length_m === "number" &&
    typeof w.depth_m === "number" &&
    typeof w.tilt_deg === "number" &&
    typeof w.yaw_deg === "number" &&
    isExternalRefs(w.external_refs)
  );
}

export function isSolarModule(value: unknown): value is SolarModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const m = value as Record<string, unknown>;
  if (
    typeof m.id !== "string" ||
    typeof m.catalog_id !== "string" ||
    typeof m.block_id !== "string" ||
    typeof m.yaw_deg !== "number" ||
    (m.mppt_id !== null && typeof m.mppt_id !== "string") ||
    !isExternalRefs(m.external_refs)
  ) {
    return false;
  }
  const anchor = m.anchor as Record<string, unknown> | undefined;
  if (
    !anchor ||
    typeof anchor.water_id !== "string" ||
    typeof anchor.u_m !== "number" ||
    typeof anchor.v_m !== "number"
  ) {
    return false;
  }
  if (
    m.pitch_override_deg !== undefined &&
    typeof m.pitch_override_deg !== "number"
  ) {
    return false;
  }
  const size = m.size_override as Record<string, unknown> | undefined;
  if (size !== undefined) {
    if (
      (size.length_m !== undefined && typeof size.length_m !== "number") ||
      (size.width_m !== undefined && typeof size.width_m !== "number")
    ) {
      return false;
    }
  }
  const overrides = m.overrides as Record<string, unknown> | undefined;
  if (overrides !== undefined) {
    for (const field of ["nominal_wp", "vmp_v", "efficiency_pct"]) {
      const v = overrides[field];
      if (v !== undefined && typeof v !== "number") {
        return false;
      }
    }
  }
  return true;
}

function isBuildingV2(value: unknown): value is Building | null {
  if (value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false;
  }
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.name === "string" &&
    isExternalRefs(b.external_refs)
  );
}

export function isExportDocumentV2(value: unknown): value is ExportDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const doc = value as Record<string, unknown>;
  if (doc.format !== EXPORT_FORMAT || doc.version !== EXPORT_VERSION) {
    return false;
  }
  if (typeof doc.exported_at !== "string") {
    return false;
  }
  if (typeof doc.correlation_id !== "string") {
    return false;
  }
  const scenario = doc.scenario as Record<string, unknown> | undefined;
  if (
    !scenario ||
    typeof scenario.id !== "string" ||
    typeof scenario.idempotency_key !== "string" ||
    typeof scenario.graph_snapshot_hash !== "string" ||
    !Array.isArray(scenario.catalog_refs)
  ) {
    return false;
  }
  return (
    isBuildingV2(doc.building) &&
    Array.isArray(doc.blocks) &&
    doc.blocks.every(isBlock) &&
    Array.isArray(doc.waters) &&
    doc.waters.every(isWater) &&
    Array.isArray(doc.mppts) &&
    doc.mppts.every(isMppt) &&
    Array.isArray(doc.modules) &&
    doc.modules.every(isSolarModule)
  );
}

/* ----------------------------- guards v1 (legado) ----------------------------- */

function isBuildingV1(value: unknown): value is SceneStateV1["building"] {
  if (value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false;
  }
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.name === "string" &&
    Array.isArray(b.roof_ids) &&
    b.roof_ids.every((id) => typeof id === "string") &&
    isExternalRefs(b.external_refs)
  );
}

function isRoofV1(value: unknown): value is SceneStateV1["roofs"][number] {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const r = value as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.template_id !== "string" ||
    typeof r.orientation_deg !== "number" ||
    typeof r.tilt_deg !== "number" ||
    typeof r.width_m !== "number" ||
    typeof r.depth_m !== "number" ||
    typeof r.height_m !== "number" ||
    !isExternalRefs(r.external_refs)
  ) {
    return false;
  }
  if (r.place !== undefined) {
    const place = r.place as Record<string, unknown>;
    if (
      typeof place !== "object" ||
      place === null ||
      typeof place.x !== "number" ||
      typeof place.z !== "number"
    ) {
      return false;
    }
  }
  return true;
}

export function isMppt(value: unknown): value is Mppt {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const m = value as Record<string, unknown>;
  if (
    typeof m.id !== "string" ||
    typeof m.preset_id !== "string" ||
    typeof m.name !== "string" ||
    !isExternalRefs(m.external_refs)
  ) {
    return false;
  }
  if (m.place !== undefined && !isVec3(m.place)) {
    return false;
  }
  return true;
}

function isModuleV1(value: unknown): value is SceneStateV1["modules"][number] {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.catalog_id === "string" &&
    typeof m.roof_id === "string" &&
    isVec3(m.position_m) &&
    isVec3(m.rotation_deg) &&
    (m.mppt_id === null || typeof m.mppt_id === "string") &&
    isExternalRefs(m.external_refs)
  );
}

export function isExportDocumentV1(value: unknown): value is ExportDocumentV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const doc = value as Record<string, unknown>;
  if (doc.format !== EXPORT_FORMAT || doc.version !== 1) {
    return false;
  }
  if (typeof doc.exported_at !== "string") {
    return false;
  }
  if (typeof doc.correlation_id !== "string") {
    return false;
  }
  const scenario = doc.scenario as Record<string, unknown> | undefined;
  if (
    !scenario ||
    typeof scenario.id !== "string" ||
    typeof scenario.idempotency_key !== "string" ||
    typeof scenario.graph_snapshot_hash !== "string" ||
    !Array.isArray(scenario.catalog_refs)
  ) {
    return false;
  }
  return (
    isBuildingV1(doc.building) &&
    Array.isArray(doc.roofs) &&
    doc.roofs.every(isRoofV1) &&
    Array.isArray(doc.mppts) &&
    doc.mppts.every(isMppt) &&
    Array.isArray(doc.modules) &&
    doc.modules.every(isModuleV1)
  );
}

/** Aceita export v1 (migra) e v2. */
export function isExportDocument(
  value: unknown,
): value is ExportDocument | ExportDocumentV1 {
  return isExportDocumentV1(value) || isExportDocumentV2(value);
}

export function docToScene(doc: ExportDocument | ExportDocumentV1): SceneState {
  if (isExportDocumentV2(doc)) {
    return {
      building: doc.building,
      blocks: doc.blocks,
      waters: doc.waters,
      mppts: doc.mppts,
      modules: doc.modules,
    };
  }
  const sceneV1: SceneStateV1 = {
    building: doc.building,
    roofs: doc.roofs,
    mppts: doc.mppts,
    modules: doc.modules,
  };
  return migrateSceneStateV1toV2(sceneV1);
}
