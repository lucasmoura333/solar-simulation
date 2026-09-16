import { findIrradiance, findModule } from "../fixtures";
import type { ModuleOverrides } from "../types";

export const DEFAULT_IRRADIANCE_ID = "irr-clear-day-01";

export interface ModuleSpecValues {
  nominal_wp: number;
  vmp_v: number;
  efficiency_pct: number;
  length_m: number;
  width_m: number;
  custom: boolean;
}

/** Valores efetivos do módulo: da família do catálogo com overrides aplicados. */
export function moduleEffectiveValues(
  catalogId: string,
  overrides?: ModuleOverrides,
): ModuleSpecValues | null {
  const family = findModule(catalogId);
  if (!family) {
    return null;
  }
  return {
    nominal_wp: overrides?.nominal_wp ?? family.nominal_wp,
    vmp_v: overrides?.vmp_v ?? family.vmp_v,
    efficiency_pct: overrides?.efficiency_pct ?? family.efficiency_pct,
    length_m: family.length_m,
    width_m: family.width_m,
    custom:
      overrides?.nominal_wp !== undefined ||
      overrides?.vmp_v !== undefined ||
      overrides?.efficiency_pct !== undefined,
  };
}

/** Dimensões físicas efetivas do módulo (família + `size_override`). */
export function moduleDimensions(module: {
  catalog_id: string;
  size_override?: { length_m?: number; width_m?: number };
}): { length_m: number; width_m: number } | null {
  const family = findModule(module.catalog_id);
  if (!family) {
    return null;
  }
  return {
    length_m: module.size_override?.length_m ?? family.length_m,
    width_m: module.size_override?.width_m ?? family.width_m,
  };
}

/** Irradiância diária do perfil (soma das horas) em kWh/m²/dia. */
export function dailyIrradianceKwhM2(
  irradianceId: string = DEFAULT_IRRADIANCE_ID,
): number {
  const profile = findIrradiance(irradianceId);
  if (!profile) {
    return 0;
  }
  const totalWh = profile.hourly_w_m2.reduce((sum, v) => sum + v, 0);
  return totalWh / 1000;
}

/**
 * Produção diária mockada de um módulo (Fase 3 — simples por área):
 * E = G_dia (kWh/m²) × área (m²) × eficiência. Agregação horária chega na Fase 5.
 */
export function moduleDailyKwh(module: {
  catalog_id: string;
  overrides?: ModuleOverrides;
}): number | null {
  const spec = moduleEffectiveValues(module.catalog_id, module.overrides);
  if (!spec) {
    return null;
  }
  const areaM2 = spec.length_m * spec.width_m;
  return dailyIrradianceKwhM2() * areaM2 * (spec.efficiency_pct / 100);
}

/**
 * Formata energia em kWh com separador de milhar (UI cliente).
 * Energia (kWh) é resultado derivado da simulação — ver `ratings.ts` para a
 * potência de equipamento (Wp/kWp), que é fato e vive em outra camada.
 */
export function formatEnergy(kwh: number): string {
  const safe = Number.isFinite(kwh) ? kwh : 0;
  const formatted = safe.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} kWh`;
}
