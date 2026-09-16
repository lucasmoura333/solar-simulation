import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProductionTotals } from "../../hooks/useProductionTotals";
import { useSceneStore } from "../../stores/sceneStore";
import { useShadingStore } from "../../stores/shadingStore";
import { useUiStore } from "../../stores/uiStore";
import { formatEnergy } from "../../utils/calculations";
import { formatWp, installedRatings } from "../../utils/ratings";

export function ProductionPanel() {
  const totals = useProductionTotals();
  const modules = useSceneStore((s) => s.modules);
  const mppts = useSceneStore((s) => s.mppts);
  const sunHour = useUiStore((s) => s.sunHour);
  const shadingStatus = useShadingStore((s) => s.status);

  const hour = Math.min(23, Math.max(0, Math.floor(sunHour)));

  const ratings = useMemo(
    () => installedRatings(modules, mppts),
    [modules, mppts],
  );

  const data = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => ({
        hora: `${String(h).padStart(2, "0")}h`,
        potencial: Number(totals.hourlyPotentialKwh[h].toFixed(3)),
        produzido: Number(totals.hourlyKwh[h].toFixed(3)),
      })),
    [totals],
  );

  const instant = totals.hourlyKwh[hour];
  const accumulated = totals.hourlyKwh.slice(0, hour + 1).reduce((s, v) => s + v, 0);
  const totalPotential = totals.hourlyPotentialKwh.reduce((s, v) => s + v, 0);
  const lossPct =
    totalPotential > 0
      ? ((totalPotential - totals.dailyKWh) / totalPotential) * 100
      : 0;

  return (
    <section className="flex flex-col gap-2 border-t border-slate-800 pt-3">
      <h2 className="font-semibold text-slate-200">
        Produção (energia, kWh)
        {shadingStatus === "running" && (
          <span className="font-normal text-slate-500"> · calculando sombras…</span>
        )}
      </h2>

      {totals.perModule.length === 0 ? (
        <p className="text-slate-500">
          Insira módulos e conecte MPPTs para ver a produção.
        </p>
      ) : (
        <>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  interval={2}
                  stroke="#334155"
                />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(3)} kWh`,
                    String(name),
                  ]}
                />
                <ReferenceLine
                  x={`${String(hour).padStart(2, "0")}h`}
                  stroke="#facc15"
                  strokeDasharray="4 3"
                />
                <Line
                  type="monotone"
                  dataKey="potencial"
                  stroke="#475569"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="potencial"
                />
                <Line
                  type="monotone"
                  dataKey="produzido"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="com sombra"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
              <p className="text-slate-400">hoje</p>
              <p className="text-sm font-semibold text-sky-300">
                {formatEnergy(totals.dailyKWh)}
              </p>
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
              <p className="text-slate-400">ano (mock)</p>
              <p className="text-sm font-semibold text-sky-300">
                {formatEnergy(totals.annualKWh)}
              </p>
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
              <p className="text-slate-400">agora ({hour}h)</p>
              <p className="text-sm font-semibold text-slate-200">
                {instant.toFixed(2)} kWh/h
              </p>
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5">
              <p className="text-slate-400">acumulado até {hour}h</p>
              <p className="text-sm font-semibold text-slate-200">
                {formatEnergy(accumulated)}
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-1">
            {totals.byMppt.map((row) => (
              <li
                key={row.mpptId ?? "sem-mppt"}
                className="flex items-center justify-between gap-1 rounded border border-slate-700/60 bg-slate-800/40 px-2 py-1 text-slate-300"
              >
                <span className="truncate">
                  {row.name} · {row.moduleCount} mód.
                </span>
                <span className="shrink-0 text-slate-200">
                  {formatEnergy(row.dailyKWh)}/dia
                </span>
              </li>
            ))}
          </ul>
          {lossPct > 0.5 && (
            <p className="text-xs text-amber-300/90">
              perda estimada por sombra: {lossPct.toFixed(1)}% do potencial
            </p>
          )}
        </>
      )}

      {modules.length > 0 && (
        <div className="rounded border border-slate-700/70 bg-slate-800/40 px-2 py-1.5">
          <p className="text-slate-400">
            potência instalada (técnico)
          </p>
          <p className="text-sm font-semibold text-emerald-300">
            {formatWp(ratings.totalWp)} · {ratings.moduleCount} módulo(s)
          </p>
          {ratings.byMppt.map((row) => (
            <p key={row.mpptId ?? "sem"} className="text-slate-400">
              {row.name}: {formatWp(row.wp)} ({row.moduleCount})
            </p>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600">
        mock · dia limpo repetido 365×; energia é derivado (nunca persistido);
        potência (kWp) é fato de equipamento.
      </p>
    </section>
  );
}
