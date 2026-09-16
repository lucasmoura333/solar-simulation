import { useMemo } from "react";
import { getProviders } from "../core/runtime";
import { useSceneStore } from "../stores/sceneStore";
import { useShadingStore } from "../stores/shadingStore";
import { computeProduction } from "../utils/production";
import type { ProductionTotals } from "../utils/production";

/** Produção derivada da cena + análise de sombra (efêmera, regenerável). */
export function useProductionTotals(): ProductionTotals {
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);
  const mppts = useSceneStore((s) => s.mppts);
  const shading = useShadingStore((s) => s.result);

  return useMemo(() => {
    const empty: ProductionTotals = {
      perModule: [],
      hourlyKwh: new Array(24).fill(0),
      hourlyPotentialKwh: new Array(24).fill(0),
      dailyKWh: 0,
      annualKWh: 0,
      byMppt: [],
    };
    if (blocks.length === 0) {
      return empty;
    }
    return computeProduction(
      { blocks, waters, modules, mppts, shading },
      { solarPosition: getProviders().solarPosition },
    );
  }, [blocks, waters, modules, mppts, shading]);
}
