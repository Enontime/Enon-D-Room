import * as THREE from 'three';
import {
  FURNITURE,
  ROOM,
  type ObjectId,
  type Point,
} from './objects';
import { movePlayer } from '@/lib/player/movement';
import {
  EYE_HEIGHT,
  START_POSE,
  firstPersonStep,
} from '@/lib/player/first-person';
import {
  createFirstPersonControls,
  type ControlMode,
} from '@/lib/player/controls';
import { getFocusedObject } from '@/lib/interactions/detection';
import { addRoomDetails } from './decor';
import { GROUND, stepJump, type JumpState } from '@/lib/player/jump';
import { createPlayerBody } from '@/lib/player/body';

type Callbacks = {
  onNearby: (id: ObjectId | null) => void;
  onInteract: (id: ObjectId) => void;
  onWalking: (value: boolean) => void;
  onControlChange: (mode: ControlMode) => void;
};
export type WorldController = {
  dispose: () => void;
  setPaused: (value: boolean) => void;
  setNight: (value: boolean) => void;
  setBodyVisible: (value: boolean) => void;
  enter: () => void;
  reset: () => void;
  setTouch: (direction: string, pressed: boolean) => void;
  jump: () => void;
};

export function createWorld(
  host: HTMLDivElement,
  callbacks: Callbacks,
): WorldController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 40);
  camera.rotation.order = 'YXZ';
  camera.position.set(START_POSE.x, EYE_HEIGHT, START_POSE.z);
  camera.rotation.set(START_POSE.pitch, START_POSE.yaw, 0);
  scene.background = new THREE.Color(0x273e32);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const ambient = new THREE.AmbientLight(0xe4f3e8, 1.65);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff3d4, 3.1);
  sun.position.set(1.9, 2.8, -3.3);
  sun.target.position.set(-0.5, 0.3, 2.0);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const lampLight = new THREE.PointLight(0xffc35d, 0, 9, 2);
  lampLight.position.set(5.1, 2.3, 3.4);
  scene.add(lampLight);
  const ceilingLight = new THREE.PointLight(0xffe5b5, 18, 14, 2);
  ceilingLight.position.set(0, 2.95, 0.1);
  scene.add(ceilingLight);
  const palette = {
    wall: 0xa9cdb4,
    side: 0x92b89d,
    wood: 0xaf7649,
    darkWood: 0x774e37,
    cream: 0xeee8d4,
    green: 0x3f775d,
    deep: 0x254b40,
  };
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  // Nearest-filtered texels give the blocks a Minecraft-like material grain.
  const grain = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const shade = 213 + ((i * 73 + (i % 16) * 31) % 43);
    grain.set([shade, shade, shade, 255], i * 4);
  }
  const blockTexture = new THREE.DataTexture(grain, 16, 16);
  blockTexture.magFilter = THREE.NearestFilter;
  blockTexture.minFilter = THREE.NearestFilter;
  blockTexture.needsUpdate = true;
  const material = (color: number) => {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 1,
          map: blockTexture,
        }),
      );
    return materials.get(color)!;
  };
  let interactiveId: ObjectId | null = null;
  let shiftX = 0,
    shiftZ = 0;
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material(color),
    );
    mesh.position.set(
      x + (parent === scene ? shiftX : 0),
      y,
      z + (parent === scene ? shiftZ : 0),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (interactiveId) mesh.userData.interactiveId = interactiveId;
    parent.add(mesh);
    return mesh;
  };
  // The room is built from real geometry: every usable object occupies space.
  box(0, -0.28, 0, 12.4, 0.52, 10.4, palette.darkWood);
  box(0, -0.1, 0, 12.35, 0.18, 10.35, 0xc59662);
  for (let row = 0; row < 20; row++)
    for (let col = 0; col < 6; col++) {
      const color = [0xd1ad7f, 0xdbb78a, 0xcda879, 0xd6b183][
        (row * 7 + col * 3) % 4
      ];
      box(-5 + col * 2, 0.015, -4.75 + row * 0.5, 1.98, 0.06, 0.485, color);
    }
  box(0, 1.65, -ROOM.halfDepth - 0.1,
    ROOM.halfWidth * 2 + 0.4, 3.3, 0.24, palette.wall);
  box(-ROOM.halfWidth - 0.1, 1.65, 0,
    0.24, 3.3, ROOM.halfDepth * 2 + 0.4, palette.side);
  // Continuous solid room envelope, including the walls previously cut away.
  box(ROOM.halfWidth + 0.1, 1.65, 0,
    0.24, 3.3, ROOM.halfDepth * 2 + 0.4, palette.wall);
  box(0, 1.65, ROOM.halfDepth + 0.1,
    ROOM.halfWidth * 2 + 0.4, 3.3, 0.24, palette.side);
  box(0, 3.4, 0, 12.4, 0.24, 10.4, 0xd9d9b9);
  // Leave gaps behind furniture so the skirting does not pass through its base.
  const skirting = (
    axis: 'x' | 'z',
    fixed: number,
    gapStart: number,
    gapEnd: number,
  ) => {
    const extent = axis === 'x' ? ROOM.halfWidth : ROOM.halfDepth;
    for (const [start, end] of [[-extent, gapStart], [gapEnd, extent]]) {
      if (end <= start) continue;
      const center = (start + end) / 2;
      box(
        axis === 'x' ? center : fixed,
        0.15,
        axis === 'z' ? center : fixed,
        axis === 'x' ? end - start : 0.12,
        0.24,
        axis === 'z' ? end - start : 0.12,
        0x689a7b,
      );
    }
  };
  skirting('x', -ROOM.halfDepth + 0.07,
    FURNITURE.bed.x - FURNITURE.bed.width / 2, ROOM.halfWidth);
  skirting('z', -ROOM.halfWidth + 0.06,
    FURNITURE.cabinet.z - FURNITURE.cabinet.depth / 2,
    FURNITURE.cabinet.z + FURNITURE.cabinet.depth / 2);
  skirting('z', ROOM.halfWidth - 0.06,
    -ROOM.halfDepth, FURNITURE.bed.z + 1.95);
  skirting('x', ROOM.halfDepth - 0.07,
    FURNITURE.tv.x - FURNITURE.tv.width / 2,
    FURNITURE.tv.x + FURNITURE.tv.width / 2);
  for (const x of [-5.94, 5.94])
    box(x, 3.15, 0, 0.12, 0.18, 10, palette.darkWood);
  for (const z of [-4.93, 4.93])
    box(0, 3.15, z, 12, 0.18, 0.12, palette.darkWood);
  for (const x of [-3, 3]) box(x, 3.22, 0, 0.16, 0.18, 10, palette.wood);
  box(0, 3.23, 0.1, 0.9, 0.12, 0.9, palette.darkWood);
  box(0, 3.12, 0.1, 0.67, 0.16, 0.67, palette.cream);
  // Closed door: no opening through the front wall.
  shiftZ = 1;
  box(0.3, 1.28, 3.91, 1.65, 2.55, 0.14, palette.darkWood);
  box(0.3, 1.24, 3.81, 1.38, 2.36, 0.09, palette.wood);
  for (const x of [-0.13, 0.3, 0.73])
    box(x, 1.24, 3.755, 0.025, 2.33, 0.025, 0x94653e);
  box(0.8, 1.25, 3.7, 0.11, 0.1, 0.12, 0xd5bd72);
  // Window and square sunlight on the floor.
  shiftZ = -1;
  box(1.95, 2.0, -3.9, 2.15, 1.9, 0.14, 0x638c73);
  box(1.95, 2.0, -3.79, 1.93, 1.65, 0.07, 0xbde2de);
  box(1.95, 1.61, -3.72, 1.86, 0.72, 0.02, 0x8fc5a7);
  box(2.43, 1.78, -3.69, 0.52, 0.33, 0.03, 0xb1d4b5);
  box(1.95, 2.0, -3.64, 0.09, 1.7, 0.09, palette.cream);
  box(1.95, 2.0, -3.64, 1.97, 0.08, 0.09, palette.cream);
  box(1.95, 1.06, -3.63, 2.38, 0.12, 0.47, palette.cream);
  box(0.72, 2.04, -3.55, 0.35, 1.95, 0.3, 0xf1dfb2);
  box(3.18, 2.04, -3.55, 0.35, 1.95, 0.3, 0xf1dfb2);
  // Work desk and its terminal.
  shiftX = FURNITURE.desk.x + 1.6;
  shiftZ = FURNITURE.desk.z + 2.9;
  interactiveId = 'terminal';
  box(-1.6, 1.07, -2.9, 3.5, 0.18, 1.25, palette.wood);
  for (const x of [-3.05, -0.16])
    for (const z of [-3.34, -2.45])
      box(x, 0.55, z, 0.14, 1, 0.14, palette.darkWood);
  // Keep the monitor just in front of the papers on the wall pinboard.
  shiftZ += 0.01;
  box(-1.65, 1.25, -3.05, 0.6, 0.12, 0.4, palette.deep);
  box(-1.65, 1.43, -3.14, 0.12, 0.4, 0.12, palette.deep);
  box(-1.65, 1.82, -3.13, 1.27, 0.85, 0.3, 0xd9dbc1);
  box(-1.65, 1.82, -2.967, 1.07, 0.65, 0.028, 0x203f36);
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x335f4c,
    emissive: 0x73c997,
    emissiveIntensity: 0.25,
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.55),
    screenMaterial,
  );
  screen.position.set(-1.65 + shiftX, 1.83, -2.945 + shiftZ);
  screen.userData.interactiveId = 'terminal';
  scene.add(screen);
  box(-1.98, 1.99, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.91, 1.94, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.98, 1.89, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.62, 1.87, -2.92, 0.32, 0.025, 0.025, 0x81b38b);
  shiftZ -= 0.01;
  box(-1.65, 1.2, -2.48, 1.1, 0.1, 0.36, 0xd8d5bc);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 10; col++)
      box(
        -2.09 + col * 0.1,
        1.259,
        -2.58 + row * 0.09,
        0.068,
        0.02,
        0.055,
        0x9eae95,
      );
  box(-0.8, 1.2, -2.47, 0.18, 0.12, 0.25, 0xd8d5bc);
  box(-2.8, 1.34, -2.75, 0.27, 0.42, 0.27, 0xf0d4a4);
  box(-2.59, 1.34, -2.75, 0.13, 0.22, 0.12, 0xf0d4a4);
  // A stool tucked beneath the desk stays inside its collision footprint.
  box(-1.55, 0.53, -2.6, 0.65, 0.15, 0.55, 0x648e70);
  box(-1.55, 0.3, -2.6, 0.18, 0.55, 0.18, palette.darkWood);
  // Shelf and notebook on the left wall.
  shiftX = FURNITURE.cabinet.x + 4.25;
  shiftZ = 0;
  interactiveId = 'notes';
  box(-4.25, 0.54, -0.8, 1.15, 1.0, 3.7, palette.darkWood);
  box(-4.25, 1.09, -0.8, 1.24, 0.12, 3.82, palette.wood);
  for (const z of [-1.95, -0.8, 0.4]) {
    box(-3.655, 0.58, z, 0.035, 0.77, 1.0, 0x93633f);
    box(-3.62, 0.65, z, 0.06, 0.06, 0.2, 0xdbc18d);
  }
  box(-4.25, 1.19, 0.35, 0.63, 0.12, 0.82, 0xdfb15c);
  box(-4.24, 1.26, 0.35, 0.51, 0.02, 0.69, 0xf2e9c8);
  box(-4.24, 1.275, 0.35, 0.02, 0.015, 0.69, 0xb49b72);
  box(-4.17, 1.29, 0.49, 0.3, 0.025, 0.025, 0x35664e);
  for (let i = 0; i < 7; i++)
    box(
      -4.2,
      1.4,
      -1.9 + i * 0.19,
      0.56,
      0.5 + (i % 3) * 0.09,
      0.14,
      [0xc8885e, 0x426e57, 0xd7bb76, 0x749b94][i % 4],
    );
  interactiveId = null;
  // Bed with a quilt; the mattress is a solid obstacle.
  shiftX = FURNITURE.bed.x - 3;
  shiftZ = FURNITURE.bed.z + 1.6;
  box(3, 0.36, -1.6, 2.45, 0.62, 3.9, palette.darkWood);
  box(3, 0.78, -1.56, 2.32, 0.38, 3.68, 0xe8debd);
  box(3, 1.04, -0.89, 2.35, 0.2, 2.34, 0x6d967b);
  box(3, 1.15, -0.86, 0.19, 0.02, 2.36, 0x96b28b);
  box(2.14, 1.15, -0.86, 0.08, 0.02, 2.36, 0xaac0a0);
  box(3.85, 1.15, -0.86, 0.08, 0.02, 2.36, 0xaac0a0);
  box(3, 1.05, -2.7, 1.64, 0.23, 0.62, palette.cream);
  box(3, 0.91, -3.49, 2.48, 1.38, 0.14, palette.wood);
  // Rug, with simple woven bands.
  shiftX = 0;
  shiftZ = 0;
  box(0.05, 0.07, 1.25, 3.7, 0.05, 2.9, 0x6d9b7e);
  box(0.05, 0.103, 1.25, 3.36, 0.014, 2.56, 0x9fbea0);
  box(0.05, 0.116, 1.25, 2.96, 0.014, 2.2, 0x749d80);
  for (const z of [-0.03, 2.53])
    for (let i = 0; i < 13; i++)
      box(-1.5 + i * 0.25, 0.13, z, 0.13, 0.015, 0.1, 0xd7d0a5);
  const plant = (x: number, z: number, y = 0, scale = 1) => {
    box(
      x,
      y + 0.25 * scale,
      z,
      0.55 * scale,
      0.5 * scale,
      0.55 * scale,
      0xb87f55,
    );
    box(
      x,
      y + 0.49 * scale,
      z,
      0.62 * scale,
      0.1 * scale,
      0.62 * scale,
      0xcf9c6c,
    );
    box(
      x,
      y + 0.9 * scale,
      z,
      0.08 * scale,
      0.8 * scale,
      0.08 * scale,
      0x567553,
    );
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const leaf = box(
        x + Math.cos(angle) * 0.2 * scale,
        y + (0.85 + i * 0.1) * scale,
        z + Math.sin(angle) * 0.2 * scale,
        0.47 * scale,
        0.21 * scale,
        0.37 * scale,
        [0x548361, 0x69976c, 0x87aa75][i % 3],
      );
      leaf.rotation.z = Math.cos(angle) * 0.35;
    }
  };
  plant(-4.95, 2.8, 0, 1.15);
  plant(FURNITURE.cabinet.x + 0.03, -0.73, 1.18, 0.65);
  // Wall pinboard and small framed art are objects in the room.
  shiftZ = -1;
  box(-2.65, 2.39, -3.88, 1.62, 1.05, 0.14, palette.darkWood);
  box(-2.65, 2.39, -3.79, 1.44, 0.87, 0.05, 0xbc9765);
  box(-3.03, 2.53, -3.745, 0.4, 0.39, 0.025, 0xede5c5);
  box(-2.45, 2.32, -3.745, 0.47, 0.51, 0.025, 0xe5c57d);
  box(-2.43, 2.53, -3.71, 0.055, 0.055, 0.03, 0x5d8568);
  // Floor lamp is the day/night switch.
  shiftX = 1;
  shiftZ = 1.3;
  interactiveId = 'light';
  box(4.15, 0.1, 2.1, 0.6, 0.14, 0.6, palette.deep);
  box(4.15, 1.18, 2.1, 0.09, 2.2, 0.09, palette.darkWood);
  box(4.15, 2.35, 2.1, 0.91, 0.48, 0.91, 0xe8d9ad);
  box(4.15, 2.64, 2.1, 0.67, 0.14, 0.67, 0xf1e2b9);
  interactiveId = null;
  shiftX = 0;
  shiftZ = 0;
  const details = addRoomDetails(scene);
  const body = createPlayerBody(scene, camera, material);
  let jumpState: JumpState = GROUND;
  // The camera is the player: there is no external avatar or orbit view.
  let position: Point = { x: START_POSE.x, z: START_POSE.z },
    paused = false,
    night = false,
    nearby: ObjectId | null = null,
    walking = false,
    frame = 0,
    lastTime = performance.now();
  const controls = createFirstPersonControls(renderer.domElement, {
    onChange: callbacks.onControlChange,
    onInteract: () => interact(nearby),
    onPick: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const point =
        document.pointerLockElement === renderer.domElement
          ? new THREE.Vector2(0, 0)
          : new THREE.Vector2(
              ((clientX - rect.left) / rect.width) * 2 - 1,
              (-(clientY - rect.top) / rect.height) * 2 + 1,
            );
      raycaster.setFromCamera(point, camera);
      interact(pickObject());
    },
  });
  function interact(id: ObjectId | null) {
    if (paused || !id) return;
    if (id !== 'light') {
      paused = true;
      controls.setPaused(true);
    }
    callbacks.onInteract(id);
  }
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(host);
  resize();
  scene.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  function pickObject() {
    const firstHit = raycaster.intersectObjects(scene.children, true)[0];
    return getFocusedObject(
      firstHit
        ? {
            id: firstHit.object.userData.interactiveId as ObjectId | undefined,
            distance: firstHit.distance,
          }
        : undefined,
    );
  }
  function animate(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const movement = controls.getMovement(dt),
      pose = controls.getPose();
    const step = firstPersonStep(
      movement.strafe,
      movement.forward,
      pose.yaw,
      dt,
    );
    const next = movePlayer(position, step.x, step.z);
    const moving =
      Math.hypot(next.x - position.x, next.z - position.z) > 0.0001;
    position = next;
    if (!paused) jumpState = stepJump(jumpState, movement.jump, dt);
    camera.position.set(position.x, EYE_HEIGHT + jumpState.height, position.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    camera.updateMatrixWorld();
    body.update(
      position,
      jumpState.height,
      pose.yaw,
      pose.pitch,
      moving,
      dt,
      !jumpState.grounded,
    );
    details.tick();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(center, camera);
    const focused = pickObject();
    if (focused !== nearby) {
      nearby = focused;
      callbacks.onNearby(nearby);
    }
    if (moving !== walking) {
      walking = moving;
      callbacks.onWalking(walking);
    }
    sun.intensity = THREE.MathUtils.lerp(
      sun.intensity,
      night ? 0.12 : 2.3,
      dt * 3,
    );
    ambient.intensity = THREE.MathUtils.lerp(
      ambient.intensity,
      night ? 0.55 : 1.4,
      dt * 3,
    );
    ceilingLight.intensity = THREE.MathUtils.lerp(
      ceilingLight.intensity,
      night ? 2 : 18,
      dt * 3,
    );
    lampLight.intensity = THREE.MathUtils.lerp(
      lampLight.intensity,
      night ? 20 : 1,
      dt * 3,
    );
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return {
    enter() {
      controls.enter();
    },
    setPaused(value) {
      paused = value;
      controls.setPaused(value);
    },
    setNight(value) {
      night = value;
      ambient.color.set(value ? 0x91a5c3 : 0xe4f3e8);
    },
    setBodyVisible(value) {
      body.setVisible(value);
    },
    reset() {
      position = { x: START_POSE.x, z: START_POSE.z };
      controls.reset();
      jumpState = GROUND;
    },
    setTouch(direction, pressed) {
      controls.setTouch(direction, pressed);
    },
    jump() {
      controls.jump();
    },
    dispose() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      controls.dispose();
      details.dispose();
      body.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.forEach((value) => value.dispose());
      blockTexture.dispose();
      screenMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
