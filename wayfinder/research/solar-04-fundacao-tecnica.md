# Research — Validar fundação técnica React + R3F + simshady

**Ticket:** [Validar fundação técnica React + R3F + simshady](tickets/solar-04-fundacao-tecnica.md)  
**Tipo:** `wayfinder:research` (AFK)  
**Data:** 2026-09-07  
**Fontes:** npm + docs oficiais + GitHub open-pv (ver tabela abaixo)

> Achado de subagente paralelo da sessão de charting. Ticket permanece aberto; esta nota é o asset a linkar na resolução.

## Pins sugeridos para o scaffold

- `react ~19.2.x` + `@react-three/fiber ^9` (não v10) + `@react-three/drei ^10` (não v11) — regra fiber@9 ↔ react@19, peer `<19.3`.
- `three 0.185.x`, `vite ^8.2`, `@vitejs/plugin-react ^6`, `typescript ~5.9.3`, `zustand ^5`.
- `tailwindcss ^4.3.3` + `@tailwindcss/vite ^4.3.3`, `solar-spa ^2.0.2`, `@openpv/simshady ^0.2.1`, `recharts ^3`, `vitest ^4.1` (ou `^5` só com Node 24 pinado).
- `engines node >=22.12` (recomendado 24 LTS), `"type": "module"`. Bun fora.

## Restrições que viram decisão

- WebGL2 obrigatório para simshady, com fallback gracioso; slider com debounce; InstancedMesh; cálculos isolados em service/hook.
- Não scaffoldear `@openpv/irradiance` (não existe no npm; é notebook). Irradiância = fixture `SolarIrradianceData` mockada + `solar-spa`.
- Só MIT/Apache-2.0; não reutilizar `open-pv/website` (AGPL-3.0); manter atribuição NREL SPA.
- Mock-first genérico, export JSON do estado.

## Riscos top (detalhe no relatório do subagente)

1. React 19 × majors do R3F — pinar juntos.
2. simshady nicho + GPU-bound — isolar atrás de hook/service com flag sem GPU.
3. Vite 8 ESM-only × plugins — exigir Tailwind >=4.2.2 e plugin-react v6.
4. Vitest 5 recém-lançado — preferir ^4.1 por estabilidade.
5. Bun não testado neste caminho — Node LTS + npm/pnpm.

Relatório completo com URLs foi devolvido pelo subagente na sessão de charting e deve ser colado como comentário de resolução ao fechar o ticket.
