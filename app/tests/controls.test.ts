import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFirstPersonControls,
  type ControlMode,
} from '../lib/player/controls.ts';

test('pausing invalidates delayed pointer-lock success and failure', async () => {
  const previous = new Map(
    ['window', 'document', 'matchMedia'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const fakeWindow = new EventTarget();
  let exitCount = 0,
    rejectRequest: (reason: Error) => void = () => {};
  class TestDocument extends EventTarget {
    pointerLockElement: unknown = null;
    hidden = false;
    exitPointerLock() {
      exitCount++;
      this.pointerLockElement = null;
      this.dispatchEvent(new Event('pointerlockchange'));
    }
  }
  const fakeDocument = new TestDocument();
  const element = Object.assign(new EventTarget(), {
    parentElement: { focus() {} },
    requestPointerLock() {
      return new Promise<void>((_, reject) => {
        rejectRequest = reject;
      });
    },
    setPointerCapture() {},
  });
  Object.defineProperty(globalThis, 'window', {
    value: fakeWindow,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: fakeDocument,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'matchMedia', {
    value: () => ({ matches: false }),
    configurable: true,
  });
  const modes: ControlMode[] = [];
  const controls = createFirstPersonControls(
    element as unknown as HTMLCanvasElement,
    { onChange: (mode) => modes.push(mode), onInteract() {} },
  );
  try {
    controls.enter();
    controls.setPaused(true);
    fakeDocument.pointerLockElement = element;
    fakeDocument.dispatchEvent(new Event('pointerlockchange'));
    assert.equal(exitCount, 1);
    assert.equal(modes.at(-1), 'idle');
    assert.ok(!modes.includes('mouse'));
    controls.setPaused(false);
    controls.enter();
    fakeWindow.dispatchEvent(new Event('blur'));
    rejectRequest(new Error('Delayed rejection'));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(modes.at(-1), 'idle');
    controls.enter();
    rejectRequest(new Error('Pointer lock unavailable'));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(modes.at(-1), 'drag');
  } finally {
    controls.dispose();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
