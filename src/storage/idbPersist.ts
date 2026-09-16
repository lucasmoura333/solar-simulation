import type { PersistStorage, StorageValue } from "zustand/middleware";
import { idbClearAll, idbGet, idbRemove, idbSet } from "../db";

const DEBOUNCE_MS = 300;

const memory = new Map<string, StorageValue<unknown>>();
let writeQueue: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

function enqueue(write: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(write, write);
  return writeQueue;
}

function flushNow(): void {
  for (const [key, value] of memory) {
    const snapshot = value;
    memory.delete(key);
    enqueue(() => idbSet(key, JSON.stringify(snapshot)));
  }
}

function scheduleFlush(): void {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    flushNow();
  }, DEBOUNCE_MS);
}

function attachFlushListeners(): void {
  const flush = () => flushNow();
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushNow();
    }
  });
}

/**
 * Drena gravações pendentes (cancela o debounce e descarrega a memória) e
 * espera a fila serial — persistência imediata, sem janela de 300ms.
 */
export async function flushIdbWrites(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (memory.size > 0) {
    flushNow();
  }
  await writeQueue;
}

let bootResetChecked = false;

/**
 * Flag de boot `?reset=1`: apaga o banco antes da hidratação e começa do zero
 * — funciona mesmo com a cena salva corrompida ou a interface travada.
 * Consome o parâmetro uma única vez e o remove da URL.
 */
function consumeBootReset(): boolean {
  if (bootResetChecked || typeof window === "undefined") {
    return false;
  }
  bootResetChecked = true;
  let params: URLSearchParams | null = null;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return false;
  }
  if (!params || params.get("reset") !== "1") {
    return false;
  }
  try {
    params.delete("reset");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    );
  } catch {
    // segue com o wipe mesmo assim
  }
  return true;
}

/**
 * Storage do Zustand persist com gravação serial (uma transação por vez),
 * debounce de 300ms por mutação e flush em pagehide/visibilitychange.
 */
export function createIdbPersistStorage<S>(
  key: string,
): PersistStorage<S> {
  if (!listenersAttached) {
    attachFlushListeners();
    listenersAttached = true;
  }

  return {
    getItem: async () => {
      if (consumeBootReset()) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        memory.clear();
        await idbClearAll();
        return null;
      }
      if (memory.has(key)) {
        return memory.get(key) as StorageValue<S> | null;
      }
      const raw = await writeQueue.then(() => idbGet(key));
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
    },
    setItem: (_name, value) => {
      memory.set(key, value as StorageValue<unknown>);
      scheduleFlush();
      return Promise.resolve();
    },
    removeItem: () => {
      memory.delete(key);
      enqueue(() => idbRemove(key));
      return Promise.resolve();
    },
  };
}
