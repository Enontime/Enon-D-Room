export type Cell = { x: number; y: number };
export type SnakeState = {
  body: Cell[];
  direction: Cell;
  food: Cell | null;
  status: 'ready' | 'running' | 'paused' | 'over' | 'won';
  score: number;
};
export const GRID = 16;
export function newSnake(): SnakeState {
  return {
    body: [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ],
    direction: { x: 1, y: 0 },
    food: { x: 11, y: 8 },
    status: 'ready',
    score: 0,
  };
}
export function canTurn(current: Cell, next: Cell) {
  return (
    Number.isInteger(next.x) &&
    Number.isInteger(next.y) &&
    Math.abs(next.x) + Math.abs(next.y) === 1 &&
    !(current.x === -next.x && current.y === -next.y)
  );
}
export function stepSnake(
  state: SnakeState,
  direction: Cell,
  random = Math.random,
): SnakeState {
  if (state.status !== 'running') return state;
  const nextDirection = canTurn(state.direction, direction)
    ? direction
    : state.direction;
  const head = {
    x: state.body[0].x + nextDirection.x,
    y: state.body[0].y + nextDirection.y,
  };
  const eating =
    !!state.food && head.x === state.food.x && head.y === state.food.y;
  const occupied = eating ? state.body : state.body.slice(0, -1);
  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= GRID ||
    head.y >= GRID ||
    occupied.some((c) => c.x === head.x && c.y === head.y)
  )
    return { ...state, status: 'over' };
  const body = [head, ...state.body];
  if (!eating) body.pop();
  const empty: Cell[] = [];
  if (eating)
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++)
        if (!body.some((c) => c.x === x && c.y === y)) empty.push({ x, y });
  return {
    ...state,
    body,
    direction: nextDirection,
    food: eating
      ? (empty[Math.floor(random() * empty.length)] ?? null)
      : state.food,
    score: state.score + Number(eating),
    status: eating && !empty.length ? 'won' : 'running',
  };
}
