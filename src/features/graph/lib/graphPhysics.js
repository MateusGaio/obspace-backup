export function nodeId(ref) {
  return typeof ref === "string" ? ref : String(ref?.id || "");
}

export function linkId(link) {
  return `${nodeId(link.source)}::${nodeId(link.target)}`;
}

export function buildConnectionMap(links = []) {
  const map = new Map();
  for (const link of links) {
    const source = nodeId(link.source);
    const target = nodeId(link.target);
    if (!map.has(source)) {
      map.set(source, new Set());
    }
    if (!map.has(target)) {
      map.set(target, new Set());
    }
    map.get(source).add(target);
    map.get(target).add(source);
  }
  return map;
}

export function createCenterForce(strength) {
  let nodes = [];
  function force(alpha) {
    const pull = strength * alpha;
    for (const node of nodes) {
      node.vx += (0 - (node.x || 0)) * pull;
      node.vy += (0 - (node.y || 0)) * pull;
      node.vz += (0 - (node.z || 0)) * pull;
    }
  }
  force.initialize = (nextNodes) => {
    nodes = nextNodes || [];
  };
  return force;
}
