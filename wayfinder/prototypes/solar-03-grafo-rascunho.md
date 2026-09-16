# Rascunho — estratégia de grafos do Solar Simulator (para reação)

**Ticket:** [Escolher a estratégia de grafos e sua evolução](../tickets/solar-03-estrategia-de-grafos.md)  
**Natureza:** asset de prototype (rascunho barato, não é decisão)

## Camadas candidatas de grafo

```text
Camada 1 - GRAFO DE CENA (runtime, efêmero, exportável)
  building ──has──> roof ──hosts──> module ──connects──> mppt
                                            + irradiance profile aplicado
  Estado Zustand; vira JSON no export; não é conhecimento, é o artefato simulado.

Camada 2 - GRAFO DE CATÁLOGO (estático, derivado das fixtures)
  module-family ──compatible_with──> mppt-preset
  roof-template ──typical_for──> building-type
  irradiance-profile ──used_by──> scenario
  Fonte única: fixtures; grafo é DERIVADO (build determinístico), nunca editado à mão.

Camada 3 - GRAFO DE RESULTADOS (evolutivo, o estudo)
  scenario ──ran_on(date,hora)──> module_instance ──produces──> kwh_sample
                                 ──shaded_by──> obstacle (fator 0..1)
  Cada execução do slider/ano vira eventos anexados aos nós da cena;
  é aqui que "evolução de grafos" vira coisa observável no mock.
```

## Como a evolução é representada (proposta crua)

- Fixtures são o tronco versionado (git). Mudou fixture → roda script que deriva um
  **snapshot do grafo** (nodes + edges + hash do snapshot).
- Snapshot novo = linha no changelog; nenhum banco, só arquivos:
  `graph/snapshots/<hash>.json` + `graph/changelog.json` (tipo de mudança, id do item, quem, quando).
- Item de catálogo muda: `updated_at` + novo snapshot; não reescreve o histórico.
- Cena exportada carrega `graph_snapshot_hash` → dá para reprojetar exatamente qual
  catálogo/versão produziu aquele resultado (chave para reinjeção futura).

## Proveniência vs. inferência (anti-fantasia)

- Todo nó/aresta carrega `provenance: fixture:<id> | plan.txt:<seção> | runtime` e
  `kind: fact | derived`.
- `fact` = valor que veio de fixture/plano (ex.: Wp 550).
- `derived` = resultado de cálculo (ex.: kWh daquela hora). Derived é **regenerável**
  e nunca é persistido como fato: export guarda só o input + hash, não o resultado como verdade.
- Um estudo nunca cita `derived` como fato de engenharia; a UI separa os dois
  visualmente quando mostrar resultados.

## Inspeção no 1º ciclo (barata)

- Export Mermaid (`.mmd`) do grafo de catálogo + do grafo de cena, gerado pelo mesmo
  script de derivação → dá para "ver" o grafo no Obsidian/GitHub sem lib interativa.

## Questões em aberto (reaja à vontade)

1. Quais camadas entram no primeiro ciclo (1, 1+2, ou 1+2+3)?
2. O snapshot+changelog em arquivo serve, ou prefere só derivar no load (sem artefatos)?
3. Mermaid no INDEX ajuda o estudo ou é peso morto?
4. `provenance`/`fact|derived` entra já no 1º ciclo ou fica documentado como princípio?
