# Escolher a estratégia de grafos e sua evolução

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:prototype`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Definir destino e primeiro piloto visível no navegador](solar-01-destino-e-piloto.md), [Separar o catálogo de evidências do contrato canônico da taxonomia](solar-02-taxonomia-e-catalogo.md)  
**Bloqueia:** [Definir modelo mockado e export JSON para reinjeção](solar-06-modelo-mockado-e-export.md)

## Question

Para facilitar estudos e futura reinjeção no projeto maior, qual combinação será adotada no primeiro ciclo: grafo de cena 3D (telhado → módulos → MPPTs), knowledge graph de entidades/eventos de simulação, versionamento da taxonomia como grafo evolutivo, ou outra? Definir o que será indexado, como manter sincronizado com fixtures mockadas, como citar fontes (Plan.txt vs. medição real) e como impedir que estudos tratem inferências como fatos de engenharia.

## Resolução (2026-09-07)

Grill HITL sobre o rascunho [prototypes/solar-03-grafo-rascunho.md](../prototypes/solar-03-grafo-rascunho.md). Decisões:

- **Camadas adotadas (1+2+3 leve):** (1) grafo de cena runtime — building → roof → module → mppt, efêmero, exportável em JSON; (2) grafo de catálogo derivado deterministicamente das fixtures — module-family ─compatible_with→ mppt-preset etc.; (3) resultados leves — eventos da cena atual anexados aos nós (sombreamento, kWh daquela hora), sem série anual completa persistida.
- **Evolução:** fixtures são o tronco versionado (git); script deriva snapshot do grafo (nodes + edges + hash) + `changelog.json` (tipo de mudança, id do item, quando); cena exportada carrega `graph_snapshot_hash` para reprojetar exatamente qual versão de catálogo produziu o resultado. Grafo nunca é editado à mão.
- **Inspeção:** o mesmo script de derivação gera Mermaid (`.mmd`) do catálogo e da cena, exibidos no INDEX — ver o grafo sem lib interativa.
- **Proveniência:** princípio documentado desde já como contrato em docs e fixtures — todo nó/aresta carrega `provenance` (`fixture:<id>` | `plan.txt:<seção>` | `runtime`) e `kind: fact | derived`; `derived` é regenerável e nunca é persistido como fato; aplicação obrigatória quando resultados passarem a ser persistidos/exportados.
- **Anti-fantasia:** estudo nunca cita `derived` como fato de engenharia; fontes reais (TMY, medição) continuam fora do primeiro ciclo.
