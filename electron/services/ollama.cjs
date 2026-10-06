"use strict";

const { findRelevantNotes } = require("./graph.cjs");
const { normalizeMarkdownForDisplay } = require("./text-normalizer.cjs");

const HEALTH_TIMEOUT_MS = 7000;
const CHAT_TIMEOUT_MS = 10 * 60 * 1000;
const CHAT_RETRIEVAL_NOTE_LIMIT = 100;
const VISUAL_TELEMETRY_NODE_LIMIT = 24;
const VISUAL_TELEMETRY_LINK_LIMIT = 60;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || 0;
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 500)}`);
      error.code = "ollama_http";
      error.status = response.status;
      throw error;
    }
    return text ? JSON.parse(text) : {};
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`Timeout ao conectar no Ollama em ${url}.`);
      timeoutError.code = "ollama_timeout";
      throw timeoutError;
    }
    if (!error.code && /fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|network/i.test(String(error.message || error))) {
      error.code = "ollama_unreachable";
    }
    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function getOllamaStatus({ host, models }) {
  try {
    const payload = await fetchJson(`${host}/api/tags`, { timeoutMs: HEALTH_TIMEOUT_MS });
    const installed = new Set((payload.models || []).map((model) => model.name));
    return {
      ok: true,
      host,
      models: models.map((name) => ({
        name,
        available: installed.has(name)
      })),
      installed: [...installed]
    };
  } catch (error) {
    const code = error.code || "ollama_unknown";
    return {
      ok: false,
      host,
      code,
      error: String(error.message || error),
      models: models.map((name) => ({ name, available: false }))
    };
  }
}

function compactHistory(history) {
  return (history || [])
    .slice(-16)
    .filter((message) => message && message.role && message.content)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content).slice(0, 8000)
    }));
}

function buildContextBlock({ graph, userMessage, attachmentText, webResults }) {
  const relevantNotes = findRelevantNotes(graph, `${userMessage}\n${attachmentText}`, CHAT_RETRIEVAL_NOTE_LIMIT);
  const noteBlock = relevantNotes.length
    ? relevantNotes
        .map((note, index) => {
          return `[${index + 1}] [[${note.name}]]\nPath: ${note.path}\nResumo: ${note.preview || "(sem resumo)"}`;
        })
        .join("\n\n")
    : "Nenhuma nota relevante encontrada por similaridade lexical.";

  const webBlock = webResults.length
    ? webResults
        .map((result, index) => `[${index + 1}] ${result.title}\n${result.url}\n${result.snippet}`)
        .join("\n\n")
    : "Sem resultados web anexados.";

  const attachmentBlock = attachmentText
    ? attachmentText.slice(0, 64000)
    : "Sem texto extraido de anexos.";

  return {
    relevantNotes,
    content: `CONTEXTO DO VAULT\n${noteBlock}\n\nANEXOS EXTRAIDOS\n${attachmentBlock}\n\nRESULTADOS WEB\n${webBlock}`
  };
}

function refId(ref) {
  return typeof ref === "string" ? ref : String(ref?.id || "");
}

function buildReadingTelemetry(graph, relevantNotes, phase = "reading_notes") {
  const activeNodeIds = relevantNotes
    .slice(0, VISUAL_TELEMETRY_NODE_LIMIT)
    .map((note) => note.id)
    .filter(Boolean);
  const activeSet = new Set(activeNodeIds);
  const activeLinkIds = [];

  for (const link of graph.links || []) {
    if (activeLinkIds.length >= VISUAL_TELEMETRY_LINK_LIMIT) {
      break;
    }
    const source = refId(link.source);
    const target = refId(link.target);
    if (activeSet.has(source) || activeSet.has(target)) {
      activeLinkIds.push(`${source}::${target}`);
    }
  }

  return {
    phase,
    activeNodeIds,
    activeLinkIds,
    trailMs: 2800,
    final: phase === "resolved"
  };
}

async function validateOllamaTarget({ host, model, mode }) {
  let payload;
  try {
    payload = await fetchJson(`${host}/api/tags`, { timeoutMs: HEALTH_TIMEOUT_MS });
  } catch (error) {
    return {
      ok: false,
      code: error.code || "ollama_unreachable",
      content:
        `Nao consegui acessar o Ollama em ${host} para o modo ${mode}.\n\n` +
        "Verifique se o Ollama esta aberto e escutando nessa porta. No Windows, abra o Ollama ou rode `ollama serve`, depois tente novamente.\n\n" +
        `Detalhe tecnico: ${String(error.message || error)}`
    };
  }

  if (mode === "online") {
    return {
      ok: true
    };
  }

  const installed = new Set((payload.models || []).map((item) => item.name));
  if (!installed.has(model)) {
    const visibleModels = [...installed].slice(0, 12).join(", ") || "nenhum modelo instalado detectado";
    return {
      ok: false,
      code: "model_missing",
      content:
        `O modelo ${model} nao foi encontrado no Ollama para o modo ${mode}.\n\n` +
        `Modelos detectados: ${visibleModels}.\n\n` +
        `Instale ou carregue o modelo com: \`ollama pull ${model}\`.`
    };
  }

  return {
    ok: true
  };
}

function systemPrompt(mode) {
  return [
    "Voce e o Obspace, uma IA de leitura e sintese dentro de um vault Obsidian.",
    "Responda em portugues por padrao, mas preserve termos tecnicos quando forem mais precisos.",
    "O fluxo e chat-first: nao mande o usuario abrir nota; use o contexto e cite wikilinks quando relevante.",
    "Quando usar notas do vault, cite-as como [[Nome da Nota]].",
    "Se o contexto nao sustentar uma afirmacao, diga claramente que e inferencia.",
    "Voce tem acesso a TODAS as notas relevantes do vault — use todas elas para dar respostas completas e elaboradas.",
    "Quanto mais contexto voce extrair das notas, melhor. Nao resuma demais, seja detalhado e abrangente.",
    "Se o usuario pedir um resumo, PDF, ou documento, formate a resposta de forma completa e estruturada com titulos, subtitulos, e listas.",
    mode === "online"
      ? "Modo Online ativo: use tambem os resultados web fornecidos e sinalize quando algo veio da web."
      : "Modo Offline ativo: use apenas o vault, anexos e raciocinio local; nao finja ter consultado a internet."
  ].join("\n");
}

async function callOllama({
  host,
  model,
  mode,
  graph,
  userMessage,
  history,
  attachments,
  attachmentText,
  webResults,
  onTelemetry
}) {
  const targetStatus = await validateOllamaTarget({ host, model, mode });
  if (!targetStatus.ok) {
    return {
      role: "assistant",
      model,
      mode,
      content: targetStatus.content,
      relevantNotes: [],
      visualTelemetry: {
        phase: "resolved",
        activeNodeIds: [],
        activeLinkIds: [],
        trailMs: 1200,
        final: true
      },
      error: targetStatus.code
    };
  }

  const context = buildContextBlock({ graph, userMessage, attachmentText, webResults });
  const visualTelemetry = buildReadingTelemetry(graph, context.relevantNotes);
  onTelemetry?.(visualTelemetry);

  const images = (attachments || []).map((item) => item.image?.base64).filter(Boolean);
  const messages = [
    { role: "system", content: systemPrompt(mode) },
    ...compactHistory(history),
    {
      role: "user",
      content: `${context.content}\n\nPERGUNTA DO USUARIO\n${userMessage}`,
      ...(images.length ? { images } : {})
    }
  ];

  try {
    const payload = await fetchJson(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeoutMs: CHAT_TIMEOUT_MS,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: mode === "online" ? 0.35 : 0.25,
          num_ctx: 32768
        }
      })
    });

    return {
      role: "assistant",
      model,
      mode,
      content: normalizeMarkdownForDisplay(payload.message?.content || ""),
      relevantNotes: context.relevantNotes,
      visualTelemetry: buildReadingTelemetry(graph, context.relevantNotes, "resolved")
    };
  } catch (error) {
    const detail =
      error.code === "ollama_timeout"
        ? "A resposta do Ollama passou de 10 minutos. Se o modelo ainda estava carregando, tente novamente; se persistir, reduza o tamanho da pergunta ou reinicie o Ollama."
        : error.code === "ollama_unreachable"
          ? "O Ollama ficou indisponivel durante a chamada. Abra o Ollama ou rode `ollama serve` e tente novamente."
          : error.code === "ollama_http" && error.status === 404
            ? `O endpoint respondeu 404. Confirme se o modelo ${model} existe com \`ollama list\`.`
            : String(error.message || error);
    return {
      role: "assistant",
      model,
      mode,
      content:
        `Falha ao chamar o modelo ${model} em ${host}.\n\n` +
        `${detail}\n\n` +
        "O modo online continua separado desta falha; troque para Online se quiser usar o modelo online configurado.",
      relevantNotes: context.relevantNotes,
      visualTelemetry: buildReadingTelemetry(graph, context.relevantNotes, "resolved"),
      error: String(error.message || error)
    };
  }
}

module.exports = {
  callOllama,
  getOllamaStatus
};
