import { clampPitch, START_POSE } from './first-person.ts';
export type ControlMode = 'idle' | 'mouse' | 'drag';
export function createFirstPersonControls(
  element: HTMLCanvasElement,
  options: {
    onChange: (mode: ControlMode) => void;
    onInteract: () => void;
    onPick?: (x: number, y: number) => void;
  },
) {
  const keys = new Set<string>(),
    taps = new Set<string>();
  let yaw = START_POSE.yaw,
    pitch = START_POSE.pitch,
    entered = false,
    paused = false,
    dragging: number | null = null,
    dragButton: number | null = null,
    swingPointer: number | null = null,
    previousX = 0,
    previousY = 0,
    dragDistance = 0,
    jumpQueued = false,
    swingQueued = false,
    disposed = false,
    requestVersion = 0,
    pendingRequest: number | null = null;
  const setMode = (mode: ControlMode) => {
    entered = mode !== 'idle';
    if (!disposed) options.onChange(mode);
  };
  const clear = () => {
    const captures = [dragging, swingPointer];
    keys.clear();
    taps.clear();
    dragging = null;
    dragButton = null;
    swingPointer = null;
    jumpQueued = false;
    swingQueued = false;
    for (const pointer of captures) {
      if (pointer !== null && element.hasPointerCapture(pointer))
        element.releasePointerCapture(pointer);
    }
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
    if (paused || disposed || !event.isPrimary) return;
    const touch = event.pointerType === 'touch';
    if (event.button !== 0 && (touch || event.button !== 2)) return;
    event.preventDefault();
    if (touch) {
      setMode('drag');
      element.parentElement?.focus();
    } else if (!entered) {
      enter();
      return;
    }
    if (!touch && event.button === 0) {
      swingQueued = true;
      swingPointer = event.pointerId;
      if (document.pointerLockElement !== element)
        element.setPointerCapture(event.pointerId);
      return;
    }
    // Right-button dragging looks around; touch keeps its existing gestures.
    dragDistance = 0;
    dragging = event.pointerId;
    dragButton = event.button;
    if (document.pointerLockElement !== element) {
      previousX = event.clientX;
      previousY = event.clientY;
      element.setPointerCapture(event.pointerId);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (paused || !entered) return;
    if (swingPointer === event.pointerId && (event.buttons & 1) === 0)
      swingPointer = null;
    if (document.pointerLockElement === element)
      look(event.movementX, event.movementY);
    else if (dragging === event.pointerId) {
      dragDistance += Math.hypot(
        event.clientX - previousX,
        event.clientY - previousY,
      );
      look(event.clientX - previousX, event.clientY - previousY);
      previousX = event.clientX;
      previousY = event.clientY;
    }
  };
  const stopDrag = (event: PointerEvent) => {
    if (
      swingPointer === event.pointerId &&
      (event.type !== 'pointerup' || event.button === 0)
    ) {
      swingPointer = null;
      // Preserve a quick click until the next frame, but discard cancellations.
      if (event.type !== 'pointerup') swingQueued = false;
    }
    if (
      dragging === event.pointerId &&
      (event.type !== 'pointerup' || event.button === dragButton)
    ) {
      const pick =
        event.type === 'pointerup' &&
        event.button === dragButton &&
        !paused && entered && dragDistance < 5;
      dragging = null;
      dragButton = null;
      if (pick) options.onPick?.(event.clientX, event.clientY);
    }
    if (
      (event.type !== 'pointerup' || event.buttons === 0) &&
      element.hasPointerCapture(event.pointerId)
    )
      element.releasePointerCapture(event.pointerId);
  };
  const onContextMenu = (event: MouseEvent) => event.preventDefault();
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
    if (key === ' ') {
      event.preventDefault();
      if (!event.repeat) jumpQueued = true;
    }
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
  element.addEventListener('lostpointercapture', stopDrag);
  element.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
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
      if (!entered || paused)
        return { strafe: 0, forward: 0, jump: false, swing: false };
      const held = (key: string) => keys.has(key) || taps.has(key);
      yaw += (Number(held('j')) - Number(held('l'))) * delta * 1.65;
      pitch = clampPitch(
        pitch + (Number(held('i')) - Number(held('k'))) * delta * 1.65,
      );
      const movement = {
        jump: jumpQueued,
        swing: swingQueued || swingPointer !== null,
        strafe:
          Number(held('d') || held('arrowright') || held('right')) -
          Number(held('a') || held('arrowleft') || held('left')),
        forward:
          Number(held('w') || held('arrowup') || held('up')) -
          Number(held('s') || held('arrowdown') || held('down')),
      };
      taps.clear();
      jumpQueued = false;
      swingQueued = false;
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
    jump() {
      if (entered && !paused) {
        element.parentElement?.focus();
        jumpQueued = true;
      }
    },
    dispose() {
      disposed = true;
      release();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('lostpointercapture', stopDrag);
      element.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('pointerlockchange', pointerChange);
      document.removeEventListener('pointerlockerror', pointerError);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', release);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
