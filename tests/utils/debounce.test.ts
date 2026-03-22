import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays execution by the specified ms', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    vi.advanceTimersByTime(300);
    debounced();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('coalesces rapid calls into one execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    for (let i = 0; i < 20; i++) debounced();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush() fires immediately and cancels pending timer', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush() is a no-op if nothing is pending', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes the latest arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('can be called again after flush', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);

    debounced();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
