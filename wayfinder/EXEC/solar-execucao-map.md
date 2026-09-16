# Solar Simulator — execução das 5 fases

**Tipo:** `wayfinder:map`  
**Status:** fechado (piloto das 5 fases entregue, 2026-09-07)  
**Tracker:** Markdown local  
**Contexto:** [Mapa de decisões (fechado)](../solar-simulator-map.md) · [Plan.txt](../../Plan.txt) · [README](../../README.md)

## Destination

As 5 fases cruas funcionando localmente no navegador: telhado desenhável (Fase 1), módulos com snap + MPPTs (Fase 2), configuração de módulos (Fase 3), sol/sombras com slider (Fase 4) e kWh + gráfico (Fase 5), com cena persistida no IndexedDB e export JSON funcionando — gate geral do piloto: 30 FPS em notebook médio e kWh com ordem de grandeza correta.

## Notes

Domínio: execução do protótipo fotovoltaico mockado. **Este esforço EXECUTA** (override do plan-don't-do): cada ticket é uma entrega executável que só fecha com `npm run build` ok + resultado visto pelo dono no navegador + nada de segredos versionados.

Regras do dono: aval a cada ticket antes de avançar (um ticket por sessão, no máximo); commits na `main`, tag por fase; valores genéricos mockados, sem precisão real.

Consultar antes de executar qualquer ticket:
- [Mapa de decisões (fechado)](../solar-simulator-map.md): 7 decisões registradas.
- [research/solar-04](../research/solar-04-fundacao-tecnica.md): pins de versões e restrições (WebGL2 obrigatório, sem `@openpv/irradiance`, só MIT/Apache-2.0).
- [prototypes/solar-07](../prototypes/solar-07-persistencia-stub.md): contrato de persistência (stores `scene.v1`/`settings.v1`, auto-save 300ms + flush, store `assets`).
- [prototypes/solar-06](../prototypes/solar-06-export-exemplo.json): envelope de export `solar-sim/export` v1 + 5 grupos de entidades.
- [Plan.txt](../../Plan.txt): seções 3–9 como referência de fases e estrutura.

Este mapa herda o out-of-scope do mapa fechado: precisão de engenharia real, TMY, inversores/string sizing, mapa/endereço, PDF/BIM, backend e dados de clientes seguem fora.

## Decisions so far

- [Montar fundação de estado e persistência local](tickets/exec-01-fundacao-de-estado-e-persistencia.md): IDB `solar-sim` v1 (kv + assets), adapter com debounce 300ms/fila/flush, stores `scene.v1` e `settings.v1`, envelope de export v1 com sha256 + import validado; gate visual aprovado (commit `8868fa0`).
- [Catalogar fixtures mockadas das 4 famílias](tickets/exec-02-catalogo-fixtures.md): 7 itens `validated` (3 módulos, 2 telhados, 1 MPPT, 1 irradiância ~5,4 kWh/m²/dia) em `src/fixtures/` com schema de ERP 1:1 + INDEX em `wayfinder/catalog-index.md` + exemplo `scn-001.json` validado por contrato; gate técnico ok (commit `6dce662`).
- [Fase 1 — Modelagem do telhado com transform controls](tickets/exec-03-fase-1-modelagem-do-telhado.md): edificação seed do template `roof-gable-01`; malha derivada dos parâmetros (`utils/geometry.ts`); gizmo mover/girar grava de volta em `roof.place`/`orientation_deg`; painel com template/dimensões/inclinação; reload preserva tudo (gate visual aprovado, commit `79bd55b`).
- [Fase 2 — Inserção de módulos com snap e MPPTs](tickets/exec-04-fase-2-modulos-snap-e-mppts.md): snap por clique no telhado com `position_m`/`rotation_deg` em coordenadas locais da edificação (parâmetros como fonte de verdade), InstancedMesh por família, TransformControls único via handle virtual, esferas MPPT (`Mppt.place?`), conexão por dropdown + linha 3D, auto-heal de módulos importados; geometria shed corrigida (malha dobrada da Fase 1); 20 testes; gate visual aprovado (commit `4bda2c3`).
- [Fase 3 — Configuração de módulos e painel lateral](tickets/exec-05-fase-3-configuracao-de-modulos.md): painel do módulo selecionado com família/Wp/Vmp/eficiência persistidos via `overrides` (troca de família limpa overrides; restaurar volta à família); `utils/calculations.ts` com produção diária mock por área `G × A × η`; 26 testes; gate visual aprovado (commit `4fe90c5`).
- [Fase 4 — Sol, sombras e slider solar (simshady)](tickets/exec-06-fase-4-sol-sombras-e-slider.md): research de arquitetura resolvido (simshady cria o próprio canvas WebGL2; sistema ENU; intensidades = máscara × radiance); posição solar com emenda `solar-spa → suncalc v2` (bug `node:module` no browser); snapshot ENU determinístico por módulo, perfil T=24, luz direcional com shadow map real + cores por fator; 35 testes; gate visual aprovado (commits `9521401`, `56b2106`).
- [Fase 5 — Cálculo de produção e gráfico](tickets/exec-07-fase-5-calculo-de-producao-e-grafico.md): emenda do sombreamento para raycast CPU determinístico (`solarShading.ts` — simshady 0.2.2 tem NaN estrutural em séries temporais); `computeProduction` horário (irrad. × área × eficiência × fator), totais diário/anual e por MPPT (efêmeros/derived); gráfico Recharts potencial vs. com sombra + cards kWh/h; correção de unidade dupla no gráfico; 51 testes; gate visual aprovado (commits `f35b81d`..`6073b48`).

## Encerramento

Destination alcançada: as 5 fases do Plan.txt rodando localmente — telhado desenhável/editável e persistente, módulos com snap + MPPTs + conexões, configuração por módulo, sol com slider + sombras reais e fator de sombreamento por hora, produção kWh/dia e por ano com ordem de grandeza correta; persistência IndexedDB + export JSON v1 funcionando (contratos intocados pelas emendas de stack). 51 testes, typecheck e build ok, validação headless ponta a ponta.

Pendências registradas para o projeto maior: orientador espacial (bússola) na cena — UX aprovada com ressalva; reavaliar simshady quando o upstream corrigir o NaN de time series; solar-spa quando suportar browser; métricas do Plan (§8) além de build/FPS por notebook médio ficam como avaliação futura. Próximo passo sugerido: camada de provedores (posição solar/sombreamento/clima) para facilitar o transplante — ver notas de arquitetura da Fase 5.

## Notes do dono (acumuladas)

- Terminologia: energia residencial é **kWh**; potência das placas é **Wp/kWp** (máxima em condições ideais). Cálculo de produção será revisitado na Fase 5 — nada muda agora.
- **Emenda de stack (Fase 4)**: `solar-spa` 2.0.2 removido — `index.mjs` usa `createRequire`/`node:module` para carregar o WASM e quebra no navegador ("createRequire is not a function"). Substituído por `suncalc` v2 (JS puro/MIT/NOAA). Registrado no ticket exec-06; afeta o pin da decisão solar-04.
- **Emenda de stack (Fase 5)**: `@openpv/simshady` 0.2.2 removido — NaN estrutural em séries temporais (T>1); sombreamento horário agora por raycast CPU determinístico (`utils/solarShading.ts`), mesmo contrato de resultado; repro completo no ticket exec-07. A coluna simshady do Plan.txt fica marcada como "avaliar quando o upstream corrigir".
- **UX pendente (observado no gate da Fase 4)**: falta um **orientador espacial** na cena (rosa-dos-ventos N/E/S/W e referência de orientação do prédio) — confuso sem ele; implementar no fechamento do piloto (Fase 5/polish).

## Not yet specified

- Arquitetura de integração simshady ↔ cena R3F (mesma cena vs. cena/offscreen auxiliar) — precisa de research antes do ticket Fase 4.
- Formato do gráfico de produção e leiaute do painel lateral (Fase 3/5) — decisão barata dentro do ticket, sem novo ticket.
- Mecânica exata do snap (edge/face, espaçamento) e da linha módulo→MPPT (Fase 2) — decidida durante a execução da Fase 2.

## Out of scope

- Precisão de engenharia, certificação ou validação contra PV*SOL/PVsyst.
- TMY real, inversores reais + string sizing, importação por mapa, PDF/BIM, comparativo what-if, backend e multiusuário.
- Reinjeção no projeto maior (esforço futuro; este mapa só garante o export JSON estável).

## Frontier

Tickets abertos e não atribuídos ficam em [tickets](tickets/). No tracker Markdown local, um ticket é tomável quando não possui bloqueadores abertos. Cadeia linear: fundação → catálogo → Fase 1 → ... → Fase 5.
