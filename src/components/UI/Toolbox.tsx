import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";

const FALLBACK_FAMILY = "pv-mod-550g";

/** Barra de ferramentas vertical (método separado de controles). */
export function Toolbox() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const toolMode = useUiStore((s) => s.toolMode);
  const setToolMode = useUiStore((s) => s.setToolMode);
  const selection = useUiStore((s) => s.selection);
  const placementFamily = useUiStore((s) => s.placementFamily);
  const setPlacementFamily = useUiStore((s) => s.setPlacementFamily);
  const multi = useUiStore((s) => s.multi);
  const modules = useSceneStore((s) => s.modules);

  const selectActive = tool === "select";
  const installActive = tool === "install";

  return (
    <div className="pointer-events-auto absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur">
      <ToolButton
        label="Selecionar"
        hint="clique seleciona · vazio desmarca"
        active={selectActive && toolMode === "translate"}
        onClick={() => {
          setTool("select");
          setToolMode("translate");
        }}
      >
        ⬚
      </ToolButton>
      <ToolButton
        label="Girar / inclinar"
        hint="água: inclina e gira · placa: pitch próprio"
        active={selectActive && toolMode === "rotate"}
        disabled={selection?.kind === "mppt"}
        onClick={() => {
          setTool("select");
          setToolMode("rotate");
        }}
      >
        ↻
      </ToolButton>
      <ToolButton
        label="Instalar módulos"
        hint={
          installActive
            ? "clique na água (ou só na água-alvo) para inserir"
            : "ativa inserção na água"
        }
        active={installActive}
        onClick={() => {
          setTool(installActive ? "select" : "install");
          if (!installActive && !placementFamily) {
            setPlacementFamily(FALLBACK_FAMILY);
          }
        }}
      >
        +
      </ToolButton>
      {(multi.length > 0 || selection) && (
        <ToolButton
          label="Limpar seleção"
          hint={`${multi.length > 0 ? `${multi.length} placas · ` : ""}ESC limpa`}
          onClick={() => {
            useUiStore.getState().clearMulti();
            useUiStore.getState().setSelection(null);
          }}
        >
          ✕
        </ToolButton>
      )}
      <div className="mt-1 border-t border-slate-700 pt-1 text-center text-[10px] text-slate-500">
        {multi.length > 0
          ? `${multi.length} placa(s)`
          : selection?.kind === "water"
            ? "água"
            : selection?.kind === "block"
              ? "bloco"
              : selection?.kind === "module"
                ? "placa"
                : modules.length > 0
                  ? `${modules.length} placa(s)`
                  : ""}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={`${label}${hint ? ` — ${hint}` : ""}`}
      disabled={disabled}
      className={`rounded px-2 py-1.5 text-sm leading-none ${
        active
          ? "bg-sky-600 text-white"
          : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
      } ${disabled ? "opacity-40" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
