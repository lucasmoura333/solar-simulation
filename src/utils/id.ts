/** Próximo id sequencial com prefixo, ex.: nextEntityId("mod-", ["mod-001", "mod-002"]) => "mod-003". */
export function nextEntityId(prefix: string, existing: string[]): string {
  let max = 0;
  for (const id of existing) {
    const m = /^(\d+)$/.exec(id.slice(prefix.length));
    if (m) {
      max = Math.max(max, Number(m[1]));
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
