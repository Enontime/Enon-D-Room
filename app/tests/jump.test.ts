import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUND, stepJump } from '../lib/player/jump.ts';
import { movePlayer, canStand } from '../lib/player/movement.ts';

test('jump rises, stays below the ceiling and lands on the floor', () => {
  let state = stepJump(GROUND, true, 1 / 60),
    peak = state.height;
  assert.equal(state.grounded, false);
  for (let i = 0; i < 120; i++) {
    state = stepJump(state, false, 1 / 60);
    peak = Math.max(peak, state.height);
    assert.ok(state.height >= 0);
  }
  assert.ok(peak > 0.75 && peak < 0.85);
  assert.ok(peak + 1.8 < 3.28);
  assert.deepEqual(state, GROUND);
});
test('airborne requests cannot double-jump, long frames stay bounded, walls still block', () => {
  let state = stepJump(GROUND, true, 0.05);
  assert.deepEqual(stepJump(state, true, 0.05), stepJump(state, false, 0.05));
  assert.deepEqual(stepJump(GROUND, true, 20), stepJump(GROUND, true, 0.05));
  let p = { x: 0, z: 3.3 };
  for (let i = 0; i < 120; i++) {
    state = stepJump(state, false, 0.016);
    p = movePlayer(p, 0, 0.1);
    assert.ok(canStand(p.x, p.z));
  }
  assert.ok(p.z <= 4.65);
  assert.deepEqual(state, GROUND);
});
