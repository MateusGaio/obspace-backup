"use strict";

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveAi2AiTargetFolder } = require("../graph/vault-notes.cjs");
const {
  fallbackPreview,
  rebaseAi2AiPreview,
  resolveAi2AiAgentDir
} = require("../ai2ai.cjs");

test("resolveAi2AiTargetFolder prefixa a pasta base configurada", () => {
  const result = resolveAi2AiTargetFolder({
    ai2aiNotesDir: "AI2AI Generated Notes",
    folder: "AI2AI/Redes Neurais/00 MOC"
  });

  assert.equal(result, "AI2AI Generated Notes\\AI2AI\\Redes Neurais\\00 MOC");
});

test("rebaseAi2AiPreview ajusta preview e notas para a pasta base nova", () => {
  const rebased = rebaseAi2AiPreview(
    {
      folder: "AI2AI/Engenharia de Software",
      notes: [
        {
          title: "Engenharia de Software - Conceitos Centrais",
          folder: "AI2AI/Engenharia de Software/01 Conceitos",
          path: "AI2AI/Engenharia de Software/01 Conceitos/old.md",
          content: "# Conteudo"
        }
      ]
    },
    "AI2AI Generated Notes"
  );

  assert.equal(rebased.folder, "AI2AI Generated Notes/AI2AI/Engenharia de Software");
  assert.equal(
    rebased.notes[0].folder,
    "AI2AI Generated Notes/AI2AI/Engenharia de Software/01 Conceitos"
  );
  assert.equal(
    rebased.notes[0].path,
    "AI2AI Generated Notes/AI2AI/Engenharia de Software/01 Conceitos/Engenharia de Software - Conceitos Centrais.md"
  );
});

test("resolveAi2AiTargetFolder evita duplicar o segmento AI2AI quando a nota ja vem com esse prefixo", () => {
  const result = resolveAi2AiTargetFolder({
    ai2aiNotesDir: "AI2AI",
    folder: "AI2AI/Inbox/2026-05-15"
  });

  assert.equal(result, "AI2AI\\Inbox\\2026-05-15");
});

test("fallbackPreview usa a data local em vez de UTC no folder de inbox", () => {
  const preview = fallbackPreview({
    topic: "engenharia de software",
    attachments: [],
    graph: { nodes: [] },
    now: new Date("2026-05-15T00:10:00.000Z")
  });

  assert.equal(preview.folder, "AI2AI/Inbox/2026-05-14");
});

test("resolveAi2AiAgentDir encontra o agente ao lado do vault quando o path padrao nao existe", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-ai2ai-agent-"));
  const vaultDir = path.join(root, "AI2AI");
  const siblingAgentDir = path.join(root, "obsidian-ai2ai-agent");

  await fs.mkdir(vaultDir, { recursive: true });
  await fs.mkdir(path.join(siblingAgentDir, "scripts"), { recursive: true });
  await fs.writeFile(path.join(siblingAgentDir, "scripts", "pdf_to_ai2ai_ollama.py"), "# stub\n", "utf8");

  const resolved = await resolveAi2AiAgentDir({
    agentDir: path.join(root, "missing-agent"),
    vaultDir
  });

  assert.equal(resolved, siblingAgentDir);
});
