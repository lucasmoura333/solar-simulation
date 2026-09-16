import { create } from "zustand";
import type { ShadingAnalysisResult } from "../services/shadingRunner";

export type ShadingStatus = "idle" | "running" | "ready" | "error";

interface ShadingState {
  status: ShadingStatus;
  error: string | null;
  result: ShadingAnalysisResult | null;
  setRunning: () => void;
  setReady: (result: ShadingAnalysisResult) => void;
  setError: (message: string) => void;
  clear: () => void;
}

export const useShadingStore = create<ShadingState>((set) => ({
  status: "idle",
  error: null,
  result: null,
  setRunning: () => set({ status: "running", error: null }),
  setReady: (result) => set({ status: "ready", error: null, result }),
  setError: (error) => set({ status: "error", error }),
  clear: () =>
    set({ status: "idle", error: null, result: null }),
}));
