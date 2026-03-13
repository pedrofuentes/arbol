import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showRestoreStrategyDialog } from '../../src/ui/restore-dialog';

describe('RestoreStrategyDialog', () => {
  beforeEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((el) => {
      el.parentElement?.remove();
    });
  });

  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((el) => {
      el.parentElement?.remove();
    });
  });

  const defaultOptions = {
    chartCount: 3,
    versionCount: 5,
    backupDate: '3/13/2026, 12:00:00 AM',
    appVersion: '1.2.0',
  };

  it('renders dialog with summary info', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('3 chart(s)');
    expect(dialog.textContent).toContain('5 version(s)');
    expect(dialog.textContent).toContain('1.2.0');

    const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel',
    )!;
    cancelBtn.click();
    expect(await promise).toBe('cancel');
  });

  it('resolves with "replace" when replace button is clicked', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    const replaceBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Replace All'),
    )!;
    replaceBtn.click();
    expect(await promise).toBe('replace');
  });

  it('resolves with "merge" when merge button is clicked', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    const mergeBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Merge'),
    )!;
    mergeBtn.click();
    expect(await promise).toBe('merge');
  });

  it('resolves with "cancel" on Escape key', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await promise).toBe('cancel');
  });

  it('resolves with "cancel" on overlay click', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    const overlay = dialog.parentElement!;
    expect(overlay).not.toBeNull();

    // Simulate click directly on the overlay (not bubbling from dialog)
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(await promise).toBe('cancel');
  });

  it('removes dialog from DOM after selection', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    const mergeBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Merge'),
    )!;
    mergeBtn.click();
    await promise;

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders three strategy buttons', async () => {
    const promise = showRestoreStrategyDialog(defaultOptions);

    const dialog = document.querySelector('[role="dialog"]')!;
    const buttons = dialog.querySelectorAll('button');
    expect(buttons.length).toBe(3);

    buttons[2].click();
    await promise;
  });
});
