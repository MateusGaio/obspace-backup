"use strict";

const fs = require("fs");
const path = require("path");

function createWindow({ app, BrowserWindow, nativeImage, log, isDev }) {
  function assetPath(...segments) {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, ...segments);
    }
    return path.join(app.getAppPath(), ...segments);
  }

  const icon = nativeImage.createFromPath(assetPath("assets", "icon.png"));
  const preloadPath = path.join(app.getAppPath(), "electron", "preload.cjs");
  const indexPath = path.join(app.getAppPath(), "dist", "index.html");

  log("createWindow", JSON.stringify({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    preloadPath,
    preloadExists: fs.existsSync(preloadPath),
    indexPath,
    indexExists: fs.existsSync(indexPath)
  }));

  const mainWindow = new BrowserWindow({
    width: 1580,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "Obspace",
    backgroundColor: "#030104",
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log("renderer-console", JSON.stringify({ level, message, line, sourceId }));
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log("did-fail-load", JSON.stringify({ errorCode, errorDescription, validatedURL }));
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log("did-finish-load", mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log("render-process-gone", JSON.stringify(details));
  });

  if (isDev()) {
    mainWindow.loadURL(process.env.OBSPACE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(indexPath);
  }

  return {
    mainWindow,
    assetPath
  };
}

module.exports = {
  createWindow
};
