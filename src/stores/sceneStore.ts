import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findRoofTemplate } from "../fixtures";
import { createScenePersistStorage } from "../storage/scenePersist";
import { flushIdbWrites } from "../storage/idbPersist";
import { sanitizeScene } from "../utils/sceneSanitize";
import { idbClearAll } from "../db";
import type {
  Block,
  Building,
  ModuleOverrides,
  Mppt,
  SceneState,
  SolarModule,
  Water,
} from "../types";

interface SceneActions {
  importScene: (scene: SceneState) => void;
  resetScene: () => void;
  /** Apaga o banco salvo e recria o padrão (protótipo). À prova de corrida. */
  resetPrototype: () => Promise<void>;
  seedDefault: () => void;
  upsertBuilding: (building: Building) => void;
  upsertBlock: (block: Block) => void;
  deleteBlock: (id: string) => void;
  upsertWater: (water: Water) => void;
  deleteWater: (id: string) => void;
  upsertMppt: (mppt: Mppt) => void;
  deleteMppt: (id: string) => void;
  upsertModule: (module: SolarModule) => void;
  deleteModule: (id: string) => void;
  deleteModules: (ids: string[]) => void;
  duplicateModule: (id: string) => void;
  setModuleMppt: (moduleId: string, mpptId: string | null) => void;
  setModuleCatalog: (moduleId: string, catalogId: string) => void;
  setModuleOverrides: (moduleId: string, patch: ModuleOverrides) => void;
  resetModuleOverrides: (moduleId: string) => void;
  /** Substitui a água e reparte os módulos (divisão). */
  replaceWaterWithSplit: (
    originalId: string,
    first: Water,
    second: Water,
    reanchor: (module: SolarModule) => SolarModule,
  ) => void;
}

export const emptyScene: SceneState = {
  building: null,
  blocks: [],
  waters: [],
  mppts: [],
  modules: [],
};

export const useSceneStore = create<SceneState & SceneActions>()(
  persist(
    (set, get) => ({
      ...emptyScene,
      importScene: (scene) => {
        const { scene: clean, dropped } = sanitizeScene(scene);
        if (dropped.length > 0) {
          console.warn(
            `[cena] ${dropped.length} entidade(s) corrompida(s) descartada(s) na importação: ${dropped.join(", ")}`,
          );
        }
        set({ ...clean });
      },
      resetScene: () => set({ ...emptyScene }),
      resetPrototype: async () => {
        // Serializado: wipe primeiro, só depois estado novo — nada antigo
        // (debounce de 300ms, outra aba) consegue ressuscitar a cena.
        await idbClearAll();
        get().resetScene();
        get().seedDefault();
        await flushIdbWrites();
      },
      seedDefault: () => {
        if (get().blocks.length > 0) {
          return;
        }
        const template = findRoofTemplate("roof-gable-01");
        if (!template) {
          return;
        }
        const d = template.defaults;
        const w = d.width_m;
        const halfW = w / 2;
        const halfD = d.depth_m / 2;
        const building: Building = {
          id: "bld-001",
          name: "edificacao generica",
          external_refs: [],
        };
        const block: Block = {
          id: "bk-001",
          name: "Bloco principal",
          place: { x: 0, z: 0 },
          orientation_deg: d.orientation_deg,
          width_m: d.width_m,
          depth_m: d.depth_m,
          wall_height_m: d.height_m,
          external_refs: [],
        };
        const water = (
          id: string,
          name: string,
          origin_x_m: number,
          origin_z_m: number,
          depth_m: number,
          yaw_deg: number,
        ): Water => ({
          id,
          block_id: block.id,
          name,
          origin_x_m,
          origin_y_m: d.height_m,
          origin_z_m,
          length_m: w,
          depth_m,
          tilt_deg: d.tilt_deg,
          yaw_deg,
          external_refs: [],
        });
        const waters: Water[] = [
          water("bk-001-1", "Água frente", -halfW, halfD, halfD, 0),
          water("bk-001-2", "Água fundo", halfW, -halfD, halfD, 180),
        ];
        set({ building, blocks: [block], waters });
      },
      upsertBuilding: (building) => set({ building }),
      upsertBlock: (block) => {
        const blocks = get().blocks;
        const exists = blocks.some((b) => b.id === block.id);
        set({
          blocks: exists
            ? blocks.map((b) => (b.id === block.id ? block : b))
            : [...blocks, block],
        });
      },
      deleteBlock: (id) => {
        const waterIds = get()
          .waters.filter((wt) => wt.block_id === id)
          .map((wt) => wt.id);
        set({
          blocks: get().blocks.filter((b) => b.id !== id),
          waters: get().waters.filter((wt) => wt.block_id !== id),
          modules: get().modules.filter(
            (m) => m.block_id !== id && !waterIds.includes(m.anchor.water_id),
          ),
        });
      },
      upsertWater: (water) => {
        const waters = get().waters;
        const exists = waters.some((wt) => wt.id === water.id);
        set({
          waters: exists
            ? waters.map((wt) => (wt.id === water.id ? water : wt))
            : [...waters, water],
        });
      },
      deleteWater: (id) =>
        set({
          waters: get().waters.filter((wt) => wt.id !== id),
          modules: get().modules.filter((m) => m.anchor.water_id !== id),
        }),
      replaceWaterWithSplit: (originalId, first, second, reanchor) =>
        set({
          waters: get()
            .waters.filter((wt) => wt.id !== originalId)
            .concat([first, second]),
          modules: get().modules.map((m) =>
            m.anchor.water_id === originalId ? reanchor(m) : m,
          ),
        }),
      upsertMppt: (mppt) => {
        const mppts = get().mppts;
        const exists = mppts.some((m) => m.id === mppt.id);
        set({
          mppts: exists
            ? mppts.map((m) => (m.id === mppt.id ? mppt : m))
            : [...mppts, mppt],
        });
      },
      deleteMppt: (id) => {
        const mppts = get().mppts.filter((m) => m.id !== id);
        const modules = get().modules.map((m) =>
          m.mppt_id === id ? { ...m, mppt_id: null } : m,
        );
        set({ mppts, modules });
      },
      upsertModule: (module) => {
        const modules = get().modules;
        const exists = modules.some((m) => m.id === module.id);
        set({
          modules: exists
            ? modules.map((m) => (m.id === module.id ? module : m))
            : [...modules, module],
        });
      },
      deleteModule: (id) =>
        set({ modules: get().modules.filter((m) => m.id !== id) }),
      deleteModules: (ids) => {
        const del = new Set(ids);
        set({ modules: get().modules.filter((m) => !del.has(m.id)) });
      },
      duplicateModule: (id) => {
        const source = get().modules.find((m) => m.id === id);
        if (!source) {
          return;
        }
        const modules = get().modules;
        let n = 1;
        let candidate = `${id}-c${n}`;
        const taken = new Set(modules.map((m) => m.id));
        while (taken.has(candidate)) {
          n += 1;
          candidate = `${id}-c${n}`;
        }
        const copy: SolarModule = {
          ...source,
          id: candidate,
          anchor: {
            ...source.anchor,
            u_m: Math.min(source.anchor.u_m + 2.5, 999),
          },
        };
        set({ modules: [...modules, copy] });
      },
      setModuleMppt: (moduleId, mpptId) =>
        set({
          modules: get().modules.map((m) =>
            m.id === moduleId ? { ...m, mppt_id: mpptId } : m,
          ),
        }),
      setModuleCatalog: (moduleId, catalogId) =>
        set({
          modules: get().modules.map((m) =>
            m.id === moduleId
              ? { ...m, catalog_id: catalogId, overrides: undefined }
              : m,
          ),
        }),
      setModuleOverrides: (moduleId, patch) =>
        set({
          modules: get().modules.map((m) =>
            m.id === moduleId
              ? { ...m, overrides: { ...m.overrides, ...patch } }
              : m,
          ),
        }),
      resetModuleOverrides: (moduleId) =>
        set({
          modules: get().modules.map((m) =>
            m.id === moduleId ? { ...m, overrides: undefined } : m,
          ),
        }),
    }),
    {
      name: "scene.v2",
      partialize: (state) => ({
        building: state.building,
        blocks: state.blocks,
        waters: state.waters,
        mppts: state.mppts,
        modules: state.modules,
      }),
      storage: createScenePersistStorage<SceneState>("scene.v2"),
    },
  ),
);
