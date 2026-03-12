import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showConfirmDialog } from '../../src/ui/confirm-dialog';

describe('showConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog with title and message', async () => {
    const promise = showConfirmDialog({
      title: 'Delete Item',
      message: 'Are you sure?',
    });

    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Delete Item');
    expect(dialog!.textContent).toContain('Are you sure?');

    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    );
    confirmBtn!.click();
    expect(await promise).toBe(true);
  });

  it('resolves true when confirm clicked', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'Test message',
      confirmLabel: 'Yes',
    });

    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Yes',
    );
    btn!.click();
    expect(await promise).toBe(true);
  });

  it('resolves false when cancel clicked', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'Test message',
      cancelLabel: 'No',
    });

    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'No');
    btn!.click();
    expect(await promise).toBe(false);
  });

  it('resolves false on Escape key', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await promise).toBe(false);
  });

  it('resolves false when clicking overlay', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
    });

    const overlay = document.querySelector('[role="alertdialog"]')!.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(await promise).toBe(false);
  });

  it('removes overlay from DOM after resolution', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
    });

    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    );
    confirmBtn!.click();
    await promise;
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('uses custom button labels', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });

    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent === 'Delete')).toBe(true);
    expect(buttons.some((b) => b.textContent === 'Keep')).toBe(true);

    buttons.find((b) => b.textContent === 'Delete')!.click();
    await promise;
  });

  it('applies danger styling when danger option is true', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
      danger: true,
    });

    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    );
    expect(confirmBtn!.className).toContain('btn-danger');

    confirmBtn!.click();
    await promise;
  });

  it('applies primary styling when danger is not set', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'msg',
    });

    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    );
    expect(confirmBtn!.className).toContain('btn-primary');

    confirmBtn!.click();
    await promise;
  });

  it('has aria-modal and role attributes', async () => {
    const promise = showConfirmDialog({ title: 'Test', message: 'msg' });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');

    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    );
    confirmBtn!.click();
    await promise;
  });

  it('uses default labels when none provided', async () => {
    const promise = showConfirmDialog({ title: 'Test', message: 'msg' });

    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent === 'Cancel')).toBe(true);
    expect(buttons.some((b) => b.textContent === 'Confirm')).toBe(true);

    buttons.find((b) => b.textContent === 'Confirm')!.click();
    await promise;
  });
});
