---
tags:
  - solar
  - stack
  - research
kind: decision
status: planned
target: prototype
next: fixture
---

# Validar fundação técnica React + R3F + simshady

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:research`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueia:** [Montar scaffold do repo e padrões GitHub](solar-05-scaffold-e-github.md)

## Question

Quais versões concretas de React + Vite + TypeScript, three + React Three Fiber + drei, Zustand, Tailwind/Radix, solar-spa, @openpv/simshady e Recharts são compatíveis hoje para o MVP (WebGL2, GPU, InstancedMesh, slider sem congelar UI), e quais restrições de performance e licenciamento precisam virar decisão antes do scaffold? Levantar docs oficiais, matriz de compatibilidade e riscos, sem implementar a cena.

## Resolução (2026-09-07)

Asset: [research/solar-04-fundacao-tecnica.md](../research/solar-04-fundacao-tecnica.md). Fatos levantados por subagente AFK contra npm, docs oficiais e repositórios open-pv:

- Pins sugeridos para o scaffold: `react ~19.2.x`, `@react-three/fiber ^9` (fiber@9 ↔ react@19), `@react-three/drei ^10`, `three 0.185.x`, `zustand ^5`, `vite ^8.2`, `@vitejs/plugin-react ^6`, `typescript ~5.9.3`, `tailwindcss ^4.3.3` + `@tailwindcss/vite ^4.3.3`, `solar-spa ^2.0.2`, `@openpv/simshady ^0.2.1`, `recharts ^3`, `vitest ^4.1`. Node LTS (`>=22.12`), `"type": "module"`; Bun fora do escopo deste protótipo.
- WebGL2 é obrigatório para o simshady (sem fallback CPU) → detecção + fallback gracioso na cena, slider com debounce, InstancedMesh para módulos.
- `@openpv/irradiance` não existe como pacote npm (é notebook) → irradiância entra como fixture `SolarIrradianceData` mockada + `solar-spa` para posição solar.
- Licenças MIT/Apache-2.0 nas dependências; não reutilizar código de `open-pv/website` (AGPL-3.0); manter atribuição NREL SPA.
- 5 riscos mapeados com mitigação (React19×R3F majors, simshady nicho/GPU, Vite 8 ESM-only × plugins, Vitest 5 recém-lançado, Bun × Node).

Nenhuma decisão foi fechada aqui: os pins são fatos e restrições propostas que o scaffold deve consumir ao ser executado.
