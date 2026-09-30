import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompassNotice } from '../src/lib/compassNotice.ts';
test('distinct actionable messages replace generic waiting for non-reading states',()=>{
 const states=['idle','requesting','waiting','tilted','denied','unsupported','paused','unavailable','unreliable','error'];
 const titles=new Set();
 for(const s of states){const n=getCompassNotice(s);assert.ok(n.title&&n.detail);assert.ok(!n.title.includes('Menunggu arah ponsel'));titles.add(n.title);}
 assert.equal(titles.size,states.length);
 assert.match(getCompassNotice('tilted').detail,/kemiringan/);
 assert.match(getCompassNotice('unavailable').detail,/Coba sensor lagi/);
});
