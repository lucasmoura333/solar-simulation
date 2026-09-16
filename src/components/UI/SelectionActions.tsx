import { findModule } from "../../fixtures";
import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import { splitWaterWithIds, repartitionAnchor, coverBlockModules } from "../../utils/waterTools";

/** Ações do objeto selecionado — manuseios explícitos. */
export function SelectionActions() {
  const selection = useUiStore((s) => s.selection);
  const setTool = useUiStore((s) => s.setTool);
  const setInstallWaterId = useUiStore((s) => s.setInstallWaterId);
  const setPlacementFamily = useUiStore((s) => s.setPlacementFamily);
  const multi = useUiStore((s) => s.multi);

  const waters = useSceneStore((s) => s.waters);
  const blocks = useSceneStore((s) => s.blocks);
  const modules = useSceneStore((s) => s.modules);
  const deleteWater = useSceneStore((s) => s.deleteWater);
  const deleteBlock = useSceneStore((s) => s.deleteBlock);
  const deleteModules = useSceneStore((s) => s.deleteModules);
  const deleteModule = useSceneStore((s) => s.deleteModule);
  const duplicateModule = useSceneStore((s) => s.duplicateModule);
  const upsertModule = useSceneStore((s) => s.upsertModule);
  const replaceWaterWithSplit = useSceneStore((s) => s.replaceWaterWithSplit);

  if (multi.length > 0) {
    return (
      <ActionBar>
        <span className="text-slate-300">{multi.length} placas selecionadas</span>
        <button onClick={() => deleteModules(multi)} className={btn}>
          Remover
        </button>
        <button onClick={() => useUiStore.getState().clearMulti()} className={btn}>
          Limpar
        </button>
      </ActionBar>
    );
  }

  if (!selection) {
    return null;
  }

  if (selection.kind === "water") {
    const water = waters.find((w) => w.id === selection.id);
    const block = blocks.find((b) => b.id === water?.block_id);
    if (!water || !block) {
      return null;
    }
    const installHere = () => {
      setTool("install");
      setInstallWaterId(water.id);
      if (!useUiStore.getState().placementFamily) {
        setPlacementFamily("pv-mod-550g");
      }
    };
    const split = (axis: "length" | "rise") => {
      const { first, second } = splitWaterWithIds(water, axis);
      replaceWaterWithSplit(water.id, first, second, (module) =>
        repartitionAnchor(module, water, axis, first.id, second.id),
      );
    };
    // "Cobrir todo o telhado": fileiras automáticas em TODAS as águas do
    // bloco (substitui os módulos atuais; não mexe na geometria das águas).
    const cover = () => {
      const family = useUiStore.getState().placementFamily ?? "pv-mod-550g";
      const def = findModule(family);
      const dims = def
        ? { length_m: def.length_m, width_m: def.width_m }
        : { length_m: 2.28, width_m: 1.13 };
      const blockWaters = waters.filter((w) => w.block_id === block.id);
      const ids = new Set(blockWaters.map((w) => w.id));
      deleteModules(modules.filter((m) => ids.has(m.anchor.water_id)).map((m) => m.id));
      const fresh = coverBlockModules(
        blockWaters,
        family,
        dims,
        useSceneStore.getState().modules.map((m) => m.id),
      );
      for (const mod of fresh) {
        upsertModule(mod);
      }
    };
    return (
      <ActionBar>
        <button onClick={installHere} className={`${btn} ${btnPrimary}`}>
          Instalar nessa água
        </button>
        {water.can_split !== false && (
          <button onClick={() => split("length")} className={btn}>
            Dividir ao meio
          </button>
        )}
        <button onClick={cover} className={btn}>
          Cobrir todo o telhado
        </button>
        <button onClick={() => deleteWater(water.id)} className={btnDanger}>
          Remover
        </button>
      </ActionBar>
    );
  }

  if (selection.kind === "block") {
    const block = blocks.find((b) => b.id === selection.id);
    if (!block) {
      return null;
    }
    return (
      <ActionBar>
        <span className="text-slate-300">{block.name}</span>
        <button onClick={() => deleteBlock(block.id)} className={btnDanger}>
          Remover bloco
        </button>
      </ActionBar>
    );
  }

  if (selection.kind === "module") {
    const module = modules.find((m) => m.id === selection.id);
    if (!module) {
      return null;
    }
    return (
      <ActionBar>
        <button onClick={() => duplicateModule(module.id)} className={btn}>
          Copiar placa
        </button>
        <button onClick={() => deleteModule(module.id)} className={btnDanger}>
          Remover
        </button>
      </ActionBar>
    );
  }

  return null;
}

const btn =
  "rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700";
const btnPrimary =
  "border-yellow-600 bg-yellow-900/60 text-yellow-100 hover:bg-yellow-800/60";
const btnDanger = "text-red-300 hover:bg-red-950/60";

function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-1.5 shadow-lg backdrop-blur">
      {children}
    </div>
  );
}
