import { irradianceProfiles } from "./irradiance";
import { moduleFixtures } from "./modules";
import { mpptPresets } from "./mppts";
import { roofTemplates } from "./roofs";
import type { FamilyKind, IrradianceProfile, ModuleFixture, MpptPreset, RoofTemplate } from "./types";

export type CatalogItem =
  | ModuleFixture
  | RoofTemplate
  | MpptPreset
  | IrradianceProfile;

export const catalog = {
  modules: moduleFixtures,
  roofs: roofTemplates,
  mppts: mpptPresets,
  irradiance: irradianceProfiles,
} as const;

export function catalogItems(): CatalogItem[] {
  return [
    ...moduleFixtures,
    ...roofTemplates,
    ...mpptPresets,
    ...irradianceProfiles,
  ];
}

export function findByKindAndId(
  kind: FamilyKind,
  id: string,
): CatalogItem | undefined {
  return catalogItems().find((item) => item.kind === kind && item.id === id);
}

export function findModule(id: string): ModuleFixture | undefined {
  return moduleFixtures.find((item) => item.id === id);
}

export function findRoofTemplate(id: string): RoofTemplate | undefined {
  return roofTemplates.find((item) => item.id === id);
}

export function findMpptPreset(id: string): MpptPreset | undefined {
  return mpptPresets.find((item) => item.id === id);
}

export function findIrradiance(id: string): IrradianceProfile | undefined {
  return irradianceProfiles.find((item) => item.id === id);
}

export { irradianceProfiles, moduleFixtures, mpptPresets, roofTemplates };
