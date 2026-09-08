import { objects, type Point, type ObjectId } from '../world/objects.ts';
export function getNearby(position: Point): ObjectId | null {
  let nearest: ObjectId | null = null,
    distance = 1.02;
  for (const object of objects) {
    const d = Math.hypot(
      position.x - object.anchor.x,
      position.z - object.anchor.z,
    );
    if (d < distance) {
      nearest = object.id;
      distance = d;
    }
  }
  return nearest;
}
