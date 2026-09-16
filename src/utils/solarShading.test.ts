import { describe, expect, it } from "vitest";
import type { Block, SolarModule, Water } from "../types";
import { isOccluded, rayTriangle, runSolarShading } from "./solarShading";
import { hourlyWOf } from "./shading";

const block: Block = {
  id: "bk-001",
  name: "Bloco",
  orientation_deg: 0,
  width_m: 8,
  depth_m: 5,
  wall_height_m: 3,
  place: { x: 0, z: 0 },
  external_refs: [],
};

const waters: Water[] = [
  {
    id: "bk-001-1",
    block_id: "bk-001",
    name: "Água frente",
    origin_x_m: -4,
    origin_y_m: 3,
    origin_z_m: 2.5,
    length_m: 8,
    depth_m: 2.5,
    tilt_deg: 25,
    yaw_deg: 0,
    external_refs: [],
  },
  {
    id: "bk-001-2",
    block_id: "bk-001",
    name: "Água fundo",
    origin_x_m: 4,
    origin_y_m: 3,
    origin_z_m: -2.5,
    length_m: 8,
    depth_m: 2.5,
    tilt_deg: 25,
    yaw_deg: 180,
    external_refs: [],
  },
];

/** Módulo ancorado: v escolhido para a posição horizontal do v1. */
function moduleOf(
  id: string,
  waterId: string,
  u: number,
  v: number,
): SolarModule {
  return {
    id,
    catalog_id: "pv-mod-550g",
    block_id: block.id,
    anchor: { water_id: waterId, u_m: u, v_m: v },
    yaw_deg: 0,
    mppt_id: null,
    external_refs: [],
  };
}

const radiance = hourlyWOf();

describe("rayTriangle/isOccluded (unidades)", () => {
  const tri = {
    a: [-1, 0, -1],
    b: [1, 0, -1],
    c: [1, 0, 1],
  };
  it("raio vertical atravessa um plano horizontal no caminho", () => {
    const t = rayTriangle([0, -1, 0], [0, 1, 0], tri, Infinity);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0);
  });
  it("raio paralelo não intersepta", () => {
    expect(rayTriangle([0, 0.5, 0], [1, 0, 0], tri, Infinity)).toBeNull();
  });
  it("isOccluded respeita direção", () => {
    expect(isOccluded([0, -1, 0], [0, 1, 0], [tri])).toBe(true);
    expect(isOccluded([0, 0.5, 0], [1, 0, 0], [tri])).toBe(false);
  });
});

describe("runSolarShading v2 (raycast CPU em blocos+águas)", () => {
  it("face ao norte (água do fundo) iluminada no meio-dia tem fator alto", async () => {
    const result = await runSolarShading({
      blocks: [block],
      waters,
      modules: [moduleOf("norte", "bk-001-2", 4, 1.5)],
    });
    expect(radiance[12]).toBeGreaterThan(0);
    expect(result.factorByModuleHour[12]).toBeGreaterThan(0.8);
  });

  it("água da frente ao meio-dia rende menos que a do fundo (ângulo)", async () => {
    const sul = await runSolarShading({
      blocks: [block],
      waters,
      modules: [moduleOf("sul", "bk-001-1", 4, 1.0)],
    });
    const norte = await runSolarShading({
      blocks: [block],
      waters,
      modules: [moduleOf("norte", "bk-001-2", 4, 1.5)],
    });
    expect(sul.factorByModuleHour[12]).toBeGreaterThan(0.1);
    expect(sul.factorByModuleHour[12]).toBeLessThan(
      norte.factorByModuleHour[12] - 0.1,
    );
  });

  it("à noite o fator é zero", async () => {
    const result = await runSolarShading({
      blocks: [block],
      waters,
      modules: [moduleOf("norte", "bk-001-2", 4, 1.5)],
    });
    expect(result.factorByModuleHour[2]).toBe(0);
  });

  it("módulos lado a lado na mesma água não se bloqueiam ao meio-dia", async () => {
    const modules = [
      moduleOf("a", "bk-001-2", 2, 2),
      moduleOf("b", "bk-001-2", 4, 1),
    ];
    const result = await runSolarShading({ blocks: [block], waters, modules });
    expect(result.moduleOrder).toHaveLength(2);
    expect(result.factorByModuleHour[12 * 2 + 0]).toBeGreaterThan(0.8);
    expect(result.factorByModuleHour[12 * 2 + 1]).toBeGreaterThan(0.8);
  });

  it("manhã (7h) com sol acima do horizonte gera fator", async () => {
    const result = await runSolarShading({
      blocks: [block],
      waters,
      modules: [moduleOf("norte", "bk-001-2", 4, 1.5)],
    });
    expect(radiance[7]).toBeGreaterThan(0);
    expect(result.factorByModuleHour[7]).toBeGreaterThan(0);
  });

  it("mudar o tilt da água re-poseia o módulo (âncora colada)", async () => {
    const tilted = waters.map((w) =>
      w.id === "bk-001-2" ? { ...w, tilt_deg: 10 } : w,
    );
    const result = await runSolarShading({ blocks: [block], waters: tilted, modules: [moduleOf("norte", "bk-001-2", 4, 1.5)] });
    expect(result.totalTriangles).toBeGreaterThan(0);
  });
});
