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
});
