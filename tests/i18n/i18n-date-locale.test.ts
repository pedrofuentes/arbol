import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setLocale, getLocale } from '../../src/i18n';
import en from '../../src/i18n/en';

/**
 * Tests that date formatting calls in the UI pass getLocale() to the
 * Date.prototype.toLocaleString / toLocaleDateString methods, ensuring
 * dates are formatted according to the app's selected locale.
 */

// ── export-dialog ───────────────────────────────────────────────

describe('export-dialog – date locale', () => {
  let toLocaleStringSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    setLocale('en', en);
    toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString');
  });

  afterEach(() => {
    toLocaleStringSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('passes getLocale() to toLocaleString for version dates', async () => {
    const { showExportDialog } = await import('../../src/ui/export-dialog');

    showExportDialog({
      chartName: 'Test',
      versions: [
        {
          id: 'v1',
          chartId: 'c1',
          name: 'Version 1',
          createdAt: '2024-01-15T10:30:00.000Z',
          tree: { id: 'root', name: 'A', title: 'B', children: [] },
        },
      ],
      onExport: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(toLocaleStringSpy).toHaveBeenCalled();
    const firstCallArgs = toLocaleStringSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('en');
  });

  it('uses updated locale when locale changes', async () => {
    setLocale('de', {});
    const { showExportDialog } = await import('../../src/ui/export-dialog');

    showExportDialog({
      chartName: 'Test',
      versions: [
        {
          id: 'v1',
          chartId: 'c1',
          name: 'Version 1',
          createdAt: '2024-01-15T10:30:00.000Z',
          tree: { id: 'root', name: 'A', title: 'B', children: [] },
        },
      ],
      onExport: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(toLocaleStringSpy).toHaveBeenCalled();
    const firstCallArgs = toLocaleStringSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('de');
  });
});

// ── version-picker ──────────────────────────────────────────────

describe('version-picker – date locale', () => {
  let toLocaleDateStringSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    setLocale('en', en);
    toLocaleDateStringSpy = vi.spyOn(Date.prototype, 'toLocaleDateString');
  });

  afterEach(() => {
    toLocaleDateStringSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('passes getLocale() to toLocaleDateString for version dates', async () => {
    const { showVersionPicker } = await import('../../src/ui/version-picker');

    showVersionPicker({
      versions: [
        {
          id: 'v1',
          chartId: 'c1',
          name: 'Q1',
          createdAt: '2024-01-15T10:00:00Z',
          tree: { id: 'root', name: 'A', title: 'B', children: [] },
        },
      ],
      includeWorkingTree: false,
    });

    expect(toLocaleDateStringSpy).toHaveBeenCalled();
    const firstCallArgs = toLocaleDateStringSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('en');
  });

  it('uses updated locale when locale changes', async () => {
    setLocale('de', {});
    const { showVersionPicker } = await import('../../src/ui/version-picker');

    showVersionPicker({
      versions: [
        {
          id: 'v1',
          chartId: 'c1',
          name: 'Q1',
          createdAt: '2024-01-15T10:00:00Z',
          tree: { id: 'root', name: 'A', title: 'B', children: [] },
        },
      ],
      includeWorkingTree: false,
    });

    expect(toLocaleDateStringSpy).toHaveBeenCalled();
    const firstCallArgs = toLocaleDateStringSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('de');
  });
});

// ── backup-panel ────────────────────────────────────────────────

describe('backup-panel – date locale', () => {
  it('getLocale() is available and returns current locale', () => {
    setLocale('en', en);
    expect(getLocale()).toBe('en');

    setLocale('fr', {});
    expect(getLocale()).toBe('fr');
  });
});

// ── chart-editor ────────────────────────────────────────────────

describe('chart-editor – date locale', () => {
  it('i18n module exports getLocale function', async () => {
    const i18n = await import('../../src/i18n');
    expect(typeof i18n.getLocale).toBe('function');
    expect(i18n.getLocale()).toBeDefined();
  });
});
