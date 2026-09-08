import * as THREE from 'three';
import {
  FACE_COLORS,
  FACE_NORMALS,
  FACES,
  moveAxis,
  type Cubie,
  type Move,
} from './cube';

export function createCubeView(host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(6, 4.5, 7);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(4, 7, 5);
  scene.add(light);
  const root = new THREE.Group();
  scene.add(root);
  const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);
  const materialMap = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materialMap.has(color))
      materialMap.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
    return materialMap.get(color)!;
  };
  const meshes = new Map<string, THREE.Mesh>();
  const paint = (cube: Cubie[]) => {
    for (const c of cube) {
      let mesh = meshes.get(c.id);
      const materials = FACES.map((face) => {
        const s = c.stickers.find((s) =>
          s.normal.every((n, i) => n === FACE_NORMALS[face][i]),
        );
        return material(s ? FACE_COLORS[s.color] : '#172725');
      });
      if (!mesh) {
        mesh = new THREE.Mesh(geometry, materials);
        meshes.set(c.id, mesh);
      }
      mesh.material = materials;
      root.add(mesh);
      mesh.position.set(...c.position);
      mesh.rotation.set(0, 0, 0);
    }
  };
  let animation: {
      pivot: THREE.Group;
      axis: number;
      sign: number;
      start: number;
      done: () => void;
    } | null = null,
    frame = 0,
    disposed = false;
  const animate = (time: number) => {
    if (animation) {
      const a = animation,
        t = Math.min((time - a.start) / 190, 1),
        smooth = 1 - Math.pow(1 - t, 3);
      a.pivot.rotation[a.axis === 0 ? 'x' : a.axis === 1 ? 'y' : 'z'] =
        ((a.sign * Math.PI) / 2) * smooth;
      if (t === 1) {
        animation = null;
        a.done();
        root.remove(a.pivot);
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(host);
  resize();
  let drag: { id: number; x: number; y: number } | null = null;
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    root.rotation.y += (e.clientX - drag.x) * 0.009;
    root.rotation.x = THREE.MathUtils.clamp(
      root.rotation.x + (e.clientY - drag.y) * 0.009,
      -1.25,
      1.25,
    );
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const up = () => {
    drag = null;
  };
  renderer.domElement.addEventListener('pointerdown', down);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('pointercancel', up);
  return {
    paint,
    turn(cube: Cubie[], move: Move, done: () => void) {
      if (animation || disposed) return;
      const { axis, layer, sign } = moveAxis(move);
      const pivot = new THREE.Group();
      root.add(pivot);
      for (const c of cube)
        if (c.position[axis] === layer) pivot.add(meshes.get(c.id)!);
      animation = { pivot, axis, sign, start: performance.now(), done };
    },
    resetView() {
      root.rotation.set(0, 0, 0);
    },
    dispose() {
      disposed = true;
      animation = null;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      geometry.dispose();
      materialMap.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
