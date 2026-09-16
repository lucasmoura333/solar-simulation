export function WebGLFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">Solar Simulator</h1>
      <p className="max-w-md text-slate-300">
        WebGL2 não está disponível neste navegador. A cena 3D e a simulação de
        sombras (simshady) exigem WebGL2 com GPU. A cena fica desabilitada, mas o
        restante do estudo pode seguir.
      </p>
    </div>
  );
}
