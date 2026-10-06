# Stage 04 - AI2AI

## O que foi construido

O modo `Note Creation` gera previews de notas AI2AI a partir de tema e anexos. O usuario revisa o preview antes de gravar Markdown no vault.

## Por que foi construido

Criacao automatica de notas tem risco de poluir ou sobrescrever conhecimento. O preview-before-commit reduz esse risco e deixa o usuario controlar quando a escrita acontece.

## Como se conecta

- `ChatPanel.jsx` alterna de `Research` para `Note Creation`.
- `notes:create-preview` chama `createAi2AiPreview`.
- `ai2ai.cjs` prepara fonte, contexto e agente externo.
- `vault-notes.cjs` sanitiza caminhos e grava notas confirmadas.
- O grafo e reindexado depois do commit.

## Decisoes

- Agente AI2AI nao e publicado neste repo.
- Caminhos ficam configuraveis por ambiente.
- Falha do agente gera fallback estrutural com warning.
- Escrita sempre fica abaixo de `<VAULT_DIR>/<OBSPACE_AI2AI_NOTES_DIR>`.
