"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("obspace", {
  getConfig: () => ipcRenderer.invoke("obspace:get-config"),
  getOllamaStatus: () => ipcRenderer.invoke("ollama:status"),
  loadGraph: (options = {}) => ipcRenderer.invoke("vault:load-graph", options),
  selectVaultDirectory: () => ipcRenderer.invoke("vault:select-directory"),
  readNote: (nodeId) => ipcRenderer.invoke("vault:read-note", nodeId),
  selectAttachments: () => ipcRenderer.invoke("attachments:select"),
  sendChat: (payload) => ipcRenderer.invoke("chat:send", payload),
  onChatTelemetry: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("chat:telemetry", handler);
    return () => ipcRenderer.removeListener("chat:telemetry", handler);
  },
  createNotesPreview: (payload) => ipcRenderer.invoke("notes:create-preview", payload),
  commitNotes: (payload) => ipcRenderer.invoke("notes:commit", payload),
  generatePdf: (payload) => ipcRenderer.invoke("chat:generate-pdf", payload),
  openPath: (filePath) => ipcRenderer.invoke("shell:open-path", filePath),
  createDesktopShortcut: () => ipcRenderer.invoke("desktop:create-shortcut")
});
