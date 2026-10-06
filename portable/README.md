# Executável portátil

`Obspace.exe` é o artefato portátil aprovado para uso imediato no Windows.

Origem de build:

```text
npm run dist
release/Obspace.exe
```

Somente este executável final deve ser versionado. A pasta `release/`, o `win-unpacked/`, caches, logs, vaults e builds intermediários continuam fora do Git.
