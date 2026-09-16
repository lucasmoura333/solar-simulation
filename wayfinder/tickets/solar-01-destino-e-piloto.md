# Definir destino e primeiro piloto visível no navegador

**Mapa:** [Solar Simulator — protótipo visível no navegador para estudos](../solar-simulator-map.md)  
**Tipo:** `wayfinder:grilling`  
**Status:** fechado  
**Assignee:** opencode  
**Bloqueia:** `solar-02-taxonomia-e-catalogo`, `solar-03-estrategia-de-grafos`, `solar-05-scaffold-e-github`, `solar-07-persistencia-local`

## Question

Qual é o recorte mínimo que conta como "minimamente visível no navegador" para material de estudo? Escolher a hipótese concreta de piloto (uma edificação com telhado inclinado, módulos com snap, MPPTs, slider solar, cálculo simplificado), os papéis envolvidos, o evento que inicia o fluxo, o resultado mensurável (30 FPS, kWh com ordem de grandeza correta) e o que fica explicitamente fora desse primeiro recorte.

## Resolução (2026-09-07)

Grill HITL com o dono do esforço. Decisões:

- **Recorte:** as 5 fases do Plan.txt em versão crua ("quadrada"), uma única edificação com telhado inclinado simples: modelagem do telhado → módulos com snap + configuração (Wp/V/eficiência) → conexão a MPPT nodes → slider solar (solar-spa) com sombras simshady na GPU (debounce) → kWh simplificado com irradiância mockada + gráfico Recharts.
- **Persistência:** Zustand persist + IndexedDB desde o início; cena/edição sobrevivem a reload; export JSON do estado permanece como saída estável para reinjeção; assets pesados (texturas/GLB) podem migrar para IndexedDB depois sem mudar o contrato (detalhe de contrato vira ticket próprio: Escolher contrato de persistência local).
- **Papéis:** um papel de estudo (dono), com demo posterior a engenheiro/consultor PV; sem multiusuário, conta, tenant ou backend.
- **Evento que inicia o fluxo:** abrir a página → desenhar/ajustar telhado → posicionar módulos (snap) → conectar a MPPTs → arrastar o slider solar → ler sombra + kWh.
- **Resultado mensurável:** ciclo completo utilizável; 30 FPS em notebook médio (Intel UHD); kWh com ordem de grandeza correta; cena reencontrada após reload via IndexedDB; estado exportável em JSON.
- **Fora deste recorte:** TMY real, inversores reais + string sizing, importação por mapa/endereço, relatórios PDF/BIM, comparativo what-if, qualquer backend — permanecem no fog do mapa.
