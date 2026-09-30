import test from "node:test";
import assert from "node:assert/strict";
import { calculateQiblaBearing } from "../src/lib/qibla.ts";

const close = (actual, expected, tolerance = 1e-9) => {
  assert.equal(typeof actual, "number");
  const difference = Math.abs(((actual - expected + 540) % 360) - 180);
  assert.ok(difference < tolerance, `${actual} differs from ${expected}`);
};

test("north and south along the Ka'bah meridian", () => {
  close(calculateQiblaBearing(0, 39.8262), 0);
  close(calculateQiblaBearing(40, 39.8262), 180);
});

test("city reference bearings across hemispheres", () => {
  // Rounded spherical initial bearings: coarse fixtures catch swapped inputs,
  // wrong atan2 arguments, or accidentally returning the reverse bearing.
  for (const [lat, lon, expected] of [
    [-6.2088, 106.8456, 295.15], // Jakarta
    [-7.25, 112.75, 294.03], // Surabaya
    [51.5074, -0.1278, 118.99], // London
    [40.7128, -74.0060, 58.48], // New York
    [-33.8688, 151.2093, 277.5], // Sydney
  ]) close(calculateQiblaBearing(lat, lon), expected, 0.1);
});

test("matches an independent Cartesian tangent projection across the globe", () => {
  const radians = value => value * Math.PI / 180;
  const vector = (lat, lon) => [
    Math.cos(radians(lat)) * Math.cos(radians(lon)),
    Math.cos(radians(lat)) * Math.sin(radians(lon)),
    Math.sin(radians(lat)),
  ];
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const destination = vector(21.4225, 39.8262);
  for (const lat of [-89, -60, -30, 0, 30, 60, 89]) {
    for (let lon = -180; lon <= 180; lon += 15) {
      const origin = vector(lat, lon);
      const tangent = destination.map((value, index) => value - dot(destination, origin) * origin[index]);
      const east = [-Math.sin(radians(lon)), Math.cos(radians(lon)), 0];
      const north = [-Math.sin(radians(lat)) * Math.cos(radians(lon)), -Math.sin(radians(lat)) * Math.sin(radians(lon)), Math.cos(radians(lat))];
      const expected = (Math.atan2(dot(tangent, east), dot(tangent, north)) * 180 / Math.PI + 360) % 360;
      const result = calculateQiblaBearing(lat, lon);
      assert.ok(result >= 0 && result < 360);
      close(result, expected);
    }
  }
});

test("date-line equivalents and north wraparound", () => {
  close(calculateQiblaBearing(0, 180), calculateQiblaBearing(0, -180));
  const westOfNorth = calculateQiblaBearing(0, 39.827);
  assert.ok(westOfNorth > 359 && westOfNorth < 360);
  assert.equal(Math.round(westOfNorth) % 360, 0);
});

test("undefined directions do not invent a north bearing", () => {
  assert.equal(calculateQiblaBearing(21.4225, 39.8262), null);
  assert.equal(calculateQiblaBearing(-21.4225, -140.1738), null);
  assert.equal(calculateQiblaBearing(90, 0), null);
  assert.equal(calculateQiblaBearing(-90, 0), null);
  assert.equal(typeof calculateQiblaBearing(21.4226, 39.8262), "number");
});

test("invalid coordinates fail explicitly", () => {
  for (const [lat, lon] of [[NaN, 0], [0, Infinity], [91, 0], [-91, 0], [0, 181], [0, -181]]) {
    assert.throws(() => calculateQiblaBearing(lat, lon), RangeError);
  }
});
