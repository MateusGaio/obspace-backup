"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createGraphStore } = require("../../bootstrap/register-ipc.cjs");

test("graph store descarta cache e reindexa usando o vault atual", async () => {
  let currentVaultDir = "C:\\VaultA";
  const calls = [];
  const store = createGraphStore({
    getVaultDir: () => currentVaultDir,
    buildGraph: async ({ vaultDir }) => {
      calls.push(vaultDir);
      return { vaultDir, stats: { nodes: calls.length, links: 0 } };
    }
  });

  assert.equal((await store.getGraph(false)).vaultDir, "C:\\VaultA");
  assert.equal((await store.getGraph(false)).vaultDir, "C:\\VaultA");

  currentVaultDir = "D:\\VaultB";
  assert.equal((await store.getGraph(false)).vaultDir, "C:\\VaultA");

  store.clear();
  assert.equal((await store.getGraph(false)).vaultDir, "D:\\VaultB");
  assert.deepEqual(calls, ["C:\\VaultA", "D:\\VaultB"]);
});
