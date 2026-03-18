import { describe, it, expect, afterEach, vi } from 'vitest';
import { showFocusBanner, dismissFocusBanner } from '../../src/ui/focus-banner';

function getBanner(): HTMLDivElement | null {
  return document.querySelector('[data-testid="focus-banner"]');
}

function getBannerLabel(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="focus-banner-label"]');
}

function getExitButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="focus-banner-exit"]');
}

describe('FocusBanner', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dismissFocusBanner();
    container.remove();
  });

  describe('rendering', () => {
    it('renders banner with role="status"', () => {
      showFocusBanner({ name: 'Alice', container, onExit: vi.fn() });
      const banner = getBanner();
      expect(banner).not.toBeNull();
      expect(banner!.getAttribute('role')).toBe('status');
    });

    it('shows the focused node name in the label', () => {
      showFocusBanner({ name: 'Bob', container, onExit: vi.fn() });
      const label = getBannerLabel();
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('Bob');
      expect(label!.textContent).toContain('org');
    });

    it('renders Show full org exit button', () => {
      showFocusBanner({ name: 'Charlie', container, onExit: vi.fn() });
      const btn = getExitButton();
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Show full org');
    });

    it('appends banner to the provided container', () => {
      showFocusBanner({ name: 'Diana', container, onExit: vi.fn() });
      expect(container.querySelector('[data-testid="focus-banner"]')).not.toBeNull();
    });
  });

  describe('exit action', () => {
    it('calls onExit when Show full org is clicked', () => {
      const onExit = vi.fn();
      showFocusBanner({ name: 'Eve', container, onExit });
      const btn = getExitButton()!;
      btn.click();
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismiss', () => {
    it('removes banner from DOM on dismissFocusBanner()', () => {
      showFocusBanner({ name: 'Frank', container, onExit: vi.fn() });
      expect(getBanner()).not.toBeNull();
      dismissFocusBanner();
      expect(getBanner()).toBeNull();
    });

    it('is safe to call dismissFocusBanner() when no banner exists', () => {
      expect(() => dismissFocusBanner()).not.toThrow();
    });
  });

  describe('singleton', () => {
    it('replaces previous banner when showing a new one', () => {
      showFocusBanner({ name: 'Grace', container, onExit: vi.fn() });
      showFocusBanner({ name: 'Heidi', container, onExit: vi.fn() });
      const banners = container.querySelectorAll('[data-testid="focus-banner"]');
      expect(banners).toHaveLength(1);
      expect(getBannerLabel()!.textContent).toContain('Heidi');
    });
  });

  describe('styling', () => {
    it('uses CSS variables for theming', () => {
      showFocusBanner({ name: 'Ivan', container, onExit: vi.fn() });
      const banner = getBanner()!;
      const style = banner.getAttribute('style') ?? '';
      expect(style).toContain('var(--bg-elevated)');
      expect(style).toContain('var(--accent)');
    });

    it('includes animation keyframe', () => {
      showFocusBanner({ name: 'Judy', container, onExit: vi.fn() });
      const styleEl = getBanner()!.querySelector('style');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('focusBannerIn');
    });
  });

  describe('aria-labels', () => {
    it('exit button has descriptive aria-label', () => {
      showFocusBanner({ name: 'Eve', container, onExit: vi.fn() });
      const exitBtn = getExitButton();
      expect(exitBtn.getAttribute('aria-label')).toBe('Exit focus mode and show full organization chart');
    });
  });

});
