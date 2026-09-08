import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACES,
  isSolved,
  solvedCube,
  turnCube,
  type Move,
} from '../lib/games/cube.ts';
import {
  canTurn,
  GRID,
  newSnake,
  stepSnake,
  type SnakeState,
} from '../lib/games/snake.ts';

test('all six cube faces have inverse moves and a four-turn identity', () => {
  const initial = solvedCube();
  for (const face of FACES) {
    const move = { face, inverse: false };
    const turned = turnCube(initial, move);
    assert.equal(isSolved(turned), false);
    assert.deepEqual(turnCube(turned, { face, inverse: true }), initial);
    assert.deepEqual(
      [move, move, move, move].reduce(turnCube, initial),
      initial,
    );
  }
  const right = turnCube(initial, { face: 'R', inverse: false }).find(
    (c) => c.id === '1,1,1',
  )!;
  assert.deepEqual(right.position, [1, 1, -1]);
});
test('a long cube sequence preserves all physical pieces and can be undone', () => {
  const sequence: Move[] = Array.from({ length: 180 }, (_, i) => ({
    face: FACES[(i * 7 + Math.floor(i / 3)) % 6],
    inverse: i % 3 === 0,
  }));
  const mixed = sequence.reduce(turnCube, solvedCube());
  assert.equal(new Set(mixed.map((c) => c.position.join(','))).size, 26);
  assert.equal(mixed.flatMap((c) => c.stickers).length, 54);
  for (const face of FACES)
    assert.equal(
      mixed.flatMap((c) => c.stickers).filter((s) => s.color === face).length,
      9,
    );
  for (const c of mixed)
    for (const s of c.stickers)
      assert.equal(
        c.position.reduce((n, p, i) => n + p * s.normal[i], 0),
        1,
      );
  assert.deepEqual(
    sequence
      .toReversed()
      .map((m) => ({ ...m, inverse: !m.inverse }))
      .reduce(turnCube, mixed),
    solvedCube(),
  );
});
test('snake grows, rejects reversals and pauses without moving', () => {
  const start: SnakeState = {
    ...newSnake(),
    status: 'running',
    food: { x: 7, y: 8 },
  };
  const ate = stepSnake(start, { x: 1, y: 0 }, () => 0);
  assert.equal(ate.body.length, 4);
  assert.equal(ate.score, 1);
  assert.ok(!ate.body.some((c) => c.x === ate.food?.x && c.y === ate.food?.y));
  assert.equal(canTurn({ x: 1, y: 0 }, { x: -1, y: 0 }), false);
  assert.equal(canTurn({ x: 1, y: 0 }, { x: 0.5, y: 0.5 }), false);
  assert.equal(stepSnake(start, { x: -1, y: 0 }).body[0].x, 7);
  const paused = { ...start, status: 'paused' } as SnakeState;
  assert.equal(stepSnake(paused, { x: 0, y: 1 }), paused);
});
test('snake permits a vacating tail, rejects walls and can fill the board', () => {
  const s: SnakeState = {
    body: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
    ],
    direction: { x: 0, y: -1 },
    food: { x: 7, y: 7 },
    status: 'running',
    score: 1,
  };
  assert.equal(stepSnake(s, { x: -1, y: 0 }).status, 'running');
  assert.equal(
    stepSnake(
      {
        ...s,
        body: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
      { x: -1, y: 0 },
    ).status,
    'over',
  );
  const body = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) if (x !== 0 || y !== 0) body.push({ x, y });
  // Put the only free cell immediately ahead of the head.
  const win = stepSnake(
    { ...s, body, direction: { x: -1, y: 0 }, food: { x: 0, y: 0 } },
    { x: -1, y: 0 },
  );
  assert.equal(win.status, 'won');
  assert.equal(win.food, null);
  assert.equal(win.body.length, 256);
});
