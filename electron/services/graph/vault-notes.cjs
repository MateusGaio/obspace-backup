"use strict";

const fs = require("fs/promises");
const path = require("path");
const { readTextFile, resolveVaultChildPath, toPosixPath } = require("./shared.cjs");

async function readNote({ vaultDir, graph, nodeId }) {
  const node = (graph.nodes || []).find((item) => item.id === nodeId);
  if (!node) {
    throw new Error("Nota nao encontrada.");
  }

  const absolutePath = resolveVaultChildPath(vaultDir, node.path);
  const content = await readTextFile(absolutePath);
  return { ...node, content };
}

function sanitizeFileName(value) {
  return String(value || "Nota")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function sanitizeFolderPath(value, fallback = "AI2AI/Inbox") {
  return String(value || fallback)
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join(path.sep);
}

function resolveAi2AiTargetFolder({ ai2aiNotesDir, folder }) {
  const baseFolder = sanitizeFolderPath(ai2aiNotesDir || "AI2AI");
  const noteFolder = sanitizeFolderPath(folder || "AI2AI/Inbox");
  const baseParts = baseFolder.split(path.sep).filter(Boolean);
  const noteParts = noteFolder.split(path.sep).filter(Boolean);

  if (
    baseParts.length &&
    noteParts.length &&
    baseParts[baseParts.length - 1].toLowerCase() === noteParts[0].toLowerCase()
  ) {
    noteParts.shift();
  }

  return sanitizeFolderPath(
    path.posix.join(
      baseFolder.replace(/\\/g, "/"),
      noteParts.join("/").replace(/\\/g, "/")
    ),
    baseFolder
  );
}

async function commitNotesToVault({ vaultDir, ai2aiNotesDir, folder, notes }) {
  const safeFolder = resolveAi2AiTargetFolder({ ai2aiNotesDir, folder });
  const targetDir = resolveVaultChildPath(vaultDir, safeFolder);

  await fs.mkdir(targetDir, { recursive: true });

  const written = [];
  for (const note of notes || []) {
    const title = sanitizeFileName(note.title);
    if (!title || !String(note.content || "").trim()) {
      continue;
    }

    let candidate = path.join(targetDir, `${title}.md`);
    let suffix = 2;
    while (true) {
      try {
        await fs.access(candidate);
        candidate = path.join(targetDir, `${title} ${suffix}.md`);
        suffix += 1;
      } catch {
        break;
      }
    }

    await fs.writeFile(candidate, `${String(note.content).trim()}\n`, "utf8");
    written.push({
      title,
      path: toPosixPath(path.relative(vaultDir, candidate))
    });
  }

  return written;
}

module.exports = {
  readNote,
  commitNotesToVault,
  resolveAi2AiTargetFolder
};
