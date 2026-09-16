import type { RoofTemplate } from "./types";

export const roofTemplates = [
  {
    id: "roof-gable-01",
    kind: "roof-template",
    tags: ["catalog", "roof", "mock"],
    status: "validated",
    target: "prototype",
    next: "fixture",
    evidence: "plan.txt §4 Fase 1 (telhado inclinado, duas águas)",
    name: "Duas águas padrão",
    shape: "gable",
    defaults: {
      orientation_deg: 0,
      tilt_deg: 25,
      width_m: 8,
      depth_m: 5,
      height_m: 3,
    },
  },
  {
    id: "roof-shed-01",
    kind: "roof-template",
    tags: ["catalog", "roof", "mock"],
    status: "validated",
    target: "prototype",
    next: "fixture",
    evidence: "plan.txt §4 Fase 1 (uma água como forma simples)",
    name: "Uma água simples",
    shape: "shed",
    defaults: {
      orientation_deg: 0,
      tilt_deg: 15,
      width_m: 6,
      depth_m: 4,
      height_m: 2,
    },
  },
] as const satisfies readonly RoofTemplate[];
