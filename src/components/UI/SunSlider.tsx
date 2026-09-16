import { useEffect, useState } from "react";
import { getProviders } from "../../core/runtime";
import { useShadingStore } from "../../stores/shadingStore";
import { useUiStore } from "../../stores/uiStore";

export function SunSlider() {
  const sunHour = useUiStore((s) => s.sunHour);
  const setSunHour = useUiStore((s) => s.setSunHour);
  const shadingStatus = useShadingStore((s) => s.status);
  const [label, setLabel] = useState("12:00");
  const [sunMeta, setSunMeta] = useState("");

  useEffect(() => {
    const hour = Math.floor(sunHour);
    const minutes = Math.round((sunHour - hour) * 60);
    setLabel(
      `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    );
    const p = getProviders().solarPosition.getPosition({
      hourFraction: sunHour,
    });
    setSunMeta(
      `elev ${p.elevationDeg.toFixed(0)}° · az ${p.azimuthDeg.toFixed(0)}°`,
    );
  }, [sunHour]);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs text-slate-300 shadow-lg">
        <span className="w-16 font-mono font-semibold text-sky-300">
          {label}
        </span>
        <input
          type="range"
          className="w-64 accent-sky-500"
          min={0}
          max={24}
          step={0.1}
          value={sunHour}
          onChange={(e) => setSunHour(Number(e.target.value))}
        />
        <span className="w-24 text-slate-400">{sunMeta}</span>
        <span className="text-slate-500">
          {shadingStatus === "running"
            ? "calculando sombras…"
            : shadingStatus === "error"
              ? "erro na análise"
              : "sombras simshady"}
        </span>
      </div>
    </div>
  );
}
