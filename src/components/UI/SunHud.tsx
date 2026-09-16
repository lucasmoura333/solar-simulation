import { useMemo } from "react";
import { getProviders } from "../../core/runtime";
import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import { waterSolarMetrics } from "../../utils/solarMetrics";

const CARDS = ["N", "E", "S", "W"];

export function SunHud() {
  const sunHour = useUiStore((s) => s.sunHour);
  const lightBoost = useUiStore((s) => s.lightBoost);
  const setLightBoost = useUiStore((s) => s.setLightBoost);
  const northDeg = useUiStore((s) => s.northDeg);
  const selection = useUiStore((s) => s.selection);
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);

  const providers = useMemo(() => getProviders(), []);

  const selectedWater = selection?.kind === "water"
    ? waters.find((w) => w.id === selection.id)
    : undefined;
  const selectedBlock = selectedWater
    ? blocks.find((b) => b.id === selectedWater.block_id)
    : undefined;

  const metrics = useMemo(() => {
    if (!selectedWater || !selectedBlock) {
      const pos = providers.solarPosition.getPosition({ hourFraction: sunHour });
      return {
        ghiWm2: providers.irradiance.hourlyW_m2()[Math.floor(sunHour)] ?? 0,
        cosIncidence: null,
        incidentWm2: null,
        azimuthDeg: pos.azimuthDeg,
        elevationDeg: pos.elevationDeg,
      };
    }
    return waterSolarMetrics({
      block: selectedBlock,
      water: selectedWater,
      solarPosition: providers.solarPosition,
      irradiance: providers.irradiance,
      hour: sunHour,
    });
  }, [selectedWater, selectedBlock, providers, sunHour]);

  const sunPos = useMemo(
    () => providers.solarPosition.getPosition({ hourFraction: sunHour }),
    [providers, sunHour],
  );

  const orientBlock = blocks[0];

  return (
    <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-2">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/90 p-3 shadow-lg backdrop-blur">
        <Compass
          northDeg={northDeg}
          buildingAzimuth={
            orientBlock ? ((orientBlock.orientation_deg + 180) % 360) : null
          }
          sunAzimuth={sunPos.azimuthDeg}
        />

        <div className="flex flex-col gap-1 text-[11px] text-slate-300">
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">sol</span>
            <span>
              elev {sunPos.elevationDeg.toFixed(0)}° · az{" "}
              {sunPos.azimuthDeg.toFixed(0)}°
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">GHI (mock)</span>
            <span className="font-mono text-sky-300">
              {metrics.ghiWm2.toFixed(0)} W/m²
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">
              {selectedWater ? `plano ${selectedWater.name}` : "plano"}
            </span>
            <span className="font-mono text-amber-300">
              {metrics.incidentWm2 !== null
                ? `${metrics.incidentWm2.toFixed(0)} W/m²`
                : "selecione uma água"}
            </span>
          </div>
          {metrics.cosIncidence !== null && (
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-400">incidência</span>
              <span className="font-mono">
                {metrics.cosIncidence.toFixed(2)}
              </span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between gap-4 border-t border-slate-800 pt-1">
            <span className="text-slate-400">realce</span>
            <input
              type="range"
              className="w-28 accent-amber-400"
              min={0}
              max={10}
              step={1}
              value={lightBoost}
              onChange={(e) => setLightBoost(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Compass({
  northDeg,
  buildingAzimuth,
  sunAzimuth,
}: {
  northDeg: number;
  buildingAzimuth: number | null;
  sunAzimuth: number | null;
}) {
  return (
    <div className="relative h-28 w-28 select-none">
      <div
        className="absolute inset-0 rounded-full border border-slate-600"
        style={{ transform: `rotate(${northDeg}deg)` }}
      >
        {CARDS.map((card, i) => {
          const angle = i * 90;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 40 * Math.sin(rad);
          const y = 50 - 40 * Math.cos(rad);
          return (
            <span
              key={card}
              className="absolute text-[10px] font-bold text-slate-400"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {card}
            </span>
          );
        })}
        {ringDot(buildingAzimuth, "bg-sky-400", "prédio")}
        {ringDot(sunAzimuth, "bg-yellow-400", "sol")}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] text-slate-600">
          N {northDeg.toFixed(0)}°
        </span>
      </div>
    </div>
  );
}

function ringDot(azimuth: number | null, color: string, label: string) {
  if (azimuth === null) {
    return null;
  }
  const rad = (azimuth * Math.PI) / 180;
  const x = 50 + 34 * Math.sin(rad);
  const y = 50 - 34 * Math.cos(rad);
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      title={label}
    >
      <div className={`h-2 w-2 rounded-full ${color}`} />
    </div>
  );
}
