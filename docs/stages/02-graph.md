# Stage 02 - Graph

## O que foi construido

O grafo transforma Markdown em nos e wikilinks em arestas. A UI renderiza notas como esferas 3D, links como linhas dinamicas e labels como sprites.

## Por que foi construido

O objetivo era navegar conhecimento por relacoes, nao apenas por lista de arquivos. Wikilinks do Obsidian ja expressam essas relacoes, entao o indexador reaproveita a estrutura do vault sem exigir banco de dados.

## Como funciona

1. `collectMarkdownFiles` percorre `<VAULT_DIR>`.
2. `extractWikiTargets` identifica `[[links]]`.
3. `resolveTargetIds` resolve links por caminho, nome e contexto de pasta.
4. `buildGraph` gera `nodes`, `links` e `stats`.
5. `ObspaceGraph` entrega dados ao `ForceGraph3D`.

## Decisoes

- Ignorar `.obsidian`, `.git`, `node_modules`, lixeira e agente AI2AI.
- Separar fisica (`graphPhysics.js`) de visual (`graphScene.js`).
- Usar telemetria visual para leitura da IA sem alterar a simulacao fisica.
