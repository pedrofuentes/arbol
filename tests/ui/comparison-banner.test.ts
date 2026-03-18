import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showComparisonBanner,
  dismissComparisonBanner,
  isComparisonBannerActive,
  ComparisonBannerOptions,
} from '../../src/ui/comparison-banner';

function getBanner(): HTMLDivElement | null {
  return document.querySelector('[data-testid="comparison-banner"]');
}

function getLabel(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="comparison-banner-label"]');
}

function getStats(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="comparison-banner-stats"]');
}

function getToggle(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="comparison-banner-toggle"]');
}

function getExit(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="comparison-banner-exit"]');
}

function getStat(key: string): HTMLSpanElement | null {
  return document.querySelector(`[data-testid="comparison-stat-${key}"]`);
}

function defaultOptions(overrides: Partial<ComparisonBannerOptions> = {}): ComparisonBannerOptions {
  return {
    container: document.querySelector<HTMLDivElement>('#test-container')!,
    oldLabel: 'v1.0',
    newLabel: 'Working tree',
    stats: { added: 3, removed: 2, moved: 1, modified: 1 },
    viewMode: 'merged',
    dimUnchanged: true,
    onToggleView: vi.fn(),
    onToggleDimUnchanged: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  };
}

describe('ComparisonBanner', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    dismissComparisonBanner();
    container.remove();
  });

  describe('rendering', () => {
    it('renders banner in container', () => {
      showComparisonBanner(defaultOptions());
      const banner = getBanner();
      expect(banner).not.toBeNull();
      expect(container.contains(banner)).toBe(true);
    });

    it('displays old and new labels', () => {
      showComparisonBanner(defaultOptions({ oldLabel: 'v1.0', newLabel: 'Working tree' }));
      const label = getLabel();
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('v1.0');
      expect(label!.textContent).toContain('Working tree');
    });

    it('wraps labels in strong tags', () => {
      showComparisonBanner(defaultOptions({ oldLabel: 'Alpha', newLabel: 'Beta' }));
      const label = getLabel()!;
      const strongs = label.querySelectorAll('strong');
      expect(strongs).toHaveLength(2);
      expect(strongs[0].textContent).toBe('Alpha');
      expect(strongs[1].textContent).toBe('Beta');
    });

    it('banner has role=status', () => {
      showComparisonBanner(defaultOptions());
      expect(getBanner()!.getAttribute('role')).toBe('status');
    });

    it('banner has correct positioning styles', () => {
      showComparisonBanner(defaultOptions());
      const style = getBanner()!.getAttribute('style') ?? '';
      expect(style).toContain('position:absolute');
      expect(style).toContain('left:50%');
      expect(style).toContain('translateX(-50%)');
      expect(style).toContain('z-index:100');
    });

    it('uses CSS variables for theming', () => {
      showComparisonBanner(defaultOptions());
      const style = getBanner()!.getAttribute('style') ?? '';
      expect(style).toContain('var(--bg-elevated)');
      expect(style).toContain('var(--accent)');
      expect(style).toContain('var(--text-primary)');
    });

    it('includes animation keyframe', () => {
      showComparisonBanner(defaultOptions());
      const styleEl = getBanner()!.querySelector('style');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('comparisonBannerIn');
    });
  });

  describe('stats', () => {
    it('shows stats with correct colors', () => {
      showComparisonBanner(defaultOptions({ stats: { added: 3, removed: 2, moved: 1, modified: 1 } }));

      const added = getStat('added')!;
      expect(added.textContent).toContain('3');
      expect(added.getAttribute('style')).toContain('#22c55e');

      const removed = getStat('removed')!;
      expect(removed.textContent).toContain('2');
      expect(removed.getAttribute('style')).toContain('#ef4444');

      const moved = getStat('moved')!;
      expect(moved.textContent).toContain('1');
      expect(moved.getAttribute('style')).toContain('#a78bfa');

      const modified = getStat('modified')!;
      expect(modified.textContent).toContain('1');
      expect(modified.getAttribute('style')).toContain('#f59e0b');
    });

    it('hides zero-count stats', () => {
      showComparisonBanner(defaultOptions({ stats: { added: 5, removed: 0, moved: 0, modified: 3 } }));

      expect(getStat('added')).not.toBeNull();
      expect(getStat('modified')).not.toBeNull();
      expect(getStat('removed')).toBeNull();
      expect(getStat('moved')).toBeNull();
    });

    it('hides all stats when all are zero', () => {
      showComparisonBanner(defaultOptions({ stats: { added: 0, removed: 0, moved: 0, modified: 0 } }));
      const statsEl = getStats()!;
      expect(statsEl.children).toHaveLength(0);
    });

    it('shows correct stat prefixes', () => {
      showComparisonBanner(defaultOptions({ stats: { added: 1, removed: 1, moved: 1, modified: 1 } }));
      expect(getStat('added')!.textContent).toMatch(/^\+1$/);
      expect(getStat('removed')!.textContent).toMatch(/^.1$/); // −1 (minus sign)
      expect(getStat('moved')!.textContent).toMatch(/^.1$/); // ↗1
      expect(getStat('modified')!.textContent).toMatch(/^~1$/);
    });
  });

  describe('toggle button', () => {
    it('shows correct text for merged mode', () => {
      showComparisonBanner(defaultOptions({ viewMode: 'merged' }));
      expect(getToggle()!.textContent).toBe('Side by side');
    });

    it('shows correct text for side-by-side mode', () => {
      showComparisonBanner(defaultOptions({ viewMode: 'side-by-side' }));
      expect(getToggle()!.textContent).toBe('Merged');
    });

    it('calls onToggleView when clicked', () => {
      const onToggleView = vi.fn();
      showComparisonBanner(defaultOptions({ onToggleView }));
      getToggle()!.click();
      expect(onToggleView).toHaveBeenCalledTimes(1);
    });

    it('has btn btn-secondary class', () => {
      showComparisonBanner(defaultOptions());
      expect(getToggle()!.className).toBe('btn btn-secondary');
    });
  });

  describe('exit button', () => {
    it('calls onExit when clicked', () => {
      const onExit = vi.fn();
      showComparisonBanner(defaultOptions({ onExit }));
      getExit()!.click();
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('displays exit text', () => {
      showComparisonBanner(defaultOptions());
      expect(getExit()!.textContent).toBe('✕ Exit');
    });

    it('has btn btn-secondary class', () => {
      showComparisonBanner(defaultOptions());
      expect(getExit()!.className).toBe('btn btn-secondary');
    });
  });

  describe('dismiss', () => {
    it('dismissComparisonBanner removes from DOM', () => {
      showComparisonBanner(defaultOptions());
      expect(getBanner()).not.toBeNull();
      dismissComparisonBanner();
      expect(getBanner()).toBeNull();
    });

    it('is safe to call dismissComparisonBanner when no banner exists', () => {
      expect(() => dismissComparisonBanner()).not.toThrow();
    });
  });

  describe('isComparisonBannerActive', () => {
    it('returns false when no banner is shown', () => {
      expect(isComparisonBannerActive()).toBe(false);
    });

    it('returns true when banner is shown', () => {
      showComparisonBanner(defaultOptions());
      expect(isComparisonBannerActive()).toBe(true);
    });

    it('returns false after dismiss', () => {
      showComparisonBanner(defaultOptions());
      dismissComparisonBanner();
      expect(isComparisonBannerActive()).toBe(false);
    });
  });

  describe('singleton', () => {
    it('showing new banner dismisses previous', () => {
      showComparisonBanner(defaultOptions({ oldLabel: 'First' }));
      showComparisonBanner(defaultOptions({ oldLabel: 'Second' }));
      const banners = container.querySelectorAll('[data-testid="comparison-banner"]');
      expect(banners).toHaveLength(1);
      expect(getLabel()!.textContent).toContain('Second');
    });
  });

  describe('dim unchanged toggle', () => {
    it('renders dim toggle button', () => {
      showComparisonBanner(defaultOptions());
      const btn = document.querySelector('[data-testid="comparison-banner-dim-toggle"]');
      expect(btn).not.toBeNull();
    });

    it('shows "Dim: On" when dimUnchanged is true', () => {
      showComparisonBanner(defaultOptions({ dimUnchanged: true }));
      const btn = document.querySelector('[data-testid="comparison-banner-dim-toggle"]')!;
      expect(btn.textContent).toBe('Dim: On');
    });

    it('shows "Dim: Off" when dimUnchanged is false', () => {
      showComparisonBanner(defaultOptions({ dimUnchanged: false }));
      const btn = document.querySelector('[data-testid="comparison-banner-dim-toggle"]')!;
      expect(btn.textContent).toBe('Dim: Off');
    });

    it('toggles text and calls callback on click', () => {
      const onToggle = vi.fn();
      showComparisonBanner(defaultOptions({ dimUnchanged: true, onToggleDimUnchanged: onToggle }));
      const btn = document.querySelector('[data-testid="comparison-banner-dim-toggle"]') as HTMLButtonElement;
      btn.click();
      expect(onToggle).toHaveBeenCalledWith(false);
      expect(btn.textContent).toBe('Dim: Off');
      btn.click();
      expect(onToggle).toHaveBeenCalledWith(true);
      expect(btn.textContent).toBe('Dim: On');
    });
  });

  describe('aria-labels', () => {
    it('dim toggle button has aria-label', () => {
      showComparisonBanner(defaultOptions());
      const dimBtn = document.querySelector('[data-testid="comparison-banner-dim-toggle"]');
      expect(dimBtn.getAttribute('aria-label')).toBe('Toggle dim unchanged nodes');
    });

    it('view toggle button has aria-label', () => {
      showComparisonBanner(defaultOptions());
      const toggleBtn = getToggle();
      expect(toggleBtn.getAttribute('aria-label')).toBe('Toggle comparison view mode');
    });

    it('exit button has aria-label', () => {
      showComparisonBanner(defaultOptions());
      const exitBtn = getExit();
      expect(exitBtn.getAttribute('aria-label')).toBe('Exit comparison mode');
    });
  });

});
