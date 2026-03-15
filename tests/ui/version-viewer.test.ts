import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  showVersionViewer,
  dismissVersionViewer,
  isVersionViewerActive,
} from '../../src/ui/version-viewer';

function getBanner(): HTMLDivElement | null {
  return document.querySelector('[data-testid="version-viewer"]');
}

function getLabel(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="version-viewer-label"]');
}

function getCompareButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="version-viewer-compare"]');
}

function getRestoreButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="version-viewer-restore"]');
}

function getCloseButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="version-viewer-close"]');
}

function getReadOnlyTag(): HTMLSpanElement | null {
  return document.querySelector('[data-testid="version-viewer-readonly"]');
}

describe('VersionViewer', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dismissVersionViewer();
    container.remove();
  });

  describe('showVersionViewer', () => {
    it('renders banner with role="status"', () => {
      showVersionViewer({ versionName: 'v1.0', container, onRestore: vi.fn(), onClose: vi.fn() });
      const banner = getBanner();
      expect(banner).not.toBeNull();
      expect(banner!.getAttribute('role')).toBe('status');
    });

    it('displays the version name in the label', () => {
      showVersionViewer({ versionName: 'Sprint 3', container, onRestore: vi.fn(), onClose: vi.fn() });
      const label = getLabel();
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('Sprint 3');
    });

    it('displays a read-only indicator', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      const tag = getReadOnlyTag();
      expect(tag).not.toBeNull();
      expect(tag!.textContent).toBe('(read-only)');
    });

    it('renders Restore button', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      const btn = getRestoreButton();
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Restore');
    });

    it('renders Close button', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      const btn = getCloseButton();
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toContain('Close');
    });

    it('appends banner to the provided container', () => {
      showVersionViewer({ versionName: 'v2', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(container.querySelector('[data-testid="version-viewer"]')).not.toBeNull();
    });

    it('sets isVersionViewerActive to true', () => {
      expect(isVersionViewerActive()).toBe(false);
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(isVersionViewerActive()).toBe(true);
    });
  });

  describe('button callbacks', () => {
    it('renders Compare button when onCompare is provided', () => {
      showVersionViewer({ versionName: 'v1', container, onCompare: vi.fn(), onRestore: vi.fn(), onClose: vi.fn() });
      const btn = getCompareButton();
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Compare');
    });

    it('does not render Compare button when onCompare is omitted', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(getCompareButton()).toBeNull();
    });

    it('calls onCompare when Compare is clicked', () => {
      const onCompare = vi.fn();
      showVersionViewer({ versionName: 'v1', container, onCompare, onRestore: vi.fn(), onClose: vi.fn() });
      getCompareButton()!.click();
      expect(onCompare).toHaveBeenCalledTimes(1);
    });

    it('calls onRestore when Restore is clicked', () => {
      const onRestore = vi.fn();
      showVersionViewer({ versionName: 'v1', container, onRestore, onClose: vi.fn() });
      getRestoreButton()!.click();
      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Close is clicked', () => {
      const onClose = vi.fn();
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose });
      getCloseButton()!.click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismissVersionViewer', () => {
    it('removes banner from DOM', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(getBanner()).not.toBeNull();
      dismissVersionViewer();
      expect(getBanner()).toBeNull();
    });

    it('sets isVersionViewerActive to false', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(isVersionViewerActive()).toBe(true);
      dismissVersionViewer();
      expect(isVersionViewerActive()).toBe(false);
    });

    it('is safe to call when no banner exists', () => {
      expect(() => dismissVersionViewer()).not.toThrow();
    });

    it('is safe to call twice', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      dismissVersionViewer();
      expect(() => dismissVersionViewer()).not.toThrow();
      expect(isVersionViewerActive()).toBe(false);
    });
  });

  describe('isVersionViewerActive', () => {
    it('returns false initially', () => {
      expect(isVersionViewerActive()).toBe(false);
    });

    it('returns true after showing', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      expect(isVersionViewerActive()).toBe(true);
    });

    it('returns false after dismissing', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      dismissVersionViewer();
      expect(isVersionViewerActive()).toBe(false);
    });
  });

  describe('singleton', () => {
    it('replaces previous banner when showing a new one', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      showVersionViewer({ versionName: 'v2', container, onRestore: vi.fn(), onClose: vi.fn() });
      const banners = container.querySelectorAll('[data-testid="version-viewer"]');
      expect(banners).toHaveLength(1);
      expect(getLabel()!.textContent).toContain('v2');
    });

    it('previous onRestore callback is no longer reachable', () => {
      const onRestore1 = vi.fn();
      const onRestore2 = vi.fn();
      showVersionViewer({ versionName: 'v1', container, onRestore: onRestore1, onClose: vi.fn() });
      showVersionViewer({ versionName: 'v2', container, onRestore: onRestore2, onClose: vi.fn() });
      getRestoreButton()!.click();
      expect(onRestore1).not.toHaveBeenCalled();
      expect(onRestore2).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('uses CSS variables for theming', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      const banner = getBanner()!;
      const style = banner.getAttribute('style') ?? '';
      expect(style).toContain('var(--bg-elevated)');
      expect(style).toContain('var(--accent)');
    });

    it('includes animation keyframe', () => {
      showVersionViewer({ versionName: 'v1', container, onRestore: vi.fn(), onClose: vi.fn() });
      const styleEl = getBanner()!.querySelector('style');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('versionViewerIn');
    });
  });
});
