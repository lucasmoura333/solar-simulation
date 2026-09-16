const DB_NAME = "solar-sim";
export const DB_VERSION = 1;
export const KV_STORE = "kv";
export const ASSET_STORE = "assets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: "hash" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function idbGet(key: string): Promise<string | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, "readonly");
    const req = tx.objectStore(KV_STORE).get(key);
    req.onsuccess = () => {
      const row = req.result as { key: string; value: string } | undefined;
      resolve(row?.value);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(KV_STORE, "readwrite");
  tx.objectStore(KV_STORE).put({ key, value });
  return txDone(tx);
}

export async function idbRemove(key: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(KV_STORE, "readwrite");
  tx.objectStore(KV_STORE).delete(key);
  return txDone(tx);
}

/**
 * Apaga o banco inteiro (todas as chaves e stores) — "zerar tudo" à prova de
 * chaves legadas e de escritas pendentes em outra conexão. Primeiro limpa a
 * store kv na conexão aberta (vale mesmo com outra aba segurando o lock),
 * depois remove o banco.
 */
export async function idbClearAll(): Promise<void> {
  const db = await getDb();
  try {
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).clear();
    await txDone(tx);
  } catch {
    // segue para o delete do banco
  }
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = done;
      req.onerror = done;
      req.onblocked = done;
    } catch {
      done();
    }
  });
}

/** Reservado para assets futuros (texturas/GLB): chave = hash do asset. */
export async function idbPutAsset(
  hash: string,
  blob: Blob,
  metadata: { mimetype: string; size: number },
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(ASSET_STORE, "readwrite");
  tx.objectStore(ASSET_STORE).put({ hash, blob, metadata });
  return txDone(tx);
}

export async function idbGetAsset(hash: string): Promise<Blob | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE, "readonly");
    const req = tx.objectStore(ASSET_STORE).get(hash);
    req.onsuccess = () => {
      const row = req.result as { blob?: Blob } | undefined;
      resolve(row?.blob);
    };
    req.onerror = () => reject(req.error);
  });
}
