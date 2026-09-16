# Fase 3 — Configuração de módulos e painel lateral

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Fase 2 — Inserção de módulos com snap e MPPTs](exec-04-fase-2-modulos-snap-e-mppts.md)  
**Bloqueia:** [Fase 4 — Sol, sombras e slider solar (simshady)](exec-06-fase-4-sol-sombras-e-slider.md)

## Question

Implementar a Fase 3 do Plan.txt (§4, Fase 3): painel lateral (Sidebar) que, ao selecionar um módulo, mostra campos de potência nominal (Wp), tensão de operação (V), eficiência (%) e família (pré-definida do catálogo ou customizada), com edição persistida em `scene.v1`; cálculo automático de produção individual do módulo com base nos dados e na irradiância mockada do catálogo (valor simples por ora — a agregação por hora chega na Fase 5). Gate: `npm run build` ok + selecionar módulo edita valores e o número muda na UI no navegador + reload preserva a edição.

## Resolução (2026-09-07)

Executado com aval do dono; gate visual aprovado. Fatos:

- `src/utils/calculations.ts`: valores efetivos (família + overrides), `dailyIrradianceKwhM2` (perfil `irr-clear-day-01` ≈ 8,18 kWh/m²/dia) e produção diária mock `E = G_dia × área × eficiência` (mock por área; agregação horária só na Fase 5). 6 testes novos (26 no total).
- Store: `setModuleCatalog` (troca de família limpa overrides), `setModuleOverrides` (merge parcial), `resetModuleOverrides` — persistidos em `scene.v1` (schema já previa `SolarModule.overrides`).
- UI: seção "Módulo selecionado (Fase 3)" no painel com família + Wp + Vmp + eficiência, badge "valores customizados", botão de restaurar família, produção diária mock na unidade de exibição (kWh/MWh).
- **Nota do dono (terminologia)**: o termo residencial de energia é kWh (o "kw/h" informal); potência das placas é **Wp/kWp** (máxima em condições ideais). Rótulos atuais de UI já usam Wp e kWh; cálculo/produção será revisitado na Fase 5 — nada muda agora.
- Commit `4fe90c5`.
