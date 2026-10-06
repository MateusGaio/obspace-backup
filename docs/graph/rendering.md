# Graph Rendering

O componente `ObspaceGraph.jsx` cria uma instancia `ForceGraph3D` e delega objetos visuais para `graphScene.js`. A UI distingue selecao manual, conexoes da nota selecionada, notas citadas pela IA e trilhas de leitura recentes.

## Construcao visual

`createNodeObject(node)` monta:

- `THREE.Group` como container;
- esfera `MeshStandardMaterial` vermelha;
- sprite de label gerado em canvas;
- `userData` com referencias para o no, mesh e label.

O tamanho base usa `degree` para dar mais peso visual a notas muito conectadas.

## Estados de no

| Estado | Origem | Visual |
| --- | --- | --- |
| `default` | Sem selecao/IA. | Vermelho escuro, escala normal. |
| `origin` | Nota selecionada pelo usuario. | Vermelho vivo, escala maior. |
| `connected` | Vizinha da nota selecionada. | Vermelho medio, escala leve. |
| `ai` | Nota destacada por resposta. | Rosa forte. |
| `reading` | Nota ativa na telemetria atual. | Clara, emissiva e pulsante. |
| `reading-trail` | Nota lida recentemente. | Destaque suave temporario. |

## Labels

Labels aparecem por proximidade da camera, selecao, telemetria AI ou nota recem-criada. `updateLabelVisibility` calcula opacidade pela distancia:

- perto: opacidade quase total;
- longe: fade ate ocultar;
- selecionada/IA: opacidade minima maior;
- nota nova: forca visibilidade por alguns segundos.

## Selecao e links

`buildConnectionMap` cria um mapa bidirecional para saber quais nos sao vizinhos. Clique em uma nota atualiza somente a selecao manual; clique no fundo limpa a selecao manual e preserva `aiNodeIds` e `aiTrace`.

Links mudam cor/largura conforme:

- link ativo da leitura;
- link na trilha recente;
- link conectado a selecao;
- link conectado a no destacado pela IA;
- link normal.

## Zoom e orbita

O mouse wheel aplica zoom continuo por velocidade acumulada e damping. A orbita lenta move a camera em torno do target com pequena rotacao por frame. O controle por maos reutiliza as mesmas primitivas de camera via `applyOrbit` e `applyZoomScale`.

## Controle por maos

`gestureController.js` usa MediaPipe Hands:

- 4 ou mais dedos estendidos: orbita;
- 1 ou menos dedos estendidos: zoom;
- demais casos: neutro.

`gestureMath.js` calcula centro da palma, profundidade, deadzones, ganhos e limites. O processamento usa EMA de velocidade para reduzir ruido e deixar o movimento continuo.
