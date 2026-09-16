import type {
  IrradianceProvider,
  ShadingAnalysisResult,
  ShadingProvider,
  SolarPositionProvider,
} from "../providers";
import type { Block, SolarModule, Water } from "../../types";
import { computeShadingFactors } from "../../utils/solarShading";
import { directionFromDegrees } from "../../utils/sun";

/**
 * Sombreamento por raycast na CPU (determinístico, sem GPU).
 * Adapter da porta ShadingProvider: injeta a posição solar e a irradiância
 * recebidas na análise e delega o cálculo ao núcleo puro.
 */
export function createCpuRaycastShading(): ShadingProvider {
  return {
    name: "raycast/cpu",
    async analyze(input: {
      blocks: Block[];
      waters: Water[];
      modules: SolarModule[];
      solarPosition: SolarPositionProvider;
      irradiance: IrradianceProvider;
    }): Promise<ShadingAnalysisResult> {
      const radianceHourly = input.irradiance.hourlyW_m2();
      return computeShadingFactors({
        blocks: input.blocks,
        waters: input.waters,
        modules: input.modules,
        radianceHourly,
        directionAtHour: (hour) => {
          const pos = input.solarPosition.getPosition({
            hourFraction: hour + 0.5,
          });
          const dir = directionFromDegrees(pos.azimuthDeg, pos.elevationDeg);
          return { x: dir.x, y: dir.y, z: dir.z };
        },
      });
    },
  };
}
