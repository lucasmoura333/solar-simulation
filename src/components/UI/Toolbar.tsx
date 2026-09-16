import { useRef } from "react";
import { buildExportDocument, docToScene, isExportDocument } from "../../export/serializer";
import { useSceneStore } from "../../stores/sceneStore";

export function Toolbar() {
  const scene = useSceneStore();
  const importScene = useSceneStore((s) => s.importScene);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const doc = await buildExportDocument(
      scene,
      "scn-001",
      "cenario-local",
    );
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solar-sim-export-v${doc.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      window.alert("Arquivo inválido: JSON malformado.");
      return;
    }
    if (!isExportDocument(parsed)) {
      window.alert(
        `Arquivo não é um export solar-sim v${parsed ? (parsed as { version?: unknown }).version : "?"} válido.`,
      );
      return;
    }
    const count = parsed.modules.length;
    importScene(docToScene(parsed));
    window.alert(`Cenário "${parsed.scenario.name}" importado (${count} módulos).`);
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <button
        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
        onClick={handleExport}
      >
        Exportar JSON
      </button>
      <button
        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
        onClick={() => fileRef.current?.click()}
      >
        Importar
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportFile(file);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
