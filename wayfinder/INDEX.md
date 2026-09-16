---
tags:
  - wayfinder
  - navigation
kind: index
status: active
target: cross-domain
next: decision
---

# Wayfinder — Solar Simulator

Ponto de retomada da frente de estudos. O objetivo não é entregar precisão de engenharia agora: é deixar pronto o desenho, a taxonomia mockada, as decisões e a ordem de construção para um protótipo minimamente visível no navegador, reinjetável depois no projeto maior.

- [Mapa Solar Simulator](solar-simulator-map.md): destino, notas, decisões, fog e out-of-scope.
- [Mapa de execução das 5 fases](EXEC/solar-execucao-map.md): esforço de execução em andamento, um ticket por sessão com aval do dono.
- [Plan.txt](../Plan.txt): contexto original das 5 fases + evoluções; evidência de origem, não spec fechada.
- [Tickets](tickets/): decisões takeáveis agora; bloqueios declarados no corpo de cada ticket.

## Taxonomia documental (emulando a técnica de catálogo versionável)

| Campo | Valores usados | Significado |
|---|---|---|
| `tags` | `solar`, `taxonomy`, `graph`, `mvp`, `mock`, `scene`, `shading` | Conexões temáticas para navegação, grafo e busca |
| `kind` | `decision`, `catalog`, `fixture`, `roadmap` | Natureza do artefato |
| `status` | `planned`, `captured`, `validated`, `fixture-ready` | Estágio verificável |
| `target` | `prototype`, `future-system` | Destino da responsabilidade |
| `next` | `decision`, `fixture`, `mapping` | Próxima ação concreta |

Fluxo normal: `planned → captured → validated → fixture-ready → building`. Nesta fase, `captured` significa evidência mockada versionada; não que a física foi validada.

## Estrutura local

```text
SolarSimulator/
├── Plan.txt
├── README.md
├── .gitignore
└── wayfinder/
    ├── INDEX.md
    ├── solar-simulator-map.md
    └── tickets/
```
