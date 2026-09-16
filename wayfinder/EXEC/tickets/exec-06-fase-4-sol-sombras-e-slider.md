# Fase 4 — Sol, sombras e slider solar (simshady)

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Fase 3 — Configuração de módulos e painel lateral](exec-05-fase-3-configuracao-de-modulos.md)  
**Bloqueia:** [Fase 5 — Cálculo de produção e gráfico](exec-07-fase-5-calculo-de-producao-e-grafico.md)

## Question

Implementar a Fase 4 do Plan.txt (§4, Fase 4): posição solar via `solar-spa` (azimute/elevação para data/hora), slider de horário na UI (SunSlider) com debounce (~300ms) para não congelar a UI, e integração do fator de sombreamento via `@openpv/simshady` sobre telhado + módulos, atualizando a cor dos módulos conforme o fator (escurece sombreado). A integração simshady ↔ cena R3F é o item de research pendente do mapa (Not yet specified): levantar a arquitetura (mesma cena vs. cena auxiliar) dentro deste ticket antes de codar. WebGL2 obrigatório com fallback já existente. Gate: `npm run build` ok + slider move o sol e módulos mudam de cor conforme a sombra no navegador, sem travar a UI.

## Research: arquitetura simshady ↔ R3F (decidido nesta execução, 2026-09-07)

Leitura do fonte instalado (`@openpv/simshady` 0.2.2, dist/index.js):

- simshady **cria o próprio contexto WebGL2** (`document.createElement("canvas").getContext("webgl2")`); logo é uma **cena auxiliar própria**, sem compartilhar o canvas do R3F — o R3F fica só com a exibição.
- Sistema interno **ENU**: x=leste, y=norte, z=cima (doc `CartesianPoint`); geometrias three (y-up) precisam de conversão de coordenadas e de normais.
- `addSimulationGeometry` recebe BufferGeometry crua (triângulos) → é *também* shading; `addShadingGeometry` só causa sombra. `refineMesh(...,1)` subdivide triângulos com lado > 1 m e **descarta** faces com normal para baixo (z<-0.9 em ENU).
- `addSolarIrradiance` recebe lista de skydomes (time series): cada `data` = segmentos `{altitude_deg, azimuth_deg, average_radiance_W_m2_sr}` (1 segmento = 1 passada de raycast na GPU). `intensity[t][tri] = Σ_seg mask_seg × radiance_seg` (sombra nítida; sem modelo difuso nessa versão).
- A cor do mesh devolvido é cosmética (baseada no primeiro timestep); o dado útil é o atributo **`intensities`** achatado `T×N`.

**Arquitetura decidida**: perfil horário T=24 como time series de skydomes com **1 segmento por hora** = direção do sol (via `solar-spa`, acima do horizonte) e radiance = perfil `irr-clear-day-01`; simulação roda **uma vez** (e quando a cena muda, com debounce ~300 ms); o slider só lê o passo e repinta as instâncias. Para ter ordem de triângulos por módulo determinística (refine não reordena além de subdividir), cada módulo vira uma grade de células ≤ 1 m já subdividida (somente face superior, normais para cima), com 2 triângulos por célula — índice global = ordem dos módulos × células. Fator de iluminação visual = `intensity / radiance_hora` (0=sombra/noite escura, 1+luz); difuso fica de fora (nota mock, entra na Fase 5 se couber).

**Emenda no research (bug de runtime, 2026-09-07)**: `solar-spa` 2.0.2 não roda no navegador — o `dist/index.mjs` carrega o WASM via `createRequire` de `node:module` (só Node; quebra no Vite/Rolldown: "createRequire is not a function"). **Substituído por `suncalc` v2** (JS puro, MIT, mesma convenção navegacional 0=N/90=E, altitude com refração; precisa o suficiente para sombras mock). O `solar-spa` foi removido do `package.json`; os testes passam a exercitar o suncalc (35 no total).

## Resolução (2026-09-07)

Executado com aval do dono; gate visual aprovado no navegador (slider gira o sol, sombras reais do three + fator simshady escurecem módulos, sem travar). Fatos:

- `src/utils/sun.ts`: posição solar via suncalc v2 (graus, azimute navegacional) + `sunDirectionWorld` (norte=−z, leste=+x).
- `src/utils/shading.ts` + testes: snapshot ENU determinístico (módulos em grade ≤ 1 m, 2 tri/célula, ordem estável; telhado/paredes como sombreamento), perfil horário T=24 (1 segmento por hora na direção do sol, radiance do `irr-clear-day-01`).
- `src/services/shadingRunner.ts`: roda o `ShadingScene` do simshady com `eff=1` num canvas WebGL2 próprio (cena auxiliar — o research confirmou que ele não compartilha o R3F); reescala as intensidades pela escala interna (0.065/1e3) e entrega fator de luz por módulo por hora.
- `src/components/3D/ShadingAnalysis.tsx`: dispara a análise com debounce 300 ms quando a cena muda (módulos/roof); resultado efêmero em `shadingStore` (não persiste).
- `SunLight` (direcional com shadow map real posicionada pela SPA), cores das instâncias por fator da hora, `SunSlider` overlay (hora + elev/az + status). 9 testes novos (35 no total). Commit `9521401` + emenda `56b2106`.
- **Observação do dono (gate)**: "um pouco confuso sem o orientador espacial" — falta rosa-dos-ventos/bússola (N/E/S/W) e referência de orientação do prédio na cena; registrada como nota de UX pendente.
