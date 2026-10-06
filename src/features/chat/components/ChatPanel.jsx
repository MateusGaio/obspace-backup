import React, { useEffect, useRef, useState } from "react";
import { obspaceApi } from "../../../shared/api/obspaceApi.js";

function AttachmentList({ attachments, onRemove }) {
  if (!attachments.length) {
    return null;
  }
  return (
    <div className="attachment-list">
      {attachments.map((item) => (
        <FileCard
          key={item.id || item.path}
          name={item.name}
          kind={String(item.extension || "FILE").replace(/^\./, "").slice(0, 4).toUpperCase()}
          meta={`${String(item.extension || "arquivo").replace(/^\./, "").toUpperCase()} anexado`}
          actionLabel="Remover"
          onAction={() => onRemove(item)}
        />
      ))}
    </div>
  );
}

function FileCard({ name, meta, kind = "FILE", actionLabel, onAction }) {
  return (
    <div className="file-card">
      <div className="file-card-icon" aria-hidden="true">
        {kind}
      </div>
      <div className="file-card-main">
        <span className="file-card-name">{name}</span>
        {meta ? <span className="file-card-meta">{meta}</span> : null}
      </div>
      {onAction ? (
        <button type="button" className="file-card-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function renderInlineMarkdown(text, keyPrefix) {
  const parts = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\[\[[^\]]+\]\])/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[[")) {
      parts.push(
        <span className="wikilink" key={key}>
          {token.slice(2, -2)}
        </span>
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push(
        <a key={key} href={link?.[2] || "#"} target="_blank" rel="noreferrer">
          {link?.[1] || token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

const INLINE_MATH_SYMBOLS = new Map([
  ["\\cap", "∩"],
  ["\\cup", "∪"],
  ["\\leq", "≤"],
  ["\\le", "≤"],
  ["\\geq", "≥"],
  ["\\ge", "≥"],
  ["\\neq", "≠"],
  ["\\ne", "≠"],
  ["\\times", "×"],
  ["\\cdot", "·"],
  ["\\alpha", "α"],
  ["\\beta", "β"],
  ["\\gamma", "γ"],
  ["\\pi", "π"],
  ["-", "-"]
]);

function normalizeMathForDisplay(content) {
  return String(content || "")
    .split(/(```[\s\S]*?```)/g)
    .map((chunk) =>
      chunk.startsWith("```")
        ? chunk
        : chunk.replace(/\$([^$\n]+)\$/g, (_match, expression) => {
            const value = String(expression || "").trim();
            return INLINE_MATH_SYMBOLS.get(value) || value;
          })
    )
    .join("");
}

function MarkdownContent({ content }) {
  const lines = normalizeMathForDisplay(content).split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += lines[index]?.startsWith("```") ? 1 : 0;
      blocks.push(
        <pre className="markdown-code" key={`code-${index}`}>
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const HeadingTag = `h${Math.min(heading[1].length + 2, 5)}`;
      blocks.push(
        <HeadingTag key={`heading-${index}`}>{renderInlineMarkdown(heading[2], `heading-${index}`)}</HeadingTag>
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`p-${index}`}>{renderInlineMarkdown(paragraph.join(" "), `p-${index}`)}</p>);
  }

  return <div className="message-markdown">{blocks}</div>;
}

function PdfDownloadButton({ pdfPath, fileName }) {
  if (!pdfPath) {
    return null;
  }

  async function handleDownload() {
    try {
      await obspaceApi.openPath?.(pdfPath);
    } catch {
      // fallback: do nothing if openPath is not available
    }
  }

  return (
    <FileCard
      name={fileName || "Resposta Obspace.pdf"}
      kind="PDF"
      meta="PDF gerado pelo Soyuz"
      actionLabel="Abrir"
      onAction={handleDownload}
    />
  );
}

function ThinkingCard({ status }) {
  if (!status) {
    return null;
  }
  return (
    <article className="message assistant thinking-message">
      <div className="message-meta">
        <span>Soyuz</span>
        <span>pensando</span>
      </div>
      <div className="thinking-content">
        <span className="thinking-pulse" aria-hidden="true" />
        <div>
          <strong>{status.title}</strong>
          <p>{status.detail}</p>
        </div>
      </div>
    </article>
  );
}

function MessageList({ messages, thinkingStatus }) {
  return (
    <div className={`messages ${!messages.length && !thinkingStatus ? "empty" : ""}`}>
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="message-meta">
            <span>{message.role === "assistant" ? "Obspace" : "Voce"}</span>
            {message.model ? <span>{message.model}</span> : null}
          </div>
          <MarkdownContent content={message.content} />
          {message.pdfPath ? (
            <PdfDownloadButton pdfPath={message.pdfPath} fileName={message.pdfFileName} />
          ) : null}
        </article>
      ))}
      <ThinkingCard status={thinkingStatus} />
    </div>
  );
}

function NotesPreview({ preview, onCommit, onCancel, committing }) {
  if (!preview) {
    return null;
  }

  return (
    <section className="preview-panel">
      <header>
        <div>
          <span className="brand-kicker">PREVIEW AI2AI</span>
          <h2>{preview.notes?.length || 0} notas prontas</h2>
        </div>
        <span>{preview.folder}</span>
      </header>
      {preview.warning ? (
        <div className="warning">
          <p>{preview.warning}</p>
          {(preview.stderr || preview.stdout) ? (
            <pre className="error-log" style={{ whiteSpace: 'pre-wrap', fontSize: '11px', marginTop: '8px' }}>
              {preview.stderr || preview.stdout}
            </pre>
          ) : null}
        </div>
      ) : null}
      <div className="preview-notes">
        {(preview.notes || []).map((note) => (
          <details key={note.title} open>
            <summary>{note.title}</summary>
            <pre>{note.content}</pre>
          </details>
        ))}
      </div>
      <div className="preview-actions">
        <button type="button" onClick={onCancel} disabled={committing}>
          Cancelar
        </button>
        <button type="button" className="primary" onClick={onCommit} disabled={committing}>
          {committing ? "Gravando..." : "Confirmar e gravar no vault"}
        </button>
      </div>
    </section>
  );
}

function createTrace(payload = {}) {
  return {
    phase: "idle",
    activeNodeIds: [],
    activeLinkIds: [],
    trailNodeIds: [],
    trailLinkIds: [],
    trailMs: 2800,
    ...payload
  };
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PDF_TRIGGER_PATTERNS = [
  /gerar?\s*(um\s+)?pdf/i,
  /cria(r|e)?\s*(um\s+)?pdf/i,
  /faz(er)?\s*(um\s+)?pdf/i,
  /mand(a|e|ar)\s*(um\s+)?pdf/i,
  /envi(a|e|ar)\s*(um\s+)?pdf/i,
  /resum[oa]\s+em\s+pdf/i,
  /documento\s+pdf/i,
  /export(a|e|ar)\s+(para\s+)?pdf/i,
  /salv(a|e|ar)\s+(como\s+|em\s+)?pdf/i
];

function isPdfRequest(text) {
  return PDF_TRIGGER_PATTERNS.some((pattern) => pattern.test(text));
}

function thinkingStatusFromPhase(phase, workflow) {
  if (workflow === "note") {
    return {
      title: "Preparando preview AI2AI",
      detail: "Lendo anexos e estruturando notas antes de gravar no vault."
    };
  }
  if (phase === "reading_notes") {
    return {
      title: "Lendo notas relevantes",
      detail: "Buscando conexoes no vault e separando o contexto mais util."
    };
  }
  if (phase === "resolved") {
    return {
      title: "Montando resposta",
      detail: "Organizando a sintese final para o chat."
    };
  }
  return {
    title: "Pensando",
    detail: "Preparando contexto, historico e anexos para responder."
  };
}

export function ChatPanel({ config, ollamaStatus, fullscreen, onToggleFullscreen, onAiTelemetry, onHighlight, onGraphUpdated }) {
  const endRef = useRef(null);
  const currentRequestRef = useRef(null);
  const trailTimerRef = useRef(null);
  const telemetrySeenRef = useRef(new Set());
  const [mode, setMode] = useState("offline");
  const [workflow, setWorkflow] = useState("research");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(null);
  const [preview, setPreview] = useState(null);
  const [committing, setCommitting] = useState(false);

  const effectiveMode = mode;
  const activeModel = effectiveMode === "online" ? config?.onlineModel : config?.offlineModel;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, preview, busy]);

  useEffect(() => {
    const unsubscribe = obspaceApi.onChatTelemetry?.((payload) => {
      const requestId = payload?.requestId;
      if (requestId && currentRequestRef.current && requestId !== currentRequestRef.current) {
        return;
      }
      if (requestId) {
        telemetrySeenRef.current.add(requestId);
      }
      clearTimeout(trailTimerRef.current);

      if (payload.phase === "resolved") {
        setThinkingPhase("resolved");
        const trailMs = Number(payload.trailMs) || 2800;
        onAiTelemetry?.(
          createTrace({
            phase: "resolved",
            trailNodeIds: payload.activeNodeIds || [],
            trailLinkIds: payload.activeLinkIds || [],
            trailMs
          })
        );
        trailTimerRef.current = setTimeout(() => {
          onAiTelemetry?.(createTrace());
          if (requestId && currentRequestRef.current === requestId) {
            currentRequestRef.current = null;
          }
        }, trailMs);
        return;
      }

      onAiTelemetry?.(
        createTrace({
          phase: payload.phase || "thinking",
          activeNodeIds: payload.activeNodeIds || [],
          activeLinkIds: payload.activeLinkIds || [],
          trailMs: Number(payload.trailMs) || 2800
        })
      );
      setThinkingPhase(payload.phase || "thinking");
    });

    return () => {
      clearTimeout(trailTimerRef.current);
      unsubscribe?.();
    };
  }, [onAiTelemetry]);

  function resolveFallbackTelemetry(result, requestId) {
    if (!requestId || telemetrySeenRef.current.has(requestId) || !result?.visualTelemetry) {
      return;
    }
    const trailMs = Number(result.visualTelemetry.trailMs) || 2800;
    onAiTelemetry?.(
      createTrace({
        phase: "resolved",
        trailNodeIds: result.visualTelemetry.activeNodeIds || [],
        trailLinkIds: result.visualTelemetry.activeLinkIds || [],
        trailMs
      })
    );
    trailTimerRef.current = setTimeout(() => {
      onAiTelemetry?.(createTrace());
      if (currentRequestRef.current === requestId) {
        currentRequestRef.current = null;
      }
    }, trailMs);
  }

  async function attachFiles() {
    const selected = await obspaceApi.selectAttachments();
    setAttachments((current) => [...current, ...selected]);
  }

  function appendMessage(message) {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...message
      }
    ]);
  }

  async function generateAndAppendPdf(content, userMessage) {
    try {
      const result = await obspaceApi.generatePdf({ content, title: userMessage, format: "pdf" });
      if (result?.filePath) {
        setMessages((current) => {
          const updated = [...current];
          const lastAssistant = [...updated].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            lastAssistant.pdfPath = result.filePath;
            lastAssistant.pdfFileName = result.fileName || "Resumo.pdf";
          }
          return [...updated];
        });
      }
    } catch (error) {
      appendMessage({
        role: "assistant",
        content: `Falha ao gerar PDF: ${String(error.message || error)}`
      });
    }
  }

  async function submit(event) {
    event.preventDefault();
    const message = input.trim();
    if ((!message && attachments.length === 0) || busy) {
      return;
    }

    const requestHistory = messages;
    const requestId = workflow === "note" ? null : createRequestId();
    const wantsPdf = isPdfRequest(message);
    clearTimeout(trailTimerRef.current);
    if (requestId) {
      currentRequestRef.current = requestId;
      telemetrySeenRef.current.delete(requestId);
      onAiTelemetry?.(createTrace({ phase: "thinking" }));
    } else {
      currentRequestRef.current = null;
      onAiTelemetry?.(createTrace());
    }
    setBusy(true);
    setThinkingPhase(requestId ? "thinking" : "reading_notes");
    setPreview(null);
    setInput("");
    appendMessage({
      role: "user",
      content: `${message || "(sem texto)"}${attachments.length ? `\n\nAnexos: ${attachments.map((item) => item.name).join(", ")}` : ""}`
    });

    try {
      if (workflow === "note") {
        const result = await obspaceApi.createNotesPreview({
          message,
          attachments,
          mode: effectiveMode
        });
        setPreview(result);
        appendMessage({
          role: "assistant",
          model: config?.onlineModel,
          content: `Preview AI2AI gerado com ${result.notes?.length || 0} notas. Revise abaixo e confirme para gravar no vault.`
        });
        onHighlight?.([]);
      } else {
        const result = await obspaceApi.sendChat({
          requestId,
          message,
          attachments,
          mode: effectiveMode,
          history: requestHistory
        });
        appendMessage({
          role: "assistant",
          model: result.model,
          content: result.content
        });
        resolveFallbackTelemetry(result, requestId);

        // If user asked for PDF, generate it from the AI response
        if (wantsPdf && result.content) {
          generateAndAppendPdf(result.content, message);
        }
      }
      setAttachments([]);
    } catch (error) {
      if (requestId) {
        onAiTelemetry?.(createTrace({ phase: "resolved", trailMs: 1200 }));
        trailTimerRef.current = setTimeout(() => onAiTelemetry?.(createTrace()), 1200);
      }
      appendMessage({
        role: "assistant",
        content: `Falha no fluxo: ${String(error.message || error)}`
      });
    } finally {
      setBusy(false);
      setThinkingPhase(null);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function commitPreview() {
    if (!preview || committing) {
      return;
    }
    setCommitting(true);
    try {
      const result = await obspaceApi.commitNotes({
        folder: preview.folder,
        notes: preview.notes
      });
      setPreview(null);
      appendMessage({
        role: "assistant",
        content: `Notas gravadas no vault: ${result.written.map((item) => `[[${item.title}]]`).join(", ")}`
      });
      onGraphUpdated?.(result.graph);
      onHighlight?.(result.written.map((item) => item.path.replace(/\.md$/i, "")));
    } catch (error) {
      appendMessage({
        role: "assistant",
        content: `Falha ao gravar notas: ${String(error.message || error)}`
      });
    } finally {
      setCommitting(false);
    }
  }

  return (
    <aside className="chat-panel">
      <header className="chat-header">
        <div>
          <h2>Soyuz</h2>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            className="fullscreen-toggle"
            onClick={onToggleFullscreen}
            title={fullscreen ? "Sair do fullscreen" : "Fullscreen Soyuz"}
          >
            {fullscreen ? "⊡" : "⊞"}
          </button>
          <div className={`model-dot ${ollamaStatus?.ok ? "ok" : "bad"}`} />
        </div>
      </header>

      <section className="mode-card">
        <div className="segmented">
          <button
            type="button"
            className={workflow === "research" ? "active" : ""}
            onClick={() => setWorkflow("research")}
          >
            Research
          </button>
          <button type="button" className={workflow === "note" ? "active" : ""} onClick={() => setWorkflow("note")}>
            Note Creation
          </button>
        </div>
        <div className="segmented">
          <button
            type="button"
            className={effectiveMode === "offline" ? "active" : ""}
            onClick={() => setMode("offline")}
          >
            Offline
          </button>
          <button type="button" className={effectiveMode === "online" ? "active" : ""} onClick={() => setMode("online")}>
            Online
          </button>
        </div>
        <p>
          Modelo ativo: <strong>{activeModel || "carregando"}</strong>
        </p>
      </section>

      <section className="chat-body">
        <MessageList messages={messages} thinkingStatus={busy ? thinkingStatusFromPhase(thinkingPhase, workflow) : null} />

        <NotesPreview
          preview={preview}
          committing={committing}
          onCommit={commitPreview}
          onCancel={() => setPreview(null)}
        />
        <div ref={endRef} className="chat-end" />
      </section>

      <form className="composer" onSubmit={submit}>
        <AttachmentList
          attachments={attachments}
          onRemove={(item) => setAttachments((current) => current.filter((entry) => entry !== item))}
        />
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={2}
          placeholder={
            workflow === "note"
              ? "Envie um PDF/assunto para gerar notas AI2AI com wikilinks..."
              : "Pergunte sobre o vault, peca analise, sintese ou pesquisa..."
          }
        />
        <div className="composer-actions">
          <button type="button" onClick={attachFiles}>
            Anexar
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Processando..." : workflow === "note" ? "Gerar preview" : "Enviar"}
          </button>
        </div>
      </form>
    </aside>
  );
}
