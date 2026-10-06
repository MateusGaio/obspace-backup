import { startTransition, useEffect, useState } from "react";
import { createDefaultPhysics } from "../features/graph/model/physics.js";
import { obspaceApi } from "../shared/api/obspaceApi.js";

export function createIdleAiTrace() {
  return {
    phase: "idle",
    activeNodeIds: [],
    activeLinkIds: [],
    trailNodeIds: [],
    trailLinkIds: [],
    trailMs: 2800
  };
}

export function useObspaceAppState() {
  const readStoredChatWidth = () => {
    const value = Number(localStorage.getItem("obspace.chatWidth"));
    return Number.isFinite(value) ? Math.min(720, Math.max(360, value)) : 430;
  };

  const [config, setConfig] = useState(null);
  const [graph, setGraph] = useState(null);
  const [status, setStatus] = useState("Inicializando Obspace");
  const [hasEntered, setHasEntered] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [aiNodeIds, setAiNodeIds] = useState([]);
  const [aiTrace, setAiTrace] = useState(createIdleAiTrace);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [slowOrbit, setSlowOrbit] = useState(false);
  const [physics, setPhysics] = useState(createDefaultPhysics);
  const [physicsCollapsed, setPhysicsCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [chatWidth, setChatWidthState] = useState(readStoredChatWidth);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  function setChatWidth(nextWidth) {
    setChatWidthState(() => {
      const width = Math.min(720, Math.max(360, Number(nextWidth) || 430));
      localStorage.setItem("obspace.chatWidth", String(width));
      return width;
    });
  }

  async function loadGraph(refresh = false) {
    setStatus(refresh ? "Reindexando vault" : "Carregando grafo");
    if (refresh) {
      setPhysics(createDefaultPhysics());
    }

    const nextGraph = await obspaceApi.loadGraph({ refresh });
    startTransition(() => {
      setGraph(nextGraph);
      setStatus(`${nextGraph.stats.nodes} notas | ${nextGraph.stats.links} conexoes`);
    });
  }

  async function selectVaultDirectory() {
    setStatus("Selecionando vault");
    try {
      const result = await obspaceApi.selectVaultDirectory();
      if (result?.canceled) {
        setStatus(graph?.stats ? `${graph.stats.nodes} notas | ${graph.stats.links} conexoes` : "Selecao cancelada");
        return result;
      }

      if (result?.config) {
        setConfig(result.config);
      }

      setSelectedNodeId(null);
      setAiNodeIds([]);
      setAiTrace(createIdleAiTrace());
      setPhysics(createDefaultPhysics());

      const nextGraph = result?.graph || await obspaceApi.loadGraph({ refresh: true });
      startTransition(() => {
        setGraph(nextGraph);
        setStatus(`${nextGraph.stats.nodes} notas | ${nextGraph.stats.links} conexoes`);
      });
      return result;
    } catch (error) {
      setStatus(`Falha ao trocar vault: ${String(error.message || error)}`);
      return { canceled: true, error: String(error.message || error) };
    }
  }

  function handleGraphUpdated(nextGraph) {
    startTransition(() => {
      setGraph(nextGraph);
      setStatus(`${nextGraph.stats.nodes} notas | ${nextGraph.stats.links} conexoes`);
    });
  }

  useEffect(() => {
    let mounted = true;

    Promise.all([obspaceApi.getConfig(), obspaceApi.getOllamaStatus()])
      .then(([nextConfig, nextOllamaStatus]) => {
        if (!mounted) {
          return;
        }
        setConfig(nextConfig);
        setOllamaStatus(nextOllamaStatus);
      })
      .then(() => loadGraph(false))
      .catch((error) => {
        setStatus(`Falha ao iniciar: ${String(error.message || error)}`);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
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
  };
}
