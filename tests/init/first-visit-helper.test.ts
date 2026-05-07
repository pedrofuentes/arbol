import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showFirstVisitHelp } from '../../src/init/first-visit-helper';
import type { IStorage } from '../../src/utils/storage';

function makeStorage(): IStorage & {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
} {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

describe('showFirstVisitHelp', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows help dialog on first visit and returns true', () => {
    const storage = makeStorage();
    const onLoadSample = vi.fn();
    const result = showFirstVisitHelp(onLoadSample, storage);

    expect(result).toBe(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('sets storage flag after showing help', () => {
    const storage = makeStorage();
    showFirstVisitHelp(vi.fn(), storage);

    expect(storage.setItem).toHaveBeenCalledWith('arbol-welcome-seen', 'true');
  });

  it('does not show help dialog on repeat visit', () => {
    const storage = makeStorage();
    storage.setItem('arbol-welcome-seen', 'true');

    const result = showFirstVisitHelp(vi.fn(), storage);

    expect(result).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens Getting Started section (index 1) by default', () => {
    const storage = makeStorage();
    showFirstVisitHelp(vi.fn(), storage);

    const sections = document.querySelectorAll('.help-section');
    expect(sections[0].classList.contains('open')).toBe(false);
    expect(sections[1].classList.contains('open')).toBe(true);
  });

  it('passes onLoadSample to help dialog', () => {
    const storage = makeStorage();
    const onLoadSample = vi.fn();
    showFirstVisitHelp(onLoadSample, storage);

    const sampleBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Load Sample Org Chart'),
    );
    expect(sampleBtn).toBeDefined();
  });
});
