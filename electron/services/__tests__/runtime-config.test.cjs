"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_AI2AI_AGENT_DIR,
  DEFAULT_VAULT_DIR,
  resolveRuntimeConfig
} = require("../../shared/runtime-config.cjs");

test("runtime default usa um vault generico no perfil do usuario", () => {
  assert.match(DEFAULT_VAULT_DIR, /ObspaceVault$/);
});

test("runtime mantem agente AI2AI externo separado do vault de leitura", () => {
  const config = resolveRuntimeConfig({});

  assert.equal(config.vaultDir, DEFAULT_VAULT_DIR);
  assert.equal(config.ai2aiAgentDir, DEFAULT_AI2AI_AGENT_DIR);
});

test("runtime respeita override explicito do agente AI2AI", () => {
  const config = resolveRuntimeConfig({
    OBSPACE_AI2AI_AGENT_DIR: "D:\\custom-agent"
  });

  assert.equal(config.ai2aiAgentDir, "D:\\custom-agent");
});
