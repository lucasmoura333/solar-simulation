import { findModule, moduleFixtures, mpptPresets } from "../../fixtures";
import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import type { SolarModule } from "../../types";
import { moduleDimensions, moduleEffectiveValues } from "../../utils/calculations";
import { nextEntityId } from "../../utils/id";
import { ProductionPanel } from "./ProductionPanel";

const MODES = [
  { value: "translate", label: "Mover" },
  { value: "rotate", label: "Girar" },
] as const;

export function ProjectPanel() {
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);
  const mppts = useSceneStore((s) => s.mppts);
  const upsertBlock = useSceneStore((s) => s.upsertBlock);
  const deleteBlock = useSceneStore((s) => s.deleteBlock);
  const upsertWater = useSceneStore((s) => s.upsertWater);
  const deleteWater = useSceneStore((s) => s.deleteWater);
  const upsertMppt = useSceneStore((s) => s.upsertMppt);
  const deleteMppt = useSceneStore((s) => s.deleteMppt);
  const setModuleMppt = useSceneStore((s) => s.setModuleMppt);
  const deleteModule = useSceneStore((s) => s.deleteModule);
  const selection = useUiStore((s) => s.selection);
  const setSelection = useUiStore((s) => s.setSelection);
  const placementFamily = useUiStore((s) => s.placementFamily);
  const setPlacementFamily = useUiStore((s) => s.setPlacementFamily);
  const tool = useUiStore((s) => s.tool);
  const toolMode = useUiStore((s) => s.toolMode);
  const setToolMode = useUiStore((s) => s.setToolMode);

  const addBlock = () => {
    const id = nextEntityId("bk-", blocks.map((b) => b.id));
    const w = 6;
    const d = 4;
    const wall = 2.5;
    upsertBlock({
      id,
      name: `Bloco ${id.slice(-3)}`,
      place: { x: (blocks.length + 1) * 6, z: 0 },
      orientation_deg: 0,
      width_m: w,
      depth_m: d,
      wall_height_m: wall,
      external_refs: [],
    });
    addShedWater(id, wall, w, d);
    setSelection({ kind: "block", id });
  };

  const addShedWater = (blockId: string, wall: number, w: number, d: number) => {
    const count = waters.filter((wt) => wt.block_id === blockId).length;
    const id = `${blockId}-${count + 1}`;
    upsertWater({
      id,
      block_id: blockId,
      name: `Água ${count + 1}`,
      origin_x_m: -w / 2,
      origin_y_m: wall,
      origin_z_m: d / 2,
      length_m: w,
      depth_m: d,
      tilt_deg: 15,
      yaw_deg: 0,
      external_refs: [],
    });
    setSelection({ kind: "water", id });
  };

  const addMppt = () => {
    const preset = mpptPresets[0];
    const id = nextEntityId(
      "mppt-",
      mppts.map((m) => m.id),
    );
    upsertMppt({
      id,
      preset_id: preset.id,
      name: `MPPT ${id.slice(-3)}`,
      place: { x: 0, y: 4.4, z: 0 },
      external_refs: [],
    });
  };

  const selectedBlock = blocks.find(
    (b) => selection?.kind === "block" && b.id === selection.id,
  );
  const selectedWater = waters.find(
    (w) => selection?.kind === "water" && w.id === selection.id,
  );
  const selectedModule = modules.find(
    (m) => selection?.kind === "module" && m.id === selection.id,
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4 text-xs">
      <button
        className="rounded border border-red-900 bg-red-950/60 px-2 py-1 text-red-300 hover:bg-red-900/50"
        onClick={() => {
          if (
            window.confirm(
              "Resetar o protótipo? A cena salva será apagada e o bloco padrão recriado.",
            )
          ) {
            useSceneStore.getState().resetPrototype().catch(() => {
              // botão idempotente: wipe + recriação já garantidos ou falharam juntos
            });
          }
        }}
      >
        Resetar protótipo
      </button>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Blocos — {blocks.length}</h2>
          <button
            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
            onClick={addBlock}
          >
            + Bloco
          </button>
        </div>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`flex-1 rounded border px-2 py-1 ${
                toolMode === m.value && selection?.kind === "block"
                  ? "border-sky-500 bg-sky-950 text-sky-200"
                  : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
              onClick={() => {
                if (selection?.kind === "block") {
                  setToolMode(m.value);
                } else if (blocks[0]) {
                  setSelection({ kind: "block", id: blocks[0].id });
                  setToolMode(m.value);
                }
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {blocks.map((b) => (
          <button
            key={b.id}
            className={`rounded border px-2 py-1 text-left ${
              selection?.kind === "block" && selection.id === b.id
                ? "border-sky-500 bg-sky-950 text-sky-200"
                : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
            onClick={() => setSelection({ kind: "block", id: b.id })}
          >
            {b.name}
            {waters.filter((w) => w.block_id === b.id).length > 0 &&
              ` · ${waters.filter((w) => w.block_id === b.id).length} água(s)`}
            <span
              role="button"
              className="float-right text-slate-500 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                deleteBlock(b.id);
              }}
            >
              remover
            </span>
          </button>
        ))}
        {selectedBlock && (
          <div className="flex flex-col gap-1.5 rounded border border-slate-800 p-2">
            <h3 className="font-semibold text-slate-300">{selectedBlock.name}</h3>
            {numField("Largura (m)", selectedBlock.width_m, 1, 30, (v) =>
              upsertBlock({ ...selectedBlock, width_m: v }),
            )}
            {numField("Fundo (m)", selectedBlock.depth_m, 1, 30, (v) =>
              upsertBlock({ ...selectedBlock, depth_m: v }),
            )}
            {numField("Pé-direito (m)", selectedBlock.wall_height_m, 0.5, 12, (v) =>
              upsertBlock({ ...selectedBlock, wall_height_m: v }),
            )}
            {numField("Orientação (°)", selectedBlock.orientation_deg, 0, 359, (v) =>
              upsertBlock({ ...selectedBlock, orientation_deg: v }),
            )}
            <p className="text-slate-500">
              Clique na caixa para mover/girar com o gizmo.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">
            Águas — {waters.length}
          </h2>
          {selectedBlock && (
            <button
              className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
              onClick={() =>
                addShedWater(
                  selectedBlock.id,
                  selectedBlock.wall_height_m,
                  selectedBlock.width_m,
                  selectedBlock.depth_m,
                )
              }
            >
              + Água
            </button>
          )}
        </div>
        {waters.map((w) => {
          const blockName = blocks.find((b) => b.id === w.block_id)?.name;
          return (
            <button
              key={w.id}
              className={`rounded border px-2 py-1 text-left ${
                selection?.kind === "water" && selection.id === w.id
                  ? "border-sky-500 bg-sky-950 text-sky-200"
                  : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
              onClick={() => setSelection({ kind: "water", id: w.id })}
            >
              {w.name} · {blockName ?? "?"} · {w.tilt_deg}°
              <span
                role="button"
                className="float-right text-slate-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteWater(w.id);
                }}
              >
                remover
              </span>
            </button>
          );
        })}
        {selectedWater && (
          <div className="flex flex-col gap-1.5 rounded border border-slate-800 p-2">
            <h3 className="font-semibold text-slate-300">{selectedWater.name}</h3>
            {numField("Comprimento (m)", selectedWater.length_m, 0.5, 30, (v) =>
              upsertWater({ ...selectedWater, length_m: v }),
            )}
            {numField("Subida (m)", selectedWater.depth_m, 0.1, 15, (v) =>
              upsertWater({ ...selectedWater, depth_m: v }),
            )}
            {numField("Cota do beirado (m)", selectedWater.origin_y_m, 0, 30, (v) =>
              upsertWater({ ...selectedWater, origin_y_m: v }),
            )}
            {numField("Inclinação (°)", selectedWater.tilt_deg, 0, 75, (v) =>
              upsertWater({ ...selectedWater, tilt_deg: v }),
            )}
            {numField("Yaw (°)", selectedWater.yaw_deg, 0, 359, (v) =>
              upsertWater({ ...selectedWater, yaw_deg: v }),
            )}
            <p className="text-slate-500">
              Mude a inclinação e os módulos colados acompanham a água.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <h2 className="font-semibold text-slate-200">
          Módulos (inserir) — {modules.length}
        </h2>
        <div className="flex flex-wrap gap-1">
          {moduleFixtures.map((f) => {
            const active = placementFamily === f.id;
            return (
              <button
                key={f.id}
                className={`rounded border px-2 py-1 ${
                  active
                    ? "border-yellow-500 bg-yellow-950 text-yellow-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
                onClick={() =>
                  setPlacementFamily(
                    active && tool !== "install" ? null : f.id,
                  )
                }
                title={`${f.length_m} x ${f.width_m} m`}
              >
                {f.nominal_wp}W
              </button>
            );
          })}
        </div>
        {placementFamily && (
          <p className="text-yellow-200/80">
            Clique em uma água para inserir {findModule(placementFamily)?.name}.
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {modules.map((m) => {
            const water = waters.find((w) => w.id === m.anchor.water_id);
            return (
              <li
                key={m.id}
                className={`flex items-center gap-1 rounded border px-1.5 py-1 ${
                  selection?.kind === "module" && selection.id === m.id
                    ? "border-yellow-500 bg-yellow-950 text-yellow-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelection({ kind: "module", id: m.id })}
                >
                  <span className="block truncate">
                    {findModule(m.catalog_id)?.name ?? m.catalog_id}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {water?.name ?? "sem água"} · {m.yaw_deg}°
                  </span>
                </button>
                <select
                  className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-200"
                  value={m.mppt_id ?? ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setModuleMppt(m.id, e.target.value === "" ? null : e.target.value)
                  }
                >
                  <option value="">sem MPPT</option>
                  {mppts.map((mppt) => (
                    <option key={mppt.id} value={mppt.id}>
                      {mppt.name}
                    </option>
                  ))}
                </select>
                <button
                  className="text-slate-500 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteModule(m.id);
                  }}
                >
                  remover
                </button>
              </li>
            );
          })}
        </ul>
        {selectedModule && <ModuleConfig key={selectedModule.id} module={selectedModule} />}
      </section>

      <section className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <h2 className="font-semibold text-slate-200">MPPTs — {mppts.length}</h2>
        <button
          className="rounded border border-orange-800 bg-orange-950 px-2 py-1 text-orange-200 hover:bg-orange-900"
          onClick={addMppt}
        >
          + Adicionar MPPT
        </button>
        <ul className="flex flex-col gap-1">
          {mppts.map((mppt) => (
            <li
              key={mppt.id}
              className={`flex items-center justify-between gap-1 rounded border px-2 py-1 ${
                selection?.kind === "mppt" && selection.id === mppt.id
                  ? "border-amber-500 bg-amber-950 text-amber-200"
                  : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
              onClick={() => setSelection({ kind: "mppt", id: mppt.id })}
            >
              <span>{mppt.name}</span>
              <button
                className="text-slate-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMppt(mppt.id);
                }}
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ProductionPanel />
    </aside>
  );
}

function numField(
  label: string,
  value: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <input
        type="number"
        className="w-20 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right text-slate-200"
        value={value}
        min={min}
        max={max}
        step={0.1}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) {
            onChange(v);
          }
        }}
      />
    </label>
  );
}

function ModuleConfig({ module }: { module: SolarModule }) {
  const waters = useSceneStore((s) => s.waters);
  const blocks = useSceneStore((s) => s.blocks);
  const upsertModule = useSceneStore((s) => s.upsertModule);
  const setModuleCatalog = useSceneStore((s) => s.setModuleCatalog);
  const setModuleOverrides = useSceneStore((s) => s.setModuleOverrides);
  const resetModuleOverrides = useSceneStore((s) => s.resetModuleOverrides);
  const family = moduleFixtures.find((f) => f.id === module.catalog_id);
  const spec = moduleEffectiveValues(module.catalog_id, module.overrides);
  const water = waters.find((w) => w.id === module.anchor.water_id);
  const block = blocks.find((b) => b.id === module.block_id);
  const dims = moduleDimensions(module);

  if (!family || !spec || !dims) {
    return null;
  }

  const patch = (p: Partial<SolarModule>) => upsertModule({ ...module, ...p });

  return (
    <div className="flex flex-col gap-1.5 rounded border border-slate-800 p-2">
      <h3 className="font-semibold text-slate-300">
        {module.id} · {family.name}
      </h3>
      <label className="flex items-center justify-between gap-2">
        <span>Família</span>
        <select
          className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-200"
          value={module.catalog_id}
          onChange={(e) => setModuleCatalog(module.id, e.target.value)}
        >
          {moduleFixtures.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>Água</span>
        <select
          className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-200"
          value={module.anchor.water_id}
          onChange={(e) => {
            const waterId = e.target.value;
            const target = waters.find((w) => w.id === waterId);
            if (!target || !block) {
              return;
            }
            const anchor = {
              water_id: target.id,
              u_m: Math.min(module.anchor.u_m, target.length_m),
              v_m: Math.min(module.anchor.v_m, target.depth_m),
            };
            upsertModule({ ...module, anchor, block_id: target.block_id });
          }}
        >
          {waters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      {numField("Rotação no plano (°)", module.yaw_deg, 0, 359, (v) => patch({ yaw_deg: v }))}
      <label className="flex items-center justify-between gap-2">
        <span>Inclinação</span>
        <select
          className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-200"
          value={module.pitch_override_deg === undefined ? "colado" : "livre"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            patch(
              e.target.value === "livre"
                ? { pitch_override_deg: water?.tilt_deg ?? 15 }
                : { pitch_override_deg: undefined },
            )
          }
        >
          <option value="colado">colado à água ({water?.tilt_deg}°)</option>
          <option value="livre">livre (descolado)</option>
        </select>
      </label>
      {module.pitch_override_deg !== undefined &&
        numField("Inclinação própria (°)", module.pitch_override_deg, 0, 75, (v) =>
          patch({ pitch_override_deg: v }),
        )}
      {numField("Comprimento (m)", dims.length_m, 0.3, 4, (v) =>
        patch({ size_override: { ...module.size_override, length_m: v } }),
      )}
      {numField("Largura (m)", dims.width_m, 0.3, 2.5, (v) =>
        patch({ size_override: { ...module.size_override, width_m: v } }),
      )}
      {numField("Potência (Wp)", spec.nominal_wp, 1, 2000, (v) =>
        setModuleOverrides(module.id, { nominal_wp: v }),
      )}
      {numField("Eficiência (%)", spec.efficiency_pct, 1, 40, (v) =>
        setModuleOverrides(module.id, { efficiency_pct: v }),
      )}
      {spec.custom && (
        <button
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700"
          onClick={() => resetModuleOverrides(module.id)}
        >
          restaurar valores da família
        </button>
      )}
    </div>
  );
}
