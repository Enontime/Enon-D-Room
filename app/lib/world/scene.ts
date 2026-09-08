import * as THREE from 'three';
import { objects, type ObjectId, type Point } from './objects';
import { canStand, findPath, movePlayer } from '@/lib/player/movement';
import { getNearby } from '@/lib/interactions/detection';

type Callbacks = {
  onNearby: (id: ObjectId | null) => void;
  onInteract: (id: ObjectId) => void;
  onWalking: (value: boolean) => void;
  onMarkers: (value: Array<{ id: ObjectId; x: number; y: number }>) => void;
  onArrive: () => void;
};
export type WorldController = {
  dispose: () => void;
  setPaused: (value: boolean) => void;
  setNight: (value: boolean) => void;
  goTo: (id: ObjectId) => void;
  reset: () => void;
  setTouch: (direction: string, pressed: boolean) => void;
};

export function createWorld(
  host: HTMLDivElement,
  callbacks: Callbacks,
): WorldController {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
  camera.position.set(12, 12, 15);
  camera.lookAt(0, 0.7, 0);
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
  sun.position.set(-3, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const lampLight = new THREE.PointLight(0xffc35d, 0, 9, 2);
  lampLight.position.set(4.1, 2.3, 2.1);
  scene.add(lampLight);
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
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // The room is built from real geometry: every usable object occupies space.
  box(0, -0.28, 0, 10.4, 0.52, 8.4, palette.darkWood);
  box(0, -0.1, 0, 10.35, 0.18, 8.35, 0xc59662);
  for (let row = 0; row < 16; row++)
    for (let col = 0; col < 5; col++) {
      const color = [0xd1ad7f, 0xdbb78a, 0xcda879, 0xd6b183][
        (row * 7 + col * 3) % 4
      ];
      box(-4 + col * 2, 0.015, -3.75 + row * 0.5, 1.98, 0.06, 0.485, color);
    }
  box(0, 1.65, -4.1, 10.4, 3.3, 0.24, palette.wall);
  box(-5.1, 1.65, 0, 0.24, 3.3, 8.4, palette.side);
  box(0, 0.15, -3.93, 10, 0.24, 0.12, 0x689a7b);
  box(-4.94, 0.15, 0, 0.12, 0.24, 8, 0x689a7b);
  box(0, 3.32, -4.1, 10.5, 0.12, 0.3, 0xc8dfbf);
  box(-5.1, 3.32, 0, 0.3, 0.12, 8.45, 0xb4cfa9);
  // Window and square sunlight on the floor.
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
  box(-1.6, 1.07, -2.9, 3.5, 0.18, 1.25, palette.wood);
  for (const x of [-3.05, -0.16])
    for (const z of [-3.35, -2.45])
      box(x, 0.55, z, 0.14, 1, 0.14, palette.darkWood);
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
  screen.position.set(-1.65, 1.83, -2.945);
  scene.add(screen);
  box(-1.98, 1.99, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.91, 1.94, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.98, 1.89, -2.92, 0.07, 0.045, 0.025, 0xb7edbe);
  box(-1.62, 1.87, -2.92, 0.32, 0.025, 0.025, 0x81b38b);
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
  box(-1.55, 0.53, -2.2, 0.65, 0.15, 0.55, 0x648e70);
  box(-1.55, 0.3, -2.2, 0.18, 0.55, 0.18, palette.darkWood);
  // Shelf and notebook on the left wall.
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
  // Bed with a quilt; the mattress is a solid obstacle.
  box(3, 0.36, -1.6, 2.45, 0.62, 3.9, palette.darkWood);
  box(3, 0.78, -1.56, 2.32, 0.38, 3.68, 0xe8debd);
  box(3, 1.04, -0.89, 2.35, 0.2, 2.34, 0x6d967b);
  box(3, 1.15, -0.86, 0.19, 0.02, 2.36, 0x96b28b);
  box(2.14, 1.15, -0.86, 0.08, 0.02, 2.36, 0xaac0a0);
  box(3.85, 1.15, -0.86, 0.08, 0.02, 2.36, 0xaac0a0);
  box(3, 1.05, -2.7, 1.64, 0.23, 0.62, palette.cream);
  box(3, 0.91, -3.49, 2.48, 1.38, 0.14, palette.wood);
  // Rug, with simple woven bands.
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
  plant(-3.95, 2.8, 0, 1.15);
  plant(-4.22, -0.73, 1.18, 0.65);
  // Wall pinboard and small framed art are objects in the room.
  box(-2.65, 2.39, -3.88, 1.62, 1.05, 0.14, palette.darkWood);
  box(-2.65, 2.39, -3.79, 1.44, 0.87, 0.05, 0xbc9765);
  box(-3.03, 2.53, -3.745, 0.4, 0.39, 0.025, 0xede5c5);
  box(-2.45, 2.32, -3.745, 0.47, 0.51, 0.025, 0xe5c57d);
  box(-2.43, 2.53, -3.71, 0.055, 0.055, 0.03, 0x5d8568);
  // Floor lamp is the day/night switch.
  box(4.15, 0.1, 2.1, 0.6, 0.14, 0.6, palette.deep);
  box(4.15, 1.18, 2.1, 0.09, 2.2, 0.09, palette.darkWood);
  box(4.15, 2.35, 2.1, 0.91, 0.48, 0.91, 0xe8d9ad);
  box(4.15, 2.64, 2.1, 0.67, 0.14, 0.67, 0xf1e2b9);
  // Pixel-shaped avatar with independently moving legs.
  const avatar = new THREE.Group();
  scene.add(avatar);
  const leftLeg = box(-0.14, 0.23, 0, 0.2, 0.42, 0.24, 0x485d56, avatar),
    rightLeg = box(0.14, 0.23, 0, 0.2, 0.42, 0.24, 0x485d56, avatar);
  box(-0.14, 0.08, 0.07, 0.23, 0.13, 0.34, 0xe2d7b7, avatar);
  box(0.14, 0.08, 0.07, 0.23, 0.13, 0.34, 0xe2d7b7, avatar);
  box(0, 0.64, 0, 0.59, 0.5, 0.34, 0xe2b256, avatar);
  box(-0.39, 0.65, 0, 0.18, 0.41, 0.25, 0xe2b256, avatar);
  box(0.39, 0.65, 0, 0.18, 0.41, 0.25, 0xe2b256, avatar);
  box(-0.39, 0.4, 0, 0.17, 0.14, 0.23, 0xe1b891, avatar);
  box(0.39, 0.4, 0, 0.17, 0.14, 0.23, 0xe1b891, avatar);
  box(0, 1.07, 0, 0.55, 0.48, 0.46, 0xe3bf97, avatar);
  box(0, 1.34, -0.02, 0.62, 0.18, 0.53, 0x4c443a, avatar);
  box(-0.245, 1.13, -0.02, 0.12, 0.32, 0.49, 0x4c443a, avatar);
  box(0.245, 1.18, -0.07, 0.12, 0.22, 0.38, 0x4c443a, avatar);
  box(-0.12, 1.09, 0.239, 0.065, 0.065, 0.025, 0x383e34, avatar);
  box(0.12, 1.09, 0.239, 0.065, 0.065, 0.025, 0x383e34, avatar);
  const selection = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.48, 4),
    new THREE.MeshBasicMaterial({ color: 0xeff8cd, side: THREE.DoubleSide }),
  );
  selection.rotation.x = -Math.PI / 2;
  selection.rotation.z = Math.PI / 4;
  selection.position.y = 0.12;
  scene.add(selection);
  const destination = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 4),
    new THREE.MeshBasicMaterial({ color: 0xf7efd0, side: THREE.DoubleSide }),
  );
  destination.rotation.x = -Math.PI / 2;
  destination.position.y = 0.14;
  destination.visible = false;
  scene.add(destination);

  let position: Point = { x: 0, z: 1.35 },
    path: Point[] = [],
    paused = false,
    night = false,
    nearby: ObjectId | null = null,
    walking = false,
    frame = 0,
    lastTime = performance.now();
  const keys = new Set<string>();
  let width = 0,
    height = 0;
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const span = Math.max(11.8, (width < 680 ? 20 : 17.3) / aspect);
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    callbacks.onMarkers(
      objects.map((object) => {
        const p = new THREE.Vector3(
          object.label.x,
          object.label.y,
          object.label.z,
        ).project(camera);
        return {
          id: object.id,
          x: ((p.x + 1) * width) / 2,
          y: ((1 - p.y) * height) / 2,
        };
      }),
    );
  }
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(host);
  resize();
  const clearKeys = () => {
    keys.clear();
  };
  function onKeyDown(event: KeyboardEvent) {
    if (paused || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (event.target as HTMLElement)?.tagName,
      )
    )
      return;
    const key = event.key.toLowerCase();
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowleft',
        'arrowdown',
        'arrowright',
      ].includes(key)
    ) {
      event.preventDefault();
      keys.add(key);
      path = [];
      destination.visible = false;
      callbacks.onArrive();
    }
    if (key === 'e' && !event.repeat && nearby) {
      event.preventDefault();
      callbacks.onInteract(nearby);
    }
  }
  const onKeyUp = (event: KeyboardEvent) =>
    keys.delete(event.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', clearKeys);
  const raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    hit = new THREE.Vector3();
  function walkTo(goal: Point) {
    path = findPath(position, goal);
    if (path.length) {
      destination.position.set(goal.x, 0.14, goal.z);
      destination.visible = true;
    } else callbacks.onArrive();
  }
  function click(event: PointerEvent) {
    if (paused || event.button !== 0) return;
    host.focus();
    const rect = host.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / width) * 2 - 1,
        (-(event.clientY - rect.top) / height) * 2 + 1,
      ),
      camera,
    );
    if (raycaster.ray.intersectPlane(plane, hit) && canStand(hit.x, hit.z))
      walkTo({ x: hit.x, z: hit.z });
  }
  renderer.domElement.addEventListener('pointerdown', click);
  function animate(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;
    let dx = 0,
      dz = 0;
    if (!paused) {
      let horizontal =
        Number(keys.has('d') || keys.has('arrowright') || keys.has('right')) -
        Number(keys.has('a') || keys.has('arrowleft') || keys.has('left'));
      let vertical =
        Number(keys.has('s') || keys.has('arrowdown') || keys.has('down')) -
        Number(keys.has('w') || keys.has('arrowup') || keys.has('up'));
      if (horizontal || vertical) {
        const norm = Math.hypot(horizontal, vertical);
        horizontal /= norm;
        vertical /= norm;
        dx = (horizontal + vertical) * Math.SQRT1_2 * dt * 2.6;
        dz = (-horizontal + vertical) * Math.SQRT1_2 * dt * 2.6;
      } else if (path.length) {
        const next = path[0],
          distance = Math.hypot(next.x - position.x, next.z - position.z),
          step = dt * 2.6;
        if (distance <= step) {
          dx = next.x - position.x;
          dz = next.z - position.z;
          path.shift();
          if (!path.length) {
            destination.visible = false;
            callbacks.onArrive();
          }
        } else {
          dx = ((next.x - position.x) / distance) * step;
          dz = ((next.z - position.z) / distance) * step;
        }
      }
    }
    const nextPosition = movePlayer(position, dx, dz);
    const moving =
      Math.hypot(nextPosition.x - position.x, nextPosition.z - position.z) >
      0.0001;
    position = nextPosition;
    if (moving) avatar.rotation.y = Math.atan2(dx, dz);
    avatar.position.set(
      position.x,
      moving ? Math.abs(Math.sin(time / 110)) * 0.035 : 0,
      position.z,
    );
    leftLeg.rotation.x = moving ? Math.sin(time / 100) * 0.35 : 0;
    rightLeg.rotation.x = -leftLeg.rotation.x;
    selection.position.set(position.x, 0.13, position.z);
    const nextNearby = getNearby(position);
    if (nextNearby !== nearby) {
      nearby = nextNearby;
      callbacks.onNearby(nearby);
    }
    if (moving !== walking) {
      walking = moving;
      callbacks.onWalking(walking);
    }
    sun.intensity = THREE.MathUtils.lerp(
      sun.intensity,
      night ? 0.4 : 3.1,
      dt * 3,
    );
    ambient.intensity = THREE.MathUtils.lerp(
      ambient.intensity,
      night ? 0.65 : 1.65,
      dt * 3,
    );
    lampLight.intensity = THREE.MathUtils.lerp(
      lampLight.intensity,
      night ? 15 : 0,
      dt * 3,
    );
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return {
    setPaused(value) {
      paused = value;
      keys.clear();
      path = [];
      destination.visible = false;
      callbacks.onArrive();
    },
    setNight(value) {
      night = value;
      ambient.color.set(value ? 0x8eaecb : 0xe4f3e8);
    },
    goTo(id) {
      const object = objects.find((item) => item.id === id);
      if (object && !paused) walkTo(object.anchor);
    },
    reset() {
      position = { x: 0, z: 1.35 };
      path = [];
      keys.clear();
      destination.visible = false;
    },
    setTouch(direction, pressed) {
      if (pressed && !paused) {
        keys.add(direction);
        path = [];
        destination.visible = false;
      } else keys.delete(direction);
    },
    dispose() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
      renderer.domElement.removeEventListener('pointerdown', click);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.forEach((value) => value.dispose());
      blockTexture.dispose();
      screenMaterial.dispose();
      (selection.material as THREE.Material).dispose();
      (destination.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
