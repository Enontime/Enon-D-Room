export const EYE_HEIGHT = 1.65;
export const START_POSE = { x: 0, z: 2.3, yaw: 0.28, pitch: -0.035 };
export function firstPersonStep(
  strafe: number,
  forward: number,
  yaw: number,
  delta: number,
) {
  const distance =
    (Math.min(Math.max(delta, 0), 0.05) * 2.6) /
    Math.max(1, Math.hypot(strafe, forward));
  return {
    x: (strafe * Math.cos(yaw) - forward * Math.sin(yaw)) * distance,
    z: (-strafe * Math.sin(yaw) - forward * Math.cos(yaw)) * distance,
  };
}
export function clampPitch(pitch: number) {
  return Math.max(-1.4, Math.min(1.4, pitch));
}
