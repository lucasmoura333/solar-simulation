# Definir modelo mockado e export JSON para reinjeção

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:prototype`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Separar o catálogo de evidências do contrato canônico da taxonomia](solar-02-taxonomia-e-catalogo.md), [Escolher a estratégia de grafos e sua evolução](solar-03-estrategia-de-grafos.md)

## Question

Qual é o modelo de dados mockado inicial (telhado, módulo com Wp/V/eficiência, MPPT, leitura de sombra, produção kWh) e seu formato de export JSON para que o projeto maior possa reinjetar o protótipo depois sem reescrever o domínio? Definir entidades, `external_refs`, `correlation_id`, idempotência de cenário e um exemplo genérico versionado, mantendo tudo mockado e sem dependência de APIs reais.

## Resolução (2026-09-07)

Grill HITL sobre o exemplo [prototypes/solar-06-export-exemplo.json](../prototypes/solar-06-export-exemplo.json). Decisões:

- **Envelope completo:** `format: "solar-sim/export"`, `version`, `exported_at`, `correlation_id`; `scenario` carrega `id`, `idempotency_key` e `graph_snapshot_hash`; `catalog_refs` lista cada fixture consumida com hash e status.
- **5 grupos de entidades:** `building` (+ `external_refs`), `roofs` (geometria inline + `template_id` → catálogo), `mppts` (`preset_id`), `modules` (`catalog_id`, posição/rotação, `mppt_id`) e `results` marcado `kind: derived` com nota de que é regenerável — nunca fato de engenharia. Toda entidade usa id estável ASCII.
- **Idempotência:** reinjeção com mesmo `scenario.id` + `idempotency_key` não duplica — upsert por id estável; `catalog_refs` conferem o hash das fixtures antes de aceitar o cenário.
- **Exemplo versionado:** `fixtures/examples/scn-001.json` no repo, consumido por testes de contrato — o schema TS do DTO valida o arquivo; sem dependência de APIs reais.
- **Anti-fantasia preservado:** resultados `derived` não viram fato; export guarda input + hash, resultados são regeneráveis.
