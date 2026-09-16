# Catálogo mockado do Solar Simulator — INDEX

**Mapa:** [Execução das 5 fases](EXEC/solar-execucao-map.md) · [Decisão de taxonomia](solar-simulator-map.md)  
**Fonte das fixtures:** `src/fixtures/` (fonte única de valores; grafo deriva delas, nunca o inverso)

## Taxonomia (schema de ERP 1:1)

| Campo | Valores usados | Significado |
|---|---|---|
| `kind` | `module-family` · `roof-template` · `mppt-preset` · `irradiance-profile` | Família do item |
| `tags` | `catalog`, `module`, `roof`, `mppt`, `irradiance`, `mock` | Conexões temáticas p/ grafo e busca |
| `status` | `planned → captured → validated → fixture-ready → building` | Maturidade; `validated` = smoke test sano |
| `target` | `prototype` | Responsabilidade atual |
| `next` | `fixture` | Próxima ação concreta |
| `evidence` | `plan.txt §…` | Seção do Plan.txt que origina o item |

Id estável ASCII por item. Todo valor é **mock/genérico**; nada validado contra fabricante ou medição real.

## Itens (7)

| Família | Id | Nome | Status |
|---|---|---|---|
| module | `pv-mod-550g` | Módulo Genérico 550W | validated |
| module | `pv-mod-430g` | Módulo Genérico 430W | validated |
| module | `pv-mod-340g` | Módulo Genérico 340W | validated |
| roof | `roof-gable-01` | Duas águas padrão | validated |
| roof | `roof-shed-01` | Uma água simples | validated |
| mppt | `mppt-node-01` | MPPT Genérico | validated |
| irradiance | `irr-clear-day-01` | Dia limpo (mock) | validated |

Gate do piloto atendido (≥ 3 módulos, 1–2 telhados, 1 MPPT, 1 irradiância em `validated`).

## Exemplos

- `src/fixtures/examples/scn-001.json`: cenário completo (envelope `solar-sim/export` v1) usando o telhado duas águas, o MPPT genérico e o módulo 550W; validado por teste de contrato do DTO.

## Relação com a cena

```text
fixture versionada (src/fixtures) → DTO tipado (src/types) → N objetos 3D (cena)
```
A cena nunca é fonte de verdade; o objeto 3D apenas consome `catalog_id`/`template_id`/`preset_id`.
