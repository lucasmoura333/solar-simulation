import { create } from "zustand";
import type { ToolMode } from "../types";

export type Tool = "select" | "install";

export type Selection =
  | { kind: "block"; id: string }
  | { kind: "water"; id: string }
  | { kind: "module"; id: string }
  | { kind: "mppt"; id: string }
  | null;

/** Ponto de inserção (sobre uma água) sob o ponteiro. */
export interface WaterHover {
  waterId: string;
  /** Coordenadas do centro do módulo (u/v) na água. */
  u: number;
  v: number;
}

interface UiState {
  toolMode: ToolMode;
  tool: Tool;
  selection: Selection;
  /** Família ativa para inserir por clique na água (null desliga). */
  placementFamily: string | null;
  /** Água-alvo da instalação (null = qualquer água). */
  installWaterId: string | null;
  hover: WaterHover | null;
  /** Ids de módulos em multiseleção (Ctrl+clique). */
  multi: string[];
  /** Horário solar em horas fracionárias 0–24 (Fase 4). */
  sunHour: number;
  /** Realce de irradiação 0–10 (Fase 6 — UX). */
  lightBoost: number;
  /** Ângulo do norte na tela (0 = topo, sentido horário) — bússola. */
  northDeg: number;
  setToolMode: (mode: ToolMode) => void;
  setTool: (tool: Tool) => void;
  setSelection: (selection: Selection) => void;
  setPlacementFamily: (family: string | null) => void;
  setInstallWaterId: (id: string | null) => void;
  setHover: (hover: WaterHover | null) => void;
  toggleMulti: (id: string) => void;
  clearMulti: () => void;
  setSunHour: (hour: number) => void;
  setLightBoost: (boost: number) => void;
  setNorthDeg: (deg: number) => void;
  cancelTools: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toolMode: "translate",
  tool: "select",
  selection: null,
  placementFamily: null,
  installWaterId: null,
  hover: null,
  multi: [],
  sunHour: 12,
  lightBoost: 7,
  northDeg: 0,
  setToolMode: (toolMode) => set({ toolMode }),
  setTool: (tool) => set({ tool, installWaterId: null }),
  setSelection: (selection) =>
    set({ selection, multi: [], installWaterId: null, hover: null }),
  setPlacementFamily: (placementFamily) => set({ placementFamily }),
  setInstallWaterId: (installWaterId) => set({ installWaterId, hover: null }),
  setHover: (hover) => set({ hover }),
  toggleMulti: (id) =>
    set((s) => ({
      multi: s.multi.includes(id)
        ? s.multi.filter((m) => m !== id)
        : [...s.multi, id],
      selection: null,
    })),
  clearMulti: () => set({ multi: [] }),
  setSunHour: (sunHour) => set({ sunHour }),
  setLightBoost: (lightBoost) => set({ lightBoost }),
  setNorthDeg: (northDeg) => set({ northDeg }),
  cancelTools: () =>
    set({ tool: "select", toolMode: "translate", installWaterId: null, hover: null }),
}));
