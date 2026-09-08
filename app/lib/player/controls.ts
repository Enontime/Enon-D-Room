import { clampPitch, START_POSE } from './first-person.ts';
export type ControlMode = 'idle' | 'mouse' | 'drag';
export function createFirstPersonControls(
  element: HTMLCanvasElement,
  options: { onChange: (mode: ControlMode) => void; onInteract: () => void },
) {
  const keys = new Set<string>(),
    taps = new Set<string>();
  let yaw = START_POSE.yaw,
    pitch = START_POSE.pitch,
    entered = false,
    paused = false,
    dragging: number | null = null,
    previousX = 0,
    previousY = 0,
    disposed = false,
    requestVersion = 0,
    pendingRequest: number | null = null;
  const setMode = (mode: ControlMode) => {
    entered = mode !== 'idle';
    if (!disposed) options.onChange(mode);
  };
  const clear = () => {
    keys.clear();
    taps.clear();
    dragging = null;
  };
  const pointerChange = () => {
    clear();
    if (document.pointerLockElement === element) {
      if (paused || disposed || pendingRequest === null) {
        document.exitPointerLock();
        return;
      }
      pendingRequest = null;
      setMode('mouse');
    } else setMode('idle');
  };
  const pointerError = () => {
    if (!disposed && !paused && pendingRequest !== null) {
      pendingRequest = null;
      setMode('drag');
    }
  };
  const release = () => {
    requestVersion++;
    pendingRequest = null;
    clear();
    setMode('idle');
    if (document.pointerLockElement === element) document.exitPointerLock();
  };
  const enter = () => {
    if (paused || disposed) return;
    const version = ++requestVersion;
    pendingRequest = version;
    element.parentElement?.focus();
    if (matchMedia('(pointer:coarse)').matches || !element.requestPointerLock) {
      pendingRequest = null;
      setMode('drag');
      return;
    }
    try {
      const request = element.requestPointerLock();
      if (request)
        request.catch(() => {
          if (version === requestVersion) pointerError();
        });
    } catch {
      pointerError();
    }
  };
  const look = (x: number, y: number) => {
    yaw -= x * 0.0025;
    pitch = clampPitch(pitch - y * 0.0025);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (paused || event.button !== 0) return;
    if (event.pointerType === 'touch') {
      setMode('drag');
      element.parentElement?.focus();
    } else if (!entered) {
      enter();
      return;
    }
    if (document.pointerLockElement !== element) {
      dragging = event.pointerId;
      previousX = event.clientX;
      previousY = event.clientY;
      element.setPointerCapture(event.pointerId);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (paused || !entered) return;
    if (document.pointerLockElement === element)
      look(event.movementX, event.movementY);
    else if (dragging === event.pointerId) {
      look(event.clientX - previousX, event.clientY - previousY);
      previousX = event.clientX;
      previousY = event.clientY;
    }
  };
  const stopDrag = (event: PointerEvent) => {
    if (dragging === event.pointerId) dragging = null;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (paused || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName)
    )
      return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      release();
      return;
    }
    if (!entered) return;
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'i',
        'j',
        'k',
        'l',
      ].includes(key)
    ) {
      event.preventDefault();
      keys.add(key);
      taps.add(key);
    }
    if (key === 'e' && !event.repeat) {
      event.preventDefault();
      options.onInteract();
    }
  };
  const onKeyUp = (event: KeyboardEvent) =>
    keys.delete(event.key.toLowerCase());
  const onVisibility = () => {
    if (document.hidden) release();
  };
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', stopDrag);
  element.addEventListener('pointercancel', stopDrag);
  document.addEventListener('pointerlockchange', pointerChange);
  document.addEventListener('pointerlockerror', pointerError);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', release);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return {
    enter,
    getPose() {
      return { yaw, pitch };
    },
    getMovement(delta: number) {
      if (!entered || paused) return { strafe: 0, forward: 0 };
      const held = (key: string) => keys.has(key) || taps.has(key);
      yaw += (Number(held('j')) - Number(held('l'))) * delta * 1.65;
      pitch = clampPitch(
        pitch + (Number(held('i')) - Number(held('k'))) * delta * 1.65,
      );
      const movement = {
        strafe:
          Number(held('d') || held('arrowright') || held('right')) -
          Number(held('a') || held('arrowleft') || held('left')),
        forward:
          Number(held('w') || held('arrowup') || held('up')) -
          Number(held('s') || held('arrowdown') || held('down')),
      };
      taps.clear();
      return movement;
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) release();
    },
    reset() {
      clear();
      yaw = START_POSE.yaw;
      pitch = START_POSE.pitch;
    },
    setTouch(direction: string, pressed: boolean) {
      if (pressed && !paused) {
        element.parentElement?.focus();
        if (!entered) setMode('drag');
        keys.add(direction);
        taps.add(direction);
      } else keys.delete(direction);
    },
    dispose() {
      disposed = true;
      release();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', stopDrag);
      element.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('pointerlockchange', pointerChange);
      document.removeEventListener('pointerlockerror', pointerError);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', release);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
