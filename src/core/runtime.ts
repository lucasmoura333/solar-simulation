import type { Providers } from "./providers";
import { createCatalogIrradiance } from "./adapters/catalogIrradiance";
import { createCpuRaycastShading } from "./adapters/cpuRaycastShading";
import { createSuncalcSolarPosition } from "./adapters/suncalcSolarPosition";

/**
 * Componível de portas (dependency injection). O aplicativo consome
 * `getProviders()`; num projeto maior, basta `setProviders(...)` com
 * implementações reais (SPA NREL, TMY, GPU/backend) antes de usar.
 */
let current: Providers | null = null;

export function createDefaultProviders(): Providers {
  return {
    solarPosition: createSuncalcSolarPosition(),
    irradiance: createCatalogIrradiance(),
    shading: createCpuRaycastShading(),
  };
}

export function getProviders(): Providers {
  if (!current) {
    current = createDefaultProviders();
  }
  return current;
}

export function setProviders(providers: Providers): void {
  current = providers;
}

export function resetProviders(): void {
  current = null;
}
