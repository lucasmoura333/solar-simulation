# Catalogar fixtures mockadas das 4 famílias

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Montar fundação de estado e persistência local](exec-01-fundacao-de-estado-e-persistencia.md)  
**Bloqueia:** [Fase 1 — Modelagem do telhado com transform controls](exec-03-fase-1-modelagem-do-telhado.md)

## Question

Criar o catálogo mockado conforme a decisão [Separar o catálogo de evidências do contrato canônico da taxonomia](../../solar-simulator-map.md): fixtures versionadas para as 4 famílias — 3 famílias de módulos genéricos (Wp/V/eficiência), 1–2 templates de telhado (uma/duas águas), 1 preset de MPPT, 1 perfil de irradiância dia limpo — em `src/fixtures/`, cada item com metadados do schema de ERP (tags/kind/status/target/next), `evidence` apontando a seção do Plan.txt, id estável ASCII e estado ≥ `validated` (validação via schema TS + smoke test sanitário: valores dentro de faixa esperada e ordem de grandeza correta). Criar também o INDEX da taxonomia em `wayfinder/catalog-index.md` e o exemplo `fixtures/examples/scn-001.json` (envelope do export v1, validado por teste de contrato). Gate: `npm run build` + `npm test` ok, catálogo conferido no INDEX.

## Resolução (2026-09-07)

Executado com aval do dono. Gate técnico ok (typecheck, 10/10 testes, build). Fatos:

- `src/fixtures/types.ts`: `CatalogStatus` (planned→building), `FamilyKind`, `ItemMeta` e tipos por família; tudo `satisfies` para validar no TS.
- 7 itens em `validated`: módulos `pv-mod-550g/430g/340g` (Wp/Vmp/eficiência/dimensões), telhados `roof-gable-01` e `roof-shed-01` (defaults orientação/inclinação/dimensões), MPPT `mppt-node-01` (v_max 600 V / i_max 26 A), irradiância `irr-clear-day-01` (24 amostras horárias, ~5,4 kWh/m²/dia).
- `src/fixtures/index.ts` + helpers de busca por família/id; `src/fixtures/examples/scn-001.json` (envelope v1 completo, refs só a fixtures existentes).
- `wayfinder/catalog-index.md`: INDEX da taxonomia (schema de ERP 1:1, fluxo de maturidade, tabela dos itens, cadeia fixture→DTO→cena).
- Testes `catalog.test.ts` + contrato do exemplo: unicidade/ASCII de ids, gate ≥ validated, faixas sãs, refs consistentes, `isExportDocument` verdadeiro. Commit `6dce662`.
