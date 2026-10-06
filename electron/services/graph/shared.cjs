"use strict";

const fs = require("fs/promises");
const path = require("path");

const DEFAULT_IGNORED_DIRS = new Set([
  ".obsidian",
  ".git",
  "node_modules",
  ".trash",
  "obsidian-ai2ai-agent"
]);

function toPosixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function stripMarkdownExtension(value) {
  return value.replace(/\.md$/i, "");
}

function normalizeKey(value) {
  return stripMarkdownExtension(String(value || "")).replace(/\\/g, "/").trim().toLowerCase();
}

function sanitizeWikiTarget(rawTarget) {
  let target = String(rawTarget || "").trim();
  if (!target) {
    return "";
  }

  for (const separator of ["|", "#", "^"]) {
    const index = target.indexOf(separator);
    if (index >= 0) {
      target = target.slice(0, index);
    }
  }

  return stripMarkdownExtension(target.trim());
}

function extractWikiTargets(markdownContent) {
  const targets = [];
  const wikiLinkRegex = /(?<!!)\[\[([^[\]]+?)\]\]/g;
  let match = wikiLinkRegex.exec(markdownContent);
  while (match) {
    const target = sanitizeWikiTarget(match[1]);
    if (target) {
      targets.push(target);
    }
    match = wikiLinkRegex.exec(markdownContent);
  }
  return targets;
}

async function readTextFile(filePath) {
  const buffer = await fs.readFile(filePath);
  for (const encoding of ["utf8", "latin1"]) {
    try {
      return buffer.toString(encoding);
    } catch {
      continue;
    }
  }
  return buffer.toString("utf8");
}

function resolveVaultChildPath(vaultDir, relativePath) {
  const baseDir = path.resolve(vaultDir);
  const absolutePath = path.resolve(baseDir, relativePath);
  const rootPrefix = `${baseDir}${path.sep}`;

  if (absolutePath !== baseDir && !absolutePath.startsWith(rootPrefix)) {
    throw new Error("Caminho de vault invalido.");
  }

  return absolutePath;
}

module.exports = {
  DEFAULT_IGNORED_DIRS,
  toPosixPath,
  stripMarkdownExtension,
  normalizeKey,
  sanitizeWikiTarget,
  extractWikiTargets,
  readTextFile,
  resolveVaultChildPath
};
