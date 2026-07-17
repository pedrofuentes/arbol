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
    let dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
    while (dialog) {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
    }
    document.body.innerHTML = '';
  });

  it('shows one welcome dialog with sample, empty, and Import choices on first visit', () => {
    const storage = makeStorage();
    const onLoadSample = vi.fn();
    const result = showFirstVisitHelp(onLoadSample, storage);

    expect(result).toBe(true);
    const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].textContent).toContain('Welcome to Arbol');
    expect(dialogs[0].textContent).toContain('Load sample org chart');
    expect(dialogs[0].textContent).toContain('Start empty');
    expect(dialogs[0].textContent).toContain('Import');
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

  it('loads the sample immediately and closes the welcome dialog without stacking a prompt', () => {
    const storage = makeStorage();
    const onLoadSample = vi.fn();
    showFirstVisitHelp(onLoadSample, storage);

    const sampleButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Load sample org chart'),
    );
    expect(sampleButton).toBeDefined();
    sampleButton!.click();

    expect(onLoadSample).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).toHaveLength(0);
  });

  it('starts empty without loading a sample and closes the welcome dialog', () => {
    const storage = makeStorage();
    const onLoadSample = vi.fn();
    showFirstVisitHelp(onLoadSample, storage);

    const emptyButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start empty'),
    );
    expect(emptyButton).toBeDefined();
    emptyButton!.click();

    expect(onLoadSample).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
