import type { MpptPreset } from "./types";

export const mpptPresets = [
  {
    id: "mppt-node-01",
    kind: "mppt-preset",
    tags: ["catalog", "mppt", "mock"],
    status: "validated",
    target: "prototype",
    next: "fixture",
    evidence: "plan.txt §4 Fase 2 (MPPT nodes)",
    name: "MPPT Genérico",
    v_max_v: 600,
    i_max_a: 26,
  },
] as const satisfies readonly MpptPreset[];
