"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  createRuntimeSettingsStore,
  sanitizeRuntimeSettings,
  validateVaultDir
} = require("../runtime-settings.cjs");

test("runtime settings salva e recarrega o vault escolhido", async () => {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-settings-"));
  const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-vault-"));
  const store = createRuntimeSettingsStore({ userDataPath });

  await store.writeSettings({ vaultDir });

  assert.deepEqual(await store.readSettings(), { vaultDir: path.resolve(vaultDir) });
});

test("runtime settings ignora JSON invalido", async () => {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-settings-"));
  const store = createRuntimeSettingsStore({ userDataPath });
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(store.settingsPath, "{", "utf8");

  assert.deepEqual(await store.readSettings(), {});
});

test("validateVaultDir aceita somente diretorios existentes", async () => {
  const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-vault-"));
  const filePath = path.join(vaultDir, "nota.md");
  await fs.writeFile(filePath, "# Nota\n", "utf8");

  await assert.doesNotReject(() => validateVaultDir(vaultDir));
  await assert.rejects(() => validateVaultDir(filePath), /vault precisa ser uma pasta/i);
  await assert.rejects(() => validateVaultDir(path.join(vaultDir, "missing")), /nao existe/i);
});

test("sanitizeRuntimeSettings nao persiste vault vazio", () => {
  assert.deepEqual(sanitizeRuntimeSettings({ vaultDir: "   " }), {});
});
