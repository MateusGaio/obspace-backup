# Repository Map

## Raiz

| Caminho | Publicar? | Proposito |
| --- | --- | --- |
| `README.md` | publicar | Entrada do projeto e links para docs. |
| `package.json` | publicar | Scripts NPM, dependencias e config electron-builder. |
| `package-lock.json` | publicar | Lockfile para reproducibilidade com `npm ci`. |
| `index.html` | publicar | HTML base do Vite. |
| `.gitignore` | publicar | Exclui builds, caches, vaults e temporarios. |

## Codigo do app

| Caminho | Proposito | Dependencias |
| --- | --- | --- |
| `src/app/` | Estado e composicao principal da UI. | React, `obspaceApi`, features. |
| `src/features/graph/` | Cena 3D, fisica, rendering e modelo de parametros. | Three.js, 3d-force-graph. |
| `src/features/chat/` | Painel Soyuz, anexos, modos, preview AI2AI, PDF. | `obspaceApi`, React. |
| `src/features/camera/` | Controle por maos e matematica de gestos. | MediaPipe, Three.js. |
| `src/shared/api/` | Ponte renderer para Electron ou fallback browser. | `window.obspace`, fetch. |
| `src/shared/ui/` | Tela inicial e UI compartilhada. | React. |

## Electron

| Caminho | Proposito | Entradas/Saidas |
| --- | --- | --- |
| `electron/main.cjs` | Entrypoint main process. | Chama bootstrap. |
| `electron/bootstrap/create-window.cjs` | Cria `BrowserWindow`. | Carrega dev URL ou `dist/index.html`. |
| `electron/bootstrap/register-ipc.cjs` | Contratos IPC. | Conecta renderer aos services. |
| `electron/preload.cjs` | Expoe `window.obspace`. | IPC invocations. |
| `electron/shared/runtime-config.cjs` | Defaults e ENV. | `OBSPACE_*` para config final. |
| `electron/services/runtime-settings.cjs` | Persiste o vault escolhido pela interface. | `app.getPath("userData")/runtime-settings.json` para `vaultDir`. |
| `electron/services/graph/` | Indexacao, wikilinks, leitura e escrita de notas. | `<VAULT_DIR>` para `nodes/links`. |
| `electron/services/ollama.cjs` | Chat, contexto, modelos e telemetria. | Ollama HTTP para resposta. |
| `electron/services/attachments.cjs` | Extracao de anexos. | Arquivos locais para texto/base64. |
| `electron/services/ai2ai.cjs` | Preview de notas AI2AI. | Agente externo para JSON/fallback. |
| `electron/services/web-search.cjs` | Busca online simples. | DuckDuckGo HTML. |
| `electron/services/shortcut.cjs` | Atalho Windows em runtime. | `.lnk` local. |

## Scripts e assets

| Caminho | Proposito |
| --- | --- |
| `scripts/dev/` | Dev server Vite + Electron e runner de build. |
| `scripts/assets/generate-icon.py` | Gera icones do app. |
| `scripts/windows/create-desktop-shortcut.cjs` | Cria atalho local para dev/release. |
| `scripts/windows/publish-desktop-release.cjs` | Copia portable para Desktop local. |
| `scripts/windows/ObspaceLauncher.cs` | Launcher opcional Windows sem caminho pessoal. |
| `assets/` | Icones do app. |

## Itens excluidos intencionalmente

`data/`, `dist/`, `release/`, `node_modules/`, `app_extracted/`, `.obsidian/`, `.venv/`, logs, caches, temporarios e vaults reais nao pertencem ao repositorio publicado.
