import { objects, type Point, type ObjectId } from '../world/objects.ts';
/** Consider only the nearest opaque surface; never skip a wall to reach an object. */
export function getFocusedObject(
  hit: { id?: ObjectId; distance: number } | undefined,
): ObjectId | null {
  return hit?.id && hit.distance <= 2.5 ? hit.id : null;
}
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
