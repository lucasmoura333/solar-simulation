import { useEffect, useState } from "react";
import { Scene } from "./components/3D/Scene";
import { ProjectPanel } from "./components/UI/ProjectPanel";
import { SelectionActions } from "./components/UI/SelectionActions";
import { SunHud } from "./components/UI/SunHud";
import { SunSlider } from "./components/UI/SunSlider";
import { Toolbar } from "./components/UI/Toolbar";
import { Toolbox } from "./components/UI/Toolbox";
import { WebGLFallback } from "./components/UI/WebGLFallback";
import type { WebGLStatus } from "./types";
import { detectWebGL2 } from "./utils/webgl";

export default function App() {
  const [webgl, setWebgl] = useState<WebGLStatus>("checking");

  useEffect(() => {
    setWebgl(detectWebGL2());
  }, []);

  if (webgl === "checking") {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-2">
        <h1 className="text-sm font-semibold tracking-wide text-slate-200">
          Solar Simulator
        </h1>
        <span className="hidden text-xs text-slate-500 md:inline">
          estudo · valores mockados
        </span>
        <Toolbar />
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          {webgl === "webgl2" ? <Scene /> : <WebGLFallback />}
          {webgl === "webgl2" && (
            <>
              <SunHud />
              <Toolbox />
              <SelectionActions />
              <SunSlider />
            </>
          )}
        </main>
        {webgl === "webgl2" && <ProjectPanel />}
      </div>
    </div>
  );
}
