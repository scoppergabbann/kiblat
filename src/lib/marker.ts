/** A symbolic 90-degree guide window, not a calibrated camera field of view. */
export const MARKER_HALF_SPAN = 45;

export function getMarkerPosition(difference: number | null): {
  position: number; edge: "left" | "right" | null;
} | null {
  if (difference === null || !Number.isFinite(difference) || Math.abs(difference) > 180) return null;
  return {
    position: (Math.max(-MARKER_HALF_SPAN, Math.min(MARKER_HALF_SPAN, difference)) / MARKER_HALF_SPAN + 1) / 2,
    edge: difference < -MARKER_HALF_SPAN ? "left" : difference > MARKER_HALF_SPAN ? "right" : null,
  };
}
