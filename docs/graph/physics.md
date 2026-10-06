# Graph Physics

O grafo usa `3d-force-graph`, `three` e forcas D3 internas para posicionar notas. Cada nota e um no 3D; cada wikilink resolvido e um link. A fisica busca equilibrio entre repulsao, distancia dos links e uma forca centripeta customizada para manter o conjunto navegavel.

## Parametros

`src/features/graph/model/physics.js` define os defaults:

| Parametro | Efeito | Default |
| --- | --- | --- |
| `centerStrength` | Puxa todos os nos para a origem. | `0.06` |
| `repulsion` | Aumenta afastamento entre nos. | `240` |
| `linkStrength` | Intensidade da mola dos links. | `0.05` |
| `linkDistance` | Distancia alvo entre notas ligadas. | `180` |
| `nodeSize` | Escala visual das esferas. | `1` |
| `linkWidth` | Escala visual das arestas. | `1` |

## Forca centripeta

`createCenterForce(strength)` em `graphPhysics.js` adiciona uma forca que atualiza `vx`, `vy` e `vz` em direcao a `(0, 0, 0)`:

```text
pull = strength * alpha
node.vx += (0 - node.x) * pull
node.vy += (0 - node.y) * pull
node.vz += (0 - node.z) * pull
```

Essa forca evita que subgrafos desconectados escapem para longe. Como ela depende de `alpha`, fica mais forte quando a simulacao esta quente e suaviza ao estabilizar.

## Links como molas

`ObspaceGraph.jsx` ajusta `d3Force("link")` com `distance(physics.linkDistance)` e `strength(physics.linkStrength)`. Links longos deixam o grafo mais aberto; link strength alto aproxima notas conectadas com mais agressividade.

## Repulsao

`d3Force("charge").strength(-Math.abs(physics.repulsion))` empurra nos para fora. Valores maiores separam clusters e reduzem sobreposicao; valores baixos deixam o grafo compacto.

## Reaquecimento

Quando algum parametro muda, `fg.d3ReheatSimulation()` reinicia a busca de equilibrio. Isso permite que sliders reajam sem recriar a cena inteira.

## Fisica e leitura da IA

A telemetria da IA nao muda a simulacao. Ela muda apenas cor, emissao, escala visual, largura dos links e particulas. Assim, uma resposta do chat pode mostrar o caminho de leitura sem deslocar as notas.
