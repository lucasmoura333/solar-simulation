import { describe, expect, it } from "vitest";
import type { SceneStateV1, Water } from "../types";
import scn001 from "../fixtures/examples/scn-001.json";
import { migrateSceneStateV1toV2, watersForRoofV1 } from "./sceneMigration";
import { waterSurfacePointLocal } from "./waterMath";

const waterSurfaceOfBack = (u: number) => {
  const water: Water = {
    id: "bk-roof-001-2",
    block_id: "bk-roof-001",
    name: "Fundo",
    origin_x_m: 4,
    origin_y_m: 3,
    origin_z_m: -2.5,
    length_m: 8,
    depth_m: 2.5,
    tilt_deg: 25,
    yaw_deg: 180,
    external_refs: [],
  };
  return waterSurfacePointLocal(water, u, 0);
};

const sceneV1: SceneStateV1 = {
  building: {
    id: "bld-001",
    name: "edificacao generica",
    external_refs: [],
    roof_ids: ["roof-001"],
  },
  roofs: [
    {
      id: "roof-001",
      template_id: "roof-gable-01",
      orientation_deg: 0,
      tilt_deg: 25,
      width_m: 8,
      depth_m: 5,
      height_m: 3,
      place: { x: 2, z: -1 },
      external_refs: [],
    },
  ],
  mppts: [
    { id: "mppt-001", preset_id: "mppt-node-01", name: "MPPT 01", external_refs: [] },
  ],
  modules: [
    {
      id: "mod-001",
      catalog_id: "pv-mod-550g",
      roof_id: "roof-001",
      position_m: { x: 1.2, y: 0, z: 1.0 },
      rotation_deg: { x: 25, y: 0, z: 0 },
      mppt_id: "mppt-001",
      external_refs: [],
    },
    {
      id: "mod-002",
      catalog_id: "pv-mod-550g",
      roof_id: "roof-001",
      position_m: { x: 0, y: 4, z: -1.5 },
      rotation_deg: { x: -25, y: 0, z: 0 },
      mppt_id: null,
      external_refs: [],
    },
  ],
};

describe("migração v1 → v2", () => {
  it("gable vira bloco + 2 águas com geometria equivalente", () => {
    const v2 = migrateSceneStateV1toV2(sceneV1);
    expect(v2.blocks).toHaveLength(1);
    const block = v2.blocks[0];
    expect(block.id).toBe("bk-roof-001");
    expect(block.width_m).toBe(8);
    expect(block.place).toEqual({ x: 2, z: -1 });
    expect(v2.waters).toHaveLength(2);
    const front = v2.waters.find((w) => w.yaw_deg === 0)!;
    expect(front.origin_z_m).toBe(2.5);
    expect(front.depth_m).toBe(2.5);
    const back = v2.waters.find((w) => w.yaw_deg === 180)!;
    expect(back.origin_z_m).toBe(-2.5);
    expect(v2.building?.id).toBe("bld-001");
  });

  it("shed vira 1 água que sobe da frente para o fundo", () => {
    const shed = watersForRoofV1({
      ...sceneV1.roofs[0],
      template_id: "roof-shed-01",
      tilt_deg: 15,
      depth_m: 4,
    });
    expect(shed).toHaveLength(1);
    expect(shed[0].depth_m).toBe(4);
    expect(shed[0].yaw_deg).toBe(0);
  });

  it("módulos são reancorados por projeção horizontal (u/v) nas águas", () => {
    const v2 = migrateSceneStateV1toV2(sceneV1);
    const modFront = v2.modules.find((m) => m.id === "mod-001")!;
    // x=1.2 → u = 1.2 + 4 = 5.2; z=1.0 na frente → v = 2.5 − 1.0 = 1.5
    expect(modFront.anchor.water_id).toBe("bk-roof-001-1");
    expect(modFront.anchor.u_m).toBeCloseTo(5.2, 5);
    expect(modFront.anchor.v_m).toBeCloseTo(1.5, 5);
    expect(modFront.yaw_deg).toBe(0);
    const modBack = v2.modules.find((m) => m.id === "mod-002")!;
    expect(modBack.anchor.water_id).toBe("bk-roof-001-2");
    // fundo: origem em +halfW com U=−x → u = 4 − x = 4
    expect(modBack.anchor.u_m).toBeCloseTo(4, 5);
    expect(modBack.anchor.v_m).toBeCloseTo(1, 5);
    expect(modBack.block_id).toBe("bk-roof-001");
  });

  it("módulo do fundo com x≠0 não é espelhado (u = halfW − x)", () => {
    const shifted: SceneStateV1 = {
      ...sceneV1,
      modules: [
        {
          ...sceneV1.modules[1],
          id: "mod-002",
          position_m: { x: 1, y: 4, z: -1.5 },
        },
      ],
    };
    const v2 = migrateSceneStateV1toV2(shifted);
    const mod = v2.modules[0];
    expect(mod.anchor.u_m).toBeCloseTo(3, 5); // 4 − 1
    const end = waterSurfaceOfBack(mod.anchor.u_m);
    expect(end.x).toBeCloseTo(1, 5);
  });

  it("exemplo scn-001 do catálogo migra sem perder mppts/módulos", () => {
    const doc = scn001 as unknown as { scenario: { name: string } };
    const v2 = migrateSceneStateV1toV2(scn001 as unknown as SceneStateV1);
    expect(doc.scenario.name).toBe("dia-limpo-telhado-2aguas");
    expect(v2.mppts).toHaveLength(1);
    expect(v2.modules).toHaveLength(1);
    expect(v2.waters).toHaveLength(2);
  });
});
