# Obspace Desktop Documentation

Esta documentacao e a fonte versionada para manutencao do Obspace Desktop. Ela explica o app de ponta a ponta sem depender do historico de conversa ou de arquivos pessoais.

## Mapa de leitura

- [Arquitetura geral](architecture/overview.md)
- [Fluxo de inicializacao](architecture/startup.md)
- [Fisica das notas](graph/physics.md)
- [Renderizacao, selecao e destaque](graph/rendering.md)
- [Pipeline de chat](chat/pipeline.md)
- [Pipeline AI2AI](ai2ai/pipeline.md)
- [Publicacao e release](release/publication.md)
- [Auditoria de publicacao](release/publication-audit.md)
- [Mapa do repositorio](repository-map.md)

## Etapas do projeto

- [01 - Descoberta](stages/01-discovery.md)
- [02 - Grafo](stages/02-graph.md)
- [03 - Chat](stages/03-chat.md)
- [04 - AI2AI](stages/04-ai2ai.md)
- [05 - Release](stages/05-release.md)

## Principios de publicacao

O repositorio nao deve conter vaults, notas pessoais, `.obsidian/`, logs, builds, releases, caches, `node_modules/`, sessoes brutas de ferramentas ou caminhos locais de maquina. Quando um caminho precisa ser documentado, use placeholders como `<VAULT_DIR>` ou variaveis de ambiente.
