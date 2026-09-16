# Fase 1 — Modelagem do telhado com transform controls

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Catalogar fixtures mockadas das 4 famílias](exec-02-catalogo-fixtures.md)  
**Bloqueia:** [Fase 2 — Inserção de módulos com snap e MPPTs](exec-04-fase-2-modulos-snap-e-mppts.md)

## Question

Implementar a Fase 1 do Plan.txt (§4, Fase 1): componente Building com uma edificação de telhado inclinado (duas águas) usando geometria simples (poucos polígonos), controles de transformação (move/scale/rotate do drei) para ajustar o telhado, parâmetros (orientação/inclinação/dimensões) persistidos na `scene.v1` (store da fundação) e consumo do template de telhado catalogado na Fase 2 do catálogo como base default. Gate: `npm run build` ok + telhado visível e manipulável no navegador + reload preserva as dimensões.

## Resolução (2026-09-07)

Executado com aval do dono; gate visual aprovado no navegador (edificação renderiza, gizmo move/gira, malha atualiza com parâmetros, reload preserva tudo). Fatos:

- `src/utils/geometry.ts`: `buildRoofGeometry(roof)` — malha derivada dos parâmetros persistidos (gable com fechamentos + shed), DoubleSide; `roofCenterY` para referência futura de snap.
- `src/components/3D/Building.tsx`: seed automático via `seedDefault()` (template `roof-gable-01`, ids iguais ao `scn-001`); TransformControls (drei) modos mover/girar que escrevem de volta em `roof.place` (x/z, y preso ao chão) e `orientation_deg` — parâmetros continuam fonte de verdade.
- `src/components/UI/RoofPanel.tsx`: troca de template (aplica defaults da fixture), largura/fundo/pé-direito/orientação numéricos, slider de inclinação 0–60°, exibição da posição do gizmo.
- `src/stores/uiStore.ts` (efêmero, não persistido): `toolMode` translate/rotate.
- Tipos: `Roof.place?` opcional (x/z) — export v1 segue compatível (guarda valida place se presente; exemplo `scn-001` intacto).
- Gate técnico: typecheck limpo, 10/10 testes, build ok. Commit `79bd55b`.
