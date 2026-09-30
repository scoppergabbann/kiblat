import test from "node:test";
import assert from "node:assert/strict";
import { readNavigationSample } from "../src/lib/navigationHeading.ts";
import { calculateHeadingDifference, readCompassSample, normalizeHeading } from "../src/lib/compass.ts";
const sample = values => ({ alpha: 0, beta: 90, gamma: 0, absolute: true, ...values });
const close = (a, b) => assert.ok(Math.abs(calculateHeadingDifference(a, b)) < 1e-7, a + " != " + b);

test("upright rear camera points north/east/south/west independently of screen orientation", () => {
  for (const [alpha, expected] of [[0,0],[270,90],[180,180],[90,270],[359,1]]) {
    for (const screenAngle of [0,90,180,270,-90]) {
      const result = readNavigationSample(sample({ alpha }), screenAngle, true);
      assert.equal(result.reference, "rear-camera");
      assert.equal(result.reading.kind, "reading");
      close(result.reading.heading, expected);
    }
  }
});

test("camera projection matches independently rotated -Z across yaw, pitch and roll", () => {
  for (const alpha of [0,53,172,271,359]) for (const beta of [-110,-70,45,89,90,91,135]) for (const gamma of [-80,-30,0,35,80]) {
    const a=alpha*Math.PI/180,b=beta*Math.PI/180,g=gamma*Math.PI/180;
    let x=0,y=0,z=-1;
    [x,z]=[x*Math.cos(g)+z*Math.sin(g),-x*Math.sin(g)+z*Math.cos(g)];
    [y,z]=[y*Math.cos(b)-z*Math.sin(b),y*Math.sin(b)+z*Math.cos(b)];
    [x,y]=[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
    const result=readNavigationSample(sample({alpha,beta,gamma}),0,true);
    if(Math.hypot(x,y)>=.65) {
      assert.equal(result.reference,"rear-camera");
      close(result.reading.heading,normalizeHeading(Math.atan2(x,y)*180/Math.PI));
    } else assert.equal(result.reference,"screen-top");
  }
});

test("flat camera, camera disabled, and WebKit retain established screen-top logic", () => {
  for (const values of [{beta:0},{beta:30},{beta:90,webkitCompassHeading:42,webkitCompassAccuracy:10},{beta:40,webkitCompassHeading:42,absolute:false}]) {
    const s=sample(values);
    const result=readNavigationSample(s,0,true);
    assert.equal(result.reference,"screen-top");
    assert.deepEqual(result.reading,readCompassSample(s,0));
  }
  const s=sample({alpha:33});
  assert.deepEqual(readNavigationSample(s,90,false).reading,readCompassSample(s,90));
  assert.equal(readNavigationSample(s,90,false).reference,"screen-top");
});

test("entry/exit hysteresis avoids rapid switching; no invented azimuth for vertical optical axis", () => {
  const mid=sample({beta:35});
  assert.equal(readNavigationSample(mid,0,true,"screen-top").reference,"screen-top");
  assert.equal(readNavigationSample(mid,0,true,"rear-camera").reference,"rear-camera");
  assert.equal(readNavigationSample(sample({beta:20}),0,true,"rear-camera").reference,"screen-top");
  assert.equal(readNavigationSample(sample({beta:0}),0,true,"rear-camera").reference,"screen-top");
});

test("camera mode never promotes relative, missing, invalid or bad WebKit readings to north", () => {
  for (const values of [{absolute:false},{alpha:null},{beta:NaN},{gamma:91},{alpha:360},{webkitCompassHeading:0,webkitCompassAccuracy:-1}]) {
    const result=readNavigationSample(sample(values),0,true);
    assert.notEqual(result.reading.kind,"reading");
    assert.equal(result.reference,"screen-top");
  }
  assert.notEqual(readNavigationSample(sample({}),NaN,true).reading.kind,"reading");
});

test("upright near-vertical pitch and north crossing do not cause 180-degree flips", () => {
  const headings=[85,89,90,91,95].map(beta=>readNavigationSample(sample({alpha:70,beta}),0,true).reading.heading);
  headings.forEach(h=>close(h,290));
  const a=readNavigationSample(sample({alpha:359}),0,true).reading.heading;
  const b=readNavigationSample(sample({alpha:1}),0,true).reading.heading;
  assert.ok(Math.abs(calculateHeadingDifference(a,b))<3);
});
