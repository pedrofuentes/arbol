import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MappingStore } from '../../src/store/mapping-store';
import type { ColumnMapping, MappingPreset } from '../../src/types';

const STORAGE_KEY = 'chartit-csv-mappings';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const validMapping: ColumnMapping = {
  name: 'employee_name',
  title: 'job_title',
  parentRef: 'supervisor',
  parentRefType: 'name',
};

function makePreset(name: string, mapping = validMapping): MappingPreset {
  return { name, mapping };
}

describe('MappingStore', () => {
  let store: MappingStore;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    store = new MappingStore();
  });

  describe('getPresets', () => {
    it('returns empty array when no presets saved', () => {
      expect(store.getPresets()).toEqual([]);
    });
  });

  describe('savePreset', () => {
    it('saves a preset that can be retrieved with getPresets', () => {
      store.savePreset(makePreset('HR Import'));
      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('HR Import');
      expect(presets[0].mapping).toEqual(validMapping);
    });

    it('updates existing preset when saving with same name', () => {
      store.savePreset(makePreset('HR Import'));
      const updatedMapping: ColumnMapping = {
        ...validMapping,
        name: 'full_name',
      };
      store.savePreset(makePreset('HR Import', updatedMapping));

      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].mapping.name).toBe('full_name');
    });

    it('throws when preset name is empty', () => {
      expect(() => store.savePreset(makePreset(''))).toThrow();
      expect(() => store.savePreset(makePreset('  '))).toThrow();
    });

    it('throws when required mapping fields are empty', () => {
      expect(() =>
        store.savePreset(makePreset('test', { ...validMapping, name: '' })),
      ).toThrow();
      expect(() =>
        store.savePreset(makePreset('test', { ...validMapping, title: '' })),
      ).toThrow();
      expect(() =>
        store.savePreset(
          makePreset('test', { ...validMapping, parentRef: '' }),
        ),
      ).toThrow();
    });
  });

  describe('deletePreset', () => {
    it('removes a preset by name', () => {
      store.savePreset(makePreset('A'));
      store.savePreset(makePreset('B'));
      store.deletePreset('A');

      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('B');
    });

    it('is a no-op when preset name does not exist', () => {
      store.savePreset(makePreset('A'));
      store.deletePreset('nonexistent');
      expect(store.getPresets()).toHaveLength(1);
    });
  });

  describe('getPreset', () => {
    it('returns the correct preset by name', () => {
      store.savePreset(makePreset('Alpha'));
      store.savePreset(makePreset('Beta'));

      const preset = store.getPreset('Beta');
      expect(preset).toBeDefined();
      expect(preset!.name).toBe('Beta');
      expect(preset!.mapping).toEqual(validMapping);
    });

    it('returns undefined for unknown name', () => {
      expect(store.getPreset('nope')).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('presets survive creating a new MappingStore instance', () => {
      store.savePreset(makePreset('Persistent'));

      const store2 = new MappingStore();
      const presets = store2.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Persistent');
    });
  });

  describe('corrupted storage', () => {
    it('returns empty array when localStorage has invalid JSON', () => {
      localStorageMock.setItem(STORAGE_KEY, '{{not valid json!!!');
      expect(store.getPresets()).toEqual([]);
    });
  });

  describe('exportPresets', () => {
    const validPreset = {
      name: 'Test',
      mapping: { name: 'employee_name', title: 'job_title', parentRef: 'supervisor', parentRefType: 'name' as const },
    };

    it('returns "[]" when no presets exist', () => {
      expect(store.exportPresets()).toBe('[]');
    });

    it('exports all presets as pretty-printed JSON when called without args', () => {
      store.savePreset(makePreset('Alpha'));
      store.savePreset(makePreset('Beta'));

      const json = store.exportPresets();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Alpha');
      expect(parsed[1].name).toBe('Beta');
      // Pretty-printed: must contain newlines
      expect(json).toContain('\n');
    });

    it('exports only named presets when called with names array', () => {
      store.savePreset(makePreset('Alpha'));
      store.savePreset(makePreset('Beta'));
      store.savePreset(makePreset('Gamma'));

      const json = store.exportPresets(['Beta', 'Gamma']);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Beta');
      expect(parsed[1].name).toBe('Gamma');
    });

    it('returns "[]" when none of the specified names match', () => {
      store.savePreset(makePreset('Alpha'));

      expect(store.exportPresets(['NonExistent', 'Unknown'])).toBe('[]');
    });
  });

  describe('importPresets', () => {
    const validPreset = {
      name: 'Test',
      mapping: { name: 'employee_name', title: 'job_title', parentRef: 'supervisor', parentRefType: 'name' as const },
    };

    it('imports valid presets and returns count', () => {
      const json = JSON.stringify([validPreset]);
      const count = store.importPresets(json);

      expect(count).toBe(1);
      expect(store.getPresets()).toHaveLength(1);
      expect(store.getPreset('Test')).toBeDefined();
      expect(store.getPreset('Test')!.mapping.name).toBe('employee_name');
    });

    it('upserts: importing a preset with same name as existing updates it', () => {
      store.savePreset(makePreset('Test'));
      expect(store.getPreset('Test')!.mapping.name).toBe('employee_name');

      const updated = {
        ...validPreset,
        mapping: { ...validPreset.mapping, name: 'full_name' },
      };
      store.importPresets(JSON.stringify([updated]));

      expect(store.getPresets()).toHaveLength(1);
      expect(store.getPreset('Test')!.mapping.name).toBe('full_name');
    });

    it('skips invalid entries but imports valid ones, returns count of valid only', () => {
      const json = JSON.stringify([
        validPreset,
        { name: 'Bad', mapping: {} },
        { name: '', mapping: validPreset.mapping },
        { ...validPreset, name: 'Also Good' },
      ]);
      const count = store.importPresets(json);

      expect(count).toBe(2);
      expect(store.getPresets()).toHaveLength(2);
      expect(store.getPreset('Test')).toBeDefined();
      expect(store.getPreset('Also Good')).toBeDefined();
    });

    it('throws on non-array JSON', () => {
      expect(() => store.importPresets('{}')).toThrow('expected an array');
    });

    it('throws on invalid JSON string', () => {
      expect(() => store.importPresets('not json')).toThrow();
    });
  });
});
