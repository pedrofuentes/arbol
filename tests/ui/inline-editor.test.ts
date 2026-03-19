import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  showInlineEditor,
  dismissInlineEditor,
  InlineEditorOptions,
} from '../../src/ui/inline-editor';

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    left: 100,
    top: 200,
    width: 180,
    height: 60,
    right: 280,
    bottom: 260,
    x: 100,
    y: 200,
    toJSON() {
      return {};
    },
    ...overrides,
  };
}

function defaultOptions(overrides: Partial<InlineEditorOptions> = {}): InlineEditorOptions {
  return {
    rect: makeRect(),
    name: 'Alice',
    title: 'VP Engineering',
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('InlineEditor', () => {
  beforeEach(() => {
    // Flush any requestAnimationFrame callbacks synchronously
    vi.useFakeTimers();
  });

  afterEach(() => {
    dismissInlineEditor();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('renders with pre-filled name and title inputs', () => {
    showInlineEditor(defaultOptions());

    const inputs = document.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(3);

    const nameInput = inputs[0] as HTMLInputElement;
    const titleInput = inputs[1] as HTMLInputElement;
    expect(nameInput.value).toBe('Alice');
    expect(titleInput.value).toBe('VP Engineering');
  });

  it('name input is focused after showing', () => {
    showInlineEditor(defaultOptions());

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(document.activeElement).toBe(nameInput);
  });

  it('positions container using rect values', () => {
    const rect = makeRect({ left: 50, top: 80, width: 200, height: 70 });
    showInlineEditor(defaultOptions({ rect }));

    const container = document.body.lastElementChild as HTMLElement;
    expect(container.style.left).toBe('50px');
    expect(container.style.top).toBe('80px');
    expect(container.style.width).toBe('200px');
  });

  it('Enter key triggers onSave with current values', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).toHaveBeenCalledWith('Alice', 'VP Engineering', undefined);
  });

  it('Enter in title input also triggers onSave', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    const titleInput = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
    titleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).toHaveBeenCalledWith('Alice', 'VP Engineering', undefined);
  });

  it('Escape key triggers onCancel', () => {
    const onCancel = vi.fn();
    showInlineEditor(defaultOptions({ onCancel }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('click outside triggers onSave', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    // Advance past the requestAnimationFrame to register the mousedown listener
    vi.advanceTimersByTime(16);

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onSave).toHaveBeenCalledWith('Alice', 'VP Engineering', undefined);
  });

  it('click inside does not trigger save', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));
    vi.advanceTimersByTime(16);

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('empty name shows error message instead of saving', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    showInlineEditor(defaultOptions({ onSave, onCancel }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.value = '';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    const errorMsg = document.querySelector('.error-msg');
    expect(errorMsg).not.toBeNull();
    expect(errorMsg!.textContent).toBe('Name is required');
  });

  it('whitespace-only name shows error message instead of saving', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    showInlineEditor(defaultOptions({ onSave, onCancel }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.value = '   ';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    const errorMsg = document.querySelector('.error-msg');
    expect(errorMsg).not.toBeNull();
    expect(errorMsg!.textContent).toBe('Name is required');
  });

  it('dismissInlineEditor removes the editor from DOM', () => {
    showInlineEditor(defaultOptions());

    expect(document.querySelectorAll('input[type="text"]').length).toBe(3);

    dismissInlineEditor();

    expect(document.querySelectorAll('input[type="text"]').length).toBe(0);
  });

  it('only one editor at a time — showing a new one dismisses the previous', () => {
    const onSave1 = vi.fn();
    const onCancel1 = vi.fn();
    showInlineEditor(defaultOptions({ name: 'First', onSave: onSave1, onCancel: onCancel1 }));

    const firstInputs = document.querySelectorAll('input[type="text"]');
    expect(firstInputs.length).toBe(3);

    showInlineEditor(defaultOptions({ name: 'Second' }));

    const allInputs = document.querySelectorAll('input[type="text"]');
    expect(allInputs.length).toBe(3);
    expect((allInputs[0] as HTMLInputElement).value).toBe('Second');
  });

  it('inputs are editable — changed values are passed to onSave', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    const titleInput = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;

    nameInput.value = 'Bob';
    titleInput.value = 'Director';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).toHaveBeenCalledWith('Bob', 'Director', undefined);
  });

  it('trims values before passing to onSave', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    const titleInput = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;

    nameInput.value = '  Bob  ';
    titleInput.value = '  Director  ';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSave).toHaveBeenCalledWith('Bob', 'Director', undefined);
  });

  it('does not call onSave or onCancel twice on rapid interactions', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    showInlineEditor(defaultOptions({ onSave, onCancel }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('container has z-index 1001', () => {
    showInlineEditor(defaultOptions());

    const container = document.body.lastElementChild as HTMLElement;
    expect(container.style.zIndex).toBe('1001');
  });

  it('name input is bold', () => {
    showInlineEditor(defaultOptions());

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    expect(nameInput.style.fontWeight).toBe('bold');
  });

  it('dismissInlineEditor is safe to call when no editor is open', () => {
    expect(() => dismissInlineEditor()).not.toThrow();
  });

  it('renders Save and Cancel buttons', () => {
    showInlineEditor(defaultOptions());

    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBe(2);

    const saveBtn = buttons[0] as HTMLButtonElement;
    const cancelBtn = buttons[1] as HTMLButtonElement;
    expect(saveBtn.textContent).toBe('Save');
    expect(saveBtn.className).toBe('btn btn-primary');
    expect(saveBtn.style.fontSize).toBe('11px');

    expect(cancelBtn.textContent).toBe('Cancel');
    expect(cancelBtn.className).toBe('btn btn-secondary');
    expect(cancelBtn.style.fontSize).toBe('11px');
  });

  it('Save button triggers onSave with current values', () => {
    const onSave = vi.fn();
    showInlineEditor(defaultOptions({ onSave }));

    const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
    const titleInput = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
    nameInput.value = 'Bob';
    titleInput.value = 'Director';

    const saveBtn = document.querySelector('button.btn-primary') as HTMLButtonElement;
    saveBtn.click();

    expect(onSave).toHaveBeenCalledWith('Bob', 'Director', undefined);
  });

  it('Cancel button triggers onCancel', () => {
    const onCancel = vi.fn();
    showInlineEditor(defaultOptions({ onCancel }));

    const cancelBtn = document.querySelector('button.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();

    expect(onCancel).toHaveBeenCalled();
  });

  describe('aria-invalid on validation errors', () => {
    it('errorMsg element has an id', () => {
      showInlineEditor(defaultOptions());
      const errorMsg = document.querySelector('.error-msg') as HTMLElement;
      expect(errorMsg.id).toBeTruthy();
    });

    it('sets aria-invalid and aria-describedby on save with empty name', () => {
      showInlineEditor(defaultOptions());
      const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
      nameInput.value = '';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      const errorMsg = document.querySelector('.error-msg') as HTMLElement;
      expect(nameInput.getAttribute('aria-describedby')).toBe(errorMsg.id);
    });

    it('clears aria-invalid and aria-describedby on input after error', () => {
      showInlineEditor(defaultOptions());
      const nameInput = document.querySelector('input[aria-label="Name"]') as HTMLInputElement;
      nameInput.value = '';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');

      nameInput.value = 'Bob';
      nameInput.dispatchEvent(new Event('input'));
      expect(nameInput.hasAttribute('aria-invalid')).toBe(false);
      expect(nameInput.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
