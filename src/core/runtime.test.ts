import { describe, expect, it } from "vitest";
import type { Block, SolarModule, Water } from "../types";
import type {
  IrradianceProvider,
  Providers,
  ShadingAnalysisResult,
  ShadingProvider,
  SolarPosition,
  SolarPositionProvider,
} from "./providers";
import {
  createDefaultProviders,
  getProviders,
  resetProviders,
  setProviders,
} from "./runtime";

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

const module: SolarModule = {
  id: "mod-001",
  catalog_id: "pv-mod-550g",
  block_id: block.id,
  anchor: { water_id: "bk-001-2", u_m: 4, v_m: 1.5 },
  yaw_deg: 0,
  mppt_id: null,
  external_refs: [],
};

describe("runtime padrão (adapters reais)", () => {
  it("expõe as três portas plugadas", () => {
    const providers = createDefaultProviders();
    expect(providers.solarPosition.name).toBeTruthy();
    expect(providers.irradiance.name).toBeTruthy();
    expect(providers.shading.name).toBeTruthy();
  });

  it("posição do sol ao meio-dia em SP: acima do horizonte e ao norte", () => {
    const pos = getProviders().solarPosition.getPosition({ hourFraction: 12 });
    expect(pos.elevationDeg).toBeGreaterThan(40);
    expect(pos.azimuthDeg < 45 || pos.azimuthDeg > 315).toBe(true);
  });

  it("irradiância do catálogo tem 24 amostras", () => {
    const hourly = getProviders().irradiance.hourlyW_m2();
    expect(hourly).toHaveLength(24);
    expect(Math.max(...hourly)).toBeGreaterThan(0);
  });

  it("análise de sombra pelo provedor gera fator alto ao meio-dia na face ao norte", async () => {
    const providers = getProviders();
    const result = await providers.shading.analyze({
      blocks: [block],
      waters,
      modules: [module],
      solarPosition: providers.solarPosition,
      irradiance: providers.irradiance,
    });
    expect(result.factorByModuleHour[12]).toBeGreaterThan(0.8);
  });
});

describe("injeção (setProviders)", () => {
  it("provedores customizados substituem o runtime", async () => {
    const calls: string[] = [];
    const stubPosition: SolarPositionProvider = {
      name: "stub",
      location: { latitude: 0, longitude: 0, timezoneHours: 0 },
      getPosition(input: { hourFraction: number }): SolarPosition {
        calls.push(`pos@${input.hourFraction}`);
        return { azimuthDeg: 0, elevationDeg: 60 };
      },
    };
    const stubIrradiance: IrradianceProvider = {
      name: "stub",
      hourlyW_m2: () =>
        Array.from({ length: 24 }, (_, i) => (i === 12 ? 1000 : 0)),
    };
    const stubShading: ShadingProvider = {
      name: "stub",
      async analyze() {
        calls.push("analyze");
        const result: ShadingAnalysisResult = {
          moduleOrder: [],
          triPerModule: [],
          factorByModuleHour: new Float32Array(0),
          radianceHourly: new Array(24).fill(0),
          totalTriangles: 0,
        };
        return result;
      },
    };
    const providers: Providers = {
      solarPosition: stubPosition,
      irradiance: stubIrradiance,
      shading: stubShading,
    };
    setProviders(providers);
    try {
      const runtime = getProviders();
      expect(runtime.shading).toBe(stubShading);
      const result = await runtime.shading.analyze({
        blocks: [block],
        waters,
        modules: [],
        solarPosition: runtime.solarPosition,
        irradiance: runtime.irradiance,
      });
      expect(result).not.toBeNull();
      expect(calls).toContain("analyze");
    } finally {
      resetProviders();
    }
  });
});
