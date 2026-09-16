---
tags:
  - wayfinder
  - execution
  - solar
kind: index
status: active
target: prototype
next: execution
---

# Wayfinder — execução das 5 fases (Solar Simulator)

Esforço de execução sobre o scaffold já decidido. Cada ticket é uma entrega com
gate: build ok + visto do dono no navegador + aval para o próximo.

- [Mapa de execução](solar-execucao-map.md): destino, regras e fronteira.
- [Mapa de decisões (fechado)](../solar-simulator-map.md): contratos que este
  esforço consome (taxonomia, grafos, persistência, export).
- [Tickets](tickets/): cadeia `fundação → catálogo → Fase 1..5`.

## Taxonomia

Os artefatos deste esforço usam `kind: execution`; cada fase é um `task` com
`status: planned → in-progress → done`, `target: prototype` e `next: phase`.
Assets de suporte (research, prototypes) vivem em `wayfinder/research/` e
`wayfinder/prototypes/` do mapa de decisões.
