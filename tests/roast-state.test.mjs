// The still-life bean's state is a pure function of scroll progress (3D guide rule 3). These pin the owner's
// asks of 2026-11-17: the bean never turns, it gathers from fragments at the start, scrolling changes its roast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state, POSE, ASSEMBLED_AT, STAGE_P, snapReduced, delayAt, FLIGHT } from '../site/assets/js/roast-state.js';

const ps = Array.from({ length: 1001 }, (_, i) => i / 1000);

test('the bean holds one pose at every scroll position', () => {
  for (const p of ps) {
    const s = state(p);
    assert.deepEqual([s.rotX, s.rotY, s.rotZ], [POSE.x, POSE.y, POSE.z], `p = ${p}`);
  }
});

test('it gathers from fragments during the intro, then stays whole', () => {
  assert.equal(state(0).assemble, 0);
  assert.equal(state(ASSEMBLED_AT).assemble, 1);
  let prev = -1;
  for (const p of ps) { const a = state(p).assemble; assert.ok(a >= prev, `monotonic at ${p}`); prev = a; }
  for (const p of ps.filter((x) => x >= ASSEMBLED_AT)) assert.equal(state(p).assemble, 1);
});

test('scrolling walks the roast green to dark, resting exactly on each stage', () => {
  let prev = -1;
  for (const p of ps) { const x = state(p).stageX; assert.ok(x >= prev - 1e-12, `monotonic at ${p}`); prev = x; }
  for (const p of ps.filter((x) => x <= ASSEMBLED_AT)) assert.equal(state(p).stageX, 0, 'green while it gathers');
  STAGE_P.forEach((p, k) => assert.ok(Math.abs(state(p).stageX - k) < 1e-9, `stage ${k} at p = ${p}`));
  assert.equal(state(1).stageX, 3);
});

test('every fragment lands before the assembly ends', () => {
  for (let k = 0; k < 2000; k++) {
    const x = Math.sin(k) * 0.7, y = Math.cos(k * 1.3) * 0.5, z = Math.sin(k * 0.7) * 1.0;
    assert.ok(delayAt(x, y, z) + FLIGHT <= 1 + 1e-9);
  }
});

test('reduced motion snaps to the four stages, the bean already whole', () => {
  for (const p of ps) assert.ok(STAGE_P.includes(snapReduced(p)), `p = ${p}`);
  assert.equal(snapReduced(0), STAGE_P[0]);
  assert.equal(snapReduced(1), STAGE_P[3]);
});
