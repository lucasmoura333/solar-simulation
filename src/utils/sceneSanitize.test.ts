import { describe, expect, it } from "vitest";
import type { SceneState } from "../types";
import { sanitizeScene } from "./sceneSanitize";

const good: SceneState = {
  building: { id: "bld-001", name: "B", external_refs: [] },
  blocks: [
    {
      id: "bk-001",
      name: "B",
      orientation_deg: 0,
      width_m: 8,
      depth_m: 5,
      wall_height_m: 3,
      place: { x: 0, z: 0 },
      external_refs: [],
    },
  ],
  waters: [
    {
      id: "bk-001-1",
      block_id: "bk-001",
      name: "Frente",
      origin_x_m: -4,
      origin_y_m: 3,
      origin_z_m: 2.5,
      length_m: 8,
      depth_m: 2.5,
      tilt_deg: 25,
      yaw_deg: 0,
      external_refs: [],
    },
  ],
  mppts: [],
  modules: [
    {
      id: "mod-001",
      catalog_id: "pv-mod-550g",
      block_id: "bk-001",
      anchor: { water_id: "bk-001-1", u_m: 2, v_m: 1 },
      yaw_deg: 0,
      mppt_id: null,
      external_refs: [],
    },
  ],
};

describe("sanitizeScene", () => {
  it("mantém cena boa intacta", () => {
    const { scene, dropped } = sanitizeScene(good);
    expect(dropped).toEqual([]);
    expect(scene.waters).toHaveLength(1);
    expect(scene.modules).toHaveLength(1);
  });

  it("descarta água com NaN/negativo e módulos órfãos", () => {
    const junk: SceneState = {
      ...good,
      waters: [
        ...good.waters,
        {
          ...good.waters[0],
          id: "bk-001-x",
          origin_x_m: Number.NaN,
        },
        {
          ...good.waters[0],
          id: "bk-001-y",
          length_m: -2,
        },
      ],
      modules: [
        ...good.modules,
        {
          ...good.modules[0],
          id: "mod-orfao",
          anchor: { water_id: "agua-ghost", u_m: 1, v_m: 1 },
        },
        {
          ...good.modules[0],
          id: "mod-nan",
          anchor: { water_id: "bk-001-1", u_m: Number.NaN, v_m: 1 },
        },
      ],
    };
    const { scene, dropped } = sanitizeScene(junk);
    expect(scene.waters).toHaveLength(1);
    expect(scene.modules).toHaveLength(1);
    expect(scene.modules[0].id).toBe("mod-001");
    expect(dropped).toContain("agua:bk-001-x");
    expect(dropped).toContain("agua:bk-001-y");
    expect(dropped).toContain("modulo:mod-orfao");
    expect(dropped).toContain("modulo:mod-nan");
  });

  it("descarta bloco inválido junto com suas águas", () => {
    const junk: SceneState = {
      ...good,
      blocks: [
        ...good.blocks,
        {
          ...good.blocks[0],
          id: "bk-ruim",
          width_m: Number.NaN,
        },
      ],
      waters: [
        ...good.waters,
        {
          ...good.waters[0],
          id: "bk-ruim-1",
          block_id: "bk-ruim",
        },
      ],
    };
    const { scene, dropped } = sanitizeScene(junk);
    expect(scene.blocks).toHaveLength(1);
    expect(scene.waters).toHaveLength(1);
    expect(dropped).toContain("bloco:bk-ruim");
    expect(dropped).toContain("agua:bk-ruim-1");
  });
});
