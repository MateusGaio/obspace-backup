"use strict";

const fs = require("fs/promises");
const path = require("path");
const {
  DEFAULT_IGNORED_DIRS,
  toPosixPath,
  stripMarkdownExtension,
  normalizeKey,
  extractWikiTargets,
  readTextFile
} = require("./shared.cjs");

async function collectMarkdownFiles(vaultDir) {
  const directories = [vaultDir];
  const markdownFiles = [];

  while (directories.length > 0) {
    const currentDir = directories.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!DEFAULT_IGNORED_DIRS.has(entry.name.toLowerCase())) {
          directories.push(fullPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        markdownFiles.push(fullPath);
      }
    }
  }

  markdownFiles.sort((a, b) => a.localeCompare(b));
  return markdownFiles;
}

function extractTitle(content, fallback) {
  const heading = String(content || "").match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function extractPreview(content) {
  const text = String(content || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 520);
}

function tokensFromText(text) {
  const stopwords = new Set([
    "a",
    "as",
    "o",
    "os",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "para",
    "com",
    "uma",
    "um",
    "que",
    "por",
    "no",
    "na",
    "nos",
    "nas",
    "the",
    "and"
  ]);
  return new Set(
    String(text || "")
      .toLowerCase()
      .match(/[a-z0-9Ãà-ú]{3,}/gi)
      ?.map((token) => token.toLowerCase())
      .filter((token) => !stopwords.has(token)) || []
  );
}

function resolveTargetIds({ target, sourcePathWithoutExt, nodeByPath, nodeIdsByName, nodeById }) {
  const normalizedTarget = normalizeKey(target);
  if (!normalizedTarget) {
    return [];
  }

  const directPathMatch = nodeByPath.get(normalizedTarget);
  if (directPathMatch) {
    return [directPathMatch];
  }

  const targetAsPosix = target.replace(/\\/g, "/");
  const sourceDir = path.posix.dirname(sourcePathWithoutExt);
  const relativePathCandidate = normalizeKey(path.posix.normalize(path.posix.join(sourceDir, targetAsPosix)));
  const relativePathMatch = nodeByPath.get(relativePathCandidate);
  if (relativePathMatch) {
    return [relativePathMatch];
  }

  const targetBaseName = normalizeKey(path.posix.basename(targetAsPosix));
  const nameMatches = nodeIdsByName.get(targetBaseName) || [];
  if (nameMatches.length <= 1) {
    return nameMatches;
  }

  const sameDirectoryCandidate = normalizeKey(path.posix.join(sourceDir, path.posix.basename(targetAsPosix)));
  const sameDirectoryMatch = nodeByPath.get(sameDirectoryCandidate);
  if (sameDirectoryMatch) {
    return [sameDirectoryMatch];
  }

  const sourceTopLevel = sourcePathWithoutExt.split("/")[0];
  const sameTopLevelMatches = nameMatches.filter((candidateId) => {
    const candidateNode = nodeById.get(candidateId);
    return candidateNode?.pathWithoutExt?.split("/")?.[0] === sourceTopLevel;
  });

  return sameTopLevelMatches.length === 1 ? sameTopLevelMatches : nameMatches;
}

function scoreNoteForQuery(node, queryTokens) {
  if (!queryTokens.size) {
    return 0;
  }
  const noteTokens = node.tokenText || tokensFromText(`${node.name} ${node.path} ${node.preview}`);
  let score = 0;
  for (const token of queryTokens) {
    if (noteTokens.has(token)) {
      score += node.name.toLowerCase().includes(token) ? 5 : 1;
    }
  }
  return score;
}

function findRelevantNotes(graph, query, limit = 40) {
  const queryTokens = tokensFromText(query);
  return (graph.nodes || [])
    .map((node) => ({ node, score: scoreNoteForQuery(node, queryTokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, limit)
    .map((item) => ({
      id: item.node.id,
      name: item.node.name,
      path: item.node.path,
      preview: item.node.preview
    }));
}

async function buildGraph(options = {}) {
  const vaultDir = path.resolve(options.vaultDir || process.cwd());
  const markdownFiles = await collectMarkdownFiles(vaultDir);

  const rawNodes = await Promise.all(
    markdownFiles.map(async (absolutePath) => {
      const relativePath = toPosixPath(path.relative(vaultDir, absolutePath));
      const pathWithoutExt = stripMarkdownExtension(relativePath);
      const fallbackName = path.posix.basename(pathWithoutExt);
      const content = await readTextFile(absolutePath);
      const name = extractTitle(content, fallbackName);

      return {
        id: pathWithoutExt,
        name,
        fileName: fallbackName,
        path: relativePath,
        pathWithoutExt,
        absolutePath,
        preview: extractPreview(content),
        targets: extractWikiTargets(content),
        tokenText: tokensFromText(`${name} ${relativePath} ${content.slice(0, 4000)}`)
      };
    })
  );

  const nodeById = new Map();
  const nodeByPath = new Map();
  const nodeIdsByName = new Map();

  for (const node of rawNodes) {
    nodeById.set(node.id, node);
    nodeByPath.set(normalizeKey(node.pathWithoutExt), node.id);

    for (const alias of new Set([node.name, node.fileName])) {
      const normalizedName = normalizeKey(alias);
      const list = nodeIdsByName.get(normalizedName) || [];
      if (!list.includes(node.id)) {
        list.push(node.id);
      }
      nodeIdsByName.set(normalizedName, list);
    }
  }

  const links = [];
  const linkKeys = new Set();
  let unresolvedLinks = 0;
  let ambiguousLinks = 0;

  for (const node of rawNodes) {
    for (const target of node.targets) {
      const resolvedTargets = resolveTargetIds({
        target,
        sourcePathWithoutExt: node.pathWithoutExt,
        nodeByPath,
        nodeIdsByName,
        nodeById
      });

      if (resolvedTargets.length === 0) {
        unresolvedLinks += 1;
        continue;
      }
      if (resolvedTargets.length > 1) {
        ambiguousLinks += 1;
      }

      for (const targetId of resolvedTargets) {
        if (targetId === node.id) {
          continue;
        }
        const linkKey = `${node.id}::${targetId}`;
        if (!linkKeys.has(linkKey)) {
          linkKeys.add(linkKey);
          links.push({ source: node.id, target: targetId });
        }
      }
    }
  }

  const nodes = rawNodes.map((node) => ({
    id: node.id,
    name: node.name,
    path: node.path,
    preview: node.preview,
    degree:
      links.filter((link) => link.source === node.id || link.target === node.id).length
  }));

  return {
    generatedAt: new Date().toISOString(),
    vaultDir,
    stats: {
      markdownFiles: markdownFiles.length,
      nodes: nodes.length,
      links: links.length,
      unresolvedLinks,
      ambiguousLinks
    },
    nodes,
    links
  };
}

module.exports = {
  buildGraph,
  findRelevantNotes
};
