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
});
