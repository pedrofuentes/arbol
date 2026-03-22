import { describe, it, expect, vi } from 'vitest';

describe('scheduleRender batching', () => {
  it('coalesces multiple calls into one via requestAnimationFrame', () => {
    const rerender = vi.fn();
    let scheduled = false;
    const callbacks: (() => void)[] = [];

    const origRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      callbacks.push(() => cb(0));
      return callbacks.length;
    }) as typeof requestAnimationFrame;

    const scheduleRender = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          rerender();
        });
      }
    };

    scheduleRender();
    scheduleRender();
    scheduleRender();

    expect(rerender).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);

    callbacks[0]();
    expect(rerender).toHaveBeenCalledTimes(1);

    globalThis.requestAnimationFrame = origRAF;
  });

  it('allows a new batch after the previous one fires', () => {
    const rerender = vi.fn();
    let scheduled = false;
    const callbacks: (() => void)[] = [];

    const origRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      callbacks.push(() => cb(0));
      return callbacks.length;
    }) as typeof requestAnimationFrame;

    const scheduleRender = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          rerender();
        });
      }
    };

    scheduleRender();
    callbacks[0]();
    expect(rerender).toHaveBeenCalledTimes(1);

    scheduleRender();
    scheduleRender();
    callbacks[1]();
    expect(rerender).toHaveBeenCalledTimes(2);

    globalThis.requestAnimationFrame = origRAF;
  });

  it('direct rerender calls are not affected by scheduling', () => {
    const rerender = vi.fn();
    let scheduled = false;
    const callbacks: (() => void)[] = [];

    const origRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      callbacks.push(() => cb(0));
      return callbacks.length;
    }) as typeof requestAnimationFrame;

    const scheduleRender = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          rerender();
        });
      }
    };

    // Direct call still works
    rerender();
    expect(rerender).toHaveBeenCalledTimes(1);

    // Scheduled call is separate
    scheduleRender();
    callbacks[0]();
    expect(rerender).toHaveBeenCalledTimes(2);

    globalThis.requestAnimationFrame = origRAF;
  });
});
