/** Visual units only. The existing compass owns bearing, north and alignment. */
export const AR_CONFIG = {
  roadWidth: 1.25,
  roadLength: 8,
  roadY: -1.1,
  roadSegments: 56,
  edgeWidth: 0.035,
  maxTargetX: 3,
  cameraFov: 48,
  cameraHeight: 1.9,
  cameraZ: 3.4,
  cameraLookY: -0.2,
  cameraLookZ: -4,
  fullRoadAngle: 30,
  visibleAngle: 45,
  farAngle: 60,
  partialRoadEnd: 0.48,
  farRoadEnd: 0.34,
  dampingSeconds: 0.14,
  geometryEpsilon: 0.0008,
  maxDeltaSeconds: 0.05,
  maxDpr: 2,
  arrowCount: 4,
  arrowSpeed: 0.11,
  arrowScale: 0.42,
  kaabaScale: 1.1,
  ringRadius: 0.94,
  ringPulseSeconds: 0.65,
  ringPulseAmount: 0.055,
  roadOpacity: 0.64,
  debugIntervalMs: 500,
} as const;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export type ARState = "unavailable" | "far" | "partial" | "visible" | "aligned";
export function headingDifferenceToDirectionFactor(difference: number): number {
  if (!Number.isFinite(difference)) return 0;
  return clamp(difference / AR_CONFIG.visibleAngle, -1, 1);
}
export function directionFactorToTargetX(factor: number): number {
  return clamp(factor, -1, 1) * AR_CONFIG.maxTargetX;
}
export function getARView(difference: number | null, aligned: boolean) {
  if (difference === null || !Number.isFinite(difference) || Math.abs(difference) > 180) {
    return { state: "unavailable" as ARState, factor: 0, end: 0, destinationOpacity: 0 };
  }
  const angle = Math.abs(difference);
  const state: ARState = aligned ? "aligned" : angle > AR_CONFIG.farAngle ? "far" : angle > AR_CONFIG.fullRoadAngle ? "partial" : "visible";
  const fraction = clamp((angle - AR_CONFIG.fullRoadAngle) / (AR_CONFIG.farAngle - AR_CONFIG.fullRoadAngle), 0, 1);
  return {
    state,
    factor: aligned ? 0 : headingDifferenceToDirectionFactor(difference),
    end: state === "far" ? AR_CONFIG.farRoadEnd : 1 - fraction * (1 - AR_CONFIG.partialRoadEnd),
    destinationOpacity: clamp((AR_CONFIG.visibleAngle - angle) / (AR_CONFIG.visibleAngle - AR_CONFIG.fullRoadAngle), 0, 1),
  };
}
export function dampDirection(current: number, target: number, delta: number): number {
  const weight = 1 - Math.exp(-Math.max(0, delta) / AR_CONFIG.dampingSeconds);
  const next = current + (target - current) * weight;
  return Math.abs(next - target) < AR_CONFIG.geometryEpsilon ? target : next;
}
/** Opposite-side jumps near +/-180 must never sweep a road through alignment. */
export function shouldResetVisualDirection(previous: number | null, next: number | null): boolean {
  return previous === null || next === null ||
    (Math.abs(previous) > AR_CONFIG.farAngle && Math.abs(next) > AR_CONFIG.farAngle && Math.sign(previous) !== Math.sign(next));
}

export type ARDiagnostics = {
  status: "active" | "fallback";
  state: ARState;
  targetFactor: number;
  renderedFactor: number;
  targetX: number;
  fps: number;
  geometries: number;
  drawCalls: number;
};

export const AR_FALLBACK_DIAGNOSTICS: ARDiagnostics = {
  status: "fallback", state: "unavailable", targetFactor: 0, renderedFactor: 0,
  targetX: 0, fps: 0, geometries: 0, drawCalls: 0,
};
