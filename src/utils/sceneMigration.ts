import type {
  SceneState,
  SceneStateV1,
  SolarModule,
  Water,
} from "../types";

/**
 * Migração v1 → v2 (2026-09-07): o telhado único (Roof) vira um bloco com
 * águas independentes; módulos (posição 3D local) viram âncoras (u/v) nas
 * águas — a pose passa a ser derivada (mudou a água, o módulo acompanha).
 */

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Cria as águas equivalentes ao telhado v1 (gable → 2, shed → 1). */
export function watersForRoofV1(roof: SceneStateV1["roofs"][number]): Water[] {
  const w = roof.width_m;
  const d = roof.depth_m;
  const h = roof.height_m;
  const tilt = roof.tilt_deg;
  const shed = roof.template_id.endsWith("shed-01");
  const walls = (id: string, name: string, origin_z_m: number, depth_m: number, yaw_deg: number): Water => ({
    id,
    block_id: "",
    name,
    origin_x_m: -w / 2,
    origin_y_m: h,
    origin_z_m,
    length_m: w,
    depth_m,
    tilt_deg: tilt,
    yaw_deg,
    external_refs: [],
  });
  if (shed) {
    return [walls("water-001", "Água única", d / 2, d, 0)];
  }
  return [
    walls("water-001", "Água frente", d / 2, d / 2, 0),
    walls("water-002", "Água fundo", -d / 2, d / 2, 180),
  ];
}

export function migrateSceneStateV1toV2(scene: SceneStateV1): SceneState {
  const building = scene.building
    ? {
        id: scene.building.id,
        name: scene.building.name,
        external_refs: scene.building.external_refs,
      }
    : null;

  const blocks = scene.roofs.map((roof) => ({
    id: `bk-${roof.id}`,
    name: roof.template_id.endsWith("shed-01")
      ? "Bloco 1 água"
      : "Bloco 2 águas",
    place: roof.place ? { x: roof.place.x, z: roof.place.z } : undefined,
    orientation_deg: roof.orientation_deg,
    width_m: roof.width_m,
    depth_m: roof.depth_m,
    wall_height_m: roof.height_m,
    external_refs: roof.external_refs,
  }));

  const waters: Water[] = [];
  for (const roof of scene.roofs) {
    const block = blocks.find((b) => b.id === `bk-${roof.id}`)!;
    const list = watersForRoofV1(roof).map((water, index) => ({
      ...water,
      id: `${block.id}-${index + 1}`,
      block_id: block.id,
    }));
    waters.push(...list);
  }

  const blockByRoofId = new Map(scene.roofs.map((r) => [r.id, `bk-${r.id}`]));

  const modules: SolarModule[] = scene.modules.map((m) => {
    const roof = scene.roofs.find((r) => r.id === m.roof_id);
    if (!roof) {
      throw new Error(`migração: roof ${m.roof_id} do módulo ${m.id} não encontrado`);
    }
    const blockId = blockByRoofId.get(roof.id)!;
    const shed = roof.template_id.endsWith("shed-01");
    const halfD = roof.depth_m / 2;
    const front = !shed && m.position_m.z >= 0;
    const waterId = shed
      ? `${blockId}-1`
      : front
        ? `${blockId}-1`
        : `${blockId}-2`;
    const water = waters.find((wt) => wt.id === waterId)!;
    const isFront =
      water.yaw_deg === 0 && water.origin_z_m > 0 && !shed;

    let u: number;
    let v: number;
    if (shed) {
      u = m.position_m.x + roof.width_m / 2;
      v = halfD - m.position_m.z;
    } else if (isFront) {
      // frente: origem em -halfW com U=+x
      u = m.position_m.x + roof.width_m / 2;
      v = halfD - m.position_m.z;
    } else {
      // fundo: origem em +halfW com U=−x (u cresce para −x)
      u = roof.width_m / 2 - m.position_m.x;
      v = m.position_m.z + halfD;
    }
    u = clamp(u, 0, water.length_m);
    v = clamp(v, 0, water.depth_m);

    return {
      id: m.id,
      catalog_id: m.catalog_id,
      block_id: blockId,
      anchor: { water_id: water.id, u_m: u, v_m: v },
      yaw_deg: 0,
      mppt_id: m.mppt_id,
      overrides: m.overrides,
      external_refs: m.external_refs,
    };
  });

  return {
    building,
    blocks,
    waters,
    mppts: scene.mppts,
    modules,
  };
}
