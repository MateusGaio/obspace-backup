export const DEFAULT_PHYSICS = {
  centerStrength: 0.06,
  repulsion: 240,
  linkStrength: 0.05,
  linkDistance: 180,
  nodeSize: 1,
  linkWidth: 1
};

export function createDefaultPhysics() {
  return { ...DEFAULT_PHYSICS };
}
