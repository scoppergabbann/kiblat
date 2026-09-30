export type CompassSource = "webkit" | "absolute";
export type OrientationSample = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};
export type CompassReading =
  | { kind: "reading"; heading: number; accuracy: number | null; source: CompassSource }
  | { kind: "relative" | "invalid" | "tilted"; source: CompassSource | null };

export function normalizeHeading(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new RangeError("Heading must be finite.");
  return ((degrees % 360) + 360) % 360;
}

/** Clockwise/right is positive. Exact 180-degree ties consistently choose left. */
export function calculateHeadingDifference(qiblaBearing: number, phoneHeading: number): number {
  return ((normalizeHeading(qiblaBearing) - normalizeHeading(phoneHeading) + 540) % 360) - 180;
}

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Horizontal projection of the CURRENT screen's top edge, not the rear camera.
 * DeviceOrientation uses Rz(alpha) Rx(beta) Ry(gamma). Screen angle rotates
 * screen-up into device coordinates [sin(angle), cos(angle), 0].
 * Near vertical, that edge cannot define a reliable horizontal heading.
 * https://www.w3.org/TR/orientation-event/#a-2-alternate-device-orientation-representations
 */
function projectedHeading(alpha: number, beta: number, gamma: number, screenAngle: number): number | null {
  const rad = Math.PI / 180;
  const a = alpha * rad, b = beta * rad, g = gamma * rad, s = screenAngle * rad;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const cg = Math.cos(g), sg = Math.sin(g);
  const x = Math.sin(s), y = Math.cos(s);
  const east = (ca * cg - sa * sb * sg) * x - cb * sa * y;
  const north = (sa * cg + ca * sb * sg) * x + ca * cb * y;
  if (Math.hypot(east, north) < 0.2) return null;
  return normalizeHeading(Math.atan2(east, north) / rad);
}

export function readCompassSample(sample: OrientationSample, screenAngle = 0): CompassReading {
  if (!isNumber(screenAngle)) return { kind: "invalid", source: null };
  const { alpha, beta, gamma, webkitCompassHeading, webkitCompassAccuracy } = sample;
  const hasTilt = isNumber(beta) && Math.abs(beta) <= 180 && isNumber(gamma) && Math.abs(gamma) <= 90;
  if (webkitCompassHeading !== undefined) {
    if (!isNumber(webkitCompassHeading) || webkitCompassHeading < 0 || webkitCompassHeading >= 360 ||
        (webkitCompassAccuracy !== undefined &&
          (!isNumber(webkitCompassAccuracy) || webkitCompassAccuracy < 0 || webkitCompassAccuracy > 30))) {
      return { kind: "invalid", source: "webkit" };
    }
    // Native WebKit heading describes the natural device top. Adjust only
    // the change in projected direction caused by screen rotation.
    let correction = 0;
    if (hasTilt) {
      const naturalTop = projectedHeading(0, beta, gamma, 0);
      const screenTop = projectedHeading(0, beta, gamma, screenAngle);
      if (naturalTop === null || screenTop === null) return { kind: "tilted", source: "webkit" };
      correction = calculateHeadingDifference(screenTop, naturalTop);
    } else if (normalizeHeading(screenAngle) !== 0) {
      return { kind: "invalid", source: "webkit" };
    }
    return {
      kind: "reading",
      heading: normalizeHeading(webkitCompassHeading + correction),
      accuracy: webkitCompassAccuracy ?? null,
      source: "webkit",
    };
  }
  // Never infer a north reference from relative alpha or from the event name.
  if (sample.absolute !== true) return { kind: "relative", source: null };
  if (!isNumber(alpha) || alpha < 0 || alpha >= 360 || !hasTilt) {
    return { kind: "invalid", source: "absolute" };
  }
  const heading = projectedHeading(alpha, beta, gamma, screenAngle);
  return heading === null
    ? { kind: "tilted", source: "absolute" }
    : { kind: "reading", heading, accuracy: null, source: "absolute" };
}

export const ALIGNMENT_TOLERANCE = 3;

/** Shortest-arc, time-based smoothing; stability is a motion heuristic, not accuracy. */
export function createHeadingFilter() {
  let previous: { raw: number; filtered: number; time: number } | null = null;
  let changes: { time: number; step: number }[] = [];
  const reset = () => { previous = null; changes = []; };
  return {
    reset,
    update(raw: number, time: number) {
      if (!Number.isFinite(raw) || !Number.isFinite(time)) throw new RangeError("Finite heading and time required.");
      raw = normalizeHeading(raw);
      if (!previous || time <= previous.time || time - previous.time > 1000) {
        changes = [];
        previous = { raw, filtered: raw, time };
        return { heading: raw, unstable: false };
      }
      const step = calculateHeadingDifference(raw, previous.raw);
      changes = changes.filter(change => time - change.time <= 800);
      if (Math.abs(step) >= 3) changes.push({ time, step });
      changes = changes.slice(-64);
      let reversals = 0;
      for (let i = 1; i < changes.length; i++) {
        if (Math.sign(changes[i].step) !== Math.sign(changes[i - 1].step)) reversals++;
      }
      const weight = 1 - Math.exp(-(time - previous.time) / 160);
      const heading = normalizeHeading(previous.filtered + weight * calculateHeadingDifference(raw, previous.filtered));
      previous = { raw, filtered: heading, time };
      return { heading, unstable: reversals >= 4 };
    },
  };
}
export const CLOSE_TOLERANCE = 20;

/** Visual classification only; this does not improve sensor accuracy. */
export function getDirectionState(difference: number | null): "unavailable" | "aligned" | "near" | "turn" {
  if (difference === null || !Number.isFinite(difference)) return "unavailable";
  const distance = Math.abs(difference);
  if (distance <= ALIGNMENT_TOLERANCE) return "aligned";
  if (distance <= CLOSE_TOLERANCE) return "near";
  return "turn";
}
