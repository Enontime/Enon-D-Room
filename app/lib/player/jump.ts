export type JumpState = { height: number; velocity: number; grounded: boolean };
export const GROUND: JumpState = { height: 0, velocity: 0, grounded: true };
export function stepJump(
  state: JumpState,
  requested: boolean,
  delta: number,
): JumpState {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  let velocity = requested && state.grounded ? 4.8 : state.velocity;
  if (state.grounded && !requested) return GROUND;
  const height = state.height + velocity * dt - (14 * dt * dt) / 2;
  velocity -= 14 * dt;
  return height <= 0 ? GROUND : { height, velocity, grounded: false };
}
