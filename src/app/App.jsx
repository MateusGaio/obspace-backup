import React, { useState } from "react";
import { ChatPanel } from "../features/chat/components/ChatPanel.jsx";
import { ObspaceGraph } from "../features/graph/components/ObspaceGraph.jsx";
import { StartScreen } from "../shared/ui/StartScreen.jsx";
import { useObspaceAppState } from "./useObspaceAppState.js";

function ToggleControl({ label, checked, onChange }) {
  return (
    <label className="control-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function RangeControl({ label, min, max, step, value, onChange }) {
  return (
    <label className="range-control">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
    </label>
  );
}

function formatVaultPath(vaultDir) {
  if (!vaultDir) {
    return "Vault nao configurado";
  }
  const parts = String(vaultDir).split(/[\\/]+/).filter(Boolean);
  if (parts.length <= 3) {
    return vaultDir;
  }
  return `...\\${parts.slice(-3).join("\\")}`;
}

export function App() {
  const [showIntro, setShowIntro] = useState(true);
  const {
    config,
    graph,
    status,
    hasEntered,
    selectedNodeId,
    aiNodeIds,
    aiTrace,
    ollamaStatus,
    cameraEnabled,
    slowOrbit,
    physics,
    physicsCollapsed,
    chatCollapsed,
    chatFullscreen,
    chatWidth,
    controlsCollapsed,
    setHasEntered,
    setSelectedNodeId,
    setAiNodeIds,
    setAiTrace,
    setCameraEnabled,
    setSlowOrbit,
    setPhysics,
    setPhysicsCollapsed,
    setChatCollapsed,
    setChatFullscreen,
    setChatWidth,
    setControlsCollapsed,
    setStatus,
    loadGraph,
    selectVaultDirectory,
    handleGraphUpdated
  } = useObspaceAppState();

  const graphCounts = graph?.stats
    ? { nodes: graph.stats.nodes, links: graph.stats.links }
    : null;
  const aiReadout =
    aiTrace.phase === "thinking"
      ? "IA preparando contexto"
      : aiTrace.phase === "reading_notes"
        ? "IA lendo contexto"
        : aiTrace.phase === "resolved"
          ? "Contexto resolvido"
          : "";

  function shellClass() {
    const classes = ["app-shell"];
    if (chatCollapsed) classes.push("chat-collapsed");
    if (chatFullscreen) classes.push("chat-fullscreen");
    if (controlsCollapsed) classes.push("controls-collapsed");
    return classes.join(" ");
  }

  function handleResizeMouseDown(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatWidth;

    function onMove(moveEvent) {
      setChatWidth(startWidth + startX - moveEvent.clientX);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <>
      {hasEntered ? (
        <main className={shellClass()} style={{ "--chat-width": `${chatWidth}px` }}>
          <section className="graph-stage">
            <header className="top-hud">
              <span className="hud-title">Obspace</span>
              {aiReadout ? <span className="ai-readout">{aiReadout}</span> : null}
            </header>

            <aside className="control-sidebar" aria-label="Controles do Obspace">
              <button
                type="button"
                className="sidebar-collapse"
                onClick={() => setControlsCollapsed((value) => !value)}
                aria-label={controlsCollapsed ? "Expandir controles" : "Recolher controles"}
                title={controlsCollapsed ? "Expandir controles" : "Recolher controles"}
              >
                {controlsCollapsed ? ">" : "<"}
              </button>

              <div className="sidebar-content">
                <section className="control-section">
                  <span className="control-section-title">Obspace</span>
                  <div className="vault-readout" title={config?.vaultDir || ""}>
                    <span>Vault atual</span>
                    <strong>{formatVaultPath(config?.vaultDir)}</strong>
                  </div>
                  <button type="button" className="control-action" onClick={() => selectVaultDirectory()}>
                    Trocar vault
                  </button>
                  <button type="button" className="control-action" onClick={() => loadGraph(true)}>
                    Reindexar vault
                  </button>
                  <p className="control-status" title={status}>
                    {status}
                  </p>
                </section>

                <section className="control-section">
                  <span className="control-section-title">Visual</span>
                  <ToggleControl label="Soyuz" checked={!chatCollapsed} onChange={(checked) => {
                    setChatCollapsed(!checked);
                    if (!checked && chatFullscreen) setChatFullscreen(false);
                  }} />
                  <ToggleControl label="Camera" checked={cameraEnabled} onChange={setCameraEnabled} />
                  <ToggleControl label="Fisica" checked={!physicsCollapsed} onChange={(checked) => setPhysicsCollapsed(!checked)} />
                  <ToggleControl label="Orbita" checked={slowOrbit} onChange={setSlowOrbit} />
                </section>

                {!physicsCollapsed ? (
                  <section className="control-section">
                    <span className="control-section-title">Fisica</span>
                    <RangeControl
                      label="Forca centripeda"
                      min="0"
                      max="0.06"
                      step="0.002"
                      value={physics.centerStrength}
                      onChange={(event) =>
                        setPhysics((current) => ({ ...current, centerStrength: Number(event.target.value) }))
                      }
                    />
                    <RangeControl
                      label="Repulsao"
                      min="10"
                      max="240"
                      step="5"
                      value={physics.repulsion}
                      onChange={(event) => setPhysics((current) => ({ ...current, repulsion: Number(event.target.value) }))}
                    />
                    <RangeControl
                      label="Forca dos links"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={physics.linkStrength}
                      onChange={(event) =>
                        setPhysics((current) => ({ ...current, linkStrength: Number(event.target.value) }))
                      }
                    />
                    <RangeControl
                      label="Distancia do link"
                      min="20"
                      max="180"
                      step="4"
                      value={physics.linkDistance}
                      onChange={(event) =>
                        setPhysics((current) => ({ ...current, linkDistance: Number(event.target.value) }))
                      }
                    />
                    <RangeControl
                      label="Tamanho das notas"
                      min="0.55"
                      max="2.2"
                      step="0.05"
                      value={physics.nodeSize}
                      onChange={(event) => setPhysics((current) => ({ ...current, nodeSize: Number(event.target.value) }))}
                    />
                    <RangeControl
                      label="Tamanho dos links"
                      min="0.4"
                      max="3.2"
                      step="0.1"
                      value={physics.linkWidth}
                      onChange={(event) =>
                        setPhysics((current) => ({ ...current, linkWidth: Number(event.target.value) }))
                      }
                    />
                  </section>
                ) : null}
              </div>
            </aside>

            <ObspaceGraph
              graph={graph}
              selectedNodeId={selectedNodeId}
              aiNodeIds={aiNodeIds}
              aiTrace={aiTrace}
              cameraEnabled={cameraEnabled}
              physics={physics}
              slowOrbit={slowOrbit}
              chatCollapsed={chatCollapsed}
              onSelectNode={(node) => {
                setSelectedNodeId(node?.id || null);
              }}
              onClearSelection={() => setSelectedNodeId(null)}
              onStatus={setStatus}
            />

            {graphCounts ? (
              <div className="graph-count-badge" title={status}>
                <span>{graphCounts.nodes} notas</span>
                <span>{graphCounts.links} conexoes</span>
              </div>
            ) : (
              <div className="graph-count-badge is-status" title={status}>{status}</div>
            )}
          </section>

          <div
            className="chat-resize-handle"
            onMouseDown={!chatCollapsed && !chatFullscreen ? handleResizeMouseDown : undefined}
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar Soyuz"
          />

          <ChatPanel
            config={config}
            ollamaStatus={ollamaStatus}
            fullscreen={chatFullscreen}
            onToggleFullscreen={() => setChatFullscreen((v) => !v)}
            onAiTelemetry={setAiTrace}
            onHighlight={(nodeIds) => setAiNodeIds(nodeIds || [])}
            onGraphUpdated={handleGraphUpdated}
          />
        </main>
      ) : null}
      {showIntro ? (
        <StartScreen
          onLaunch={() => setHasEntered(true)}
          onEnter={() => {
            setHasEntered(true);
            setShowIntro(false);
          }}
        />
      ) : null}
    </>
  );
}
