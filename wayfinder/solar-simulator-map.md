# Solar Simulator — protótipo visível no navegador para estudos

**Tipo:** `wayfinder:map`  
**Status:** fechado  
**Tracker:** Markdown local  
**Contexto:** [Plan.txt](../Plan.txt) · [README](../README.md)

## Destination

Chegar a uma spec executável + scaffold mínimo versionado do Solar Simulator (fotovoltaico, genérico e mockado) pronto para receber o plano de execução, com taxonomia inicial, estratégia de evolução de grafos e ordem de construção das 5 fases; nada ainda com precisão de engenharia real.

## Notes

Domínio: simulação fotovoltaica — telhado/edificação, módulos, MPPTs, trajetória solar/sombras, cálculo simplificado de produção.

Emula a técnica de catálogo versionável usada em um ERP de referência: capturas viram catálogo versionável com taxonomia explícita (`tags`, `kind`, `status`, `target`, `next`), nunca suposição; fixtures mockadas sustentam decisões antes de qualquer API real.

Consultar sempre [Plan.txt](../Plan.txt) antes de fechar decisões. Usar `wayfinder` para decisões grandes. Preferir mock-first, valores genéricos, InstancedMesh + simshady na GPU, Zustand + R3F, export JSON do estado para reinjeção futura no projeto maior, decisões reversíveis no início.

Este mapa planeja; não implementa o simulador. Cada ticket fecha uma decisão ou produz evidência necessária para uma decisão. Execução (scaffold + estudos) entra via tickets `task`/`research`, não por construção direta.

## Decisions so far

- [Validar fundação técnica React + R3F + simshady](tickets/solar-04-fundacao-tecnica.md): pins e restrições propostos para o scaffold — React 19.2 + R3F v9 + three 0.185 + simshady 0.2.1, WebGL2 obrigatório, irradiância via fixture mockada (sem `@openpv/irradiance` no npm), Node LTS (Bun fora), só licenças MIT/Apache-2.0.
- [Definir destino e primeiro piloto visível no navegador](tickets/solar-01-destino-e-piloto.md): piloto = 5 fases cruas numa edificação (telhado → módulos com snap → MPPT → slider solar + sombras simshady → kWh + gráfico), papel único de estudo/demo, Zustand persist + IndexedDB desde o início; gates: 30 FPS em notebook médio e kWh com ordem de grandeza correta; TMY/inversores/mapa/PDF ficam fora do recorte.
- [Separar o catálogo de evidências do contrato canônico da taxonomia](tickets/solar-02-taxonomia-e-catalogo.md): catálogo cobre 4 famílias (módulos, telhados, MPPT, irradiância mock) como fixtures versionadas + INDEX; schema de ERP 1:1 (tags/kind/status/target/next, fluxo até `building`), id estável ASCII e `evidence` para o Plan.txt; relação fixture → DTO → cena; gate do piloto: 3 módulos, 1–2 telhados, 1 MPPT e 1 irradiância em `validated`.
- [Escolher a estratégia de grafos e sua evolução](tickets/solar-03-estrategia-de-grafos.md): camadas 1+2+3 leve (cena runtime + catálogo derivado de fixtures + resultados da cena atual); evolução via snapshot com hash + changelog (grafo nunca editado à mão); Mermaid gerado no INDEX; proveniência `fact|derived` como contrato desde já, aplicada no export.
- [Definir modelo mockado e export JSON para reinjeção](tickets/solar-06-modelo-mockado-e-export.md): envelope completo (`format/version/correlation_id`) + `scenario` com idempotency_key e `graph_snapshot_hash`; 5 grupos de entidades com id estável ASCII; reinjeção por upsert + conferência de hash; exemplo em `fixtures/examples/scn-001.json` validado por schema TS do DTO.
- [Escolher contrato de persistência local (Zustand + IndexedDB)](tickets/solar-07-persistencia-local.md): só `scene` + `settings` vão ao IDB; ui/resultados efêmeros; auto-save ~300ms + flush + fila serial; DB `solar-sim` com migrações por DB version; store `assets` reservado (chave = hash) sem blob no export.
- [Montar scaffold do repo e padrões GitHub](tickets/solar-05-scaffold-e-github.md): repo git `main` com commit `40a5ebe`, stack instalada com os pins da pesquisa (vitest ^5 por incompatibilidade do 4 com vite 8), cena vazia + fallback WebGL2 compilando (`npm run build`) e dev server em http://localhost:5173; `origin` configurado para `lucasmoura333/SolarSimulator` — criação do repo no GitHub fica como checklist manual do dono.

## Encerramento (2026-09-07)

Destino alcançado: spec executável + scaffold mínimo versionado, com taxonomia, estratégia de grafos, contrato de persistência/export e ordem de construção registrados. O plano de execução das 5 fases agora entra como um novo esforço quando o dono injetar.

## Not yet specified

- Como dados climáticos reais (TMY via PVGIS/Solcast/NREL) entrarão após o MVP mockado, e com quais gates de precisão.
- Como inversores reais e string sizing (limites de tensão/corrente, clipping, queda de tensão) serão validados eletricamente.
- Como importação por endereço (Mapbox/Google 3D Tiles), preenchimento automático de telhado e ferramentas de medição entram sem quebrar o modelo mockado.
- Como slider solar/time-lapse, relatórios PDF técnico-financeiros, export BIM/CAD (glTF/IFC/DXF) e comparativo de cenários what-if serão fatiados pós-MVP.
- Qual o mecanismo concreto de reinjeção no projeto maior (pacote modular, API REST, worker, design system compartilhado).
- Política de assets pesados no IndexedDB (texturas/GLB, quota, eviction) quando o protótipo crescer além das fixtures genéricas.

## Out of scope

- Precisão de engenharia real, certificação ou validação contra PV*SOL/PVsyst neste mapa.
- Integrar APIs pagas de clima/mapas ou armazenar credenciais/chaves neste esforço de wayfinding.
- Substituir ou acoplar ao projeto maior agora; a reinjeção é destino futuro, não entrega deste mapa.
- Migrar dados produtivos de clientes ou tratar dados pessoais além de fixtures genéricas.

## Frontier

Tickets abertos e não atribuídos estão em [tickets](tickets/). No tracker Markdown local, um ticket é tomável quando não possui bloqueadores abertos.
