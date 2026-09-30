import { normalizeHeading, readCompassSample, type OrientationSample, type CompassReading } from "./compass.ts";

export type DirectionReference = "screen-top" | "rear-camera";
// Horizontal length of the unit rear-camera axis. Hysteresis avoids mode chatter.
export const CAMERA_HEADING_CONFIG = { enter: 0.65, exit: 0.45 } as const;

export function readNavigationSample(
  sample: OrientationSample, screenAngle: number, rearCameraActive: boolean,
  previousReference: DirectionReference = "screen-top",
): { reading: CompassReading; reference: DirectionReference } {
  const screenReading = readCompassSample(sample, screenAngle);
  const fallback = { reading: screenReading, reference: "screen-top" as const };
  // WebKit alpha is relative. Keep its established magnetic screen-top path;
  // never infer a camera azimuth from it or cache an unverified north offset.
  if (!rearCameraActive || sample.webkitCompassHeading !== undefined ||
      sample.absolute !== true || screenReading.source !== "absolute" ||
      (screenReading.kind !== "reading" && screenReading.kind !== "tilted")) return fallback;
  const rad = Math.PI / 180;
  const a = sample.alpha! * rad, b = sample.beta! * rad, g = sample.gamma! * rad;
  // Rz(alpha) Rx(beta) Ry(gamma) * [0, 0, -1].
  // -Z points out of the phone's back, independent of screen orientation.
  const east = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const north = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
  const threshold = previousReference === "rear-camera" ? CAMERA_HEADING_CONFIG.exit : CAMERA_HEADING_CONFIG.enter;
  if (Math.hypot(east, north) < threshold) return fallback;
  return {
    reference: "rear-camera",
    reading: { kind: "reading", source: "absolute", accuracy: null,
      heading: normalizeHeading(Math.atan2(east, north) / rad) },
  };
}
