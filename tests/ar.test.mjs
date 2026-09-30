import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { AR_CONFIG as C, getARView, dampDirection, shouldResetVisualDirection } from "../src/lib/ar/arMath.ts";
import { createQiblaRoad } from "../src/lib/ar/createQiblaRoad.ts";
import { createKaabaModel, disposeSceneObjects } from "../src/lib/ar/createKaaba.ts";
import { calculateHeadingDifference, getDirectionState } from "../src/lib/compass.ts";

test("AR respects existing alignment, signed turn, unavailable and far-destination states", () => {
  for (const diff of [-180, -150, -60, -45, -30, -15, -3, 0, 3, 15, 30, 45, 60, 150, 179]) {
    const view = getARView(diff, getDirectionState(diff) === "aligned");
    assert.ok(Math.abs(view.factor) <= 1);
    assert.ok(view.end > 0 && view.end <= 1);
    if (Math.abs(diff) <= 3) { assert.equal(view.factor, 0); assert.equal(view.state, "aligned"); }
    else assert.equal(Math.sign(view.factor), Math.sign(diff));
    if (Math.abs(diff) >= 45) assert.equal(view.destinationOpacity, 0);
    if (Math.abs(diff) > 60) { assert.equal(view.state, "far"); assert.ok(view.end < 0.5); }
  }
  for (const diff of [null, NaN, Infinity, 181]) assert.equal(getARView(diff, false).state, "unavailable");
});

test("north wrap remains continuous; opposite rear directions reset without sweeping through alignment", () => {
  const before = calculateHeadingDifference(0, 359), after = calculateHeadingDifference(0, 1);
  assert.equal(shouldResetVisualDirection(before, after), false);
  assert.ok(Math.abs(getARView(before, false).factor - getARView(after, false).factor) < 0.05);
  assert.equal(shouldResetVisualDirection(179, -179), true);
  assert.equal(shouldResetVisualDirection(-179, 179), true);
  assert.equal(shouldResetVisualDirection(null, 20), true);
});

test("visual damping is time based, bounded and settles exactly", () => {
  const step = (hz, duration) => { let n = -0.8; for (let i = 0; i < hz * duration; i++) n = dampDirection(n, 0.8, 1 / hz); return n; };
  assert.ok(Math.abs(step(30, 0.2) - step(60, 0.2)) < 1e-10);
  assert.ok(step(60, 0.2) > -0.8 && step(60, 0.2) < 0.8);
  assert.equal(step(60, 2), 0.8);
});

test("ribbon keeps a flat constant-width surface, monotonic forward direction and stable GPU buffers", () => {
  const road = createQiblaRoad(), mesh = road.group.getObjectByName("RoadMesh");
  const geometry = mesh.geometry, attr = geometry.getAttribute("position"), buffer = attr.array;
  assert.ok(geometry instanceof THREE.BufferGeometry);
  assert.equal(geometry.index.count, C.roadSegments * 6);
  for (const factor of [-1, -0.3, 0, 0.3, 1]) {
    road.update(factor, 1);
    assert.equal(mesh.geometry, geometry); assert.equal(attr.array, buffer);
    for (let i = 0; i <= C.roadSegments; i++) {
      const left = new THREE.Vector3().fromBufferAttribute(attr, i * 2);
      const right = new THREE.Vector3().fromBufferAttribute(attr, i * 2 + 1);
      assert.ok(Math.abs(left.distanceTo(right) - C.roadWidth) < 1e-5);
      assert.ok(Math.abs(left.y - C.roadY) < 1e-5);
      if (i) assert.ok(road.curve.getPointAt(i / C.roadSegments).z < road.curve.getPointAt((i - 1) / C.roadSegments).z);
    }
    assert.ok(Math.abs(road.curve.getPointAt(1).x - factor * C.maxTargetX) < 1e-8);
  }
  road.update(0, 1);
  const camera = new THREE.PerspectiveCamera(C.cameraFov, 334 / 363, .1, 60);
  camera.position.set(0, C.cameraHeight, C.cameraZ); camera.lookAt(0, C.cameraLookY, C.cameraLookZ); camera.updateMatrixWorld();
  const projectedWidth = z => new THREE.Vector3(C.roadWidth / 2, C.roadY, z).project(camera).x - new THREE.Vector3(-C.roadWidth / 2, C.roadY, z).project(camera).x;
  assert.ok(projectedWidth(0) > projectedWidth(-C.roadLength) * 2);
  disposeSceneObjects(road.group);
});

test("shared chevrons point along curve tangents and move toward the destination", () => {
  const road = createQiblaRoad();
  road.update(-0.7, 1); road.animateArrows(0, 1);
  const arrows = road.group.getObjectByName("NavigationArrows").children;
  assert.equal(arrows.length, 4);
  const previousZ = arrows.map(a => a.position.z);
  arrows.forEach((arrow, i) => {
    const t = .045 + i / C.arrowCount * .87;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(arrow.rotation);
    assert.ok(forward.dot(road.curve.getTangentAt(t)) > .99999);
    assert.equal(arrow.geometry, arrows[0].geometry);
  });
  road.animateArrows(.03, 1);
  arrows.forEach((arrow, i) => assert.ok(arrow.position.z < previousZ[i]));
  disposeSceneObjects(road.group);
});

test("procedural model uses solid boxes and cleanup disposes shared resources exactly once", () => {
  const root = new THREE.Group();
  const kaaba = createKaabaModel(); root.add(kaaba, createQiblaRoad().group);
  assert.ok(kaaba.children.every(m => m.geometry instanceof THREE.BoxGeometry));
  assert.equal(kaaba.children.length, 7);
  const resources = new Set();
  root.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  const counts = new Map();
  resources.forEach(resource => resource.addEventListener("dispose", () => counts.set(resource, (counts.get(resource) || 0) + 1)));
  disposeSceneObjects(root);
  assert.equal(root.children.length, 0);
  resources.forEach(resource => assert.equal(counts.get(resource), 1));
});
