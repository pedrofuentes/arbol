import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { showLoading, hideLoading } from '../../src/ui/loading-overlay';

let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  setItemSpy = vi.spyOn(localStorage, 'setItem');
  setLocale('en', en);
});

afterAll(() => {
  setItemSpy.mockRestore();
});

describe('LoadingOverlay', () => {
  afterEach(() => {
    hideLoading();
    document.body.innerHTML = '';
  });

  it('showLoading() creates an overlay element', () => {
    showLoading();
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay).toBeInstanceOf(HTMLDivElement);
  });

  it('overlay has role="status" for accessibility', () => {
    showLoading();
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay!.getAttribute('role')).toBe('status');
  });

  it('overlay has aria-live="polite"', () => {
    showLoading();
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay!.getAttribute('aria-live')).toBe('polite');
  });

  it('showLoading() creates a spinner element', () => {
    showLoading();
    const spinner = document.querySelector('.loading-overlay .loading-spinner');
    expect(spinner).not.toBeNull();
  });

  it('showLoading(message) shows message text', () => {
    showLoading('Loading...');
    const text = document.querySelector('.loading-overlay .loading-text');
    expect(text).not.toBeNull();
    expect(text!.textContent).toBe('Loading...');
  });

  it('showLoading() without message does not create text element', () => {
    showLoading();
    const text = document.querySelector('.loading-overlay .loading-text');
    expect(text).toBeNull();
  });

  it('hideLoading() removes the overlay', () => {
    showLoading();
    expect(document.querySelector('.loading-overlay')).not.toBeNull();
    hideLoading();
    expect(document.querySelector('.loading-overlay')).toBeNull();
  });

  it('calling showLoading() twice replaces the overlay (no duplicates)', () => {
    showLoading('First');
    showLoading('Second');
    const overlays = document.querySelectorAll('.loading-overlay');
    expect(overlays).toHaveLength(1);
    expect(overlays[0].querySelector('.loading-text')!.textContent).toBe('Second');
  });

  it('hideLoading() is safe to call when no overlay exists', () => {
    expect(() => hideLoading()).not.toThrow();
  });

  it('overlay is appended to document.body', () => {
    showLoading();
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay!.parentElement).toBe(document.body);
  });
});
