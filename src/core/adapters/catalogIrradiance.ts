import type { IrradianceProvider } from "../providers";
import { hourlyWOf } from "../../utils/shading";

/**
 * Irradiância do dia de estudo vinda do catálogo mockado
 * (fixture `irr-clear-day-01`). Adapter da porta IrradianceProvider.
 */
export function createCatalogIrradiance(
  profileId?: string,
): IrradianceProvider {
  const id = profileId;
  return {
    name: `catalog/${id ?? "irr-clear-day-01"}`,
    hourlyW_m2: () => (id ? hourlyWOf(id) : hourlyWOf()),
  };
}
