# Stage 01 - Discovery

## O que foi construido

A fase de descoberta definiu o Obspace Desktop como app nativo separado de qualquer vault ou prototipo legado. A decisao central foi tratar o repositorio como produto desktop: Electron para acesso local, React para UI e Vite para build/dev.

## Por que foi construido

O app precisava ler arquivos locais, controlar janela, gerar PDF e integrar scripts/servicos Node. Um site puro nao cobria bem esses requisitos. Electron separa o renderer visual do processo principal com permissoes de filesystem.

## Partes conectadas

- `electron/main.cjs` e `electron/bootstrap/*` criam o processo desktop.
- `src/app/*` monta a experiencia principal.
- `electron/shared/runtime-config.cjs` centraliza configuracao via ambiente.
- `scripts/dev/*` permite desenvolvimento com reload e fallback HTTP.

## Decisoes

- Nao publicar vaults nem caminhos locais.
- Configurar runtime por `OBSPACE_*`.
- Manter `README.md` curto e docs tecnicas em `docs/`.
