# Obspace Desktop

Obspace Desktop é um app Electron + Vite + React para explorar um vault Markdown/Obsidian como um grafo 3D, conversar com modelos via Ollama, gerar notas AI2AI e exportar respostas em PDF.

Este repositório é a fonte canônica do app desktop. Ele não inclui vaults, notas pessoais, logs, caches, pastas de build, releases completas ou agentes externos. A única exceção versionada é `portable/Obspace.exe`, executável portátil aprovado para quem baixar o repositório privado já poder iniciar o app.

## Uso imediato

Baixe o repositório privado pelo GitHub, extraia o ZIP e execute:

```text
portable/Obspace.exe
```

Por padrão, o app usa `%USERPROFILE%\Documents\ObspaceVault` como vault seguro. Para usar outro vault local, clique em `Trocar vault` na sidebar do Obspace ou defina `OBSPACE_VAULT_DIR` antes de iniciar o executável.

## Documentação

A documentação técnica versionada fica em [docs/README.md](docs/README.md). Comece por ali para entender:

- arquitetura Electron/Vite/React;
- fluxo de inicialização;
- grafo, física das notas, seleção, zoom, órbitas e destaques;
- chat online/offline, anexos, PDF e pipeline AI2AI;
- publicação GitHub, release Windows e exclusões intencionais;
- etapas históricas do projeto.

## Comandos

```powershell
npm install
npm run icon
npm run dev
```

Build portable:

```powershell
npm run dist
```

O pacote Windows atual é portable e gera artefatos em `release/`. Depois de validar `release/Obspace.exe`, copie somente esse arquivo para `portable/Obspace.exe` quando quiser atualizar o executável versionado. Para copiar o executável para a Área de Trabalho e recriar o atalho local:

```powershell
npm run release:desktop
```

Em desenvolvimento, depois de instalar dependências, use `npm run shortcut` se quiser criar um atalho que aponta para o Electron local.

## Configuração

Pela interface do app, use `Obspace > Trocar vault` para escolher a pasta lida e escrita pelo grafo, chat e AI2AI. A escolha fica salva localmente no perfil do aplicativo e será reutilizada nas próximas aberturas do `.exe`.

O app aceita variáveis de ambiente para evitar caminhos locais hardcoded:

| Variável | Propósito | Default seguro |
| --- | --- | --- |
| `OBSPACE_VAULT_DIR` | Pasta do vault Markdown usado para leitura e escrita de notas. | `%USERPROFILE%\Documents\ObspaceVault` |
| `OBSPACE_AI2AI_NOTES_DIR` | Subpasta do vault onde notas AI2AI são gravadas. | `AI2AI` |
| `OBSPACE_AI2AI_AGENT_DIR` | Pasta do agente AI2AI externo, quando usado. | `%USERPROFILE%\Documents\obsidian-ai2ai-agent` |
| `OBSPACE_OLLAMA_HOST` | Host HTTP do Ollama. | `http://localhost:11434` |
| `OBSPACE_OFFLINE_MODEL` | Modelo usado no modo offline. | `llama3.2:3b` |
| `OBSPACE_ONLINE_MODEL` | Modelo usado no modo online. | `gemma4:31b-cloud` |

```powershell
$env:OBSPACE_VAULT_DIR = Join-Path $env:USERPROFILE "Documents\ObspaceVault"
$env:OBSPACE_OLLAMA_HOST = "http://localhost:11434"
$env:OBSPACE_OFFLINE_MODEL = "llama3.2:3b"
$env:OBSPACE_ONLINE_MODEL = "gemma4:31b-cloud"
$env:OBSPACE_AI2AI_AGENT_DIR = Join-Path $env:USERPROFILE "Documents\obsidian-ai2ai-agent"
```

## Fluxos

- `Research`: chat-first sobre vault e anexos; no modo online, tenta busca web via DuckDuckGo HTML sem chave externa.
- `Note Creation`: usa `gemma4:31b-cloud` no modo online, chama o agente AI2AI, gera preview de notas Markdown com wikilinks e grava no vault somente após confirmação.
- Camera: inicia desligada; o botão `Ativar câmera` liga o controle por mãos.

## Escopo publicado

O repositório publica código, assets, scripts, documentação técnica e o executável portátil aprovado em `portable/Obspace.exe`. Diretórios como `data/`, `dist/`, `release/`, `node_modules/`, `app_extracted/`, `.obsidian/`, `.venv/` e qualquer vault real ficam fora do Git por segurança.
