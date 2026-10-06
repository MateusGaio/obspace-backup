"use strict";

const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { normalizeMarkdownForDisplay } = require("../services/text-normalizer.cjs");

function createGraphStore({ buildGraph, getVaultDir }) {
  let graphCache = null;

  return {
    async getGraph(force = false) {
      if (!graphCache || force) {
        graphCache = await buildGraph({ vaultDir: getVaultDir() });
      }
      return graphCache;
    },
    clear() {
      graphCache = null;
    },
    setGraph(graph) {
      graphCache = graph;
    }
  };
}

function extractMentionedNodeIds(text, graph) {
  const source = String(text || "").toLowerCase();
  const ids = [];
  for (const node of graph.nodes || []) {
    if (ids.length >= 18) {
      break;
    }
    const name = String(node.name || "").toLowerCase();
    if (name.length >= 4 && source.includes(name)) {
      ids.push(node.id);
    }
  }
  return ids;
}

function emitChatTelemetry(event, payload) {
  event.sender.send("chat:telemetry", {
    phase: "idle",
    activeNodeIds: [],
    activeLinkIds: [],
    trailMs: 2800,
    final: false,
    ...payload
  });
}

function markdownToHtml(markdown, title) {
  const escaped = normalizeMarkdownForDisplay(markdown)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const bodyHtml = escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[\[([^\]]+)\]\]/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${String(title || "Obspace PDF").replace(/</g, "&lt;")}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #8f1026; border-bottom: 2px solid #8f1026; padding-bottom: 8px; }
  h2 { color: #b80722; margin-top: 28px; }
  h3 { color: #c31935; margin-top: 20px; }
  code { background: #f5f0f1; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  ul { padding-left: 24px; }
  li { margin-bottom: 4px; }
  em { color: #8f1026; font-style: normal; font-weight: 600; }
  strong { color: #1a0005; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; color: #888; font-size: 12px; }
</style>
</head>
<body>
<p>${bodyHtml}</p>
<div class="footer">Gerado por Obspace &bull; ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;
}

function registerIpc({
  ipcMain,
  dialog,
  app,
  getMainWindow,
  config,
  services
}) {
  const graphStore = createGraphStore({
    buildGraph: services.buildGraph,
    getVaultDir: () => config.vaultDir
  });

  function rendererConfig() {
    return {
      ...config,
      appVersion: app.getVersion(),
      isPackaged: app.isPackaged
    };
  }

  ipcMain.handle("obspace:get-config", async () => rendererConfig());

  ipcMain.handle("ollama:status", async () =>
    services.getOllamaStatus({
      host: config.ollamaHost,
      models: [config.offlineModel, config.onlineModel]
    })
  );

  ipcMain.handle("vault:load-graph", async (_event, options = {}) => {
    return graphStore.getGraph(Boolean(options.refresh));
  });

  ipcMain.handle("vault:select-directory", async () => {
    const options = {
      title: "Selecionar vault do Obspace",
      properties: ["openDirectory", "createDirectory"]
    };
    const window = getMainWindow();
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths?.[0]) {
      return { canceled: true, config: rendererConfig() };
    }

    const vaultDir = await services.validateVaultDir(result.filePaths[0]);
    await services.runtimeSettings.writeSettings({ vaultDir });
    config.vaultDir = vaultDir;
    graphStore.clear();
    const graph = await graphStore.getGraph(true);
    return { canceled: false, config: rendererConfig(), graph };
  });

  ipcMain.handle("vault:read-note", async (_event, nodeId) => {
    const graph = await graphStore.getGraph(false);
    return services.readNote({ vaultDir: config.vaultDir, graph, nodeId });
  });

  ipcMain.handle("attachments:select", async () =>
    services.selectAttachmentFiles({ dialog, window: getMainWindow() })
  );

  ipcMain.handle("chat:send", async (_event, payload = {}) => {
    const graph = await graphStore.getGraph(false);
    const mode = payload.mode === "online" ? "online" : "offline";
    const model = mode === "online" ? config.onlineModel : config.offlineModel;
    const requestId = payload.requestId || `${Date.now()}`;
    emitChatTelemetry(_event, { requestId, phase: "thinking" });
    const attachments = await services.processAttachments(payload.attachments || []);
    const attachmentText = attachments.map((item) => item.text).filter(Boolean).join("\n\n");
    const webResults = mode === "online" ? await services.searchWeb(payload.message || "") : [];

    const reply = await services.callOllama({
      host: config.ollamaHost,
      model,
      mode,
      graph,
      userMessage: payload.message || "",
      history: payload.history || [],
      attachments,
      attachmentText,
      webResults,
      onTelemetry: (telemetry) => emitChatTelemetry(_event, { requestId, ...telemetry })
    });
    emitChatTelemetry(_event, {
      requestId,
      ...(reply.visualTelemetry || {}),
      phase: "resolved",
      final: true
    });

    return {
      ...reply,
      attachments,
      webResults,
      highlightedNodeIds: extractMentionedNodeIds(reply.content, graph)
    };
  });

  ipcMain.handle("notes:create-preview", async (_event, payload = {}) => {
    const graph = await graphStore.getGraph(false);
    const attachments = await services.processAttachments(payload.attachments || []);
    return services.createAi2AiPreview({
      agentDir: config.ai2aiAgentDir,
      vaultDir: config.vaultDir,
      ai2aiNotesDir: config.ai2aiNotesDir,
      ollamaHost: config.ollamaHost,
      model: payload.mode === "offline" ? config.offlineModel : config.onlineModel,
      topic: payload.message || "",
      attachments,
      graph
    });
  });

  ipcMain.handle("notes:commit", async (_event, payload = {}) => {
    const written = await services.commitNotesToVault({
      vaultDir: config.vaultDir,
      ai2aiNotesDir: config.ai2aiNotesDir,
      folder: payload.folder,
      notes: payload.notes || []
    });
    const graph = await services.buildGraph({ vaultDir: config.vaultDir });
    graphStore.setGraph(graph);
    return { written, graph };
  });

  // ── PDF generation from chat content ──
  ipcMain.handle("chat:generate-pdf", async (_event, payload = {}) => {
    const { content, title } = payload;
    if (payload.format && payload.format !== "pdf") {
      throw new Error("Formato de exportacao nao suportado. O Obspace exporta respostas em PDF.");
    }

    const safeTitle = String(title || "Obspace-Resumo")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Obspace-Resumo";

    const html = markdownToHtml(content, safeTitle);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-pdf-"));
    const htmlPath = path.join(tempDir, "content.html");
    await fs.writeFile(htmlPath, html, "utf8");

    const { BrowserWindow } = require("electron");
    const pdfWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1100,
      webPreferences: { offscreen: true }
    });

    let pdfBuffer;
    try {
      await pdfWin.loadFile(htmlPath);
      pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
      });
    } finally {
      pdfWin.destroy();
    }

    const fileName = `${safeTitle}.pdf`;
    const pdfPath = path.join(tempDir, fileName);
    await fs.writeFile(pdfPath, pdfBuffer);

    return { format: "pdf", mimeType: "application/pdf", filePath: pdfPath, fileName };
  });

  // ── Open a file with system default app ──
  ipcMain.handle("shell:open-path", async (_event, filePath) => {
    const { shell } = require("electron");
    await shell.openPath(path.resolve(filePath));
    return { ok: true };
  });

  ipcMain.handle("desktop:create-shortcut", async () =>
    services.createShortcut({
      app,
      name: "Obspace",
      iconPath: services.assetPath("assets", "icon.ico"),
      devProjectPath: app.getAppPath()
    })
  );
}

module.exports = {
  createGraphStore,
  registerIpc
};
