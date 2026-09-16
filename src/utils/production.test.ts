import { describe, expect, it } from "vitest";
import type { Block, Mppt, SolarModule, Water } from "../types";
import { computeProduction, moduleIncidenceCos } from "./production";
import type { ShadingAnalysisResult } from "../core/providers";
import { moduleDimensions } from "./calculations";
import { directionFromDegrees } from "./sun";

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

const mppt: Mppt = {
  id: "mppt-001",
  preset_id: "mppt-node-01",
  name: "MPPT 01",
  place: { x: 0, y: 4, z: 0 },
  external_refs: [],
};

function moduleOf(
  id: string,
  waterId: string,
  u: number,
  v: number,
  mpptId: string | null,
): SolarModule {
  return {
    id,
    catalog_id: "pv-mod-550g",
    block_id: block.id,
    anchor: { water_id: waterId, u_m: u, v_m: v },
    yaw_deg: 0,
    mppt_id: mpptId,
    external_refs: [],
  };
}

const radianceHourly = new Array(24).fill(0);
for (let h = 6; h <= 17; h++) {
  radianceHourly[h] = 900;
}

function shadingStub(factorsByModule: number[]): ShadingAnalysisResult {
  const moduleOrder = ["mod-norte", "mod-sul"].slice(0, factorsByModule.length);
  const M = moduleOrder.length;
  const factorByModuleHour = new Float32Array(24 * M);
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < M; m++) {
      factorByModuleHour[h * M + m] =
        radianceHourly[h] > 0 ? factorsByModule[m] : 0;
    }
  }
  return {
    moduleOrder,
    triPerModule: moduleOrder.map(() => 0),
    factorByModuleHour,
    radianceHourly,
    totalTriangles: 0,
  };
}

describe("computeProduction v2 (mock por área × fator)", () => {
  it("soma por MPPT, sem MPPT e totais diário/anual", () => {
    const modules = [
      moduleOf("mod-norte", "bk-001-2", 4, 1.5, "mppt-001"),
      moduleOf("mod-sul", "bk-001-1", 4, 1.0, null),
    ];
    const totals = computeProduction(
      { blocks: [block], waters, modules, mppts: [mppt], shading: shadingStub([0.9, 0.4]) },
    );
    expect(totals.perModule).toHaveLength(2);
    expect(totals.dailyKWh).toBeGreaterThan(0);
    expect(totals.annualKWh).toBeCloseTo(totals.dailyKWh * 365, 6);
    const north = totals.perModule.find((m) => m.moduleId === "mod-norte")!;
    const south = totals.perModule.find((m) => m.moduleId === "mod-sul")!;
    expect(north.dailyKWh).toBeGreaterThan(south.dailyKWh);
    const row = totals.byMppt.find((r) => r.mpptId === "mppt-001")!;
    expect(row.moduleCount).toBe(1);
    const loose = totals.byMppt.find((r) => r.mpptId === null)!;
    expect(loose.moduleCount).toBe(1);
  });

  it("sombra ao meio-dia zera a hora e reduz o total do dia", () => {
    const modules = [moduleOf("mod-norte", "bk-001-2", 4, 1.5, "mppt-001")];
    const stub = shadingStub([1]);
    const semSombra = computeProduction({ blocks: [block], waters, modules, mppts: [mppt], shading: stub });
    stub.factorByModuleHour[12] = 0;
    const comSombra = computeProduction({ blocks: [block], waters, modules, mppts: [mppt], shading: stub });
    expect(comSombra.perModule[0].hourlyKwh[12]).toBe(0);
    expect(comSombra.dailyKWh).toBeLessThan(semSombra.dailyKWh);
  });

  it("sem análise (shading null) produz zero e não quebra", () => {
    const modules = [moduleOf("mod-norte", "bk-001-2", 4, 1.5, "mppt-001")];
    const totals = computeProduction({ blocks: [block], waters, modules, mppts: [mppt], shading: null });
    expect(totals.dailyKWh).toBe(0);
    expect(totals.perModule).toHaveLength(1);
  });

  it("size_override aumenta a área e a produção", () => {
    const small = moduleOf("a", "bk-001-2", 4, 1.5, "mppt-001");
    const big = {
      ...small,
      size_override: { length_m: 3, width_m: 2 },
    };
    const dimsS = moduleDimensions(small)!;
    const dimsB = moduleDimensions(big)!;
    expect(dimsB.length_m * dimsB.width_m).toBeGreaterThan(dimsS.length_m * dimsS.width_m);
    const tS = computeProduction({ blocks: [block], waters, modules: [small], mppts: [mppt], shading: shadingStub([1]) });
    const tB = computeProduction({ blocks: [block], waters, modules: [big], mppts: [mppt], shading: shadingStub([1]) });
    expect(tB.dailyKWh).toBeGreaterThan(tS.dailyKWh);
  });
});

describe("moduleIncidenceCos", () => {
  it("água do fundo (norte) recebe mais sol ao meio-dia que a da frente", () => {
    const dir = directionFromDegrees(2, 61);
    const back = moduleOf("n", "bk-001-2", 4, 1.5, null);
    const front = moduleOf("s", "bk-001-1", 4, 1.0, null);
    const cosBack = moduleIncidenceCos(block, waters[1], back, dir);
    const cosFront = moduleIncidenceCos(block, waters[0], front, dir);
    expect(cosBack).toBeGreaterThan(0.8);
    expect(cosBack).toBeGreaterThan(cosFront);
  });
});
