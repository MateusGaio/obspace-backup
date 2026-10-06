import { Camera } from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";
import {
  MP_HANDS_VERSION,
  PALM_SMOOTHING,
  PROCESS_EVERY_N_FRAMES,
  ZOOM_SMOOTHING,
  applyOrbit,
  applyZoom,
  depthSignal,
  extendedFingerCount,
  lerp,
  palmCenter,
  rightHand
} from "./gestureMath.js";

export async function initGestureController({ graph, videoEl, onStatus }) {
  const state = {
    palm: null,
    zoomDepth: null,
    frame: 0,
    lastStatusAt: 0,
    // Velocity EMA for smoother continuous movement
    velX: 0,
    velY: 0,
    velDepth: 0
  };

  const VEL_DECAY = 0.7;       // velocity decays each frame when no new data
  const VEL_BLEND = 0.55;      // blend factor for new velocity vs old

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MP_HANDS_VERSION}/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.35,
    minTrackingConfidence: 0.35,
    selfieMode: true
  });

  function setStatus(message) {
    if (!message) {
      return;
    }
    const now = Date.now();
    if (now - state.lastStatusAt > 900) {
      state.lastStatusAt = now;
      onStatus?.(message);
    }
  }

  hands.onResults((results) => {
    const hand = rightHand(results);
    if (!hand) {
      state.palm = null;
      state.zoomDepth = null;
      // Decay velocity to zero when hand is lost
      state.velX *= VEL_DECAY;
      state.velY *= VEL_DECAY;
      state.velDepth *= VEL_DECAY;
      return;
    }

    const mode = extendedFingerCount(hand) >= 4 ? "orbit" : extendedFingerCount(hand) <= 1 ? "zoom" : "neutral";
    const palm = palmCenter(hand);
    const depth = depthSignal(hand);
    if (!state.palm) {
      state.palm = palm;
      state.zoomDepth = depth;
      state.velX = 0;
      state.velY = 0;
      state.velDepth = 0;
      return;
    }

    const smooth = {
      x: lerp(state.palm.x, palm.x, PALM_SMOOTHING),
      y: lerp(state.palm.y, palm.y, PALM_SMOOTHING),
      z: lerp(state.palm.z, palm.z, PALM_SMOOTHING)
    };
    const smoothDepth = lerp(state.zoomDepth, depth, ZOOM_SMOOTHING);

    // Compute instantaneous delta and blend into velocity EMA
    const rawDx = smooth.x - state.palm.x;
    const rawDy = smooth.y - state.palm.y;
    const rawDd = smoothDepth - state.zoomDepth;

    state.velX = lerp(state.velX, rawDx, VEL_BLEND);
    state.velY = lerp(state.velY, rawDy, VEL_BLEND);
    state.velDepth = lerp(state.velDepth, rawDd, VEL_BLEND);

    if (mode === "orbit") {
      applyOrbit(graph, state.velX, state.velY);
      state.velDepth *= VEL_DECAY;
    }
    if (mode === "zoom") {
      applyZoom(graph, state.velDepth);
    }
    if (mode === "neutral") {
      state.velDepth *= VEL_DECAY;
    }

    state.palm = smooth;
    state.zoomDepth = smoothDepth;
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      state.frame += 1;
      if (state.frame % PROCESS_EVERY_N_FRAMES === 0) {
        await hands.send({ image: videoEl });
      }
    },
    width: 640,
    height: 480
  });

  await camera.start();

  return async () => {
    try {
      await camera.stop();
    } catch {
      // MediaPipe can throw when the track already ended.
    }
    try {
      await hands.close();
    } catch {
      // Ignore shutdown races.
    }
  };
}
