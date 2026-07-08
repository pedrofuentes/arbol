import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { initOfflineBanner, teardownOfflineBanner } from '../../src/ui/offline-banner';

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

function dispatchConnectivity(type: 'online' | 'offline'): void {
  window.dispatchEvent(new Event(type));
}

function getBanner(): HTMLDivElement | null {
  return document.querySelector('[data-testid="offline-banner"]');
}

function getBannerText(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="offline-banner-text"]');
}

describe('OfflineBanner', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setOnline(true);
  });

  afterEach(() => {
    teardownOfflineBanner();
    container.remove();
    setOnline(true);
  });

  it('does not render a banner when online at init', () => {
    initOfflineBanner(container);
    expect(getBanner()).toBeNull();
  });

  it('renders a banner immediately when already offline at init', () => {
    setOnline(false);
    initOfflineBanner(container);
    expect(getBanner()).not.toBeNull();
  });

  it('shows the banner with role="status" and aria-live="polite" on offline event', () => {
    initOfflineBanner(container);
    setOnline(false);
    dispatchConnectivity('offline');

    const banner = getBanner();
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute('role')).toBe('status');
    expect(banner!.getAttribute('aria-live')).toBe('polite');
    expect(getBannerText()!.textContent).toBe('You are offline — changes are saved locally.');
  });

  it('hides the banner on online event', () => {
    initOfflineBanner(container);
    setOnline(false);
    dispatchConnectivity('offline');
    expect(getBanner()).not.toBeNull();

    setOnline(true);
    dispatchConnectivity('online');
    expect(getBanner()).toBeNull();
  });

  it('does not duplicate the banner on repeated offline events', () => {
    initOfflineBanner(container);
    setOnline(false);
    dispatchConnectivity('offline');
    dispatchConnectivity('offline');

    expect(container.querySelectorAll('[data-testid="offline-banner"]')).toHaveLength(1);
  });

  it('removes listeners and the banner on teardownOfflineBanner()', () => {
    initOfflineBanner(container);
    setOnline(false);
    dispatchConnectivity('offline');
    expect(getBanner()).not.toBeNull();

    teardownOfflineBanner();
    expect(getBanner()).toBeNull();

    dispatchConnectivity('offline');
    expect(getBanner()).toBeNull();
  });

  it('is safe to call teardownOfflineBanner() when no banner exists', () => {
    expect(() => teardownOfflineBanner()).not.toThrow();
  });
});
