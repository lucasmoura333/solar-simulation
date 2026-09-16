import { getPosition } from "suncalc";
import type { GeoLocation } from "../core/providers";

/** Local mockado do estudo (São Paulo), usado pela posição solar. */
export const LOCATION: GeoLocation = {
  latitude: -23.55,
  longitude: -46.63,
  timezoneHours: -3,
} as const;

/** Data base do estudo (dia claro de setembro). Hora é redefinida pelo slider. */
export const STUDY_DATE_UTC = "2026-09-07T12:00:00Z";

export interface SunPosition {
  /** Azimute (navegacional, 0=N, 90=E) em graus. */
  azimuthDeg: number;
  /** Elevação acima do horizonte em graus (negativa = abaixo). */
  elevationDeg: number;
  /** Elevação em radianos. */
  elevationRad: number;
}

/**
 * Posição do sol em dado instante local (horas fracionárias 0–24) no local mockado.
 * suncalc v2 (NOAA): ângulos em graus, azimute navegacional (0=N, 90=E), altitude com refração.
 */
export function sunPositionAt(
  hourFraction: number,
  dateUtc: string = STUDY_DATE_UTC,
  location: GeoLocation = LOCATION,
): SunPosition {
  const date = new Date(dateUtc);
  const utcHour = ((hourFraction % 24) - location.timezoneHours + 24) % 24;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCHours(utcHour);

  const position = getPosition(date, location.latitude, location.longitude);
  const elevationDeg = position.altitude;
  return {
    azimuthDeg: position.azimuth,
    elevationDeg,
    elevationRad: (elevationDeg * Math.PI) / 180,
  };
}

/**
 * Direção do sol em coordenadas de mundo three (norte = −z, leste = +x, cima = +y),
 * apontando da origem para o sol (para posicionar a luz direcional).
 * Função pura a partir de azimute (navegacional) e elevação em graus — usada
 * pelos adaptadores de provedor; independe da biblioteca de posição.
 */
export function directionFromDegrees(
  azimuthDeg: number,
  elevationDeg: number,
): { x: number; y: number; z: number } {
  const alt = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  const east = Math.cos(alt) * Math.sin(az);
  const north = Math.cos(alt) * Math.cos(az);
  const up = Math.sin(alt);
  return { x: east, y: up, z: -north };
}

/**
 * Direção do sol em coordenadas de mundo three (norte = −z, leste = +x, cima = +y),
 * apontando do sol para a origem (para a luz direcional posicionar no céu).
 */
export function sunDirectionWorld(position: SunPosition): {
  x: number;
  y: number;
  z: number;
} {
  const alt = position.elevationRad;
  const az = (position.azimuthDeg * Math.PI) / 180;
  const east = Math.cos(alt) * Math.sin(az);
  const north = Math.cos(alt) * Math.cos(az);
  const up = Math.sin(alt);
  return { x: east, y: up, z: -north };
}
