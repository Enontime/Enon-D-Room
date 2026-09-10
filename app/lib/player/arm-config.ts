// View angles are degrees; screen positions are fractions measured from top-left.
// Model lengths/translations are world units. Body animation angles remain radians.
export const ARM_CONFIG = {
  // Warm Alex-inspired skin, with only subtle, flat differences between faces.
  skin: { base: 0xe8bf9e, light: 0xefc8aa, shade: 0xdfb593 },
  scale: 1,
  lookDownPitch: -0.62,
  view: {
    // Narrow the view model's cross-section only; keep its length, pose and scale.
    thickness: { width: 0.12, depth: 0.16 }, // Alex-inspired slim 3:4 ratio.
    idleScreenAngle: 80,
    // This is the hand centre; the highest tip corner is around y=71% at 16:9.
    idlePosition: { x: 0.91, y: 0.83, pivotDepth: 0.4 },
    // Axis tilt is solved from projection; twist determines front/side visibility.
    idleRotation: { twist: 108, referenceAspect: 16 / 9, aspectTwist: -14 },
    pivotScreenY: 1.2,
    // The elbow-side pivot is below the viewport, not in the middle of the hand.
    pivotPosition: { x: 0, y: -0.32, z: 0.015 },
    // Hand and forearm share a slim profile, without an oversized separate fist.
    hand: { position: [0, 0.11, 0.015], length: 0.16 },
    // Extend only the hidden elbow-side connection; the visible front stays put.
    forearm: { position: [0, -0.16, 0.015], length: 0.39 },
    walkBob: {
      amplitude: { x: 0.003, y: 0.003, roll: 0.004 },
      smoothing: 12,
      swingAttenuation: 0.8,
    },
    // A screen destination for the fixed-pivot rotation, never a hand translation.
    // Derive x from the diagonal angle and clamp it to the requested middle-right area.
    // Lower the centre so the top rim stays near y=61%, clear of the crosshair.
    swingTarget: { screenAngle: 45, y: 0.72, minX: 0.6, maxX: 0.72 },
    swingWristTwist: -8,
    swingCenterTranslation: -0.006,
    swingVerticalTranslation: 0.004,
    swingDepthTranslation: -0.006,
    swingDuration: 0.32,
  },
  body: {
    thickness: { width: 0.15, depth: 0.2 },
    shoulder: { y: 1.42, z: 0.055 },
    parts: [
      { position: [0, -0.12, 0], length: 0.26 },
      { position: [0, -0.43, 0], length: 0.38 },
      { position: [0, -0.63, -0.014], length: 0.09 },
    ],
    walkSwing: 0.35,
    swingRotation: { x: 0.32, y: -0.05, z: -0.06 },
  },
} as const;
