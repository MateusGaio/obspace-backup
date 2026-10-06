"use strict";

const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const projectDir = path.resolve(__dirname, "..", "..");
const electronCli = path.join(projectDir, "node_modules", "electron", "cli.js");
const viteRunner = path.join(projectDir, "scripts", "dev", "vite-runner.cjs");
const devHost = "127.0.0.1";
const devPort = 5177;

let vite = null;
let electron = null;
let shuttingDown = false;

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: projectDir,
    shell: false,
    stdio: "inherit",
    env: { ...process.env, ...(options.env || {}) }
  });

  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }
    if (options.exitOnClose !== false) {
      shuttingDown = true;
      if (vite && vite !== child && !vite.killed) {
        vite.kill();
      }
      if (electron && electron !== child && !electron.killed) {
        electron.kill();
      }
      process.exit(code || 0);
    }
  });

  return child;
}

function waitForPortOpen(host, port, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timeout aguardando ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 250);
      });
    }

    attempt();
  });
}

function shutdown() {
  shuttingDown = true;
  if (vite && !vite.killed) {
    vite.kill();
  }
  if (electron && !electron.killed) {
    electron.kill();
  }
}

async function main() {
  vite = spawnLogged(process.execPath, [viteRunner, "dev", "--host", devHost, "--port", String(devPort)], {
    exitOnClose: true
  });

  await waitForPortOpen(devHost, devPort);

  electron = spawnLogged(process.execPath, [electronCli, "."], {
    env: {
      OBSPACE_DEV_SERVER_URL: `http://${devHost}:${devPort}`
    },
    exitOnClose: true
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  shutdown();
  console.error(`Falha ao iniciar ambiente dev: ${String(error.message || error)}`);
  process.exit(1);
});
