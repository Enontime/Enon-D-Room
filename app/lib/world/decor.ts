import * as THREE from 'three';
import { FACE_COLORS, FACE_NORMALS, FACES, solvedCube } from '../games/cube';
import type { ObjectId } from './objects';

// Functional props are real meshes, so a ray cannot select through their backs.
export function addRoomDetails(scene: THREE.Scene) {
  let disposed = false;
  const resources: Array<{ dispose: () => void }> = [];
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!materials.has(color)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      materials.set(color, m);
      resources.push(m);
    }
    return materials.get(color)!;
  };
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    id?: ObjectId,
  ) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    resources.push(geometry);
    const mesh = new THREE.Mesh(geometry, mat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (id) mesh.userData.interactiveId = id;
    parent.add(mesh);
    return mesh;
  };
  const groupAt = (x: number, y: number, z: number, angle = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = angle;
    scene.add(g);
    return g;
  };
  const panel = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    z: number,
    texture: THREE.Texture,
    id?: ObjectId,
  ) => {
    const geometry = new THREE.PlaneGeometry(w, h),
      material = new THREE.MeshBasicMaterial({ map: texture });
    resources.push(geometry, material, texture);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    if (id) mesh.userData.interactiveId = id;
    parent.add(mesh);
    return mesh;
  };
  const textTexture = (
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d')!);
    const texture = new THREE.CanvasTexture(canvas);
    document.fonts.ready.then(() => {
      if (!disposed) {
        draw(canvas.getContext('2d')!);
        texture.needsUpdate = true;
      }
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  };
  // Three original paintings, cropped with texture UVs rather than resampled.
  const paintingMaps: Array<{
    texture: THREE.Texture;
    material: THREE.MeshBasicMaterial;
  }> = [];
  const atlas = new THREE.TextureLoader().load(
    '/art/voxel-paintings.png',
    (loaded) => {
      if (disposed) return;
      for (const item of paintingMaps) {
        item.texture.image = loaded.image;
        item.texture.needsUpdate = true;
        item.material.map = item.texture;
        item.material.needsUpdate = true;
      }
    },
  );
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.magFilter = THREE.NearestFilter;
  resources.push(atlas);
  const paintings = [
    { x: -5.83, z: -3.5, a: Math.PI / 2, s: 1.45 },
    { x: 5.83, z: -2.8, a: -Math.PI / 2, s: 1.6 },
    { x: 5.83, z: -0.6, a: -Math.PI / 2, s: 1.2 },
  ];
  paintings.forEach((p, i) => {
    const g = groupAt(p.x, 2.25, p.z, p.a);
    box(g, 0, 0, 0, p.s + 0.17, p.s + 0.17, 0.12, 0x66472f);
    box(g, 0, 0, 0.07, p.s + 0.055, p.s + 0.055, 0.03, 0xe5d7ad);
    const texture = atlas.clone();
    texture.repeat.set(1 / 3, 1);
    texture.offset.set(i / 3, 0);
    const painting = panel(g, p.s, p.s, 0.092, texture);
    painting.material.map = null;
    paintingMaps.push({ texture, material: painting.material });
  });
  // Clock uses local wall time and updates its hands every second.
  const clock = groupAt(-0.05, 2.42, -4.84);
  box(clock, 0, 0, 0, 0.88, 0.88, 0.12, 0x624c34);
  const clockFace = textTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#e8e1c5';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#354c3e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px "Silkscreen", monospace';
    for (let i = 1; i <= 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.fillText(String(i), 128 + Math.sin(a) * 94, 128 - Math.cos(a) * 94);
    }
  });
  panel(clock, 0.77, 0.77, 0.067, clockFace);
  const hourPivot = new THREE.Group(),
    minutePivot = new THREE.Group(),
    secondPivot = new THREE.Group();
  clock.add(hourPivot, minutePivot, secondPivot);
  box(hourPivot, 0, 0.105, 0.08, 0.034, 0.23, 0.02, 0x294839);
  box(minutePivot, 0, 0.15, 0.1, 0.024, 0.33, 0.02, 0x294839);
  box(secondPivot, 0, 0.145, 0.12, 0.01, 0.34, 0.015, 0xbd6249);
  box(clock, 0, 0, 0.14, 0.055, 0.055, 0.03, 0xb58943);
  let lastSecond = -1;
  const tick = () => {
    const date = new Date(),
      seconds = date.getSeconds();
    if (seconds === lastSecond) return;
    lastSecond = seconds;
    secondPivot.rotation.z = (-seconds * Math.PI) / 30;
    minutePivot.rotation.z =
      (-(date.getMinutes() + seconds / 60) * Math.PI) / 30;
    hourPivot.rotation.z =
      (-((date.getHours() % 12) + date.getMinutes() / 60) * Math.PI) / 6;
  };
  tick();
  // Television faces into the room from the entrance wall.
  const tv = groupAt(-3.1, 0, 4.55, Math.PI);
  box(tv, 0, 0.44, 0, 2.9, 0.72, 0.65, 0x755338, 'tv');
  box(tv, 0, 0.84, 0, 3.0, 0.12, 0.73, 0xab8051, 'tv');
  for (const x of [-0.78, 0.78])
    box(tv, x, 1.01, 0, 0.16, 0.3, 0.28, 0x273d37, 'tv');
  box(tv, 0, 1.76, 0, 2.85, 1.46, 0.23, 0x283d39, 'tv');
  const tvTexture = textTexture(640, 320, (ctx) => {
    ctx.fillStyle = '#112e32';
    ctx.fillRect(0, 0, 640, 320);
    ctx.fillStyle = '#84d2ac';
    ctx.fillRect(30, 28, 12, 12);
    ctx.font = '20px "Silkscreen", monospace';
    ctx.fillText('ENON / PLAY', 58, 42);
    ctx.font = '52px "Silkscreen", monospace';
    ctx.fillStyle = '#f1deb0';
    ctx.fillText('PRESS PLAY', 48, 139);
    ctx.font = '22px "Silkscreen", monospace';
    ctx.fillStyle = '#9fc9bd';
    ctx.fillText('SNAKE   /   MEMORY', 48, 195);
    ctx.fillStyle = '#e9b867';
    ctx.fillRect(48, 244, 24, 24);
    ctx.fillStyle = '#ddebd0';
    ctx.fillText('E  /  CLICK TO START', 91, 265);
  });
  const television = panel(tv, 2.59, 1.22, 0.121, tvTexture, 'tv');
  television.position.y = 1.79;
  box(tv, 1.2, 1.08, 0.128, 0.045, 0.045, 0.02, 0x8fd59b, 'tv');
  // Profile board links to the existing personal site.
  const board = groupAt(2.55, 1.93, 4.84, Math.PI);
  box(board, 0, 0, 0, 2.2, 1.55, 0.12, 0x6c4b35, 'profile');
  const boardTexture = textTexture(640, 420, (ctx) => {
    ctx.fillStyle = '#ddc38b';
    ctx.fillRect(0, 0, 640, 420);
    ctx.fillStyle = '#345644';
    ctx.font = '22px "Silkscreen", monospace';
    ctx.fillText('PERSONAL SPACE  /  01', 40, 53);
    ctx.font = '80px "Silkscreen", monospace';
    ctx.fillText('ENON', 40, 164);
    ctx.fillStyle = '#756545';
    ctx.font = '22px "Silkscreen", monospace';
    ctx.fillText('ABOUT ME & MY PROJECTS', 40, 219);
    ctx.fillStyle = '#315642';
    ctx.fillRect(38, 269, 564, 99);
    ctx.fillStyle = '#edf0cb';
    ctx.font = '22px "Silkscreen", monospace';
    ctx.fillText('enontime.github.io  >', 65, 329);
  });
  panel(board, 2.04, 1.39, 0.068, boardTexture, 'profile');
  // Two-tier metal cart: books below, cube and Minecraft collectibles above.
  const cart = groupAt(4.4, 0, 1.7, -Math.PI / 2);
  for (const x of [-0.72, 0.72])
    for (const z of [-0.4, 0.4]) {
      const wheelGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.09, 8);
      resources.push(wheelGeometry);
      const wheel = new THREE.Mesh(wheelGeometry, mat(0x263d36));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.16, z);
      cart.add(wheel);
      box(cart, x, 0.68, z, 0.06, 1.02, 0.06, 0x3f6658);
    }
  for (const y of [0.36, 1.03]) {
    box(cart, 0, y, 0, 1.7, 0.09, 1.02, 0xaa8055);
    for (const z of [-0.5, 0.5])
      box(cart, 0, y + 0.1, z, 1.73, 0.16, 0.04, 0x426c5d);
  }
  box(cart, -0.81, 1.25, 0, 0.07, 0.08, 0.83, 0x426c5d);
  for (let i = 0; i < 6; i++) {
    box(
      cart,
      -0.59 + i * 0.18,
      0.64,
      0.05,
      0.14,
      0.45 + (i % 2) * 0.08,
      0.62,
      [0xb65d4d, 0xddb15c, 0x5b8f91, 0x395f50][i % 4],
    );
    box(cart, -0.59 + i * 0.18, 0.78, 0.368, 0.09, 0.035, 0.012, 0xe8d8ae);
  }
  // Cube's small cubies share the same solved colour scheme as the playable cube.
  const mini = new THREE.Group();
  mini.position.set(-0.3, 1.37, 0.07);
  cart.add(mini);
  for (const c of solvedCube()) {
    const geometry = new THREE.BoxGeometry(0.155, 0.155, 0.155);
    resources.push(geometry);
    const faces = FACES.map((face) => {
      const s = c.stickers.find((s) =>
        s.normal.every((n, i) => n === FACE_NORMALS[face][i]),
      );
      return mat(
        s ? Number.parseInt(FACE_COLORS[s.color].slice(1), 16) : 0x1d2927,
      );
    });
    const mesh = new THREE.Mesh(geometry, faces);
    mesh.position.set(
      ...(c.position.map((n) => n * 0.17) as [number, number, number]),
    );
    mesh.userData.interactiveId = 'cube';
    mini.add(mesh);
  }
  box(cart, 0.48, 1.22, 0.14, 0.37, 0.27, 0.38, 0x8b603d);
  box(cart, 0.48, 1.38, 0.14, 0.4, 0.12, 0.4, 0x6b9e46);
  // Creeper head and block feet are intentionally voxel geometry.
  box(cart, 0.4, 1.64, 0.1, 0.28, 0.28, 0.28, 0x6eac58);
  for (const x of [0.32, 0.48])
    box(cart, x, 1.67, 0.247, 0.055, 0.055, 0.01, 0x223d2c);
  box(cart, 0.4, 1.59, 0.247, 0.075, 0.07, 0.01, 0x223d2c);
  box(cart, 0.43, 1.12, -0.28, 0.43, 0.06, 0.2, 0x4f8271);
  return {
    tick,
    dispose() {
      disposed = true;
      resources.forEach((r) => r.dispose());
    },
  };
}
