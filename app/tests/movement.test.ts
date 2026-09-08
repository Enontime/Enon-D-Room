import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStand, movePlayer, findPath } from '../lib/player/movement.ts';
import { ROOM, objects, solids } from '../lib/world/objects.ts';
import { getNearby } from '../lib/interactions/detection.ts';

test('movement cannot tunnel through furniture even at a very large timestep', () => {
  const point = movePlayer({ x: 0, z: 1 }, 0, -30);
  assert.ok(point.z >= -3.025);
  assert.ok(canStand(point.x, point.z));
});
test('all room boundaries stop movement, with sliding along furniture', () => {
  for (const [dx, dz] of [
    [30, 0],
    [-30, 0],
    [0, 30],
    [0, -30],
  ]) {
    const p = movePlayer({ x: 0, z: 1 }, dx, dz);
    assert.ok(canStand(p.x, p.z));
    assert.ok(
      Math.abs(p.x) <= ROOM.halfWidth - 0.35 &&
        Math.abs(p.z) <= ROOM.halfDepth - 0.35,
    );
  }
  const point = movePlayer({ x: 1, z: -1 }, 1, 1);
  assert.ok(point.z > -0.1);
  assert.ok(canStand(point.x, point.z));
});
test('every usable object can be reached from every other one without crossing solids', () => {
  for (const start of [{ x: 0, z: 1.35 }, ...objects.map((o) => o.anchor)])
    for (const object of objects) {
      const path = findPath(start, object.anchor);
      assert.ok(path.length > 0, object.id);
      let previous = start;
      for (const point of path) {
        assert.ok(canStand(point.x, point.z));
        const moved = movePlayer(
          previous,
          point.x - previous.x,
          point.z - previous.z,
        );
        assert.ok(Math.hypot(moved.x - point.x, moved.z - point.z) < 0.001);
        previous = point;
      }
      assert.equal(getNearby(previous), object.id);
    }
});
test('clicking furniture is rejected, interaction requires proximity', () => {
  for (const solid of solids) {
    assert.equal(canStand(solid.x, solid.z), false);
    assert.deepEqual(findPath({ x: 0, z: 1.35 }, solid), []);
  }
  assert.equal(getNearby({ x: 0, z: 3.5 }), null);
});
