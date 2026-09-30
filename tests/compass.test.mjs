import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHeading, calculateHeadingDifference, readCompassSample, getDirectionState } from "../src/lib/compass.ts";

const sample = (values = {}) => ({ alpha: 0, beta: 0, gamma: 0, absolute: true, ...values });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("normalize headings and shortest signed turn across north", () => {
  assert.equal(normalizeHeading(-1), 359);
  assert.equal(normalizeHeading(720), 0);
  assert.equal(calculateHeadingDifference(294, 261), 33);
  assert.equal(calculateHeadingDifference(294, 312), -18);
  assert.equal(calculateHeadingDifference(1, 359), 2);
  assert.equal(calculateHeadingDifference(359, 1), -2);
  assert.equal(calculateHeadingDifference(180, 0), -180);
  assert.equal(calculateHeadingDifference(90, 90), 0);
  assert.throws(() => normalizeHeading(NaN), RangeError);
  assert.throws(() => calculateHeadingDifference(1, Infinity), RangeError);
});

test("absolute Euler headings: all quadrants and screen orientations", () => {
  for (const alpha of [0, 45, 90, 180, 270, 359]) {
    for (const angle of [0, 90, 180, 270, -90]) {
      const result = readCompassSample(sample({ alpha }), angle);
      assert.equal(result.kind, "reading");
      close(result.heading, normalizeHeading(360 - alpha + angle));
      assert.equal(result.source, "absolute");
      assert.equal(result.accuracy, null);
    }
  }
});

test("tilted results match independently applied rotation matrices", () => {
  const rad = x => x * Math.PI / 180;
  for (const alpha of [0, 60, 125, 270]) for (const beta of [-40, 0, 40]) for (const gamma of [-30, 0, 30]) {
    for (const angle of [0, 90, 180, 270]) {
      let [x, y, z] = [Math.sin(rad(angle)), Math.cos(rad(angle)), 0];
      [x, z] = [x * Math.cos(rad(gamma)) + z * Math.sin(rad(gamma)), -x * Math.sin(rad(gamma)) + z * Math.cos(rad(gamma))];
      [y, z] = [y * Math.cos(rad(beta)) - z * Math.sin(rad(beta)), y * Math.sin(rad(beta)) + z * Math.cos(rad(beta))];
      [x, y] = [x * Math.cos(rad(alpha)) - y * Math.sin(rad(alpha)), x * Math.sin(rad(alpha)) + y * Math.cos(rad(alpha))];
      const result = readCompassSample(sample({ alpha, beta, gamma }), angle);
      assert.equal(result.kind, "reading");
      close(result.heading, normalizeHeading(Math.atan2(x, y) * 180 / Math.PI));
    }
  }
});

test("relative, missing and non-finite data are not compass headings", () => {
  assert.equal(readCompassSample(sample({ absolute: false })).kind, "relative");
  for (const values of [{ alpha: null }, { alpha: NaN }, { beta: null }, { gamma: Infinity }, { beta: 181 }, { gamma: 91 }]) {
    assert.equal(readCompassSample(sample(values)).kind, "invalid");
  }
  assert.equal(readCompassSample(sample(), NaN).kind, "invalid");
});

test("vertical screen top is rejected instead of inventing a heading", () => {
  assert.equal(readCompassSample(sample({ beta: 90 })).kind, "tilted");
  assert.equal(readCompassSample(sample({ gamma: 90 }), 90).kind, "tilted");
  assert.equal(readCompassSample(sample({ beta: 70 })).kind, "reading");
});

test("WebKit magnetic heading takes precedence over alpha and handles zero", () => {
  const result = readCompassSample(sample({ alpha: 200, absolute: false, webkitCompassHeading: 0, webkitCompassAccuracy: 10 }), 90);
  assert.equal(result.kind, "reading");
  assert.equal(result.heading, 90);
  assert.equal(result.accuracy, 10);
  assert.equal(result.source, "webkit");
  const unknown = readCompassSample(sample({ webkitCompassHeading: 261 }));
  assert.equal(unknown.kind, "reading");
  assert.equal(unknown.heading, 261);
  assert.equal(unknown.accuracy, null);
});

test("invalid WebKit accuracy is rejected; no silent absolute fallback", () => {
  for (const accuracy of [-1, 31, NaN]) {
    assert.equal(readCompassSample(sample({ webkitCompassHeading: 261, webkitCompassAccuracy: accuracy })).kind, "invalid");
  }
  assert.equal(readCompassSample(sample({ webkitCompassHeading: NaN })).kind, "invalid");
  assert.equal(readCompassSample(sample({ webkitCompassHeading: 20, beta: 90 })).kind, "tilted");
});


test("visual state boundaries use raw signed differences and reject missing readings", () => {
  for (const value of [null, NaN, Infinity]) assert.equal(getDirectionState(value), "unavailable");
  for (const value of [-3, -0.1, 0, 0.1, 3]) assert.equal(getDirectionState(value), "aligned");
  for (const value of [-20, -3.01, 3.01, 20]) assert.equal(getDirectionState(value), "near");
  for (const value of [-180, -20.01, 20.01, 179.99]) assert.equal(getDirectionState(value), "turn");
});