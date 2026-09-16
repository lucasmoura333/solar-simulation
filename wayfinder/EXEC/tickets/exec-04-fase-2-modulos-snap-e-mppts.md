# Fase 2 — Inserção de módulos com snap e MPPTs

**Mapa:** [Solar Simulator — execução das 5 fases](../solar-execucao-map.md)  
**Tipo:** `wayfinder:task`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueado por:** [Fase 1 — Modelagem do telhado com transform controls](exec-03-fase-1-modelagem-do-telhado.md)  
**Bloqueia:** [Fase 3 — Configuração de módulos e painel lateral](exec-05-fase-3-configuracao-de-modulos.md)

## Question

Implementar a Fase 2 do Plan.txt (§4, Fase 2): componente SolarPanel como instância fina posicionável sobre o telhado com snap por raycast à superfície (decisão de mecânica fica nesta execução, com foco em simplicidade), módulos selecionáveis por clique, MPPT nodes como esferas posicionáveis, conexão módulo→MPPT por seleção simples (ex.: dropdown ou clique em sequência), tudo persistido em `scene.v1` (roof/module/mppt com `catalog_id`). Usar InstancedMesh para módulos iguais (mesma geometria, matriz por instância). Gate: `npm run build` ok + módulos grudam no telhado e conectam a MPPT no navegador + reload preserva a cena.

## Mecânica decidida nesta execução (2026-09-07)

- **Snap**: `position_m`/`rotation_deg` de módulos são coordenadas **locais da edificação** (seguem o gizmo da Fase 1). Inserção por clique no telhado: ponto do raycast convertido para local → `y` reposicionado sobre a superfície do plano + folga de meia espessura (`t/2/cos(tilt)`); `rotation_deg.x` = inclinação da face (±tilt no gable conforme sinal de z; −tilt no shed). Parâmetros seguem fonte de verdade.
- **Movimento**: `TransformControls` único sobre um "handle" virtual em coordenadas de mundo sincronizado com a store; em `onObjectChange` grava-se de volta (roof → `place`/`orientation_deg`; módulo → x/z local + re-snap; mppt → x/z local preservando y).
- **Conexão módulo→MPPT**: dropdown por módulo no painel lateral + linhas 3D na cena (rota de retorno visual simples). `Mppt` ganha `place?: Vec3` opcional (export v1 segue válido — sem `place` no exemplo).
- **Auto-heal**: módulos importados/seed com `y` abaixo da superfície (ex.: exemplo `scn-001` conceitual) são re-snapped uma única vez na hidratação.

## Resolução (2026-09-07)

Executado com aval do dono; gate visual aprovado no navegador (módulos grudam, gizmo re-snapa, MPPT move, conexão por dropdown + linha, reload preserva tudo). Fatos:

- `src/utils/placement.ts`: superfície/pitch do plano no frame local, snap com folga de meia espessura, `localToWorld`/`worldToLocal` do yaw do telhado, clamp ao plano. 20 testes no total (10 novos em `placement.test.ts` incl. roundtrip do yaw).
- Geometria do telhado "uma água" (`roof-shed-01`) corrigida: a rampa da Fase 1 tinha malha dobrada (empena dupla vertical, nunca vista no gate) — agora é um plano inclinado real; testes de superfície travam a convenção.
- `Building.tsx`: sem gizmo próprio; mesh do telhado emite hover (fantasma amarelo inclinado) e clique de inserção; paredes selecionam a edificação. `SolarPanels.tsx` (InstancedMesh por família, 1 draw call/família, seleção por `instanceId`, cor base/sei); `MpptNodes.tsx` (esferas); `WireLines.tsx` (linha amarela módulo→MPPT); `SelectionControls.tsx` (handle virtual + TransformControls único para roof/módulo/MPPT).
- `Mppt.place?` opcional validado no export; `sceneStore` ganha `deleteMppt` (desconecta módulos), `deleteModule`, `setModuleMppt`; `uiStore` ganha `selection`/`placementFamily`/`hoverLocal` (efêmeros).
- Painel unificado `ProjectPanel` (edificação/módulos/MPPTs) substitui `RoofPanel`. Commit `4bda2c3`.
