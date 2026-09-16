---
tags:
  - solar
  - taxonomy
  - catalog
  - mock
kind: decision
status: planned
target: prototype
next: decision
---

# Separar o catálogo de evidências do contrato canônico da taxonomia

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:grilling`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Definir destino e primeiro piloto visível no navegador](solar-01-destino-e-piloto.md)  
**Bloqueia:** [Escolher a estratégia de grafos e sua evolução](solar-03-estrategia-de-grafos.md), [Definir modelo mockado e export JSON para reinjeção](solar-06-modelo-mockado-e-export.md)

## Question

Como o acervo genérico inicial (módulos, inversores fictícios, telhados, cenários de sombra) vira um catálogo versionável com taxonomia explícita, sem fingir precisão real? Definir os metadados obrigatórios de cada item, os estados de maturidade (`planned`, `captured`, `validated`, `fixture-ready`), a relação entre evidência em Plan.txt, fixture mockada, DTO interno e objeto 3D, e o recorte que precisa estar pronto para o primeiro piloto. Tudo começa genérico com valores mockados.

## Resolução (2026-09-07)

Grill HITL com o dono do esforço. Decisões:

- **Famílias do catálogo (4):** famílias de módulos genéricos (Wp/V/eficiência), templates de telhado (uma/duas águas), presets de MPPT genérico, perfis de irradiância mock (dia limpo).
- **Forma:** catálogo nasce como fixtures versionadas (JSON/TS) em `src/fixtures`, com maturidade por item, mais um INDEX em `wayfinder/` documentando a taxonomia; docs e código caminham juntos, fixtures são a fonte única de valores.
- **Schema:** reusa a técnica de catálogo versionável 1:1 — `tags`, `kind`, `status`, `target`, `next` — com fluxo `planned → captured → validated → fixture-ready → building`, onde `building` = em uso na cena. Cada item carrega também `evidence` apontando para a seção do Plan.txt que o origina e id estável ASCII (ex.: `pv-mod-550g`, `roof-gable-01`, `mppt-node-01`, `irr-clear-day-01`).
- **Relação:** evidência (Plan.txt) → 1 fixture versionada → 1 DTO tipado → N objetos 3D na cena; fixture é fonte dos valores, DTO valida o contrato, objeto 3D nunca é fonte de verdade.
- **Gate do piloto:** no mínimo 3 famílias de módulos, 1–2 telhados, 1 MPPT e 1 perfil de irradiância em `validated` (conferidos em smoke test na cena, ordem de grandeza sã) antes da execução das fases; o resto pode permanecer `planned`.
- **Sem fingir precisão real:** todo valor é mockado/genérico, com origem rastreável; nada aqui é validado contra fabricante, TMY ou PV*SOL.
