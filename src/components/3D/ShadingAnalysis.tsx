import { useEffect } from "react";
import { getProviders } from "../../core/runtime";
import { useSceneStore } from "../../stores/sceneStore";
import { useShadingStore } from "../../stores/shadingStore";

const DEBOUNCE_MS = 300;

let running = false;
let rerunRequested = false;

async function runOnce() {
  if (running) {
    rerunRequested = true;
    return;
  }
  running = true;
  const store = useShadingStore.getState();
  const scene = useSceneStore.getState();
  const blocks = scene.blocks;
  const waters = scene.waters;
  const modules = scene.modules;
  try {
    if (blocks.length === 0) {
      return;
    }
    store.setRunning();
    const providers = getProviders();
    const result = await providers.shading.analyze({
      blocks,
      waters,
      modules,
      solarPosition: providers.solarPosition,
      irradiance: providers.irradiance,
    });
    if (!rerunRequested) {
      store.setReady(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!rerunRequested) {
      store.setError(message);
    }
  } finally {
    running = false;
    if (rerunRequested) {
      rerunRequested = false;
      void runOnce();
    }
  }
}

/** Sombra por provedor (default: raycast CPU) quando a cena muda. */
export function ShadingAnalysis() {
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);

  useEffect(() => {
    if (blocks.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      void runOnce();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [blocks, waters, modules]);

  return null;
}
