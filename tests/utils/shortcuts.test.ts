import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShortcutManager } from '../../src/utils/shortcuts';

describe('ShortcutManager', () => {
  let manager: ShortcutManager;

  beforeEach(() => {
    manager = new ShortcutManager();
  });

  function fireKey(
    key: string,
    opts: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; target?: HTMLElement } = {},
  ) {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: opts.ctrlKey ?? false,
      shiftKey: opts.shiftKey ?? false,
      altKey: opts.altKey ?? false,
      bubbles: true,
    });

    if (opts.target) {
      // Override target by dispatching from the element itself
      vi.spyOn(event, 'preventDefault');
      opts.target.dispatchEvent(event);
      return event;
    }

    vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    return event;
  }

  it('register() adds a shortcut', () => {
    const handler = vi.fn();
    manager.register({ key: 'a', handler, description: 'Test' });
    fireKey('a');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handler is called when matching key is pressed', () => {
    const handler = vi.fn();
    manager.register({ key: 's', ctrl: true, handler, description: 'Save' });
    fireKey('s', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handler is NOT called when required modifier is missing', () => {
    const handler = vi.fn();
    manager.register({ key: 'z', ctrl: true, handler, description: 'Undo' });
    fireKey('z'); // no ctrl
    expect(handler).not.toHaveBeenCalled();
  });

  it('Ctrl+Z fires the correct handler, not plain Z', () => {
    const undoHandler = vi.fn();
    const plainZHandler = vi.fn();
    manager.register({ key: 'z', ctrl: true, handler: undoHandler, description: 'Undo' });
    manager.register({ key: 'z', handler: plainZHandler, description: 'Plain Z' });

    fireKey('z', { ctrlKey: true });
    expect(undoHandler).toHaveBeenCalledOnce();
    expect(plainZHandler).not.toHaveBeenCalled();
  });

  it('Ctrl+Shift+Z fires differently from Ctrl+Z', () => {
    const undoHandler = vi.fn();
    const redoHandler = vi.fn();
    manager.register({ key: 'z', ctrl: true, handler: undoHandler, description: 'Undo' });
    manager.register({
      key: 'z',
      ctrl: true,
      shift: true,
      handler: redoHandler,
      description: 'Redo',
    });

    fireKey('z', { ctrlKey: true, shiftKey: true });
    expect(redoHandler).toHaveBeenCalledOnce();
    expect(undoHandler).not.toHaveBeenCalled();
  });

  it('shortcuts do not fire when typing in an input element', () => {
    const handler = vi.fn();
    manager.register({ key: 'z', ctrl: true, handler, description: 'Undo' });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireKey('z', { ctrlKey: true, target: input });
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('shortcuts do not fire when typing in a textarea', () => {
    const handler = vi.fn();
    manager.register({ key: 'z', ctrl: true, handler, description: 'Undo' });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    fireKey('z', { ctrlKey: true, target: textarea });
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('Escape fires even when focused in an input element', () => {
    const handler = vi.fn();
    manager.register({ key: 'Escape', handler, description: 'Close' });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireKey('Escape', { target: input });
    expect(handler).toHaveBeenCalledOnce();
    document.body.removeChild(input);
  });

  it('setActive(false) disables all shortcuts', () => {
    const handler = vi.fn();
    manager.register({ key: 'a', handler, description: 'Test' });
    manager.setActive(false);
    fireKey('a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('setActive(true) re-enables shortcuts', () => {
    const handler = vi.fn();
    manager.register({ key: 'a', handler, description: 'Test' });
    manager.setActive(false);
    fireKey('a');
    expect(handler).not.toHaveBeenCalled();

    manager.setActive(true);
    fireKey('a');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('getShortcutLabel() returns correct label string', () => {
    manager.register({ key: 'z', ctrl: true, handler: vi.fn(), description: 'Undo' });
    expect(manager.getShortcutLabel('Undo')).toBe('Ctrl+Z');
  });

  it('getShortcutLabel() returns null for unknown description', () => {
    expect(manager.getShortcutLabel('NonExistent')).toBeNull();
  });

  it('e.preventDefault() is called when a shortcut matches', () => {
    manager.register({ key: 'a', handler: vi.fn(), description: 'Test' });
    const event = fireKey('a');
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
