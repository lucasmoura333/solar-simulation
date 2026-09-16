import { useEffect, useState } from "react";
import { getProviders } from "../../core/runtime";
import { useUiStore } from "../../stores/uiStore";
import { directionFromDegrees } from "../../utils/sun";

interface SunState {
  dir: [number, number, number];
  elevationDeg: number;
}

/**
 * Luz solar com "realce de irradiação" (uiStore.lightBoost 0–10):
 * quanto maior o realce, mais quente/intensa a luz e mais profunda a sombra
 * (ambiente reduzida) — irradiação × ausência ficam evidentes na cena.
 */
export function SunLight() {
  const sunHour = useUiStore((s) => s.sunHour);
  const lightBoost = useUiStore((s) => s.lightBoost);
  const [sun, setSun] = useState<SunState>({
    dir: [0, 0, -1],
    elevationDeg: -1,
  });

  useEffect(() => {
    const position = getProviders().solarPosition.getPosition({
      hourFraction: sunHour,
    });
    const d = directionFromDegrees(position.azimuthDeg, position.elevationDeg);
    setSun({
      dir: [d.x, d.y, d.z],
      elevationDeg: position.elevationDeg,
    });
  }, [sunHour]);

  const sunAbove = sun.elevationDeg > 0;
  const k = Math.max(0, Math.min(10, lightBoost)) / 10;

  return (
    <>
      <ambientLight intensity={sunAbove ? 0.05 + 0.3 * (1 - k) : 0.06} />
      <hemisphereLight
        args={["#3b4a63", "#1b2536", sunAbove ? 0.18 + 0.35 * (1 - k) : 0.05]}
      />
      {sunAbove && (
        <directionalLight
          castShadow
          color="#ffe3b3"
          intensity={1.1 + 1.5 * k}
          position={[
            sun.dir[0] * 60,
            sun.dir[1] * 60,
            sun.dir[2] * 60,
          ]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={140}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
      )}
    </>
  );
}
