# Stage 05 - Release

## O que foi construido

A fase de release organiza build Vite, pacote Electron portable, atalho Windows e publicacao GitHub privada com auditoria de arquivos.

## Por que foi construido

O projeto vive perto de um vault pessoal, mas o repositorio deve conter somente o app. O fluxo de release protege contra push acidental de notas, builds, logs, caches e caminhos locais.

## Como se conecta

- `npm run check` valida sintaxe Electron e build renderer.
- `npm run dist` cria portable em `release/`.
- `publish-desktop-release.cjs` copia o portable para a Area de Trabalho local.
- `.gitignore` mantem artefatos fora do Git.
- `docs/release/publication.md` define checklist de publicacao.

## Decisoes

- Repositorio privado no GitHub.
- Staging explicito; nunca `git add .`.
- Validacao em clone limpo antes de concluir.
- `docs/superpowers/` e planejamento interno ficam fora do push.
