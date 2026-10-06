import * as THREE from "three";

export const MP_HANDS_VERSION = "0.4.1675469240";

// ── Tuned for responsive, fluid hand tracking ──
export const PALM_SMOOTHING = 0.45;        // was 0.2 – higher = more responsive
export const ROTATION_GAIN = 4.8;           // was 3.2 – amplify rotation movement
export const ROTATION_DEADZONE = 0.0008;    // was 0.0022 – smaller = less dead area
export const ZOOM_GAIN = 20;
export const ZOOM_DEADZONE = 0.0025;
export const ZOOM_SMOOTHING = 0.18;
export const ZOOM_MIN_SCALE = 0.94;
export const ZOOM_MAX_SCALE = 1.06;
export const PROCESS_EVERY_N_FRAMES = 1;    // was 2 – process every single frame

export function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

export function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function extendedFingerCount(landmarks) {
  const wrist = landmarks[0];
  const pairs = [
    [4, 3],
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18]
  ];
  return pairs.reduce((count, [tipIndex, midIndex]) => {
    const tip = landmarks[tipIndex];
    const mid = landmarks[midIndex];
    return pointDistance(tip, wrist) > pointDistance(mid, wrist) * 1.12 ? count + 1 : count;
  }, 0);
}

export function palmCenter(landmarks) {
  const indices = [0, 5, 9, 13, 17];
  const sum = indices.reduce(
    (acc, index) => ({
      x: acc.x + landmarks[index].x,
      y: acc.y + landmarks[index].y,
      z: acc.z + landmarks[index].z
    }),
    { x: 0, y: 0, z: 0 }
  );
  return {
    x: sum.x / indices.length,
    y: sum.y / indices.length,
    z: sum.z / indices.length
  };
}

export function depthSignal(landmarks) {
  const wrist = landmarks[0];
  const palmAnchors = [5, 9, 13, 17];
  const palmSpread =
    palmAnchors.reduce((total, index) => {
      const point = landmarks[index];
      return total + Math.hypot(point.x - wrist.x, point.y - wrist.y);
    }, 0) / palmAnchors.length;
  return palmSpread + pointDistance(landmarks[5], landmarks[17]) * 0.6;
}

export function rightHand(results) {
  const landmarks = results.multiHandLandmarks || [];
  if (!landmarks.length) {
    return null;
  }

  for (let index = 0; index < landmarks.length; index += 1) {
    const handedness = results.multiHandedness?.[index]?.[0]?.label || results.multiHandedness?.[index]?.label;
    if (String(handedness || "").toLowerCase() === "right") {
      return landmarks[index];
    }
  }

  return results.multiHandedness?.length ? null : landmarks[0];
}

export function applyOrbit(graph, deltaX, deltaY) {
  if (Math.abs(deltaX) < ROTATION_DEADZONE && Math.abs(deltaY) < ROTATION_DEADZONE) {
    return false;
  }

  const controls = graph.controls();
  const camera = graph.camera();
  if (!controls?.target || !camera) {
    return false;
  }

  const target = controls.target.clone();
  const offset = new THREE.Vector3().subVectors(camera.position, target);
  offset.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(camera.up.clone().normalize(), deltaX * ROTATION_GAIN));

  const rightAxis = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
  if (Number.isFinite(rightAxis.lengthSq()) && rightAxis.lengthSq() > 0) {
    offset.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(rightAxis, deltaY * ROTATION_GAIN));
  }

  camera.position.copy(target.clone().add(offset));
  camera.lookAt(target);
  controls.update();
  return true;
}

export function applyZoom(graph, deltaDepth) {
  if (!Number.isFinite(deltaDepth) || Math.abs(deltaDepth) < ZOOM_DEADZONE) {
    return false;
  }

  const scale = THREE.MathUtils.clamp(1 - deltaDepth * ZOOM_GAIN, ZOOM_MIN_SCALE, ZOOM_MAX_SCALE);
  return applyZoomScale(graph, scale);
}

export function applyZoomScale(graph, scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    return false;
  }

  const camera = graph.camera();
  const controls = graph.controls();
  const target = controls.target.clone();
  const offset = new THREE.Vector3().subVectors(camera.position, target);
  const distance = THREE.MathUtils.clamp(offset.length() * scale, 12, 5000);
  offset.setLength(distance);
  camera.position.copy(target.clone().add(offset));
  controls.update();
  return true;
}
