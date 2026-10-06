"use strict";

const os = require("os");
const path = require("path");

const DEFAULT_VAULT_DIR = path.join(os.homedir(), "Documents", "ObspaceVault");
const DEFAULT_AI2AI_NOTES_DIR = "AI2AI";
const DEFAULT_AI2AI_AGENT_DIR = path.join(os.homedir(), "Documents", "obsidian-ai2ai-agent");
const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_OFFLINE_MODEL = "llama3.2:3b";
const DEFAULT_ONLINE_MODEL = "gemma4:31b-cloud";

function resolveRuntimeConfig(env = process.env, overrides = {}) {
  const vaultDir = env.OBSPACE_VAULT_DIR || DEFAULT_VAULT_DIR;

  return {
    vaultDir,
    ai2aiNotesDir: env.OBSPACE_AI2AI_NOTES_DIR || DEFAULT_AI2AI_NOTES_DIR,
    ollamaHost: env.OBSPACE_OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
    offlineModel: env.OBSPACE_OFFLINE_MODEL || DEFAULT_OFFLINE_MODEL,
    onlineModel: env.OBSPACE_ONLINE_MODEL || DEFAULT_ONLINE_MODEL,
    ai2aiAgentDir: env.OBSPACE_AI2AI_AGENT_DIR || DEFAULT_AI2AI_AGENT_DIR,
    ...overrides
  };
}

function createRendererConfig(env = process.env, overrides = {}) {
  return {
    ...resolveRuntimeConfig(env),
    appVersion: overrides.appVersion ?? null,
    isPackaged: Boolean(overrides.isPackaged)
  };
}

module.exports = {
  DEFAULT_VAULT_DIR,
  DEFAULT_AI2AI_NOTES_DIR,
  DEFAULT_AI2AI_AGENT_DIR,
  DEFAULT_OLLAMA_HOST,
  DEFAULT_OFFLINE_MODEL,
  DEFAULT_ONLINE_MODEL,
  resolveRuntimeConfig,
  createRendererConfig
};
