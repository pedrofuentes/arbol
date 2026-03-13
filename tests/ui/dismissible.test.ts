import { describe, it, expect, vi } from 'vitest';
import { createDismissible } from '../../src/ui/dismissible';

describe('createDismissible', () => {
  it('starts with no active element', () => {
    const d = createDismissible();
    expect(d.getActive()).toBeNull();
    expect(d.isActive()).toBe(false);
  });

  it('activate sets the active element', () => {
    const d = createDismissible();
    const el = document.createElement('div');
    document.body.appendChild(el);

    d.activate(el);

    expect(d.getActive()).toBe(el);
    expect(d.isActive()).toBe(true);

    d.dismiss();
  });

  it('dismiss removes element from DOM and clears state', () => {
    const d = createDismissible();
    const el = document.createElement('div');
    document.body.appendChild(el);

    d.activate(el);
    d.dismiss();

    expect(d.getActive()).toBeNull();
    expect(d.isActive()).toBe(false);
    expect(document.body.contains(el)).toBe(false);
  });

  it('singleton: activate replaces previous element', () => {
    const d = createDismissible();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    d.activate(el1);
    d.activate(el2);

    expect(d.getActive()).toBe(el2);
    expect(document.body.contains(el1)).toBe(false);
    expect(document.body.contains(el2)).toBe(true);

    d.dismiss();
  });

  it('runs cleanup functions on dismiss', () => {
    const d = createDismissible();
    const el = document.createElement('div');
    document.body.appendChild(el);
    d.activate(el);

    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();
    d.onDismiss(cleanup1);
    d.onDismiss(cleanup2);

    d.dismiss();

    expect(cleanup1).toHaveBeenCalledOnce();
    expect(cleanup2).toHaveBeenCalledOnce();
  });

  it('clears cleanup functions after dismiss so they do not run twice', () => {
    const d = createDismissible();
    const el = document.createElement('div');
    document.body.appendChild(el);
    d.activate(el);

    const cleanup = vi.fn();
    d.onDismiss(cleanup);

    d.dismiss();
    d.dismiss();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('ignores errors thrown by cleanup functions', () => {
    const d = createDismissible();
    const el = document.createElement('div');
    document.body.appendChild(el);
    d.activate(el);

    d.onDismiss(() => { throw new Error('boom'); });
    const after = vi.fn();
    d.onDismiss(after);

    expect(() => d.dismiss()).not.toThrow();
    expect(after).toHaveBeenCalledOnce();
  });

  it('dismiss when no element is active is a no-op', () => {
    const d = createDismissible();
    expect(() => d.dismiss()).not.toThrow();
    expect(d.isActive()).toBe(false);
  });

  it('runs previous cleanup functions when activate replaces element', () => {
    const d = createDismissible();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    d.activate(el1);
    const cleanup = vi.fn();
    d.onDismiss(cleanup);

    d.activate(el2);

    expect(cleanup).toHaveBeenCalledOnce();

    d.dismiss();
  });
});
