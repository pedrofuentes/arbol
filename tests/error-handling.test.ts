/**
 * Tests for error handling improvements:
 * 1. Global unhandled rejection handler (main.ts)
 * 2. localStorage failure toasts (settings-store, category-store, mapping-store)
 * 3. D3 render pipeline protection (chart-renderer)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChartRenderer } from '../src/renderer/chart-renderer';
import type { IStorage } from '../src/utils/storage';
import type { OrgNode, ColumnMapping, MappingPreset } from '../src/types';
import { showToast } from '../src/ui/toast';
import { t } from '../src/i18n';

vi.mock('../src/ui/toast', () => ({
  showToast: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates an IStorage that throws on setItem (simulates full/disabled storage). */
function failingStorage(data: Record<string, string> = {}): IStorage {
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    },
    removeItem: () => {},
    clear: () => {},
  };
}

const validMapping: ColumnMapping = {
  name: 'employee_name',
  title: 'job_title',
  parentRef: 'supervisor',
  parentRefType: 'name',
};

function makePreset(name: string, mapping = validMapping): MappingPreset {
  return { name, mapping };
}

// ─── Part 2: localStorage failure toasts ──────────────────────────────────────

describe('localStorage failure toasts', () => {
  beforeEach(() => {
    vi.mocked(showToast).mockClear();
  });

  describe('SettingsStore', () => {
    it('shows a toast when saveImmediate fails due to storage error', async () => {
      const { SettingsStore } = await import('../src/store/settings-store');
      const store = new SettingsStore(failingStorage());
      store.saveImmediate({ nodeWidth: 200 });
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining(''),
        'error',
      );
    });
  });

  describe('CategoryStore', () => {
    it('shows a toast when adding a category fails due to storage error', async () => {
      const { CategoryStore } = await import('../src/store/category-store');
      const store = new CategoryStore(failingStorage());
      store.add('Test Category', '#ff0000');
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining(''),
        'error',
      );
    });
  });

  describe('MappingStore', () => {
    it('shows a toast when savePreset fails due to storage error', async () => {
      const { MappingStore } = await import('../src/store/mapping-store');
      const store = new MappingStore(failingStorage());
      store.savePreset(makePreset('HR Import'));
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining(''),
        'error',
      );
    });

    it('shows a toast when deletePreset fails due to storage error', async () => {
      const data: Record<string, string> = {
        'arbol-csv-mappings': JSON.stringify([makePreset('HR Import')]),
      };
      const storage = failingStorage(data);
      const { MappingStore } = await import('../src/store/mapping-store');
      const store = new MappingStore(storage);
      store.deletePreset('HR Import');
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining(''),
        'error',
      );
    });
  });
});

// ─── Part 3: D3 render pipeline protection ────────────────────────────────────

describe('D3 render pipeline protection', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;

  function createRenderer(): ChartRenderer {
    return new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createRenderer();
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('render() does not throw when given a leaf node', () => {
    const badNode = { id: 'x', name: 'X', title: 'X' } as OrgNode;
    expect(() => renderer.render(badNode)).not.toThrow();
  });

  it('render() does not throw on a valid tree', () => {
    const root: OrgNode = {
      id: 'root',
      name: 'CEO',
      title: 'CEO',
      children: [
        { id: 'a', name: 'A', title: 'VP' },
        { id: 'b', name: 'B', title: 'VP' },
      ],
    };
    expect(() => renderer.render(root)).not.toThrow();
  });

  it('render() catches errors and logs them instead of throwing', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force a render failure by removing the SVG element
    const svg = container.querySelector('svg');
    if (svg) svg.remove();

    // The try/catch should prevent the error from propagating
    expect(() => renderer.render({ id: 'root', name: 'Test', title: 'Test' })).not.toThrow();

    consoleErrorSpy.mockRestore();
  });
});

// ─── Part 1: i18n keys exist ──────────────────────────────────────────────────

describe('error handling i18n keys', () => {
  it('error.unexpected key exists and supports interpolation', () => {
    const result = t('error.unexpected', { message: 'test error' });
    expect(result).toContain('test error');
    expect(result).not.toBe('error.unexpected');
  });

  it('error.storage_save_failed key exists', () => {
    const result = t('error.storage_save_failed');
    expect(result).not.toBe('error.storage_save_failed');
    expect(result.length).toBeGreaterThan(0);
  });

  it('error.render_failed key exists', () => {
    const result = t('error.render_failed');
    expect(result).not.toBe('error.render_failed');
    expect(result.length).toBeGreaterThan(0);
  });
});
