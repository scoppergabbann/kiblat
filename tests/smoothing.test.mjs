import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadingFilter, calculateHeadingDifference } from '../src/lib/compass.ts';

test('smooths across north by the short arc and converges without overshoot', () => {
  const f=createHeadingFilter(); f.update(359,0);
  const next=f.update(1,16).heading;
  assert.ok(next>359 && next<360);
  let value=next;
  for(let t=32;t<=1600;t+=16) value=f.update(1,t).heading;
  assert.ok(Math.abs(calculateHeadingDifference(1,value))<.001);
});
test('time-based response is independent of sample rate; resets remove old history', () => {
  const a=createHeadingFilter(),b=createHeadingFilter(); a.update(0,0);b.update(0,0);
  let x,y;for(let t=10;t<=160;t+=10)x=a.update(30,t).heading;
  for(let t=40;t<=160;t+=40)y=b.update(30,t).heading;
  assert.ok(Math.abs(x-y)<1e-8);
  a.reset();assert.equal(a.update(200,200).heading,200);
  assert.equal(a.update(90,1400).heading,90);
});
test('flags repeated large reversals, not steady turns or small noise, and recovers', () => {
  const f=createHeadingFilter();f.update(100,0);
  let result;for(let i=1;i<=6;i++)result=f.update(i%2?112:100,i*50);
  assert.equal(result.unstable,true);
  for(let t=350;t<=1200;t+=50)result=f.update(100,t);
  assert.equal(result.unstable,false);
  f.reset();for(let i=0;i<20;i++)assert.equal(f.update(i*5,i*20).unstable,false);
  f.reset();for(let i=0;i<20;i++)assert.equal(f.update(i%2?101:100,i*20).unstable,false);
  assert.throws(()=>f.update(NaN,20),RangeError);
});
