# Stub — contrato de persistência local (Zustand + IndexedDB)

**Ticket:** [Escolher contrato de persistência local (Zustand + IndexedDB)](../tickets/solar-07-persistencia-local.md)  
**Natureza:** asset de prototype (stub barato para reação; não é implementação)

## Banco e chaves

```text
IndexedDB: "solar-sim"   version: 1

object store "kv"          (Zustand persist, um registro por chave)
  chaves:
    scene.v1      →  { building, roofs, modules, mppts }          (persistido)
    settings.v1   →  { unit, locale, webgl_ok }                    (persistido)
    ui.v1         →  EFÊMERO — nunca grava (seleção, câmera)

object store "assets"      (reservado desde já, vazio no 1º ciclo)
  chave: hash do asset (sha256); registro: { mimetype, size, blob }
  destino futuro: texturas/GLB fora do bundle, aliviando o peso
```

## Fatias: persistir vs. efêmero

| Fatia | Store | Decisão proposta |
|---|---|---|
| Edição da cena (roofs/modules/mppts/positions) | sceneStore | persistir |
| Conexões módulo→MPPT | sceneStore | persistir (mesma chave) |
| Seleção/câmera/ferramenta ativa | uiStore | efêmero |
| Resultados de simulação (shading/kWh) | simulationStore | efêmero + `kind: derived` (regenerável; coerente com a camada 3 leve) |

## Gatilho de gravação (proposta)

- `persist` do Zustand com storage adapter IDB + `partialize` (só scene/settings);
- auto-save com debounce ~300 ms por mutação;
- flush síncrono em `pagehide`/`visibilitychange: hidden`;
- fila serial de escritas (uma transação por vez) para nunca corromper;
- nada de `ui`/resultados no disco.

## Versionamento

- DB version em `src/db.ts` com migrações `v1 → vN` (upgrade event);
- cada chave versionada no próprio nome: `scene.v1` → `scene.v2` mantém a v1 lida até migrar;
- contrato de export JSON é INDEPENDENTE do schema interno (solar-06): migração interna nunca muda o envelope `solar-sim/export` v1 sem bump explícito de `version`.

## Re-hidratação e export

- load: ler `scene.v1`, validar contra DTO (schema TS), migrar se preciso, hidratar stores;
- export: gerado a partir do estado validado, nunca do objeto bruto do IDB;
- import (reinjeção futura): upsert por id + hash, conforme solar-06.

## Assets (evolução sem quebra)

- `assets` reservado agora com hash como chave e metadata;
- contrato de export continua sem blobs: export referencia asset por hash (`asset_refs`),
  quem reinjeta decide onde materializar; nada no JSON fica pesado.
