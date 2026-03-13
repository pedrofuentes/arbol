import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { announce, _resetForTesting } from '../../src/ui/announcer';

function getRegion(): HTMLElement | null {
  return document.querySelector('[role="status"][aria-live]');
}

describe('announcer', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it('creates the live region on first call', () => {
    expect(getRegion()).toBeNull();
    announce('hello');
    const region = getRegion();
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(region!.getAttribute('aria-atomic')).toBe('true');
    expect(region!.getAttribute('role')).toBe('status');
  });

  it('reuses the same region on repeated calls', () => {
    announce('first');
    const region1 = getRegion();
    announce('second');
    const region2 = getRegion();
    expect(region1).toBe(region2);
    expect(document.querySelectorAll('[role="status"][aria-live]').length).toBe(1);
  });

  it('sets message after requestAnimationFrame', async () => {
    announce('test message');
    const region = getRegion()!;
    // Immediately after announce, textContent is cleared
    expect(region.textContent).toBe('');

    // After rAF fires, message is set
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(region.textContent).toBe('test message');
  });

  it('defaults to polite priority', () => {
    announce('polite msg');
    const region = getRegion()!;
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('switches to assertive priority when specified', () => {
    announce('urgent', 'assertive');
    const region = getRegion()!;
    expect(region.getAttribute('aria-live')).toBe('assertive');
  });

  it('can switch back from assertive to polite', () => {
    announce('urgent', 'assertive');
    announce('calm', 'polite');
    const region = getRegion()!;
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('region is visually hidden', () => {
    announce('hidden');
    const region = getRegion()!;
    expect(region.style.position).toBe('absolute');
    expect(region.style.width).toBe('1px');
    expect(region.style.height).toBe('1px');
    expect(region.style.overflow).toBe('hidden');
    expect(region.style.clip).toBe('rect(0px, 0px, 0px, 0px)');
    expect(region.style.border).toBe('0px');
  });

  it('region is appended to document.body', () => {
    announce('body check');
    const region = getRegion()!;
    expect(region.parentElement).toBe(document.body);
  });

  it('clears text before setting new message to trigger re-announcement', async () => {
    announce('first');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const region = getRegion()!;
    expect(region.textContent).toBe('first');

    announce('first'); // same message again
    // Should be cleared synchronously
    expect(region.textContent).toBe('');
    // Then re-set after rAF
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(region.textContent).toBe('first');
  });

  it('_resetForTesting removes the region from DOM', () => {
    announce('something');
    expect(getRegion()).not.toBeNull();
    _resetForTesting();
    expect(getRegion()).toBeNull();
  });
});
