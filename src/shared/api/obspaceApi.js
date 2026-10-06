const nativeApi = window.obspace;

async function requestJson(path, options = {}) {
  const response = await fetch(`/__obspace${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function browserApi() {
  return {
    getConfig: () => requestJson("/config"),
    getOllamaStatus: () => requestJson("/ollama-status"),
    loadGraph: ({ refresh } = {}) => requestJson(`/graph${refresh ? "?refresh=1" : ""}`),
    selectVaultDirectory: async () => ({ canceled: true, browserMode: true }),
    readNote: (nodeId) => requestJson(`/note?id=${encodeURIComponent(nodeId)}`),
    selectAttachments: async () => [],
    sendChat: (payload) => requestJson("/chat", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onChatTelemetry: () => () => {},
    createNotesPreview: (payload) => requestJson("/notes-preview", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    commitNotes: (payload) => requestJson("/commit-notes", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    generatePdf: async () => ({ filePath: null, fileName: null }),
    openPath: async () => ({ ok: false, browserMode: true }),
    createDesktopShortcut: async () => ({ ok: false, browserMode: true })
  };
}

export const obspaceApi = nativeApi || browserApi();
