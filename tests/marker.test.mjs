import test from "node:test";
import assert from "node:assert/strict";
import { getMarkerPosition } from "../src/lib/marker.ts";
import { calculateHeadingDifference } from "../src/lib/compass.ts";

test("marker centers, moves monotonically, and stays bounded across the full circle", () => {
  assert.deepEqual(getMarkerPosition(0), { position: .5, edge: null });
  let previous = -1;
  for (let d = -180; d <= 180; d += .5) {
    const value = getMarkerPosition(d);
    assert.ok(value.position >= 0 && value.position <= 1);
    assert.ok(value.position >= previous);
    previous = value.position;
    assert.equal(value.edge, d < -45 ? "left" : d > 45 ? "right" : null);
  }
  assert.deepEqual(getMarkerPosition(-45), { position: 0, edge: null });
  assert.deepEqual(getMarkerPosition(45), { position: 1, edge: null });
});

test("crossing north remains near center; opposite headings remain at an edge", () => {
  assert.ok(getMarkerPosition(calculateHeadingDifference(1,359)).position > .5);
  assert.ok(getMarkerPosition(calculateHeadingDifference(359,1)).position < .5);
  assert.equal(getMarkerPosition(calculateHeadingDifference(180,0)).edge, "left");
  assert.equal(getMarkerPosition(179.9).edge, "right");
});

test("missing, nonfinite and unnormalized differences never invent a marker", () => {
  for (const d of [null, NaN, Infinity, -Infinity, 181, -181]) assert.equal(getMarkerPosition(d), null);
});
