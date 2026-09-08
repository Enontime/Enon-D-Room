import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstPersonStep,
  clampPitch,
  START_POSE,
} from '../lib/player/first-person.ts';
import { canStand, movePlayer } from '../lib/player/movement.ts';
import { getFocusedObject } from '../lib/interactions/detection.ts';
test('movement follows camera yaw after a quarter turn', () => {
  const front = firstPersonStep(0, 1, 0, 0.02);
  assert.equal(front.x, 0);
  assert.ok(front.z < 0);
  const turned = firstPersonStep(0, 1, Math.PI / 2, 0.02);
  assert.ok(turned.x < 0);
  assert.ok(Math.abs(turned.z) < 1e-12);
  const right = firstPersonStep(1, 0, Math.PI / 2, 0.02);
  assert.ok(right.z < 0);
  assert.ok(Math.abs(right.x) < 1e-12);
});
test('diagonal speed stays constant, long frames and walls cannot teleport the camera', () => {
  const straight = firstPersonStep(0, 1, 0, 0.02),
    diagonal = firstPersonStep(1, 1, 0, 0.02);
  assert.ok(
    Math.abs(
      Math.hypot(straight.x, straight.z) - Math.hypot(diagonal.x, diagonal.z),
    ) < 1e-12,
  );
  const step = firstPersonStep(1, 1, 0, 100);
  assert.ok(Math.hypot(step.x, step.z) <= 0.130001);
  assert.ok(canStand(START_POSE.x, START_POSE.z));
  let p = { x: 0, z: 3 };
  for (let i = 0; i < 200; i++) {
    const s = firstPersonStep(0, -1, 0, 0.05);
    p = movePlayer(p, s.x, s.z);
  }
  assert.ok(p.z <= 4.65);
});
test('look has vertical limits and interaction never skips an opaque first hit', () => {
  assert.equal(clampPitch(10), 1.4);
  assert.equal(clampPitch(-10), -1.4);
  assert.equal(getFocusedObject({ distance: 0.7 }), null);
  assert.equal(getFocusedObject({ id: 'terminal', distance: 2.51 }), null);
  assert.equal(getFocusedObject({ id: 'terminal', distance: 2.4 }), 'terminal');
  assert.equal(getFocusedObject(undefined), null);
});
