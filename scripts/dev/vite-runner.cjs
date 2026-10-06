"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectDir = path.resolve(__dirname, "..", "..");
const viteBin = path.join(projectDir, "node_modules", "vite", "bin", "vite.js");
const esbuildBinary = process.platform === "win32"
  ? path.join(projectDir, "node_modules", "@esbuild", "win32-x64", "esbuild.exe")
  : "";

const { createRendererConfig } = require("../../electron/shared/runtime-config.cjs");

function buildEnv() {
  const env = { ...process.env };
  if (process.platform === "win32" && fs.existsSync(esbuildBinary)) {
    env.ESBUILD_BINARY_PATH = esbuildBinary;
  }
  return env;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(payload)}\n`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function startDevServer(args) {
  const { createServer } = await import("vite");
  const { buildGraph, readNote, commitNotesToVault } = require("../../electron/services/graph.cjs");
  const { getOllamaStatus, callOllama } = require("../../electron/services/ollama.cjs");
  const { createAi2AiPreview } = require("../../electron/services/ai2ai.cjs");
  const { searchWeb } = require("../../electron/services/web-search.cjs");

  const hostIndex = args.indexOf("--host");
  const portIndex = args.indexOf("--port");
  const host = hostIndex >= 0 ? args[hostIndex + 1] : "127.0.0.1";
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 5177;
  const config = createRendererConfig(process.env, {
    appVersion: "dev-browser",
    isPackaged: false
  });

  let graphCache = null;
  async function getGraph(refresh = false) {
    if (!graphCache || refresh) {
      graphCache = await buildGraph({ vaultDir: config.vaultDir });
    }
    return graphCache;
  }

  const server = await createServer({
    root: projectDir,
    configFile: false,
    clearScreen: false,
    server: {
      host,
      port,
      strictPort: true
    },
    optimizeDeps: {
      noDiscovery: true,
      include: []
    },
    build: {
      target: "es2022",
      sourcemap: true
    },
    plugins: [
      {
        name: "obspace-dev-api",
        configureServer(viteServer) {
          viteServer.middlewares.use("/__obspace", async (req, res) => {
            try {
              const url = new URL(req.url || "/", "http://127.0.0.1");
              if (req.method === "GET" && url.pathname === "/config") {
                sendJson(res, 200, config);
                return;
              }
              if (req.method === "GET" && url.pathname === "/ollama-status") {
                sendJson(res, 200, await getOllamaStatus({
                  host: config.ollamaHost,
                  models: [config.offlineModel, config.onlineModel]
                }));
                return;
              }
              if (req.method === "GET" && url.pathname === "/graph") {
                sendJson(res, 200, await getGraph(url.searchParams.get("refresh") === "1"));
                return;
              }
              if (req.method === "GET" && url.pathname === "/note") {
                const graph = await getGraph(false);
                sendJson(res, 200, await readNote({
                  vaultDir: config.vaultDir,
                  graph,
                  nodeId: url.searchParams.get("id")
                }));
                return;
              }
              if (req.method === "POST" && url.pathname === "/chat") {
                const body = await readBody(req);
                const graph = await getGraph(false);
                const mode = body.mode === "online" ? "online" : "offline";
                const model = mode === "online" ? config.onlineModel : config.offlineModel;
                sendJson(res, 200, await callOllama({
                  host: config.ollamaHost,
                  model,
                  mode,
                  graph,
                  userMessage: body.message || "",
                  history: body.history || [],
                  attachments: [],
                  attachmentText: "",
                  webResults: mode === "online" ? await searchWeb(body.message || "") : []
                }));
                return;
              }
              if (req.method === "POST" && url.pathname === "/notes-preview") {
                const body = await readBody(req);
                const graph = await getGraph(false);
                sendJson(res, 200, await createAi2AiPreview({
                  agentDir: config.ai2aiAgentDir,
                  vaultDir: config.vaultDir,
                  ollamaHost: config.ollamaHost,
                  model: config.onlineModel,
                  topic: body.message || "",
                  attachments: [],
                  graph
                }));
                return;
              }
              if (req.method === "POST" && url.pathname === "/commit-notes") {
                const body = await readBody(req);
                const written = await commitNotesToVault({
                  vaultDir: config.vaultDir,
                  folder: body.folder,
                  notes: body.notes || []
                });
                graphCache = await getGraph(true);
                sendJson(res, 200, { written, graph: graphCache });
                return;
              }
              sendJson(res, 404, { error: "Rota dev nao encontrada." });
            } catch (error) {
              sendJson(res, 500, { error: String(error.message || error) });
            }
          });
        }
      }
    ]
  });

  await server.listen();
  server.printUrls();
}

const args = process.argv.slice(2);
if (args[0] === "dev") {
  startDevServer(args.slice(1)).catch((error) => {
    console.error(`Falha ao iniciar Vite dev: ${String(error.message || error)}`);
    process.exit(1);
  });
  return;
}

if (!args.includes("--configLoader")) {
  args.push("--configLoader", "runner");
}
if (args[0] === "build") {
  if (!args.includes("--target")) {
    args.push("--target", "es2022");
  }
  if (!args.includes("--sourcemap")) {
    args.push("--sourcemap");
  }
  if (!args.includes("--base")) {
    args.push("--base", "./");
  }
}

const child = spawn(process.execPath, [viteBin, ...args], {
  cwd: projectDir,
  shell: false,
  stdio: "inherit",
  env: buildEnv()
});

child.on("exit", (code) => {
  process.exit(code || 0);
});

child.on("error", (error) => {
  console.error(`Falha ao iniciar Vite: ${String(error.message || error)}`);
  process.exit(1);
});
