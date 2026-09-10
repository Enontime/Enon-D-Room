import * as THREE from 'three';
import { ARM_CONFIG } from './arm-config.ts';

export function armSwingCurves(progress: number) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  if (t === 0 || t === 1) return { inward: 0, twist: 0, vertical: 0, depth: 0 };
  const root = Math.sqrt(t);
  return {
    inward: Math.sin(root * Math.PI),
    twist: Math.sin(t * t * Math.PI),
    vertical: Math.sin(root * Math.PI * 2),
    depth: Math.sin(t * Math.PI),
  };
}

// The rendered view model and the measurement script share camera-local poses.
export function createArmMotion(camera: THREE.PerspectiveCamera) {
  const config = ARM_CONFIG.view;
  const projectionCamera = new THREE.PerspectiveCamera();
  const pivotLocal = new THREE.Vector3(
    config.pivotPosition.x, config.pivotPosition.y, config.pivotPosition.z,
  );
  const modelPoint = (point: THREE.Vector3) =>
    point.sub(pivotLocal).multiplyScalar(ARM_CONFIG.scale);
  const handCenter = modelPoint(new THREE.Vector3(...config.hand.position));
  const handEnd = modelPoint(new THREE.Vector3(
    config.hand.position[0],
    config.hand.position[1] + config.hand.length / 2,
    config.hand.position[2],
  ));
  const baseCenter = modelPoint(new THREE.Vector3(
    config.forearm.position[0],
    config.forearm.position[1] - config.forearm.length / 2,
    config.forearm.position[2],
  ));
  const baseCorners = [-1, 1].flatMap((x) => [-1, 1].map((z) =>
    modelPoint(new THREE.Vector3(
      config.forearm.position[0] + x * config.thickness.width / 2,
      config.forearm.position[1] - config.forearm.length / 2,
      config.forearm.position[2] + z * config.thickness.depth / 2,
    )),
  ));
  const length = handCenter.length();
  const localAxis = handCenter.clone().normalize();
  const idlePivot = new THREE.Vector3();
  const idleQuaternion = new THREE.Quaternion();
  const idleRay = new THREE.Vector3();
  const peakRay = new THREE.Vector3();
  const pivotRay = new THREE.Vector3();
  const idleAxis = new THREE.Vector3();
  const peakAxis = new THREE.Vector3();
  const sweepAxis = new THREE.Vector3();
  const peakPivot = new THREE.Vector3();
  const zero = new THREE.Vector3();
  const peakCurves = armSwingCurves(0.25);
  const peakTranslation = new THREE.Vector3(
    config.swingCenterTranslation * peakCurves.inward,
    config.swingVerticalTranslation * peakCurves.vertical,
    config.swingDepthTranslation * peakCurves.depth,
  );
  const idleTwist = new THREE.Quaternion();
  const delta = new THREE.Quaternion();
  const wrist = new THREE.Quaternion();
  const frame = {
    pivot: new THREE.Vector3(),
    translation: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    inward: 0,
    sweepDegrees: 0,
    twistDegrees: 0,
  };
  let sweepAngle = 0;
  let lastAspect = -1;
  let lastFov = -1;

  function ray(x: number, y: number, out: THREE.Vector3) {
    out.set(x * 2 - 1, 1 - y * 2, 0).unproject(projectionCamera);
    return out.divideScalar(-out.z);
  }

  // Keep both rays inside the real-length sphere, with depth margin for wide views.
  // This adjusts perspective distance only, never the model's scale or thickness.
  function depthLimit(target: THREE.Vector3, shift: THREE.Vector3) {
    const aa = target.lengthSq();
    const perpendicularPivot = pivotRay.clone().addScaledVector(target, -pivotRay.dot(target) / aa);
    const perpendicularShift = shift.clone().addScaledVector(target, -shift.dot(target) / aa);
    const a = perpendicularPivot.lengthSq();
    if (a < 1e-10) return Infinity;
    const b = 2 * perpendicularPivot.dot(perpendicularShift);
    const c = perpendicularShift.lengthSq() - length * length;
    return (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  }

  function solveAxis(target: THREE.Vector3, pivot: THREE.Vector3, out: THREE.Vector3) {
    const a = target.lengthSq();
    const b = -2 * target.dot(pivot);
    const c = pivot.lengthSq() - length * length;
    // Farther intersection: the hand points away from the eyes, hiding its end cap.
    const depth = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    return out.copy(target).multiplyScalar(depth).sub(pivot).normalize();
  }

  function refresh() {
    const fov = camera.getEffectiveFOV();
    if (lastAspect === camera.aspect && lastFov === fov) return;
    lastAspect = camera.aspect;
    lastFov = fov;
    projectionCamera.fov = fov;
    projectionCamera.aspect = camera.aspect;
    projectionCamera.near = camera.near;
    projectionCamera.far = camera.far;
    projectionCamera.updateProjectionMatrix();
    projectionCamera.updateMatrixWorld();

    // Include aspect ratio in the projected long-axis angle, not rotation.z.
    // The visible outer edges are also measured separately to catch perspective.
    const pivotScreenX = config.idlePosition.x +
      (config.pivotScreenY - config.idlePosition.y) /
      (camera.aspect * Math.tan(THREE.MathUtils.degToRad(config.idleScreenAngle)));
    const target = config.swingTarget;
    const peakScreenX = THREE.MathUtils.clamp(pivotScreenX -
      (config.pivotScreenY - target.y) /
      (camera.aspect * Math.tan(THREE.MathUtils.degToRad(target.screenAngle))),
    target.minX, target.maxX);
    ray(config.idlePosition.x, config.idlePosition.y, idleRay);
    ray(peakScreenX, target.y, peakRay);
    ray(pivotScreenX, config.pivotScreenY, pivotRay);
    const depth = Math.min(config.idlePosition.pivotDepth,
      depthLimit(idleRay, zero) * 0.95, depthLimit(peakRay, peakTranslation) * 0.95);
    idlePivot.copy(pivotRay).multiplyScalar(depth);
    solveAxis(idleRay, idlePivot, idleAxis);
    const twistDegrees = config.idleRotation.twist + config.idleRotation.aspectTwist *
      THREE.MathUtils.clamp(camera.aspect - config.idleRotation.referenceAspect, -0.5, 0.6);
    idleTwist.setFromAxisAngle(localAxis, THREE.MathUtils.degToRad(twistDegrees));
    idleQuaternion.setFromUnitVectors(localAxis, idleAxis).multiply(idleTwist);

    peakPivot.copy(idlePivot).add(peakTranslation);
    solveAxis(peakRay, peakPivot, peakAxis);
    sweepAxis.crossVectors(idleAxis, peakAxis);
    sweepAngle = idleAxis.angleTo(peakAxis);
    if (sweepAxis.lengthSq() < 1e-10) sweepAxis.set(0, 0, 1);
    else sweepAxis.normalize();
  }

  // Frame storage is reused. Clone its vectors/quaternion when retaining samples.
  function sample(progress: number) {
    refresh();
    const curves = armSwingCurves(progress);
    frame.inward = curves.inward;
    frame.sweepDegrees = THREE.MathUtils.radToDeg(sweepAngle * curves.inward);
    frame.twistDegrees = config.swingWristTwist * curves.twist;
    // Fixed-axis rotation around the elbow traces a circular 3D arc; no hand lerp.
    delta.setFromAxisAngle(sweepAxis, sweepAngle * curves.inward);
    frame.rotation.copy(delta).multiply(idleQuaternion);
    wrist.setFromAxisAngle(localAxis, THREE.MathUtils.degToRad(frame.twistDegrees));
    frame.rotation.multiply(wrist);
    frame.translation.set(
      config.swingCenterTranslation * curves.inward,
      config.swingVerticalTranslation * curves.vertical,
      config.swingDepthTranslation * curves.depth,
    );
    frame.pivot.copy(idlePivot).add(frame.translation);
    return frame;
  }

  function project(point: THREE.Vector3) {
    refresh();
    const p = point.clone().project(projectionCamera);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  }

  return { sample, project, idlePivot, handCenter, handEnd, baseCenter, baseCorners };
}
