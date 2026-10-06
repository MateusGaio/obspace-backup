import * as THREE from "three";

// ── Track recently-created notes so their labels glow for 5 s ──
const NEW_NOTE_DURATION_MS = 5000;
const recentNoteTimestamps = new Map();

export function markNotesAsNew(nodeIds) {
  const now = performance.now();
  for (const id of nodeIds) {
    recentNoteTimestamps.set(id, now);
  }
}

export function isRecentNote(nodeId) {
  const ts = recentNoteTimestamps.get(nodeId);
  if (!ts) return false;
  if (performance.now() - ts > NEW_NOTE_DURATION_MS) {
    recentNoteTimestamps.delete(nodeId);
    return false;
  }
  return true;
}

/** Returns 1→0 opacity factor for a recently created note (fades over 5 s). */
export function recentNoteFade(nodeId) {
  const ts = recentNoteTimestamps.get(nodeId);
  if (!ts) return 0;
  const elapsed = performance.now() - ts;
  if (elapsed > NEW_NOTE_DURATION_MS) {
    recentNoteTimestamps.delete(nodeId);
    return 0;
  }
  return 1 - elapsed / NEW_NOTE_DURATION_MS;
}

export function createNodeObject(node) {
  const group = new THREE.Group();
  const size = Math.max(3.6, Math.min(8.8, 3.4 + Math.sqrt(node.degree || 1) * 1.05));
  const geometry = new THREE.SphereGeometry(size, 16, 12);
  const material = new THREE.MeshStandardMaterial({
    color: "#8f1026",
    emissive: "#000000",
    emissiveIntensity: 0,
    roughness: 0.74,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(geometry, material);
  const label = makeLabelSprite(node.name);

  mesh.userData.node = node;
  group.userData.node = node;
  group.userData.coreMesh = mesh;
  group.userData.labelSprite = label;
  group.add(mesh);
  group.add(label);
  return group;
}

function makeLabelSprite(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const safeText = String(text || "Nota").slice(0, 52);
  const fontSize = 42;
  const paddingX = 32;

  ctx.font = `700 ${fontSize}px "Rajdhani", "Segoe UI", sans-serif`;
  canvas.width = Math.min(1024, Math.max(256, Math.ceil(ctx.measureText(safeText).width + paddingX * 2)));
  canvas.height = 128;

  ctx.font = `700 ${fontSize}px "Rajdhani", "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255, 196, 206, .34)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255, 226, 232, .96)";
  ctx.fillText(safeText, paddingX, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 12, canvas.height / 12, 1);
  sprite.position.set(0, 13, 0);
  sprite.userData.opacity = 0;
  sprite.visible = false;
  return sprite;
}

export function applyNodeState(object, state, nodeScale = 1) {
  const mesh = object?.userData?.coreMesh;
  if (!mesh) {
    return;
  }
  const visualScale = Math.max(0.2, Number(nodeScale) || 1);
  if (state === "origin") {
    mesh.material.color.set("#ff2848");
    mesh.material.emissive.set("#000000");
    mesh.material.emissiveIntensity = 0;
    object.scale.setScalar(1.22 * visualScale);
    return;
  }
  if (state === "connected") {
    mesh.material.color.set("#c31935");
    mesh.material.emissive.set("#000000");
    mesh.material.emissiveIntensity = 0;
    object.scale.setScalar(1.08 * visualScale);
    return;
  }
  if (state === "ai") {
    mesh.material.color.set("#ff5c72");
    mesh.material.emissive.set("#000000");
    mesh.material.emissiveIntensity = 0;
    object.scale.setScalar(1.16 * visualScale);
    return;
  }
  if (state === "reading") {
    mesh.material.color.set("#fff1d8");
    mesh.material.emissive.set("#ffd8a3");
    mesh.material.emissiveIntensity = 0.9;
    object.scale.setScalar(1.3 * visualScale);
    return;
  }
  if (state === "reading-trail") {
    mesh.material.color.set("#ffd8bd");
    mesh.material.emissive.set("#5a180e");
    mesh.material.emissiveIntensity = 0.25;
    object.scale.setScalar(1.12 * visualScale);
    return;
  }
  mesh.material.color.set("#8f1026");
  mesh.material.emissive.set("#000000");
  mesh.material.emissiveIntensity = 0;
  object.scale.setScalar(visualScale);
}

export function pulseReadingNodes(graph, aiTrace, nodeScale = 1) {
  const activeSet = new Set(aiTrace?.activeNodeIds || []);
  if (!activeSet.size) {
    return;
  }
  const visualScale = Math.max(0.2, Number(nodeScale) || 1);
  const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;

  for (const node of graph.graphData().nodes || []) {
    if (!activeSet.has(node.id)) {
      continue;
    }
    const object = node.__threeObj;
    const mesh = object?.userData?.coreMesh;
    if (!mesh) {
      continue;
    }
    mesh.material.emissiveIntensity = 0.75 + pulse * 0.55;
    object.scale.setScalar((1.24 + pulse * 0.08) * visualScale);
  }
}

export function updateLabelVisibility(graph, selectedNodeId, aiSet) {
  const camera = graph.camera();
  if (!camera) {
    return;
  }

  const fullOpacityDistance = 82;
  const hiddenDistance = 128;
  const fadeSpeed = 0.12;

  for (const node of graph.graphData().nodes || []) {
    const object = node.__threeObj;
    const label = object?.userData?.labelSprite;
    if (!label || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) {
      continue;
    }

    const distance = camera.position.distanceTo(new THREE.Vector3(node.x, node.y, node.z));
    const pinned = node.id === selectedNodeId || aiSet.has(node.id);

    // New notes get forced-visible for 5 seconds with gradual fade
    const recentFactor = recentNoteFade(node.id);

    const distanceOpacity =
      distance <= fullOpacityDistance
        ? 0.92
        : distance >= hiddenDistance
          ? 0
          : 0.92 * (1 - (distance - fullOpacityDistance) / (hiddenDistance - fullOpacityDistance));
    const pinnedOpacity = pinned ? Math.max(distanceOpacity, 0.86) : distanceOpacity;
    const targetOpacity = Math.max(pinnedOpacity, recentFactor * 0.92);
    const currentOpacity = Number.isFinite(label.userData.opacity) ? label.userData.opacity : 0;
    const nextOpacity = currentOpacity + (targetOpacity - currentOpacity) * fadeSpeed;

    label.userData.opacity = nextOpacity;
    label.material.opacity = nextOpacity;
    label.visible = nextOpacity > 0.03;
  }
}
