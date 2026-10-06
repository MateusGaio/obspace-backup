# Publication Audit

Esta auditoria registra o escopo aprovado para publicacao privada do Obspace Desktop. Ela deve ser revisada antes de cada commit de release.

## Publicar

Codigo e configuracao do app:

- `.gitignore`
- `README.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `assets/icon.ico`
- `assets/icon.png`
- `assets/icon.svg`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/bootstrap/`
- `electron/services/`
- `electron/shared/runtime-config.cjs`
- `src/`
- `scripts/assets/`
- `scripts/dev/`

Documentacao tecnica:

- `docs/README.md`
- `docs/architecture/`
- `docs/graph/`
- `docs/chat/`
- `docs/ai2ai/`
- `docs/release/`
- `docs/stages/`
- `docs/repository-map.md`

## Publicar se necessario

Estes itens sao uteis para manutencao/release e foram incluidos quando nao expunham dados pessoais:

- `electron/services/__tests__/`
- `electron/services/text-normalizer.cjs`
- `scripts/windows/create-desktop-shortcut.cjs`
- `scripts/windows/publish-desktop-release.cjs`
- `scripts/windows/ObspaceLauncher.cs`

Regras aplicadas:

- caminhos locais foram substituidos por defaults genericos ou variaveis `OBSPACE_*`;
- o pacote nao inclui agente externo fora do repositorio;
- scripts Windows que escrevem fora do repo sao documentados como comandos locais, nao CI.

## Excluir do push

Nunca publicar:

- `Notas/` ou qualquer vault real;
- `.obsidian/`;
- `.venv/`;
- `data/`;
- `app_extracted/`;
- `dist/`;
- `release/`;
- `node_modules/`;
- logs `*.log`;
- caches e temporarios;
- `docs/superpowers/`;
- sessoes brutas de ferramentas;
- arquivos com caminhos pessoais de maquina.

## Evidencia de sanitizacao

A publicacao deve passar por varredura antes de commit e depois do clone limpo. Padroes minimos:

```powershell
Select-String -Path <arquivos-publicados> -Pattern "<nome-real>","<workspace-local>","<vault-local>" -SimpleMatch
git status --short --ignored
git diff --cached
```

Ocorrencias de termos como `.obsidian`, `app_extracted` e `node_modules` sao aceitaveis apenas em `.gitignore` ou docs de exclusao.
