import type { Block, Mppt, SceneState, SolarModule, Water } from "../types";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export interface SanitizeResult {
  scene: SceneState;
  /** Identificadores do que foi descartado, ex. "agua:bk-001-3". */
  dropped: string[];
}

/**
 * Cura de cena salva: descarta entidades com números não-finítos (NaN/Inf,
 * nulos virados null no JSON) ou geometria impossível, e módulos órfãos de
 * água/bloco. Aplicada ao carregar (storage) e ao importar cena manual.
 */
export function sanitizeScene(scene: SceneState): SanitizeResult {
  const dropped: string[] = [];

  const blocks = (Array.isArray(scene?.blocks) ? scene.blocks : []).filter(
    (b): b is Block => {
      const ok =
        !!b &&
        typeof b.id === "string" &&
        isFiniteNumber(b.width_m) &&
        b.width_m > 0 &&
        isFiniteNumber(b.depth_m) &&
        b.depth_m > 0 &&
        isFiniteNumber(b.wall_height_m) &&
        b.wall_height_m > 0 &&
        isFiniteNumber(b.orientation_deg) &&
        (!b.place || (isFiniteNumber(b.place.x) && isFiniteNumber(b.place.z)));
      if (!ok) {
        dropped.push(`bloco:${(b as Block | undefined)?.id ?? "?"}`);
      }
      return ok;
    },
  );
  const blockIds = new Set(blocks.map((b) => b.id));

  const waters = (Array.isArray(scene?.waters) ? scene.waters : []).filter(
    (w): w is Water => {
      const ok =
        !!w &&
        typeof w.id === "string" &&
        blockIds.has(w.block_id) &&
        isFiniteNumber(w.origin_x_m) &&
        isFiniteNumber(w.origin_y_m) &&
        isFiniteNumber(w.origin_z_m) &&
        isFiniteNumber(w.length_m) &&
        w.length_m > 0 &&
        isFiniteNumber(w.depth_m) &&
        w.depth_m > 0 &&
        isFiniteNumber(w.tilt_deg) &&
        Math.abs(w.tilt_deg) <= 89 &&
        isFiniteNumber(w.yaw_deg);
      if (!ok) {
        dropped.push(`agua:${(w as Water | undefined)?.id ?? "?"}`);
      }
      return ok;
    },
  );
  const waterIds = new Set(waters.map((w) => w.id));

  const modules = (Array.isArray(scene?.modules) ? scene.modules : []).filter(
    (m): m is SolarModule => {
      const ok =
        !!m &&
        typeof m.id === "string" &&
        blockIds.has(m.block_id) &&
        !!m.anchor &&
        waterIds.has(m.anchor.water_id) &&
        isFiniteNumber(m.anchor.u_m) &&
        m.anchor.u_m >= 0 &&
        isFiniteNumber(m.anchor.v_m) &&
        m.anchor.v_m >= 0 &&
        (m.yaw_deg === undefined || isFiniteNumber(m.yaw_deg)) &&
        (m.pitch_override_deg === undefined || isFiniteNumber(m.pitch_override_deg));
      if (!ok) {
        dropped.push(`modulo:${(m as SolarModule | undefined)?.id ?? "?"}`);
      }
      return ok;
    },
  );

  const mppts = (Array.isArray(scene?.mppts) ? scene.mppts : []).filter(
    (m): m is Mppt => {
      const ok =
        !!m &&
        typeof m.id === "string" &&
        typeof m.preset_id === "string" &&
        (!m.place ||
          (isFiniteNumber(m.place.x) &&
            isFiniteNumber(m.place.y) &&
            isFiniteNumber(m.place.z)));
      if (!ok) {
        dropped.push(`mppt:${(m as Mppt | undefined)?.id ?? "?"}`);
      }
      return ok;
    },
  );

  return {
    scene: {
      building: scene?.building ?? null,
      blocks,
      waters,
      mppts,
      modules,
    },
    dropped,
  };
}
