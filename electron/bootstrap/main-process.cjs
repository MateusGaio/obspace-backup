"use strict";

const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require("electron");
const { buildGraph, readNote, commitNotesToVault } = require("../services/graph.cjs");
const { callOllama, getOllamaStatus } = require("../services/ollama.cjs");
const { processAttachments, selectAttachmentFiles } = require("../services/attachments.cjs");
const { createAi2AiPreview } = require("../services/ai2ai.cjs");
const { createShortcut } = require("../services/shortcut.cjs");
const { createRuntimeSettingsStore, validateVaultDir } = require("../services/runtime-settings.cjs");
const { searchWeb } = require("../services/web-search.cjs");
const { resolveRuntimeConfig } = require("../shared/runtime-config.cjs");
const { createLogger } = require("./logger.cjs");
const { createWindow } = require("./create-window.cjs");
const { registerIpc } = require("./register-ipc.cjs");

function isDev() {
  return Boolean(process.env.OBSPACE_DEV_SERVER_URL);
}

function bootstrapMainProcess() {
  const config = resolveRuntimeConfig();
  const log = createLogger(app);
  let mainWindow = null;
  let assetPath = (...segments) => segments.join("/");

  app.whenReady().then(async () => {
    log("app-ready", JSON.stringify({ version: app.getVersion(), cwd: process.cwd() }));
    const runtimeSettings = createRuntimeSettingsStore({ userDataPath: app.getPath("userData") });
    const savedSettings = await runtimeSettings.readSettings();
    if (savedSettings.vaultDir) {
      try {
        config.vaultDir = await validateVaultDir(savedSettings.vaultDir);
      } catch (error) {
        log("runtime-settings-invalid-vault", JSON.stringify({ vaultDir: savedSettings.vaultDir, error: error.message }));
      }
    }

    const services = {
      assetPath: (...segments) => assetPath(...segments),
      buildGraph,
      readNote,
      commitNotesToVault,
      callOllama,
      getOllamaStatus,
      processAttachments,
      selectAttachmentFiles,
      createAi2AiPreview,
      createShortcut,
      runtimeSettings,
      validateVaultDir,
      searchWeb
    };

    registerIpc({
      ipcMain,
      dialog,
      app,
      getMainWindow: () => mainWindow,
      config,
      services
    });

    const windowContext = createWindow({
      app,
      BrowserWindow,
      nativeImage,
      log,
      isDev
    });
    mainWindow = windowContext.mainWindow;
    assetPath = windowContext.assetPath;

    if (app.isPackaged) {
      await createShortcut({
        app,
        name: "Obspace",
        iconPath: assetPath("assets", "icon.ico"),
        devProjectPath: app.getAppPath()
      }).catch(() => null);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const nextWindowContext = createWindow({
          app,
          BrowserWindow,
          nativeImage,
          log,
          isDev
        });
        mainWindow = nextWindowContext.mainWindow;
        assetPath = nextWindowContext.assetPath;
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

module.exports = {
  bootstrapMainProcess
};
