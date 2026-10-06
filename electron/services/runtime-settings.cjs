"use strict";

const fs = require("fs/promises");
const path = require("path");

const SETTINGS_FILE = "runtime-settings.json";

function normalizeVaultDir(value) {
  const rawValue = String(value || "").trim();
  return rawValue ? path.resolve(rawValue) : null;
}

function sanitizeRuntimeSettings(value = {}) {
  const vaultDir = normalizeVaultDir(value.vaultDir);
  return vaultDir ? { vaultDir } : {};
}

async function validateVaultDir(vaultDir) {
  const resolvedVaultDir = normalizeVaultDir(vaultDir);
  if (!resolvedVaultDir) {
    throw new Error("Selecione uma pasta de vault valida.");
  }

  let stat;
  try {
    stat = await fs.stat(resolvedVaultDir);
  } catch {
    throw new Error("A pasta selecionada nao existe ou nao esta acessivel.");
  }

  if (!stat.isDirectory()) {
    throw new Error("O vault precisa ser uma pasta.");
  }

  return resolvedVaultDir;
}

function createRuntimeSettingsStore({ userDataPath }) {
  const settingsPath = path.join(userDataPath, SETTINGS_FILE);

  async function readSettings() {
    try {
      const raw = await fs.readFile(settingsPath, "utf8");
      return sanitizeRuntimeSettings(JSON.parse(raw));
    } catch (error) {
      if (error.code === "ENOENT" || error instanceof SyntaxError) {
        return {};
      }
      throw error;
    }
  }

  async function writeSettings(settings) {
    const sanitized = sanitizeRuntimeSettings(settings);
    await fs.mkdir(userDataPath, { recursive: true });
    const tempPath = `${settingsPath}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, settingsPath);
    return sanitized;
  }

  return {
    settingsPath,
    readSettings,
    writeSettings
  };
}

module.exports = {
  SETTINGS_FILE,
  createRuntimeSettingsStore,
  normalizeVaultDir,
  sanitizeRuntimeSettings,
  validateVaultDir
};
