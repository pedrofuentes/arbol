import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsStore, PersistableSettings } from '../../src/store/settings-store';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const DEFAULTS: PersistableSettings = {
  nodeWidth: 160,
  nodeHeight: 34,
  horizontalSpacing: 50,
  branchSpacing: 20,
  topVerticalSpacing: 10,
  bottomVerticalSpacing: 20,
  icNodeWidth: 141,
  icGap: 6,
  icContainerPadding: 10,
  palTopGap: 12,
  palBottomGap: 12,
  palRowGap: 6,
  palCenterGap: 70,
  nameFontSize: 11,
  titleFontSize: 9,
  textPaddingTop: 6,
  textGap: 2,
  linkColor: '#94a3b8',
  linkWidth: 1.5,
  dottedLineDash: '6,4',
  cardFill: '#ffffff',
  cardStroke: '#22c55e',
  cardStrokeWidth: 1,
  icContainerFill: '#e5e7eb',
};

describe('SettingsStore', () => {
  let store: SettingsStore;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    store = new SettingsStore();
  });

  describe('save/load round-trip', () => {
    it('should save and load settings', () => {
      const custom: PersistableSettings = { ...DEFAULTS, nodeWidth: 200, cardFill: '#000000' };
      store.saveImmediate(custom);
      const loaded = store.load(DEFAULTS);
      expect(loaded.nodeWidth).toBe(200);
      expect(loaded.cardFill).toBe('#000000');
    });
  });

  describe('load', () => {
    it('returns defaults when nothing saved', () => {
      const loaded = store.load(DEFAULTS);
      expect(loaded).toEqual(DEFAULTS);
    });

    it('merges partial saved data with defaults', () => {
      store.saveImmediate({ nodeWidth: 999 });
      const loaded = store.load(DEFAULTS);
      expect(loaded.nodeWidth).toBe(999);
      expect(loaded.nodeHeight).toBe(DEFAULTS.nodeHeight);
      expect(loaded.linkColor).toBe(DEFAULTS.linkColor);
    });

    it('returns defaults when localStorage contains invalid JSON', () => {
      localStorageMock.setItem('arbol-settings', 'not-json');
      const loaded = store.load(DEFAULTS);
      expect(loaded).toEqual(DEFAULTS);
    });
  });

  describe('hasSaved', () => {
    it('returns false when no settings saved', () => {
      expect(store.hasSaved()).toBe(false);
    });

    it('returns true after saving settings', () => {
      store.saveImmediate(DEFAULTS);
      expect(store.hasSaved()).toBe(true);
    });
  });

  describe('clear', () => {
    it('removes saved settings', () => {
      store.saveImmediate(DEFAULTS);
      expect(store.hasSaved()).toBe(true);
      store.clear();
      expect(store.hasSaved()).toBe(false);
    });
  });

  describe('debounce behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('save() is debounced at 300ms', () => {
      store.save({ nodeWidth: 50 });
      store.save({ nodeWidth: 100 });
      store.save({ nodeWidth: 150 });

      // Nothing written yet
      expect(store.hasSaved()).toBe(false);

      vi.advanceTimersByTime(300);

      const loaded = store.load(DEFAULTS);
      expect(loaded.nodeWidth).toBe(150);
    });

    it('save() resets timer on each call', () => {
      store.save({ nodeWidth: 50 });
      vi.advanceTimersByTime(200);
      store.save({ nodeWidth: 100 });
      vi.advanceTimersByTime(200);

      // 400ms total but timer reset, so not yet written
      expect(store.hasSaved()).toBe(false);

      vi.advanceTimersByTime(100);

      const loaded = store.load(DEFAULTS);
      expect(loaded.nodeWidth).toBe(100);
    });
  });

  describe('saveImmediate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('bypasses debounce and writes immediately', () => {
      store.save({ nodeWidth: 50 });
      // Pending debounce, not yet saved
      expect(store.hasSaved()).toBe(false);

      store.saveImmediate({ nodeWidth: 200 });
      const loaded = store.load(DEFAULTS);
      expect(loaded.nodeWidth).toBe(200);
    });

    it('cancels pending debounced save', () => {
      store.save({ nodeWidth: 50 });
      store.saveImmediate({ nodeWidth: 200 });

      vi.advanceTimersByTime(500);

      const loaded = store.load(DEFAULTS);
      // Should be 200, not overwritten by the debounced 50
      expect(loaded.nodeWidth).toBe(200);
    });
  });

  describe('createExport', () => {
    it('includes version, timestamp, name, and settings', () => {
      const exp = store.createExport(DEFAULTS, 'my-theme');
      expect(exp.version).toBe(1);
      expect(exp.name).toBe('my-theme');
      expect(exp.timestamp).toBeTruthy();
      expect(new Date(exp.timestamp).getTime()).not.toBeNaN();
      expect(exp.settings).toEqual(DEFAULTS);
    });

    it('uses default name when none provided', () => {
      const exp = store.createExport(DEFAULTS);
      expect(exp.name).toBe('arbol-settings');
    });
  });

  describe('parseImport', () => {
    it('parses valid export JSON', () => {
      const exp = store.createExport(DEFAULTS, 'test');
      const json = JSON.stringify(exp);
      const result = store.parseImport(json);
      expect(result).toEqual(DEFAULTS);
    });

    it('throws on invalid JSON', () => {
      expect(() => store.parseImport('not json')).toThrow('Invalid JSON');
    });

    it('throws on missing settings field', () => {
      const json = JSON.stringify({ version: 1 });
      expect(() => store.parseImport(json)).toThrow('missing "settings"');
    });

    it('throws on missing version field', () => {
      const json = JSON.stringify({ settings: DEFAULTS });
      expect(() => store.parseImport(json)).toThrow('missing "version"');
    });

    it('throws on missing individual setting', () => {
      const partial = { ...DEFAULTS } as Record<string, unknown>;
      delete partial.nodeWidth;
      const json = JSON.stringify({ version: 1, settings: partial });
      expect(() => store.parseImport(json)).toThrow('missing setting "nodeWidth"');
    });

    it('throws on invalid numeric value', () => {
      const bad = { ...DEFAULTS, nodeWidth: 'not-a-number' };
      const json = JSON.stringify({ version: 1, settings: bad });
      expect(() => store.parseImport(json)).toThrow('expected a finite number');
    });

    it('throws on invalid string value', () => {
      const bad = { ...DEFAULTS, linkColor: 42 };
      const json = JSON.stringify({ version: 1, settings: bad });
      expect(() => store.parseImport(json)).toThrow('expected a string');
    });

    it('handles different version gracefully (still parses if structure valid)', () => {
      const exp = store.createExport(DEFAULTS, 'test');
      exp.version = 99;
      const json = JSON.stringify(exp);
      const result = store.parseImport(json);
      expect(result).toEqual(DEFAULTS);
    });
  });

  describe('importFromFile', () => {
    it('parses JSON and saves to localStorage', () => {
      const exp = store.createExport(DEFAULTS, 'imported');
      const json = JSON.stringify(exp);
      const result = store.importFromFile(json);
      expect(result).toEqual(DEFAULTS);
      expect(store.hasSaved()).toBe(true);
      expect(store.load(DEFAULTS)).toEqual(DEFAULTS);
    });
  });
});
