import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../../src/ui/toast';

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a toast element in the document body', () => {
    showToast('Hello');
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('Hello');
  });

  it('applies role="alert" for accessibility', () => {
    showToast('Alert!');
    const toast = document.querySelector('.toast');
    expect(toast!.getAttribute('role')).toBe('alert');
  });

  it('applies toast-error class for error type', () => {
    showToast('Oops', 'error');
    const toast = document.querySelector('.toast');
    expect(toast!.classList.contains('toast-error')).toBe(true);
  });

  it('applies toast-success class for success type', () => {
    showToast('Done', 'success');
    const toast = document.querySelector('.toast');
    expect(toast!.classList.contains('toast-success')).toBe(true);
  });

  it('applies toast-info class for info type', () => {
    showToast('FYI', 'info');
    const toast = document.querySelector('.toast');
    expect(toast!.classList.contains('toast-info')).toBe(true);
  });

  it('defaults to info type', () => {
    showToast('Default');
    const toast = document.querySelector('.toast');
    expect(toast!.classList.contains('toast-info')).toBe(true);
  });

  it('removes toast after duration', () => {
    showToast('Bye', 'info', 3000);
    expect(document.querySelector('.toast')).not.toBeNull();

    vi.advanceTimersByTime(3000);
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('uses fixed positioning', () => {
    showToast('Positioned');
    const toast = document.querySelector('.toast') as HTMLElement;
    expect(toast.style.position).toBe('fixed');
  });

  it('can display multiple toasts simultaneously', () => {
    showToast('First');
    showToast('Second');
    const toasts = document.querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
  });
});
