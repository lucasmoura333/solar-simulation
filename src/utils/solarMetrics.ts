import type { Block, Water } from "../types";
import type {
  IrradianceProvider,
  SolarPositionProvider,
} from "../core/providers";
import { rotateLocalToWorld, waterNormalLocal } from "./waterMath";

export interface WaterSolarMetrics {
  /** Irradiância global horizontal mockada da hora (W/m²). */
  ghiWm2: number;
  /** Cosseno do ângulo de incidência do sol no plano da água. */
  cosIncidence: number;
  /** Irradiância incidente aproximada no plano da água (W/m²) = GHI × cos. */
  incidentWm2: number;
  azimuthDeg: number;
  elevationDeg: number;
}

/** Métricas solares de uma água na hora atual (mock direto, sem difuso). */
export function waterSolarMetrics(input: {
  block: Block;
  water: Water;
  solarPosition: SolarPositionProvider;
  irradiance: IrradianceProvider;
  hour: number;
}): WaterSolarMetrics {
  const { block, water } = input;
  const pos = input.solarPosition.getPosition({ hourFraction: input.hour });
  const radiance = input.irradiance.hourlyW_m2();
  const ghiWm2 = radiance[Math.min(23, Math.max(0, Math.floor(input.hour)))] ?? 0;

  const az = (pos.azimuthDeg * Math.PI) / 180;
  const el = (pos.elevationDeg * Math.PI) / 180;
  const toSun = { x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: -Math.cos(el) * Math.cos(az) };
  const normal = rotateLocalToWorld(block, waterNormalLocal(water));
  const cosIncidence = Math.max(
    0,
    normal.x * toSun.x + normal.y * toSun.y + normal.z * toSun.z,
  );
  return {
    ghiWm2,
    cosIncidence,
    incidentWm2: ghiWm2 * cosIncidence,
    azimuthDeg: pos.azimuthDeg,
    elevationDeg: pos.elevationDeg,
  };
}
