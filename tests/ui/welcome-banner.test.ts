import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showWelcomeBanner } from '../../src/ui/welcome-banner';

const STORAGE_KEY = 'arbol-welcome-seen';

function getBanner(): HTMLDivElement | null {
  return document.querySelector('[data-testid="welcome-banner"]');
}

function getBannerText(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="welcome-banner-text"]');
}

function getDismissButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="welcome-banner-dismiss"]');
}

describe('WelcomeBanner', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    localStorage.clear();
  });

  describe('rendering', () => {
    it('shows banner when localStorage flag is absent', () => {
      showWelcomeBanner(container);
      expect(getBanner()).not.toBeNull();
    });

    it('does not show banner when localStorage flag is present', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      showWelcomeBanner(container);
      expect(getBanner()).toBeNull();
    });

    it('displays welcome text', () => {
      showWelcomeBanner(container);
      const text = getBannerText();
      expect(text).not.toBeNull();
      expect(text!.textContent).toContain('Welcome to Arbol');
      expect(text!.textContent).toContain('Right-click');
    });

    it('appends banner to the provided container', () => {
      showWelcomeBanner(container);
      expect(container.querySelector('[data-testid="welcome-banner"]')).not.toBeNull();
    });

    it('renders a Got it dismiss button', () => {
      showWelcomeBanner(container);
      const btn = getDismissButton();
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Got it');
    });
  });

  describe('ARIA attributes', () => {
    it('has role="complementary"', () => {
      showWelcomeBanner(container);
      const banner = getBanner()!;
      expect(banner.getAttribute('role')).toBe('complementary');
    });

    it('has aria-label="Welcome guide"', () => {
      showWelcomeBanner(container);
      const banner = getBanner()!;
      expect(banner.getAttribute('aria-label')).toBe('Welcome guide');
    });
  });

  describe('dismiss', () => {
    it('clicking Got it sets the localStorage flag and removes the banner', () => {
      showWelcomeBanner(container);
      expect(getBanner()).not.toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      getDismissButton()!.click();

      expect(getBanner()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('banner stays dismissed on subsequent calls', () => {
      showWelcomeBanner(container);
      getDismissButton()!.click();

      showWelcomeBanner(container);
      expect(getBanner()).toBeNull();
    });
  });

  describe('styling', () => {
    it('uses CSS variables for theming', () => {
      showWelcomeBanner(container);
      const banner = getBanner()!;
      const style = banner.getAttribute('style') ?? '';
      expect(style).toContain('var(--bg-elevated)');
      expect(style).toContain('var(--accent)');
    });

    it('includes animation keyframe', () => {
      showWelcomeBanner(container);
      const styleEl = getBanner()!.querySelector('style');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('welcomeBannerIn');
    });
  });
});
