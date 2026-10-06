import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { initGestureController } from "../../camera/lib/gestureController.js";
import { applyZoomScale } from "../../camera/lib/gestureMath.js";
import { buildConnectionMap, createCenterForce, linkId, nodeId } from "../lib/graphPhysics.js";
import { applyNodeState, createNodeObject, markNotesAsNew, pulseReadingNodes, updateLabelVisibility } from "../lib/graphScene.js";

export function ObspaceGraph({
  graph,
  selectedNodeId,
  aiNodeIds,
  aiTrace,
  cameraEnabled,
  physics,
  slowOrbit,
  chatCollapsed,
  onSelectNode,
  onClearSelection,
  onStatus
}) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const videoRef = useRef(null);
  const stopGestureRef = useRef(null);
  const selectedRef = useRef(selectedNodeId);
  const aiSetRef = useRef(new Set(aiNodeIds || []));
  const aiTraceRef = useRef(aiTrace);
  const physicsRef = useRef(physics);
  const slowOrbitRef = useRef(slowOrbit);
  const onSelectRef = useRef(onSelectNode);
  const onClearSelectionRef = useRef(onClearSelection);
  const onStatusRef = useRef(onStatus);
  const prevNodeIdsRef = useRef(new Set());

  const connectionMap = useMemo(() => buildConnectionMap(graph?.links || []), [graph]);

  useEffect(() => {
    selectedRef.current = selectedNodeId;
    aiSetRef.current = new Set(aiNodeIds || []);
    aiTraceRef.current = aiTrace;
    physicsRef.current = physics;
    slowOrbitRef.current = slowOrbit;
    onSelectRef.current = onSelectNode;
    onClearSelectionRef.current = onClearSelection;
    onStatusRef.current = onStatus;
  });

  useEffect(() => {
    if (!containerRef.current || graphRef.current) {
      return;
    }

    const fg = ForceGraph3D({ controlType: "orbit" })(containerRef.current)
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .nodeThreeObject(createNodeObject)
      .nodeThreeObjectExtend(false)
      .linkOpacity(0.26)
      .linkWidth(0.62)
      .linkDirectionalParticles(0)
      .linkColor(() => "rgba(255, 192, 204, .24)")
      .cooldownTicks(180)
      .d3VelocityDecay(0.32)
      .enableNodeDrag(true)
      .onNodeClick((node) => {
        onSelectRef.current?.(node);
      })
      .onBackgroundClick(() => {
        onClearSelectionRef.current?.();
      });

    const scene = fg.scene();
    scene.fog = null;
    scene.add(new THREE.AmbientLight(0x8a2a35, 0.72));

    const key = new THREE.DirectionalLight(0xff9aa8, 0.62);
    key.position.set(160, 240, 360);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x5c1420, 0.28);
    rim.position.set(-420, -120, -260);
    scene.add(rim);

    const controls = fg.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.zoomSpeed = 0.45;
    controls.enableZoom = false;
    controls.minDistance = 12;
    controls.maxDistance = 5000;

    fg.cameraPosition({ x: 0, y: 120, z: 360 }, { x: 0, y: 0, z: 0 }, 0);
    graphRef.current = fg;

    const onResize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      fg.width(rect.width);
      fg.height(rect.height);
    };

    const canvas = fg.renderer()?.domElement;
    let wheelZoomVelocity = 0;
    const onWheel = (event) => {
      event.preventDefault();
      wheelZoomVelocity = THREE.MathUtils.clamp(wheelZoomVelocity + event.deltaY * 0.0009, -0.12, 0.12);
    };
    canvas?.addEventListener("wheel", onWheel, { passive: false });

    let frameId = 0;
    const animate = () => {
      const currentGraph = graphRef.current;
      if (currentGraph) {
        if (Math.abs(wheelZoomVelocity) > 0.0001) {
          const step = THREE.MathUtils.clamp(wheelZoomVelocity, -0.045, 0.045);
          applyZoomScale(currentGraph, 1 + step);
          wheelZoomVelocity *= 0.82;
        }
        if (slowOrbitRef.current) {
          const camera = currentGraph.camera();
          const currentControls = currentGraph.controls();
          const target = currentControls.target.clone();
          const offset = camera.position.clone().sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.0012);
          camera.position.copy(target.clone().add(offset));
          camera.lookAt(target);
              currentControls.update();
            }
        const readingSet = new Set([
          ...(aiTraceRef.current?.activeNodeIds || []),
          ...(aiTraceRef.current?.trailNodeIds || [])
        ]);
        const labelSet = new Set([...aiSetRef.current, ...readingSet]);
        pulseReadingNodes(currentGraph, aiTraceRef.current, physicsRef.current?.nodeSize || 1);
        updateLabelVisibility(currentGraph, selectedRef.current, labelSet);
      }
      frameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", onResize);
    onResize();
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      canvas?.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frameId);
      fg._destructor?.();
      graphRef.current = null;
    };
  }, []);

  // Re-center graph canvas when chatCollapsed changes
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !containerRef.current) return;
    // Small delay to let CSS transition complete
    const timer = setTimeout(() => {
      const rect = containerRef.current.getBoundingClientRect();
      fg.width(rect.width);
      fg.height(rect.height);
    }, 80);
    return () => clearTimeout(timer);
  }, [chatCollapsed]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !physics) {
      return;
    }

    fg.d3Force("charge")?.strength(-Math.abs(physics.repulsion));
    fg.d3Force("link")?.distance(physics.linkDistance).strength(physics.linkStrength);
    fg.d3Force("centerPull", createCenterForce(physics.centerStrength));
    fg.d3ReheatSimulation();
  }, [physics?.centerStrength, physics?.repulsion, physics?.linkDistance, physics?.linkStrength]);

  useEffect(() => {
    if (!graphRef.current || !graph) {
      return;
    }

    // Detect newly-added notes and mark them for 5s label glow
    const currentIds = new Set((graph.nodes || []).map((n) => n.id));
    const newIds = [];
    for (const id of currentIds) {
      if (!prevNodeIdsRef.current.has(id)) {
        newIds.push(id);
      }
    }
    // Only mark as new if we already had a previous snapshot (not initial load)
    if (prevNodeIdsRef.current.size > 0 && newIds.length > 0) {
      markNotesAsNew(newIds);
    }
    prevNodeIdsRef.current = currentIds;

    graphRef.current.graphData({
      nodes: graph.nodes || [],
      links: graph.links || []
    });
    onStatusRef.current?.(`${graph.stats.nodes} notas | ${graph.stats.links} conexoes`);
  }, [graph]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !graph) {
      return;
    }

    const selectedConnections = selectedNodeId ? connectionMap.get(selectedNodeId) || new Set() : new Set();
    const aiSet = new Set(aiNodeIds || []);
    const readingSet = new Set(aiTrace?.activeNodeIds || []);
    const readingTrailSet = new Set(aiTrace?.trailNodeIds || []);
    const readingLinkSet = new Set(aiTrace?.activeLinkIds || []);
    const readingTrailLinkSet = new Set(aiTrace?.trailLinkIds || []);
    const nodeScale = physics?.nodeSize || 1;
    const linkScale = physics?.linkWidth || 1;

    for (const node of fg.graphData().nodes || []) {
      const state =
        readingSet.has(node.id)
          ? "reading"
          : readingTrailSet.has(node.id)
            ? "reading-trail"
            : node.id === selectedNodeId
          ? "origin"
          : aiSet.has(node.id)
            ? "ai"
            : selectedConnections.has(node.id)
              ? "connected"
              : "default";
      applyNodeState(node.__threeObj, state, nodeScale);
    }

    fg.linkColor((link) => {
      const source = nodeId(link.source);
      const target = nodeId(link.target);
      const id = linkId(link);
      if (readingLinkSet.has(id)) {
        return "rgba(255, 242, 218, .92)";
      }
      if (readingTrailLinkSet.has(id)) {
        return "rgba(255, 218, 188, .42)";
      }
      if (source === selectedNodeId || target === selectedNodeId) {
        return "rgba(255, 210, 218, .72)";
      }
      if (aiSet.has(source) || aiSet.has(target)) {
        return "rgba(255, 128, 146, .48)";
      }
      return "rgba(255, 192, 204, .2)";
    });
    fg.linkWidth((link) => {
      const source = nodeId(link.source);
      const target = nodeId(link.target);
      const id = linkId(link);
      if (readingLinkSet.has(id)) {
        return 2.8 * linkScale;
      }
      if (readingTrailLinkSet.has(id)) {
        return 1.45 * linkScale;
      }
      if (source === selectedNodeId || target === selectedNodeId) {
        return 2.2 * linkScale;
      }
      if (aiSet.has(source) || aiSet.has(target)) {
        return 1.45 * linkScale;
      }
      return 0.58 * linkScale;
    });
    fg.linkDirectionalParticles((link) => {
      const id = linkId(link);
      if (readingLinkSet.has(id)) {
        return 3;
      }
      if (readingTrailLinkSet.has(id)) {
        return 1;
      }
      return 0;
    });
    fg.linkDirectionalParticleColor((link) => {
      return readingLinkSet.has(linkId(link)) ? "rgba(255, 250, 232, .92)" : "rgba(255, 220, 190, .48)";
    });
    fg.linkDirectionalParticleWidth((link) => {
      return readingLinkSet.has(linkId(link)) ? 2.6 : 1.2;
    });
    fg.linkDirectionalParticleSpeed((link) => {
      return readingLinkSet.has(linkId(link)) ? 0.012 : 0.006;
    });
  }, [
    selectedNodeId,
    aiNodeIds,
    aiTrace?.activeNodeIds,
    aiTrace?.activeLinkIds,
    aiTrace?.trailNodeIds,
    aiTrace?.trailLinkIds,
    connectionMap,
    graph,
    physics?.nodeSize,
    physics?.linkWidth
  ]);

  useEffect(() => {
    let cancelled = false;

    async function startGestures() {
      if (!cameraEnabled || !graphRef.current || !containerRef.current || !videoRef.current) {
        return;
      }
      const stop = await initGestureController({
        graph: graphRef.current,
        videoEl: videoRef.current,
        onStatus: (message) => onStatusRef.current?.(message)
      });
      if (cancelled) {
        await stop?.();
        return;
      }
      stopGestureRef.current = stop;
    }

    startGestures().catch((error) => {
      onStatusRef.current?.(`Camera sem acesso: ${String(error.message || error)}`);
    });

    return () => {
      cancelled = true;
      const stop = stopGestureRef.current;
      stopGestureRef.current = null;
      Promise.resolve(stop?.()).catch(() => null);
    };
  }, [cameraEnabled]);

  return (
    <div className="graph-wrap">
      <div ref={containerRef} className="graph-canvas" />
      <video ref={videoRef} className={`camera-preview ${cameraEnabled ? "visible" : ""}`} playsInline muted />
      <div className="space-aurora" />
    </div>
  );
}
