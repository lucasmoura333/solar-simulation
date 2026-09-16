# Montar scaffold do repo e padrões GitHub

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Definir destino e primeiro piloto visível no navegador](solar-01-destino-e-piloto.md), [Escolher contrato de persistência local (Zustand + IndexedDB)](solar-07-persistencia-local.md)

## Question

Executar o scaffold mínimo replicando os padrões do outro repositório (Odoo): README como ponto único de retomada, INDEX de navegação, `wayfinder/` com mapa + tickets, `.gitignore` sem segredos, estrutura `src/` conforme Plan.txt, remote GitHub criado (privado por padrão) com branch inicial. Resolvido quando `npm run dev` abre a cena vazia e o repo está versionado sem `.env`, credenciais ou dados produtivos.

## Resolução (2026-09-07)

Executado com aval do dono. Fatos:

- **Repo git** inicializado em `local` (branch `main`), identidade local `Lucas Moura`. Commit inicial `40a5ebe` contém scaffold + wayfinder/ + Plan.txt + README; sem `.env`, credenciais ou dados produtivos (`.gitignore` cobre node_modules/dist/.env/secrets).
- **Stack instalada** conforme a pesquisa de fundação, com um desvio: `vitest ^5.0.0` no lugar de `^4.1` (vitest@4 quebrava o arborist do npm com vite 8; vitest 5 suporta vite 8 e Node 22.12+). Pins reais: react ~19.2.8, fiber ^9.7.0, drei ^10.7.8, three ^0.185.1, zustand ^5.0.15, simshady ^0.2.2, solar-spa ^2.0.2, vite ^8.2.2, tailwindcss ^4.3.3, typescript ~5.9.3.
- **Estrutura `src/`** conforme Plan.txt: `components/3D/Scene.tsx` (Canvas + Grid + OrbitControls), `components/UI/WebGLFallback.tsx`, `types/`, `utils/webgl.ts` (detecção WebGL2), `App.tsx`, `main.tsx`, `index.css` (Tailwind v4 via plugin).
- **Gate técnico ok:** `npm run build` compila (tsc + vite); `npm run dev` sobe Vite 8.2.2 em http://localhost:5173. Confirmação visual da cena vazia + fallback WebGL2 fica com o dono.
- **Remote GitHub:** `origin` configurado como `https://github.com/lucasmoura333/SolarSimulator.git`. `gh` CLI não está instalado e o repo ainda não existe no GitHub → ação manual pendente do dono: criar repo privado vazio `SolarSimulator` em github.com/new e rodar `git push -u origin main` (checklist entregue na sessão).
