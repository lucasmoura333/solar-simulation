import { describe, expect, it } from "vitest";
import {
  dailyIrradianceKwhM2,
  formatEnergy,
  moduleDailyKwh,
  moduleEffectiveValues,
} from "./calculations";

describe("calculations da Fase 3 (mock por área)", () => {
  const pv550 = { catalog_id: "pv-mod-550g" } as const;
  it("irradiância diária soma as horas do perfil", () => {
    expect(dailyIrradianceKwhM2()).toBeGreaterThan(5);
    expect(dailyIrradianceKwhM2()).toBeLessThan(10);
  });

  it("valores efetivos vêm da família sem overrides", () => {
    const spec = moduleEffectiveValues("pv-mod-550g");
    expect(spec).not.toBeNull();
    expect(spec!.nominal_wp).toBe(550);
    expect(spec!.efficiency_pct).toBe(21.3);
    expect(spec!.custom).toBe(false);
  });

  it("override parcial substitui apenas o campo editado", () => {
    const spec = moduleEffectiveValues("pv-mod-550g", {
      nominal_wp: 600,
    });
    expect(spec!.nominal_wp).toBe(600);
    expect(spec!.efficiency_pct).toBe(21.3);
    expect(spec!.custom).toBe(true);
  });

  it("produção diária cresce com eficiência e área da família", () => {
    const base = moduleDailyKwh(pv550);
    const efficient = moduleDailyKwh({
      catalog_id: "pv-mod-550g",
      overrides: { efficiency_pct: 25 },
    });
    expect(base).not.toBeNull();
    expect(efficient).not.toBeNull();
    expect(efficient!).toBeGreaterThan(base!);

    const smaller = moduleDailyKwh({ catalog_id: "pv-mod-340g" });
    expect(smaller!).toBeLessThan(base!);
  });

  it("módulo de catálogo desconhecido retorna null", () => {
    expect(moduleDailyKwh({ catalog_id: "nao-existe" })).toBeNull();
  });
});

describe("formatEnergy", () => {
  it("formata energia em kWh com separador de milhar", () => {
    expect(formatEnergy(1500)).toBe("1.500,00 kWh");
    expect(formatEnergy(6.22)).toBe("6,22 kWh");
  });
});
