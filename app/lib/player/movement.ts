import { solids, type Point } from '../world/objects.ts';
const radius = 0.25;
export function canStand(x: number, z: number): boolean {
  if (x < -4.65 || x > 4.65 || z < -3.65 || z > 3.65) return false;
  return !solids.some(
    (s) =>
      Math.abs(x - s.x) < s.width / 2 + radius &&
      Math.abs(z - s.z) < s.depth / 2 + radius,
  );
}
export function movePlayer(point: Point, dx: number, dz: number): Point {
  let { x, z } = point;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < steps; i++) {
    if (canStand(x + dx / steps, z)) x += dx / steps;
    if (canStand(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
// A bounded grid search keeps click-to-walk paths outside solid furniture.
export function findPath(start: Point, goal: Point): Point[] {
  if (!canStand(goal.x, goal.z)) return [];
  const cell = 0.2,
    snap = (p: Point) => ({
      x: Math.round(p.x / cell),
      z: Math.round(p.z / cell),
    });
  const from = snap(start),
    to = snap(goal),
    key = (p: Point) => `${p.x},${p.z}`;
  const queue = [from],
    visited = new Map<string, Point | null>([[key(from), null]]);
  let last: Point | null = null;
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.x === to.x && node.z === to.z) {
      last = node;
      break;
    }
    for (const [dx, dz] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const next = { x: node.x + dx, z: node.z + dz };
      if (!visited.has(key(next)) && canStand(next.x * cell, next.z * cell)) {
        visited.set(key(next), node);
        queue.push(next);
      }
    }
  }
  if (!last) return [];
  const result: Point[] = [];
  while (last && key(last) !== key(from)) {
    result.unshift({ x: last.x * cell, z: last.z * cell });
    last = visited.get(key(last)) ?? null;
  }
  result.push(goal);
  return result;
}
