import * as THREE from 'three';
import type { Point } from '../world/objects';

export function createPlayerBody(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  material: (color: number) => THREE.MeshStandardMaterial,
) {
  const body = new THREE.Group();
  scene.add(body);
  camera.layers.enable(1);
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material(color),
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
  const arms = [-0.36, 0.36].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.42, 0.055);
    body.add(pivot);
    box(pivot, 0, -0.12, 0, 0.21, 0.26, 0.27, 0x368f94);
    box(pivot, 0, -0.43, 0, 0.2, 0.38, 0.25, 0xbe8d66);
    box(pivot, 0, -0.63, -0.014, 0.2, 0.09, 0.27, 0xc3936e);
    return pivot;
  });
  // A separate view hand stays in the lower-right corner while looking ahead.
  const hand = new THREE.Group();
  camera.add(hand);
  scene.add(camera);
  hand.layers.set(1);
  box(hand, 0, 0.08, 0, 0.18, 0.34, 0.2, 0xc3936e);
  box(hand, 0, -0.17, 0.015, 0.19, 0.16, 0.21, 0x368f94);
  hand.rotation.set(-0.3, 0, -0.18);
  let gait = 0;
  return {
    update(
      position: Point,
      height: number,
      yaw: number,
      pitch: number,
      moving: boolean,
      dt: number,
      airborne: boolean,
    ) {
      if (moving) gait += dt * 9;
      const swing = moving ? Math.sin(gait) * 0.42 : 0;
      // Put the eyes slightly ahead of the chest, so looking down reveals legs
      // instead of filling the view with the top of the torso.
      body.position.set(position.x+Math.sin(yaw)*.24, height + 0.045, position.z+Math.cos(yaw)*.24);
      body.rotation.y = yaw;
      legs[0].rotation.x = airborne ? -0.23 : swing;
      legs[1].rotation.x = airborne ? 0.23 : -swing;
      arms[0].rotation.x = -swing * 0.7;
      arms[1].rotation.x = swing * 0.7;
      hand.visible = pitch > -0.62;
      hand.position.set(
        Math.min(0.32, camera.aspect * 0.25) +
          (moving ? Math.sin(gait) * 0.012 : 0),
        -0.43 + (moving ? Math.cos(gait * 2) * 0.012 : 0),
        -0.67,
      );
      hand.rotation.z = -0.18 + (moving ? Math.sin(gait) * 0.025 : 0);
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
    },
  };
}
