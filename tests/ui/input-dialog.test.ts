import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showInputDialog } from '../../src/ui/input-dialog';

describe('showInputDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((el) => {
      el.closest('div')?.remove();
    });
  });

  it('renders a dialog with title and input', async () => {
    const promise = showInputDialog({
      title: 'Test Title',
      label: 'Name',
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Test Title');

    const input = dialog!.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();

    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('resolves with input value on confirm', async () => {
    const promise = showInputDialog({
      title: 'Version',
      label: 'Name',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const input = dialog!.querySelector('input') as HTMLInputElement;
    input.value = 'Q1 Plan';

    const confirmBtn = dialog!.querySelector('.btn-primary') as HTMLButtonElement;
    confirmBtn.click();

    const result = await promise;
    expect(result).toBe('Q1 Plan');
  });

  it('resolves null on cancel', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('resolves null on Escape key', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await promise;
    expect(result).toBeNull();
  });

  it('confirms on Enter key in input', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const input = dialog!.querySelector('input') as HTMLInputElement;
    input.value = 'My Value';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const result = await promise;
    expect(result).toBe('My Value');
  });

  it('uses placeholder and initialValue when provided', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
      placeholder: 'Type here',
      initialValue: 'Default',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const input = dialog!.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('Type here');
    expect(input.value).toBe('Default');

    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
  });

  it('uses custom confirmLabel', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
      confirmLabel: 'Save',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const confirmBtn = dialog!.querySelector('.btn-primary') as HTMLButtonElement;
    expect(confirmBtn.textContent).toBe('Save');

    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
  });

  it('applies maxLength to input', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
      maxLength: 50,
    });

    const dialog = document.querySelector('[role="dialog"]');
    const input = dialog!.querySelector('input') as HTMLInputElement;
    expect(input.maxLength).toBe(50);

    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
  });

  it('removes overlay from DOM after close', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
    });

    const cancelBtn = document.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();
    await promise;

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('resolves null when clicking overlay backdrop', async () => {
    const promise = showInputDialog({
      title: 'Title',
      label: 'Label',
    });

    const dialog = document.querySelector('[role="dialog"]');
    const overlay = dialog!.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const result = await promise;
    expect(result).toBeNull();
  });

  it('label and input are programmatically associated via htmlFor and id', () => {
    showInputDialog({ title: 'Test', label: 'Name' });
    const dialog = document.querySelector('[role="dialog"]')!;
    const label = dialog.querySelector('label')!;
    const input = dialog.querySelector('input')!;
    expect(label.htmlFor).toBeTruthy();
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });

});
