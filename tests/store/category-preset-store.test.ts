import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryPresetStore } from '../../src/store/category-preset-store';
import type { ColorCategory, CategoryPreset } from '../../src/types';

const STORAGE_KEY = 'arbol-category-presets';

function makeStorage() {
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
}

function makeCategories(): ColorCategory[] {
  return [
    { id: 'cat-1', label: 'Open Position', color: '#fbbf24' },
    { id: 'cat-2', label: 'Contractor', color: '#60a5fa' },
  ];
}

function makePreset(name: string, categories = makeCategories()): CategoryPreset {
  return { name, categories };
}

describe('CategoryPresetStore', () => {
  let storage: ReturnType<typeof makeStorage>;
  let store: CategoryPresetStore;

  beforeEach(() => {
    storage = makeStorage();
    store = new CategoryPresetStore(storage);
  });

  describe('getPresets', () => {
    it('returns empty array when nothing saved', () => {
      expect(store.getPresets()).toEqual([]);
    });

    it('returns copies, not references', () => {
      store.savePreset(makePreset('Theme A'));
      const first = store.getPresets();
      const second = store.getPresets();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });
  });

  describe('savePreset', () => {
    it('stores and retrieves a preset', () => {
      store.savePreset(makePreset('Theme A'));
      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Theme A');
      expect(presets[0].categories).toEqual(makeCategories());
    });

    it('overwrites existing preset with same name', () => {
      store.savePreset(makePreset('Theme A'));
      const updated: ColorCategory[] = [
        { id: 'cat-3', label: 'Executive', color: '#f43f5e' },
      ];
      store.savePreset(makePreset('Theme A', updated));

      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].categories).toEqual(updated);
    });

    it('emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.savePreset(makePreset('Theme A'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws on empty name', () => {
      expect(() => store.savePreset(makePreset(''))).toThrow();
      expect(() => store.savePreset(makePreset('  '))).toThrow();
    });

    it('throws on empty categories array', () => {
      expect(() => store.savePreset(makePreset('Theme A', []))).toThrow();
    });

    it('validates categories have id, label, color', () => {
      const bad1: ColorCategory[] = [{ id: '', label: 'X', color: '#000' }];
      const bad2: ColorCategory[] = [{ id: 'x', label: '', color: '#000' }];
      const bad3: ColorCategory[] = [{ id: 'x', label: 'X', color: '' }];
      expect(() => store.savePreset(makePreset('A', bad1))).toThrow();
      expect(() => store.savePreset(makePreset('A', bad2))).toThrow();
      expect(() => store.savePreset(makePreset('A', bad3))).toThrow();
    });
  });

  describe('getPreset', () => {
    it('returns a single preset by name', () => {
      store.savePreset(makePreset('Alpha'));
      store.savePreset(makePreset('Beta'));

      const preset = store.getPreset('Beta');
      expect(preset).toBeDefined();
      expect(preset!.name).toBe('Beta');
      expect(preset!.categories).toEqual(makeCategories());
    });

    it('returns undefined for non-existent name', () => {
      expect(store.getPreset('nope')).toBeUndefined();
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

    it('is no-op for non-existent name', () => {
      store.savePreset(makePreset('A'));
      store.deletePreset('nonexistent');
      expect(store.getPresets()).toHaveLength(1);
    });

    it('emits change event', () => {
      store.savePreset(makePreset('A'));
      const listener = vi.fn();
      store.onChange(listener);
      store.deletePreset('A');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('corrupted storage', () => {
    it('returns empty array when storage has invalid JSON', () => {
      storage.setItem(STORAGE_KEY, '{{not valid json!!!');
      expect(store.getPresets()).toEqual([]);
    });

    it('returns empty array when storage has non-array JSON', () => {
      storage.setItem(STORAGE_KEY, '{"not": "array"}');
      expect(store.getPresets()).toEqual([]);
    });
  });

  describe('change events', () => {
    it('does not emit after unsubscribe', () => {
      const listener = vi.fn();
      const unsub = store.onChange(listener);
      unsub();
      store.savePreset(makePreset('A'));
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
