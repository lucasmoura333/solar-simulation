# Fase 5 — Cálculo de produção e gráfico

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Fase 4 — Sol, sombras e slider solar (simshady)](exec-06-fase-4-sol-sombras-e-slider.md)  
**Bloqueia:** —

## Question

Implementar a Fase 5 do Plan.txt (§4, Fase 5): modelo de irradiância mockado (perfil dia limpo do catálogo) aplicado por hora com os fatores de sombreamento da Fase 4, acumulando produção diária/anual simplificada por módulo/MPPT/total (kWh com ordem de grandeza correta), exibida no painel de estatísticas e num gráfico Recharts da produção ao longo do dia. Resultados marcados `kind: derived`, mantidos efêmeros (regeneráveis), nunca persistidos como fato (contratos de grafos/export); export JSON v1 já carrega `results.last_run` opcional. Gate: `npm run build` ok + slider solar atualiza o gráfico e o total de kWh com valores plausíveis no navegador, sem travar (30 FPS em notebook médio).

## Emenda técnica da Fase 5 (2026-09-07) — diagnóstico completo

Sintoma: produção zerada primeiro e depois NaN em todos os números. Diagnóstico em duas causas (reproduzidas em navegador headless com console instrumentado):

1. **Bug estrutural do `@openpv/simshady` 0.2.2 (NaN em séries temporais)**: o raytrace concatena as direções de céu de **todas** as entradas do time series, mas o somatório JS faz `intensity[t] += mask[i] × radiation[t][i]` com `i` além do vetor de radiance de cada entrada (`radiation[t].length` = segmentos de UMA entrada) → `undefined` → NaN em 100% das intensidades. Os próprios dados de referência dos autores são sempre **uma** entrada (ex.: `irradiance_munich_2018.json` tem 1 skydome anual), então a série temporal nunca funcionou. Não há versão mais nova no npm (latest 0.2.2).
2. **Exibição**: `hourlyWh` do modelo já nasce em kWh, mas o gráfico/cards dividiam por 1000 de novo (produção aparente ~1000× menor).

**Decisão**: substituir o fator horário de sombra por **raycast direcional na CPU** (`src/utils/solarShading.ts`, Möller–Trumbore puro, determinístico, testável em node, sem GPU): por módulo, 9 amostras na superfície × 24 horas, contra oclusores = paredes + telhado + células dos módulos; `fator = lit(0..1) × cos(incidência)`. Mesmo formato `ShadingAnalysisResult` — produção, cores e painéis não mudaram de contrato. Pacote `@openpv/simshady` desinstalado (com repro documentado); caso ele corrija upstream, a arquitetura antiga está descrita neste ticket para reavaliação.

## Resolução (2026-09-07)

Executado com aval do dono; gate visual aprovado (curva em kWh, cards, sombra física, sem travar). Fatos:

- `src/utils/solarShading.ts` + testes (raycast CPU): oclusores (paredes/telhado/células de módulos), amostragem 3×3 por módulo, fator por hora = lit × cos(incidência). Curva do dia: 0 → ~0,99 (meio-dia, face norte em SP) → 0; face sul atrás da cumeeira ensombrada na hora certa; noite zero. 8 testes novos (51 no total).
- `computeProduction` (Fase 5): `E_h (Wh→kWh) = irrad. horária × área × eficiência × fator`; totais diário/anual (365× dia limpo) e por MPPT; resultados efêmeros (`derived`), nunca persistidos.
- UI: gráfico Recharts potencial vs. com sombra + linha da hora atual; cards hoje/ano/agora (kWh/h)/acumulado; correção de unidade (hourly já em kWh — gráfico e cards dividiam por 1000 duas vezes).
- Validação headless ponta a ponta (Playwright + WebGL SwiftShader): 2 módulos → 0,98 kWh/h ao meio-dia, 6,22 kWh/dia, 2,27 MWh/ano, console limpo.
- Commits: `f35b81d`, `c88ad0c`, `d72dc52`, `6073b48`.
