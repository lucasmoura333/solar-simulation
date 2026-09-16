# Montar fundação de estado e persistência local

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueia:** [Catalogar fixtures mockadas das 4 famílias](exec-02-catalogo-fixtures.md)

## Question

Criar a fundação de estado e persistência que as fases vão consumir, conforme o contrato [Escolher contrato de persistência local](../../solar-simulator-map.md) (stub em `wayfinder/prototypes/solar-07-persistencia-stub.md`): stores Zustand (`scene` com building/roofs/modules/mppts e `settings`), banco IndexedDB `solar-sim` v1 com stores `kv` e `assets` (reservado, vazio) e migrações por DB version, persist seletiva (`partialize`: só scene/settings), auto-save com debounce ~300ms + flush em `pagehide`/`visibilitychange: hidden` + fila serial de escritas. Incluir re-hidratação validando contra schema TS e export/import mínimos do envelope `solar-sim/export` v1 (conforme exemplo em `wayfinder/prototypes/solar-06-export-exemplo.json`). Prova de reload com um valor de `settings` editável na UI (ex.: unidade). Gate: `npm run build` ok + cena aberta no navegador + reload preserva o valor + nada de segredos no repo.

## Resolução (2026-09-07)

Executado com aval do dono. Gate visual confirmado no navegador (unidade MWh preservada após reload; Exportar/Importar funcionando). Fatos:

- `src/db.ts`: IndexedDB `solar-sim` v1 com `kv` (keyPath key) e `assets` (keyPath hash, reservado vazio; `idbPutAsset`/`idbGetAsset` prontos).
- `src/storage/idbPersist.ts`: adapter `createIdbPersistStorage` — memória + debounce 300ms, fila serial de escritas, flush em `pagehide`/`visibilitychange: hidden` (stub seguido).
- Stores persistidas com `partialize`: `scene.v1` (`building/roofs/mppts/modules`) e `settings.v1` (`unit`) em `src/stores/`.
- `src/export/serializer.ts`: envelope `solar-sim/export` v1 com sha256 do snapshot (`crypto.subtle`), `idempotency_key` estável por cenário, `catalog_refs` derivados das fixtures referenciadas; guardas `isExportDocument` + `docToScene`.
- UI `Toolbar` no header: toggle kWh/MWh, Exportar JSON (download) e Importar (valida + hidrata).
- Testes: 4/4 passando (`serializer.test.ts`) — envelope válido, idempotency_key estável, hash muda com a cena, rejeição de documento inválido. `npm run build` ok. Commit `8868fa0`.
- Observação do dono validada: import "0 módulos" era esperado (cena ainda vazia; módulos só existem a partir da Fase 2). Decisão: manter Zustand + persist conforme contrato original.

## Resolução (2026-09-07)

Executado, commit `8868fa0`. Gate confirmado pelo dono no navegador (toggle unidade MWh, reload preserva, export baixa `solar-sim-export-v1.json`, import hidrata). Fatos:

- `src/db.ts`: IndexedDB `solar-sim` v1 com upgrade event; stores `kv` (chave) e `assets` (hash, reservado — `idbPutAsset`/`idbGetAsset` prontos, sem uso).
- `src/storage/idbPersist.ts`: storage do Zustand persist — debounce 300ms, fila serial (`writeQueue`), flush em `pagehide` e `visibilitychange:hidden`.
- `src/stores/sceneStore.ts` (`scene.v1`) e `src/stores/settingsStore.ts` (`settings.v1`): persist seletivo via `partialize`; re-hidratação valida contra os tipos TS.
- `src/export/serializer.ts`: envelope `solar-sim/export` v1 — `exported_at`, `correlation_id` (UUID), `scenario` com `idempotency_key` estável e `graph_snapshot_hash` (SHA-256 real via `crypto.subtle`), `catalog_refs` derivados dos ids presentes, 5 grupos de entidades, `results` `kind: derived`; `isExportDocument` (type guard) e `docToScene` para import.
- UI: `Toolbar` no header — select de unidade (kWh/MWh), Exportar JSON (download), Importar (valida e alerta contagem).
- Gate técnico: `npm run typecheck` limpo, `npm test` 4/4, `npm run build` ok.
