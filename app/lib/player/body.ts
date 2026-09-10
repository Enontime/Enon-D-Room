import * as THREE from 'three';
import type { Point } from '../world/objects';
import { ARM_CONFIG } from './arm-config';
import { createArmMotion } from './arm-motion';

export function createPlayerBody(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  material: (color: number) => THREE.MeshStandardMaterial,
) {
  const body = new THREE.Group();
  body.visible = false;
  scene.add(body);
  camera.layers.enable(1);
  // Solid face colours, with no skin texture, noise or lighting gradients.
  const { base, light, shade } = ARM_CONFIG.skin;
  const skinMaterials = (overlay: boolean) =>
    [shade, shade, light, shade, base, base].map((color) =>
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        depthTest: !overlay,
        depthWrite: !overlay,
      }),
    );
  const armMaterials = skinMaterials(false);
  const viewMaterials = skinMaterials(true);
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    surface: number | THREE.Material | THREE.Material[],
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      typeof surface === 'number' ? material(surface) : surface,
    );
    mesh.position.set(x, y, z);
    mesh.layers.set(1);
    parent.add(mesh);
    return mesh;
  };
  // No head mesh: the view is from the player's eyes, above shoulders.
  box(body, 0, 1.1, 0.055, 0.5, 0.62, 0.28, 0x368f94);
  box(body, 0, 0.79, 0.055, 0.49, 0.11, 0.29, 0x365576);
  const legs = [-0.135, 0.135].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.79, 0.055);
    body.add(pivot);
    box(pivot, 0, -0.33, 0, 0.235, 0.65, 0.27, 0x456286);
    box(pivot, 0, -0.71, -0.035, 0.235, 0.15, 0.34, 0x334347);
    return pivot;
  });
  const bodyArm = ARM_CONFIG.body;
  const thickness = bodyArm.thickness;
  const shoulderX = 0.25 + thickness.width / 2;
  const arms = [-shoulderX, shoulderX].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, bodyArm.shoulder.y, bodyArm.shoulder.z);
    body.add(pivot);
    for (const part of bodyArm.parts)
      box(pivot, part.position[0], part.position[1], part.position[2],
        thickness.width, part.length, thickness.depth, armMaterials);
    return pivot;
  });
  // Keep the view model's elbow outside the frame; only hand and forearm extend in.
  const view = ARM_CONFIG.view;
  const viewThickness = view.thickness;
  const hand = new THREE.Group();
  camera.add(hand);
  scene.add(camera);
  hand.layers.set(1);
  // Keep camera-relative idle placement, walk bob and swing on separate nodes.
  const movementBob = new THREE.Group();
  const swingPose = new THREE.Group();
  hand.add(movementBob);
  movementBob.add(swingPose);
  const pivotPosition = new THREE.Vector3(
    view.pivotPosition.x, view.pivotPosition.y, view.pivotPosition.z,
  );
  const armModel = new THREE.Group();
  armModel.position.copy(pivotPosition).multiplyScalar(-ARM_CONFIG.scale);
  armModel.scale.setScalar(ARM_CONFIG.scale);
  swingPose.add(armModel);
  // With depth testing disabled, internal end caps of overlapping boxes showed
  // through as a third face. Keep the same outer dimensions in one continuous mesh.
  const armBottom = view.forearm.position[1] - view.forearm.length / 2;
  const armTop = view.hand.position[1] + view.hand.length / 2;
  const viewMesh = box(armModel, view.hand.position[0], (armBottom + armTop) / 2,
    view.hand.position[2], viewThickness.width, armTop - armBottom, viewThickness.depth, viewMaterials);
  viewMesh.renderOrder = 10;
  const motion = createArmMotion(camera);
  let gait = 0;
  let bobWeight = 0;
  let showBody = false;
  let swingProgress = 1;
  return {
    cancelSwing() {
      swingProgress = 1;
    },
    setVisible(value: boolean) {
      showBody = value;
      body.visible = value;
    },
    update(
      position: Point,
      height: number,
      yaw: number,
      pitch: number,
      moving: boolean,
      dt: number,
      airborne: boolean,
      swingRequested: boolean,
    ) {
      if (moving) gait += dt * 9;
      bobWeight = THREE.MathUtils.damp(
        bobWeight, moving ? 1 : 0, view.walkBob.smoothing, dt,
      );
      const swing = moving ? Math.sin(gait) * 0.42 : 0;
      // Finish each stroke before accepting another, including when held down.
      if (swingRequested && swingProgress >= 1) swingProgress = 0;
      swingProgress = Math.min(1, swingProgress + dt / view.swingDuration);
      const frame = motion.sample(swingProgress);
      const strike = frame.inward;
      // Put the eyes slightly ahead of the chest, so looking down reveals legs
      // instead of filling the view with the top of the torso.
      body.position.set(
        position.x + Math.sin(yaw) * 0.24,
        height + 0.045,
        position.z + Math.cos(yaw) * 0.24,
      );
      body.rotation.y = yaw;
      legs[0].rotation.x = airborne ? -0.23 : swing;
      legs[1].rotation.x = airborne ? 0.23 : -swing;
      arms[0].rotation.x = -swing * bodyArm.walkSwing;
      arms[1].rotation.set(
        swing * bodyArm.walkSwing + strike * bodyArm.swingRotation.x,
        strike * bodyArm.swingRotation.y,
        strike * bodyArm.swingRotation.z,
      );
      hand.visible = !showBody || pitch > ARM_CONFIG.lookDownPitch;
      // Stable elbow pivot + camera-space rotational sweep + small secondary motion.
      hand.position.copy(motion.idlePivot);
      const bob = bobWeight * (1 - strike * view.walkBob.swingAttenuation);
      movementBob.position.set(
        bob * Math.sin(gait) * view.walkBob.amplitude.x,
        bob * Math.cos(gait * 2) * view.walkBob.amplitude.y,
        0,
      );
      movementBob.rotation.z = bob * Math.sin(gait) * view.walkBob.amplitude.roll;
      swingPose.position.copy(frame.translation);
      swingPose.quaternion.copy(frame.rotation);
      // The matching world arm is visible when looking down at the body.
      arms[1].visible = !hand.visible;
    },
    dispose() {
      body.removeFromParent();
      hand.removeFromParent();
      body.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      hand.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      armMaterials.forEach((surface) => surface.dispose());
      viewMaterials.forEach((surface) => surface.dispose());
    },
  };
}
