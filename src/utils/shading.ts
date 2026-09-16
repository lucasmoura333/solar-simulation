import { findIrradiance } from "../fixtures";

export const DEFAULT_IRRADIANCE_PROFILE_ID = "irr-clear-day-01";

/**
 * Perfil horário de irradiância (W/m²) do dia de estudo, vindo do catálogo.
 * Histórico: este módulo já abrigou a montagem de skydomes para o simshady
 * (arquitetura descontinuada — ver `services/shadingRunner.ts`).
 */
export function hourlyWOf(
  profileId: string = DEFAULT_IRRADIANCE_PROFILE_ID,
): number[] {
  const profile = findIrradiance(profileId);
  return profile ? [...profile.hourly_w_m2] : new Array(24).fill(0);
}
