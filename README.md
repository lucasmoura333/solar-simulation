# Solar Simulator

Protótipo de estudo para simulação fotovoltaica no navegador, reinjetável depois em um projeto maior e robusto. Este README é o ponto único de retomada: resume direção, ambiente, roadmap e referências.

## Direção atual

```text
Blocos → águas (planos) → módulos ancorados → sol/sombra (mock) → kWh (cliente) + kWp (técnico)
```

- No corte atual, tudo é genérico com valores mockados: sem TMY, sem inversores reais, sem APIs pagas.
- **Modelo v2**: cada bloco recebe águas paramétricas independentes (altura/inclinação por água); módulos são âncoras (u/v) na água, com rotação no plano, inclinação própria (colado/livre) e dimensões próprias — pose 3D derivada.
- **Grandezas separadas**: energia em kWh (cliente, sempre) vs potência kWp (técnico, fato de equipamento); MWh fora do domínio.
- Stack instalada: React 19.2 + Vite 8 + TypeScript 5.9, Three.js via React Three Fiber v9 + drei v10, Zustand 5, Tailwind v4, suncalc (posição solar), Recharts, Vitest 5.
- Estado exportável em JSON para reinjeção futura (contrato **v2**, lê v1 e migra); domínio não conhece SDKs externos — cálculo de sol/sombra/clima entra por **portas injetáveis** (`src/core`, ver [docs/PORTABILITY.md](docs/PORTABILITY.md)).
- Técnica de organização emula a de um ERP de referência: taxonomia explícita + catálogo versionável + fixtures antes de qualquer dado real.

## Checkpoint atual

| Frente | Estado |
|---|---|
| Plano de origem | `Plan.txt` com 5 fases + evoluções preservado como evidência |
| Mapa Wayfinder | `wayfinder/solar-simulator-map.md` fechado — 7 decisões registradas |
| Destino/piloto | fechado: 5 fases cruas, papel único de estudo/demo, persistência local desde o início |
| Fundação técnica | fechado (research): pins React 19.2 + R3F v9 + three 0.185 + simshady 0.2 |
| Taxonomia mockada | fechada: 4 famílias (módulos, telhados, MPPT, irradiância), schema de ERP 1:1 |
| Grafos | fechado: cena + catálogo derivado + resultados leves; snapshot com hash + changelog |
| Persistência | fechado: scene+settings no IndexedDB, auto-save+flush, store `assets` reservado |
| Export JSON | fechado: envelope + 5 grupos de entidades, upsert por id+hash |
| Código | scaffold commitado (`40a5ebe`); `npm run dev` em http://localhost:5173 |
| Remoto GitHub | `origin` → `lucasmoura333/solar-simulation` |
| Execução 5 fases | novo esforço em `wayfinder/EXEC/`; fronteira: Montar fundação de estado e persistência local |

## Rodar localmente

```powershell
npm install
npm run dev
```

Abra <http://localhost:5173>.

- Cena vazia com grid + orbit controls como gate do scaffold.
- Depois: telhado inclinado, snap de módulos, painel lateral, slider solar, kWh simplificado.
- Requer navegador com WebGL2; notebook médio com Intel UHD como referência de 30 FPS.

## Decisões registradas

| Decisão | Estado | Referência |
|---|---|---|
| Fundação React+R3F+simshady | fechada (research) | [solar-04](wayfinder/tickets/solar-04-fundacao-tecnica.md) |
| Destino e primeiro piloto visível | fechada | [solar-01](wayfinder/tickets/solar-01-destino-e-piloto.md) |
| Taxonomia e catálogo mockado | fechada | [solar-02](wayfinder/tickets/solar-02-taxonomia-e-catalogo.md) |
| Estratégia de grafos e evolução | fechada | [solar-03](wayfinder/tickets/solar-03-estrategia-de-grafos.md) |
| Modelo mockado e export JSON | fechada | [solar-06](wayfinder/tickets/solar-06-modelo-mockado-e-export.md) |
| Contrato de persistência local (Zustand+IDB) | fechada | [solar-07](wayfinder/tickets/solar-07-persistencia-local.md) |
| Scaffold e padrões GitHub | aberto (fronteira) | [solar-05](wayfinder/tickets/solar-05-scaffold-e-github.md) |

## Roadmap por checkpoints

1. **Destino/piloto** — fechado: 5 fases cruas, papel único, persistência local desde o início. ✔
2. **Taxonomia mockada** — fechada: 4 famílias em fixtures + INDEX, schema de ERP. ✔
3. **Grafos** — fechado: cena + catálogo derivado + resultados leves, snapshot+changelog. ✔
4. **Persistência local** — fechado: scene+settings no IDB, auto-save+flush, DB version. ✔
5. **Fundação** — fechado (research): matriz de compatibilidade da stack. ✔
6. **Scaffold** — fechado: repo `main` commitado `40a5ebe`, dev server em :5173. ✔
7. **Modelo mockado** — fechado: envelope + 5 grupos de entidades, upsert por id+hash. ✔
8. **Execução das 5 fases** — fora deste mapa; entra quando você injetar o plano apropriado.

## Mapa de referências

| Área | Documento de entrada |
|---|---|
| Plano original + evoluções | [Plan.txt](Plan.txt) |
| Mapa Wayfinder (fechado, 7 decisões) | [wayfinder/solar-simulator-map.md](wayfinder/solar-simulator-map.md) |
| Índice Wayfinder | [wayfinder/INDEX.md](wayfinder/INDEX.md) |
| Protótipos/assets de decisão | [wayfinder/prototypes](wayfinder/prototypes) |
| Padrão replicado | `outro projeto de estudo` (README como retomada, `wayfinder/` com mapa + tickets) |

## Segurança e versionamento

- Não versione `.env`, credenciais de clima/mapas, dados produtivos ou chaves de API.
- Todo mock vive em fixtures versionadas; nenhum dado de cliente entra aqui.
- Confirme que o remoto permanece privado se houver requisito de sigilo.
