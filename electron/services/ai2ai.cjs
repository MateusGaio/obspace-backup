"use strict";

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { resolveAi2AiTargetFolder } = require("./graph/vault-notes.cjs");

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      env: { ...process.env, ...(options.env || {}) }
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Build a rich fallback preview using AI2AI language conventions.
 * Titles are structured for AI searchability: "Conceito - Detalhe Especifico"
 * Content maximizes context for downstream AI consumption.
 */
function fallbackPreview({ topic, attachments, graph, now }) {
  const sourceTitles = (attachments || []).map((item) => item.name).join(", ") || "assunto enviado";
  const timestamp = formatLocalDateStamp(now);

  // Build a descriptive, AI-searchable title
  const baseTopic = topic || sourceTitles;
  const cleanTopic = baseTopic
    .replace(/^(faz|crie|gere|resuma|explique)\s+/i, "")
    .replace(/^(um|uma|o|a|os|as)\s+/i, "")
    .trim();
  const mainTitle = cleanTopic
    ? `${cleanTopic.charAt(0).toUpperCase()}${cleanTopic.slice(1)} - Mapa Conceitual AI2AI`
    : `Mapa Conceitual AI2AI - ${sourceTitles}`;

  // Collect related notes for maximum cross-referencing
  const relatedNodes = (graph.nodes || []).slice(0, 20);
  const relatedLinks = relatedNodes
    .map((node) => `[[${node.name}]]`)
    .join(", ");
  const relatedDetails = relatedNodes
    .map((node) => `- [[${node.name}]]: ${node.preview || "(sem resumo disponivel)"}`)
    .join("\n");

  // Attachment summaries for context
  const attachmentSummaries = (attachments || [])
    .map((item) => {
      const textPreview = item.text ? item.text.slice(0, 2000) : "(sem texto extraido)";
      return `### Fonte: ${item.name}\n${item.error ? `Erro de extracao: ${item.error}` : textPreview}`;
    })
    .join("\n\n");

  const indexNote = {
    title: mainTitle,
    content: [
      `# ${mainTitle}`,
      "",
      "## Contexto AI2AI",
      `Este mapa conceitual foi gerado pelo agente AI2AI do Obspace em ${timestamp}.`,
      "O objetivo e criar uma estrutura de conhecimento interconectada que maximize a capacidade de uma IA de encontrar, relacionar e sintetizar informacoes.",
      "",
      "## Metodologia de Criacao",
      "- **Linguagem AI2AI**: Conteudo otimizado para consumo por agentes de IA, priorizando clareza, completude e conectividade",
      "- **Titulos descritivos**: Cada nota usa titulos que facilitam busca semantica por IAs",
      "- **Wikilinks abundantes**: Conexoes explicitas entre conceitos relacionados",
      "- **Contexto maximo**: Quanto mais texto e detalhamento, melhor a compreensao do agente",
      "",
      "## Fontes Originais",
      `- ${sourceTitles}`,
      "",
      attachmentSummaries ? `## Conteudo Extraido das Fontes\n${attachmentSummaries}` : "",
      "",
      "## Conexoes com o Vault Existente",
      relatedDetails || "- [[Indice AI2AI]]",
      "",
      `## Notas Relacionadas Identificadas\n${relatedLinks || "[[Indice AI2AI]]"}`,
      "",
      "## Tags",
      `#ai2ai #mapa-conceitual #${timestamp}`,
      ""
    ].filter(Boolean).join("\n")
  };

  return {
    folder: `AI2AI/Inbox/${timestamp}`,
    notes: [indexNote]
  };
}

function formatLocalDateStamp(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveAi2AiAgentDir({ agentDir, vaultDir }) {
  const candidates = [
    agentDir,
    vaultDir ? path.join(path.dirname(vaultDir), "obsidian-ai2ai-agent") : null,
    vaultDir ? path.join(vaultDir, "obsidian-ai2ai-agent") : null
  ]
    .filter(Boolean)
    .map((item) => path.resolve(item));

  for (const candidate of [...new Set(candidates)]) {
    if (await pathExists(path.join(candidate, "scripts", "pdf_to_ai2ai_ollama.py"))) {
      return candidate;
    }
  }

  return null;
}

function rebaseAi2AiPreview(preview, ai2aiNotesDir) {
  if (!preview || !ai2aiNotesDir) {
    return preview;
  }

  const folder = resolveAi2AiTargetFolder({
    ai2aiNotesDir,
    folder: preview.folder
  }).replace(/\\/g, "/");

  const notes = (preview.notes || []).map((note) => {
    const noteFolder = resolveAi2AiTargetFolder({
      ai2aiNotesDir,
      folder: note.folder || preview.folder
    }).replace(/\\/g, "/");
    const fileName = `${String(note.title || "Nota").replace(/[<>:"/\\|?*\x00-\x1F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Nota"}.md`;

    return {
      ...note,
      folder: noteFolder,
      path: `${noteFolder}/${fileName}`
    };
  });

  return {
    ...preview,
    folder,
    notes
  };
}

async function createAi2AiPreview({ agentDir, vaultDir, ai2aiNotesDir, ollamaHost, model, topic, attachments, graph }) {
  const joinedText = (attachments || [])
    .map((item) => {
      const header = `# Fonte: ${item.name}`;
      const body = item.error ? `Erro de extracao: ${item.error}` : item.text || "(sem texto extraido)";
      return `${header}\n${body}`;
    })
    .join("\n\n");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "obspace-ai2ai-"));
  const sourceFile = path.join(tempDir, "source.txt");
  const outputFile = path.join(tempDir, "preview.json");

  // Maximize context sent to the agent: include vault context for better cross-referencing
  const vaultContext = (graph.nodes || [])
    .slice(0, 30)
    .map((node) => `[[${node.name}]]: ${node.preview || ""}`)
    .join("\n");

  const fullSource = [
    topic ? `TOPICO PRINCIPAL: ${topic}` : "",
    "",
    "INSTRUCOES AI2AI:",
    "- Use a linguagem AI2AI: priorize MAXIMO de contexto, quanto mais texto melhor",
    "- Titulos das notas DEVEM ser descritivos e pesquisaveis por IA (ex: 'Engenharia de Software - Principios SOLID' ao inves de 'SOLID')",
    "- Cada nota deve ter conteudo extenso, detalhado e auto-contido",
    "- Use wikilinks [[Nome da Nota]] abundantemente para interconectar conceitos",
    "- Inclua definicoes, exemplos, relacoes causais e contexto historico quando relevante",
    "- NAO resuma demais - a IA precisa de texto rico para compreensao profunda",
    "",
    "CONTEUDO DAS FONTES:",
    joinedText,
    "",
    "NOTAS EXISTENTES NO VAULT (para cross-referencing):",
    vaultContext
  ].filter(Boolean).join("\n");

  await fs.writeFile(sourceFile, fullSource, "utf8");

  const resolvedAgentDir = await resolveAi2AiAgentDir({ agentDir, vaultDir });
  if (!resolvedAgentDir) {
    return rebaseAi2AiPreview({
      ...fallbackPreview({ topic, attachments, graph }),
      warning: "Agente AI2AI nao encontrado; gerado preview estrutural com maximo contexto.",
      stderr: [
        "Configure OBSPACE_AI2AI_AGENT_DIR com a pasta do agente externo",
        "ou mantenha a pasta obsidian-ai2ai-agent ao lado do vault atual."
      ].join("\n")
    }, ai2aiNotesDir);
  }

  const scriptPath = path.join(resolvedAgentDir, "scripts", "pdf_to_ai2ai_ollama.py");
  const args = [
    scriptPath,
    "--vault-path",
    vaultDir,
    "--source-text-file",
    sourceFile,
    "--out",
    outputFile,
    "--model",
    model,
    "--ollama-host",
    ollamaHost,
    "--topic",
    topic || "Material enviado ao Obspace",
    "--preview-only"
  ];

  const result = await runProcess("python", args, { cwd: path.dirname(scriptPath) });
  if (result.code === 0) {
    try {
      const payload = JSON.parse(await fs.readFile(outputFile, "utf8"));
      return rebaseAi2AiPreview({
        ...payload,
        stdout: result.stdout,
        stderr: result.stderr
      }, ai2aiNotesDir);
    } catch (error) {
      return rebaseAi2AiPreview({
        ...fallbackPreview({ topic, attachments, graph }),
        warning: `Agente executou, mas retornou JSON invalido: ${String(error.message || error)}`,
        stdout: result.stdout,
        stderr: result.stderr
      }, ai2aiNotesDir);
    }
  }

  return rebaseAi2AiPreview({
    ...fallbackPreview({ topic, attachments, graph }),
    warning: "Agente AI2AI falhou; gerado preview estrutural com maximo contexto.",
    stdout: result.stdout,
    stderr: result.stderr
  }, ai2aiNotesDir);
}

module.exports = {
  createAi2AiPreview,
  fallbackPreview,
  rebaseAi2AiPreview,
  resolveAi2AiAgentDir
};
