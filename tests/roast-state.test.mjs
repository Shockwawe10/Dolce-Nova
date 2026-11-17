// The roast as four batches under one temperature slider (the owner, 2026-11-17: "sliders that user can slide
// and see how coffee roasting changes ... four bins"). Every value on screen is a pure function of the slider
// position u (0..100) and the one-time assembly a (0..1): 3D guide rule 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state, uToTemp, tempToU, degreeAt, STOPS, TICKS, POSES, phaseAt, delayAt, FLIGHT } from '../site/assets/js/roast-state.js';

const us = Array.from({ length: 1001 }, (_, i) => i / 10);

test('the slider runs 20 to 230 degrees, and gives the cracks room: 196, 210 and 224 at 60, 75 and 90', () => {
  assert.equal(uToTemp(0), 20);
  assert.equal(uToTemp(100), 230);
  assert.deepEqual(TICKS.map((t) => [t.u, t.temp]), [[0, 20], [60, 196], [75, 210], [90, 224]]);
  for (const t of TICKS) assert.equal(uToTemp(t.u), t.temp);
  let prev = -Infinity;
  for (const u of us) { const T = uToTemp(u); assert.ok(T > prev || u === 0, `rises at ${u}`); prev = T; assert.ok(Math.abs(tempToU(T) - u) < 1e-9, `inverse at ${u}`); }
});

test('the four batches start green together and are each pulled at their own stage', () => {
  assert.deepEqual(STOPS, [20, 196, 210, 224]);
  assert.deepEqual(state(0).beans, [0, 0, 0, 0]);
  assert.deepEqual(state(tempToU(196)).beans.map((d) => +d.toFixed(6)), [0, 1, 1, 1]);
  assert.deepEqual(state(tempToU(210)).beans.map((d) => +d.toFixed(6)), [0, 1, 2, 2]);
  assert.deepEqual(state(100).beans.map((d) => +d.toFixed(6)), [0, 1, 2, 3]);
  const prev = [0, 0, 0, 0];
  for (const u of us) {
    state(u).beans.forEach((d, k) => {
      assert.ok(d >= prev[k] - 1e-12, `bean ${k} never lightens (u ${u})`);
      assert.ok(d <= k + 1e-12, `bean ${k} never passes its stage (u ${u})`);
      prev[k] = d;
    });
  }
});

test('the roast degree climbs from green (0) through light (1) and medium (2) to dark (3)', () => {
  assert.equal(degreeAt(20), 0);
  assert.equal(degreeAt(196), 1);
  assert.equal(degreeAt(210), 2);
  assert.equal(degreeAt(224), 3);
  assert.equal(degreeAt(230), 3);
});

test('no bean ever turns: each keeps its own pose at every slider position', () => {
  for (const u of us) assert.deepEqual(state(u).poses, POSES);
  assert.equal(POSES.length, 4);
});

test('every temperature has a phase, in order, and the note names first and second crack', () => {
  const names = [];
  for (const u of us) { const n = phaseAt(uToTemp(u)).name; if (names.at(-1) !== n) names.push(n); }
  assert.deepEqual(names, ['Raw', 'Drying', 'Yellowing', 'First crack', 'Development', 'Second crack']);
});

test('the grains gather once and every one lands before the assembly ends', () => {
  assert.equal(state(50, 0).assemble, 0);
  assert.equal(state(50, 1).assemble, 1);
  for (let k = 0; k < 2000; k++) {
    const x = Math.sin(k) * 0.7, y = Math.cos(k * 1.3) * 0.5, z = Math.sin(k * 0.7) * 1.0;
    assert.ok(delayAt(x, y, z) + FLIGHT <= 1 + 1e-9);
  }
});
