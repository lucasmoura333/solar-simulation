import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { SceneState } from "../types";
import { sanitizeScene } from "../utils/sceneSanitize";
import { createIdbPersistStorage } from "./idbPersist";

/**
 * Storage da cena (`scene.v2`). Sem migração automática de legado v1: o
 * protótipo começa limpo; arquivos v1 ainda podem ser importados à mão pelo
 * Toolbar (com migração corrigida). Ao carregar, entidades corrompidas são
 * descartadas (cura) em vez de travar a cena.
 */
export function createScenePersistStorage<S>(
  key: string,
): PersistStorage<S> {
  const base = createIdbPersistStorage<S>(key);
  return {
    ...base,
    getItem: async (name) => {
      const value = await base.getItem(name);
      if (!value || typeof value !== "object" || !("state" in value)) {
        return value;
      }
      const raw = (value as { state: unknown }).state as SceneState;
      const { scene, dropped } = sanitizeScene(raw);
      if (dropped.length > 0) {
        console.warn(
          `[cena] ${dropped.length} entidade(s) corrompida(s) descartada(s) no carregamento: ${dropped.join(", ")}`,
        );
      }
      return { ...(value as object), state: scene } as StorageValue<S>;
    },
  };
}
