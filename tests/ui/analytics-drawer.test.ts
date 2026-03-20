import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalyticsDrawer } from '../../src/ui/analytics-drawer';

describe('AnalyticsDrawer', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it('renders drawer element in parent', () => {
    const drawer = new AnalyticsDrawer(parent);
    expect(parent.querySelector('.analytics-drawer')).not.toBeNull();
    drawer.destroy();
  });

  it('starts collapsed', () => {
    const drawer = new AnalyticsDrawer(parent);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(true);
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('toggle opens drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.toggle();
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(false);
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('toggle closes open drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.toggle();
    drawer.toggle();
    expect(drawer.isOpen()).toBe(false);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(true);
    drawer.destroy();
  });

  it('open() opens', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('open() is idempotent', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('close() closes', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('close() is idempotent', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('close button closes drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    const closeBtn = parent.querySelector('.analytics-drawer-close') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('getContentContainer returns body element', () => {
    const drawer = new AnalyticsDrawer(parent);
    const body = drawer.getContentContainer();
    expect(body).not.toBeNull();
    expect(body.className).toBe('analytics-drawer-body');
    drawer.destroy();
  });

  it('emits on open', () => {
    const drawer = new AnalyticsDrawer(parent);
    let called = false;
    drawer.onChange(() => { called = true; });
    drawer.open();
    expect(called).toBe(true);
    drawer.destroy();
  });

  it('emits on close', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    let called = false;
    drawer.onChange(() => { called = true; });
    drawer.close();
    expect(called).toBe(true);
    drawer.destroy();
  });

  it('destroy removes DOM', () => {
    const drawer = new AnalyticsDrawer(parent);
    expect(parent.querySelector('.analytics-drawer')).not.toBeNull();
    drawer.destroy();
    expect(parent.querySelector('.analytics-drawer')).toBeNull();
  });

  it('has correct aria attributes', () => {
    const drawer = new AnalyticsDrawer(parent);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Organization analytics panel');
    drawer.destroy();
  });

  it('has grip element', () => {
    const drawer = new AnalyticsDrawer(parent);
    const grip = parent.querySelector('.analytics-drawer-grip');
    expect(grip).not.toBeNull();
    expect(grip!.getAttribute('aria-hidden')).toBe('true');
    drawer.destroy();
  });

  describe('drag-to-resize', () => {
    it('handle has ns-resize cursor', () => {
      const drawer = new AnalyticsDrawer(parent);
      const handle = parent.querySelector('.analytics-drawer-handle') as HTMLElement;
      expect(handle).not.toBeNull();
      expect(handle.style.cursor).toBe('ns-resize');
      drawer.destroy();
    });

    it('grip has aria-hidden', () => {
      const drawer = new AnalyticsDrawer(parent);
      const grip = parent.querySelector('.analytics-drawer-grip') as HTMLElement;
      expect(grip).not.toBeNull();
      expect(grip.getAttribute('aria-hidden')).toBe('true');
      drawer.destroy();
    });

    it('pointerdown on handle starts drag', () => {
      const drawer = new AnalyticsDrawer(parent);
      const handle = parent.querySelector('.analytics-drawer-handle') as HTMLElement;
      const root = parent.querySelector('.analytics-drawer') as HTMLElement;

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 300 }));

      expect(root.style.transition).toBe('none');
      drawer.destroy();
    });

    it('pointerup saves height to localStorage', () => {
      const drawer = new AnalyticsDrawer(parent);
      const handle = parent.querySelector('.analytics-drawer-handle') as HTMLElement;
      const root = parent.querySelector('.analytics-drawer') as HTMLElement;

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 300 }));
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 250 }));
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      expect(localStorage.getItem('arbol-analytics-drawer-height')).not.toBeNull();
      drawer.destroy();
      localStorage.removeItem('arbol-analytics-drawer-height');
    });

    it('restores height from localStorage', () => {
      localStorage.setItem('arbol-analytics-drawer-height', '350px');
      const drawer = new AnalyticsDrawer(parent);
      const root = parent.querySelector('.analytics-drawer') as HTMLElement;

      expect(root.style.height).toBe('350px');
      drawer.destroy();
      localStorage.removeItem('arbol-analytics-drawer-height');
    });

    it('destroy removes document listeners', () => {
      const drawer = new AnalyticsDrawer(parent);
      drawer.destroy();
      expect(parent.querySelector('.analytics-drawer')).toBeNull();
    });
  });
});
