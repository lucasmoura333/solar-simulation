import type { IrradianceProfile } from "./types";

export const irradianceProfiles = [
  {
    id: "irr-clear-day-01",
    kind: "irradiance-profile",
    tags: ["catalog", "irradiance", "mock"],
    status: "validated",
    target: "prototype",
    next: "fixture",
    evidence: "plan.txt §4 Fase 5 (modelo de irradiância simples) e §1.3",
    name: "Dia limpo (mock)",
    hourly_w_m2: [
      0, 0, 0, 0, 20, 180, 420, 640, 790, 880, 920, 930, 900, 820, 680,
      500, 310, 150, 40, 0, 0, 0, 0, 0,
    ],
  },
] as const satisfies readonly IrradianceProfile[];
