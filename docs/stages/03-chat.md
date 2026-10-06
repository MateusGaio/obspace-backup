# Stage 03 - Chat

## O que foi construido

O Soyuz e o painel de chat do Obspace. Ele conversa com modelos via Ollama, injeta contexto do vault, processa anexos, gera PDF quando solicitado e destaca no grafo as notas usadas como contexto.

## Por que foi construido

O fluxo principal e perguntar ao vault sem exigir que o usuario abra nota por nota. O chat age como interface de leitura e sintese, e o grafo mostra visualmente de onde a resposta veio.

## Como se conecta

- `ChatPanel.jsx` coleta mensagem, modo e anexos.
- `preload.cjs` envia `chat:send`.
- `register-ipc.cjs` busca grafo cacheado e processa anexos.
- `ollama.cjs` monta prompt, contexto e chamada HTTP.
- `ObspaceGraph.jsx` recebe telemetria de leitura e destaque.

## Decisoes

- Offline nao usa web.
- Online pode adicionar busca web.
- Contexto textual e maior que o destaque visual.
- PDF e gerado por Electron com `printToPDF`, nao por servico externo.
