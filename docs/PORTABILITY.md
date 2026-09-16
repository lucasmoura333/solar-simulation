# Portabilidade — núcleo reutilizável × pontos injetáveis × camadas de grandeza

Guia curto para transplante deste protótipo num projeto maior. Princípios:

1. **Núcleo de domínio é puro** (sem SDK, sem UI).
2. Sol, clima e sombra entram por **portas injetáveis** (`src/core`).
3. **Grandezas em camadas**: potência/elétrica (kWp) é **fato de equipamento**;
   energia (kWh) é **resultado derivado** da simulação.

## Camadas de grandeza (por que a separação importa)

| Grandeza | Natureza | Exibição | Vive em |
|---|---|---|---|
| kWp / Wp / Vmp / Imp | fato de equipamento (catálogo + overrides) | painel técnico | `src/utils/ratings.ts`, `calculations.ts` |
| kWh (hora/dia/ano) | derivado da simulação (sombra + irradiância) | painel cliente | `src/utils/production.ts` (efêmero, nunca persistido) |
| Irradiância / posição solar | dado de entrada | HUD | portas (provedores) |

O próximo passo natural (strings, inversores, dimensionamento) continua na
camada de equipamento; energia e otimização continuam na camada derivada.

## O que é núcleo reutilizável

| Área | Arquivos | Observação |
|---|---|---|
| Modelos de cena/entidades (v2) | `src/types` | `Block`, `Water` (água paramétrica), `SolarModule` (âncora u/v), Mppt… |
| Matemática de blocos/águas | `src/utils/waterMath.ts` | superfície paramétrica, normal, pose de módulo, world/local |
| Malhas de exibição | `src/utils/geometry.ts` | bloco → paredes; água → plano (three só aqui) |
| Sombreamento (núcleo) | `src/utils/solarShading.ts` → `computeShadingFactors` | 100% injetado (blocos/águas/módulos + perfil + direção do sol) |
| Produção (energia) | `src/utils/production.ts` → `computeProduction` | irrad. × área × eficiência × fator; efêmero |
| Equipamento (potência) | `src/utils/ratings.ts` | kWp total / por MPPT |
| Métricas solares de água | `src/utils/solarMetrics.ts` | irradiância incidente p/ HUD |
| Migração v1→v2 | `src/utils/sceneMigration.ts` | telhado único → bloco + águas |
| Catálogo mockado | `src/fixtures` | dados versionáveis, schema estável |
| Export JSON | `src/export/serializer.ts` | envelope `solar-sim/export` **v2** (lê v1 e migra; Web Crypto p/ sha256) |
| Utilitários | `src/utils/calculations.ts`, `id.ts` | puras |

## Portas (contratos — o que você injeta)

Definidas em `src/core/providers.ts`:

- `SolarPositionProvider` → `getPosition({ hourFraction, dateUtc? }): { azimuthDeg, elevationDeg }`
- `IrradianceProvider` → `hourlyW_m2(): number[]` (24 amostras)
- `ShadingProvider` → `analyze({ blocks, waters, modules, solarPosition, irradiance }): ShadingAnalysisResult`
- `Providers` = composição das três; runtime em `src/core/runtime.ts` (`getProviders`/`setProviders`).

## Adaptadores de referência (`src/core/adapters`)

| Porta | Adapter | Implementação |
|---|---|---|
| Posição solar | `suncalcSolarPosition.ts` | suncalc v2 (NOAA, JS puro) |
| Irradiância | `catalogIrradiance.ts` | fixture `irr-clear-day-01` do catálogo |
| Sombreamento | `cpuRaycastShading.ts` | raycast CPU determinístico (Möller–Trumbore) |

## Substituindo no projeto maior (exemplos)

Posição real (SPA/NREL ou API) — 1 arquivo:

```ts
import { setProviders, getProviders } from "./src/core/runtime";

setProviders({
  ...getProviders(),
  solarPosition: { name: "spa/nrel", location: meuLocal,
    getPosition: (input) => nrelPosition(input) },
});
```

Irradiância real (TMY / PVGIS / Solcast):

```ts
setProviders({ ...getProviders(), irradiance: { name: "tmy/2023",
  hourlyW_m2: () => perfilDoDiaTMY } });
```

Sombra pesada (GPU/backend): implemente `ShadingProvider.analyze` com a mesma
assinatura — nada no núcleo muda (o contrato `ShadingAnalysisResult` — fator
por módulo por hora — é o único elo).

## História das trocas (por que estes adapters hoje)

1. `solar-spa` (WASM/NREL) quebrou no navegador (`createRequire` de
   `node:module`) → `suncalc` v2.
2. `@openpv/simshady` 0.2.2 produz NaN em séries temporais (T>1) →
   sombreamento por raycast CPU (mesmo contrato; GPU volta como adapter quando
   o upstream corrigir).
3. Modelo v2 (2026-09-07): `Roof` único virou **Bloco + Águas paramétricas** e
   módulos passaram a **âncoras (u/v)** com pose derivada — mudou a água,
   o módulo acompanha. Export v2 com leitura/migração de v1.

## O que NÃO transplanta

UI/componentes (`src/components`), stores de UI efêmeras e o canvas WebGL/R3F.
As stores de cena (`scene.v2`) e o export JSON são o contrato de dados — é por
eles que um sistema maior deve ler/escrever.
