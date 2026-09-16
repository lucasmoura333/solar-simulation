import type {
  GeoLocation,
  SolarPosition,
  SolarPositionProvider,
} from "../providers";
import { LOCATION, STUDY_DATE_UTC, sunPositionAt } from "../../utils/sun";

/**
 * Posição solar via suncalc (NOAA, JS puro).
 * Adapter da porta SolarPositionProvider.
 */
export function createSuncalcSolarPosition(
  location: GeoLocation = LOCATION,
): SolarPositionProvider {
  return {
    name: "suncalc/noaa",
    location,
    getPosition(input: { hourFraction: number; dateUtc?: string }): SolarPosition {
      const pos = sunPositionAt(
        input.hourFraction,
        input.dateUtc ?? STUDY_DATE_UTC,
        location,
      );
      return { azimuthDeg: pos.azimuthDeg, elevationDeg: pos.elevationDeg };
    },
  };
}
