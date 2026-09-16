# Escolher contrato de persistência local (Zustand + IndexedDB)

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:prototype`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Definir destino e primeiro piloto visível no navegador](solar-01-destino-e-piloto.md)  
**Bloqueia:** [Montar scaffold do repo e padrões GitHub](solar-05-scaffold-e-github.md)

## Question

Quais fatias do estado (cena/edição, módulos, conexões MPPT, resultados de simulação) são persistidas localmente via Zustand persist + IndexedDB desde o início, com qual gatilho (auto-save com debounce vs. salvar explícito), qual versionamento de schema/migração e como a evolução futura para assets pesados (texturas/GLB também no IndexedDB, para aliviar o peso do sistema) cabe sem quebrar o contrato de export JSON para reinjeção no projeto maior? Produzir um stub concreto de stores, chaves e versão para a Fase 0 consumir; tudo mockado, sem backend.

## Resolução (2026-09-07)

Grill HITL sobre o stub [prototypes/solar-07-persistencia-stub.md](../prototypes/solar-07-persistencia-stub.md). Decisões:

- **Fatias persistidas:** apenas `scene` (building, roofs, modules e conexões módulo→MPPT) e `settings`; `ui` (seleção/câmera) e resultados de simulação permanecem efêmeros — `derived` regenerável, coerente com a camada 3 leve.
- **Gatilho:** auto-save com debounce ~300 ms por mutação + flush em `pagehide`/`visibilitychange: hidden` + fila serial de escritas (uma transação por vez) para nunca corromper; `partialize` limita o que chega ao disco.
- **Versionamento:** IndexedDB `solar-sim` com migrações via upgrade event em `src/db.ts`; chaves versionadas no próprio nome (`scene.v1` → `scene.v2`); contrato de export JSON (solar-06) é independente do schema interno — mudança interna nunca muda o envelope sem bump explícito.
- **Assets (evolução sem quebra):** object store `assets` criado já no 1º ciclo, vazio, com chave = hash sha256 + metadata (mimetype/size); export referencia asset por hash (`asset_refs`), nunca embute blob — reinjeção decide onde materializar.
- **Re-hidratação:** load valida contra o schema TS do DTO, migra se preciso e hidrata as stores; export nasce do estado validado, nunca do objeto bruto do IDB.
