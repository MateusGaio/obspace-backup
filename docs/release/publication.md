# Publication And Release

Esta pagina descreve o fluxo seguro para publicar o Obspace Desktop em GitHub privado e gerar release local Windows sem enviar arquivos pessoais.

## Escopo GitHub

Publicar:

- `src/`
- `electron/`
- `scripts/`
- `assets/`
- `index.html`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `README.md`
- `docs/`

Excluir do push:

- `Notas/` ou qualquer vault real;
- `.obsidian/`;
- `.venv/`;
- `data/`;
- `app_extracted/`;
- `dist/`;
- `release/`;
- `node_modules/`;
- logs, caches e temporarios;
- docs internos de planejamento, como `docs/superpowers/`;
- arquivos com caminhos pessoais de maquina.

## Auditoria antes de commit

Nunca use `git add .`. Use:

```powershell
git status --short --ignored
git diff --name-only
git diff --cached
```

Depois faca staging explicito por arquivo ou diretorio aprovado:

```powershell
git add README.md docs/README.md docs/architecture/overview.md
```

## Criacao de repositorio privado

Se o historico local contem caminhos pessoais antigos, nao publique esse historico. Use uma copia limpa de publicacao ou um branch orphan contendo apenas os arquivos aprovados. Com `gh` autenticado dentro da copia limpa:

```powershell
gh auth status
gh repo create obspace-desktop --private --source . --remote origin --push
```

Se ja existir remoto privado limpo:

```powershell
git remote -v
git push -u origin <branch>
```

## Validacao limpa

Depois do push, clone fora do workspace atual:

```powershell
git clone <PRIVATE_REPO_URL> <TEMP_DIR>\obspace-desktop-clean
cd <TEMP_DIR>\obspace-desktop-clean
npm ci
npm run check
npm run build
npm start
```

O smoke test minimo deve abrir a janela sem depender de vault pessoal. Para testar dados reais sem publicar nada, configure `OBSPACE_VAULT_DIR` no ambiente local antes de iniciar.

## Build Windows

`npm run build` gera `dist/`. `npm run dist` usa `electron-builder` para gerar portable em `release/`. `npm run release:desktop` copia o portable para a Area de Trabalho e recria o atalho local; esse comando tem efeito fora do repo e nao deve rodar em CI sem intencao explicita.

## Revisao final

Antes de concluir:

- revisar `git show --stat --oneline HEAD`;
- varrer por nome real, marcadores de workspace local, `.obsidian`, vaults locais e `app_extracted`;
- comparar lista publicada com lista local aprovada;
- confirmar que clone limpo reproduz build e startup.
