export type Vec = [number, number, number];
export type Face = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';
export type Move = { face: Face; inverse: boolean };
export type Cubie = {
  id: string;
  position: Vec;
  stickers: { normal: Vec; color: Face }[];
};
export const FACES: Face[] = ['R', 'L', 'U', 'D', 'F', 'B'];
export const FACE_COLORS: Record<Face, string> = {
  R: '#e34b42',
  L: '#ff9b37',
  U: '#f5f3e7',
  D: '#f5d547',
  F: '#48b77b',
  B: '#498cde',
};
export const FACE_NORMALS: Record<Face, Vec> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};
export function solvedCube(): Cubie[] {
  const result: Cubie[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const position: Vec = [x, y, z];
        const stickers = FACES.filter((f) =>
          FACE_NORMALS[f].some((n, i) => n !== 0 && position[i] === n),
        ).map((color) => ({ color, normal: [...FACE_NORMALS[color]] as Vec }));
        result.push({ id: `${x},${y},${z}`, position, stickers });
      }
  return result;
}
export function moveAxis(move: Move) {
  const normal = FACE_NORMALS[move.face];
  const axis = normal.findIndex((n) => n !== 0);
  return {
    axis,
    layer: normal[axis],
    sign: -normal[axis] * (move.inverse ? -1 : 1),
  };
}
function rotate([x, y, z]: Vec, axis: number, sign: number): Vec {
  const v: Vec =
    axis === 0
      ? [x, -sign * z, sign * y]
      : axis === 1
        ? [sign * z, y, -sign * x]
        : [-sign * y, sign * x, z];
  return v.map((n) => (n === 0 ? 0 : n)) as Vec;
}
export function turnCube(cube: Cubie[], move: Move): Cubie[] {
  const { axis, layer, sign } = moveAxis(move);
  return cube.map((c) =>
    c.position[axis] !== layer
      ? c
      : {
          ...c,
          position: rotate(c.position, axis, sign),
          stickers: c.stickers.map((s) => ({
            ...s,
            normal: rotate(s.normal, axis, sign),
          })),
        },
  );
}
export function isSolved(cube: Cubie[]) {
  return cube.every((c) =>
    c.stickers.every((s) =>
      s.normal.every((n, i) => n === FACE_NORMALS[s.color][i]),
    ),
  );
}
export function scrambleMoves(count = 20): Move[] {
  const moves: Move[] = [];
  while (moves.length < count) {
    const face = FACES[Math.floor(Math.random() * 6)];
    if (moves.at(-1)?.face !== face)
      moves.push({ face, inverse: Math.random() < 0.5 });
  }
  return moves;
}
