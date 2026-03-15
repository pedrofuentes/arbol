import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../../src/utils/event-emitter';

// emit() is protected — expose it for testing
class TestEmitter<T = void> extends EventEmitter<T> {
  public emit(...args: T extends void ? [] : [T]): void {
    super.emit(...args);
  }
}

describe('EventEmitter', () => {
  // ── Basic functionality ──────────────────────────────────────────

  describe('basic functionality', () => {
    it('onChange registers a listener that fires on emit', () => {
      const emitter = new TestEmitter();
      const listener = vi.fn();
      emitter.onChange(listener);
      emitter.emit();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('onChange returns an unsubscribe function', () => {
      const emitter = new TestEmitter();
      const unsub = emitter.onChange(vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calling unsubscribe removes the listener', () => {
      const emitter = new TestEmitter();
      const listener = vi.fn();
      const unsub = emitter.onChange(listener);
      unsub();
      emitter.emit();
      expect(listener).not.toHaveBeenCalled();
    });

    it('multiple listeners fire on emit', () => {
      const emitter = new TestEmitter();
      const a = vi.fn();
      const b = vi.fn();
      const c = vi.fn();
      emitter.onChange(a);
      emitter.onChange(b);
      emitter.onChange(c);
      emitter.emit();
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
      expect(c).toHaveBeenCalledOnce();
    });

    it('listeners fire in registration order', () => {
      const emitter = new TestEmitter();
      const order: number[] = [];
      emitter.onChange(() => order.push(1));
      emitter.onChange(() => order.push(2));
      emitter.onChange(() => order.push(3));
      emitter.emit();
      expect(order).toEqual([1, 2, 3]);
    });

    it('emit fires listeners each time it is called', () => {
      const emitter = new TestEmitter();
      const listener = vi.fn();
      emitter.onChange(listener);
      emitter.emit();
      emitter.emit();
      emitter.emit();
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('unsubscribe same listener twice — no error', () => {
      const emitter = new TestEmitter();
      const unsub = emitter.onChange(vi.fn());
      unsub();
      expect(() => unsub()).not.toThrow();
    });

    it('emit with no listeners — no error', () => {
      const emitter = new TestEmitter();
      expect(() => emitter.emit()).not.toThrow();
    });

    it('register listener during emit — fires in current emit (Set iterates live)', () => {
      const emitter = new TestEmitter();
      const late = vi.fn();
      emitter.onChange(() => {
        emitter.onChange(late);
      });
      emitter.emit();
      // Set for-of visits newly added entries that haven't been visited yet
      expect(late).toHaveBeenCalledOnce();
    });

    it('unsubscribe during emit — skips deleted listener not yet visited', () => {
      const emitter = new TestEmitter();
      const b = vi.fn();
      let unsub: () => void;
      emitter.onChange(() => {
        unsub();
      });
      unsub = emitter.onChange(b);
      emitter.emit();
      // Set for-of skips entries deleted before they are visited
      expect(b).not.toHaveBeenCalled();
    });

    it('unsubscribe all listeners — emit does nothing', () => {
      const emitter = new TestEmitter();
      const a = vi.fn();
      const b = vi.fn();
      const unsubA = emitter.onChange(a);
      const unsubB = emitter.onChange(b);
      unsubA();
      unsubB();
      emitter.emit();
      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });

    it('adding the same function reference twice — Set deduplicates', () => {
      const emitter = new TestEmitter();
      const listener = vi.fn();
      emitter.onChange(listener);
      emitter.onChange(listener);
      emitter.emit();
      // Set stores unique values, so the listener fires only once
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  // ── Error handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('listener that throws does NOT prevent other listeners from firing', () => {
      const emitter = new TestEmitter();
      const a = vi.fn();
      const b = vi.fn();
      emitter.onChange(a);
      emitter.onChange(() => { throw new Error('boom'); });
      emitter.onChange(b);
      emitter.emit();
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });

    it('listener that throws does NOT crash the emitter', () => {
      const emitter = new TestEmitter();
      emitter.onChange(() => { throw new Error('boom'); });
      expect(() => emitter.emit()).not.toThrow();
    });

    it('error is logged via console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const emitter = new TestEmitter();
      const err = new Error('boom');
      emitter.onChange(() => { throw err; });
      emitter.emit();
      expect(spy).toHaveBeenCalledWith('TestEmitter listener error:', err);
      spy.mockRestore();
    });
  });

  // ── Memory / cleanup ─────────────────────────────────────────────

  describe('memory / cleanup', () => {
    it('after unsubscribe, listener is no longer in the set', () => {
      const emitter = new TestEmitter();
      const listener = vi.fn();
      const unsub = emitter.onChange(listener);
      unsub();
      // Access private field via cast to verify cleanup
      const listeners = (emitter as unknown as { listeners: Set<unknown> }).listeners;
      expect(listeners.size).toBe(0);
    });

    it('multiple subscribe/unsubscribe cycles leave set empty', () => {
      const emitter = new TestEmitter();
      const unsubs = Array.from({ length: 5 }, () => emitter.onChange(vi.fn()));
      unsubs.forEach(u => u());
      const listeners = (emitter as unknown as { listeners: Set<unknown> }).listeners;
      expect(listeners.size).toBe(0);
    });
  });

  // ── Typed payloads ───────────────────────────────────────────────

  describe('typed payloads', () => {
    it('EventEmitter<string> — emit passes string payload to listeners', () => {
      const emitter = new TestEmitter<string>();
      const listener = vi.fn();
      emitter.onChange(listener);
      emitter.emit('hello');
      expect(listener).toHaveBeenCalledWith('hello');
    });

    it('EventEmitter<string> — payload value changes between emits', () => {
      const emitter = new TestEmitter<string>();
      const values: string[] = [];
      emitter.onChange((v) => values.push(v));
      emitter.emit('a');
      emitter.emit('b');
      emitter.emit('c');
      expect(values).toEqual(['a', 'b', 'c']);
    });

    it('EventEmitter<void> — emit with no payload', () => {
      const emitter = new TestEmitter<void>();
      const listener = vi.fn();
      emitter.onChange(listener);
      emitter.emit();
      expect(listener).toHaveBeenCalledWith();
    });

    it('EventEmitter with object payload', () => {
      const emitter = new TestEmitter<{ id: number; name: string }>();
      const listener = vi.fn();
      emitter.onChange(listener);
      const payload = { id: 1, name: 'test' };
      emitter.emit(payload);
      expect(listener).toHaveBeenCalledWith(payload);
    });
  });
});
