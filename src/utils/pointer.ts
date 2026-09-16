/** Guarda anti-arrasto para cliques de seleção/inserção. */

let downAt: { x: number; y: number } | null = null;
let activeTarget: EventTarget | null = null;

/** Registra o pointerdown global (capture) para detectar clique vs. arrasto. */
export function installPointerGuard(target: EventTarget): void {
  if (activeTarget === target) {
    return;
  }
  if (activeTarget) {
    activeTarget.removeEventListener("pointerdown", onDown, true);
  }
  activeTarget = target;
  target.addEventListener("pointerdown", onDown, true);
}

function onDown(event: Event): void {
  const e = event as PointerEvent;
  downAt = { x: e.clientX, y: e.clientY };
}

export const DRAG_TOLERANCE_PX = 6;

/** Retorna true se o clique (mouseup) veio depois de um arrasto. */
export function isDragClick(event: { clientX: number; clientY: number }): boolean {
  if (!downAt) {
    return false;
  }
  const dx = event.clientX - downAt.x;
  const dy = event.clientY - downAt.y;
  return Math.hypot(dx, dy) > DRAG_TOLERANCE_PX;
}
