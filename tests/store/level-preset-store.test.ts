import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelPresetStore } from '../../src/store/level-preset-store';
import type { LevelMapping, LevelMappingPreset } from '../../src/types';

const STORAGE_KEY = 'arbol-level-presets';

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

function makeMappings(): LevelMapping[] {
  return [
    { rawLevel: 'L20', displayTitle: 'Principal Engineer', managerDisplayTitle: 'Director' },
    { rawLevel: 'L21', displayTitle: 'Senior Engineer' },
  ];
}

function makePreset(name: string, mappings = makeMappings()): LevelMappingPreset {
  return { name, levelMappings: mappings, levelDisplayMode: 'mapped' };
}

describe('LevelPresetStore', () => {
  let storage: ReturnType<typeof makeStorage>;
  let store: LevelPresetStore;

  beforeEach(() => {
    storage = makeStorage();
    store = new LevelPresetStore(storage);
  });

  describe('getPresets', () => {
    it('returns empty array when nothing saved', () => {
      expect(store.getPresets()).toEqual([]);
    });

    it('returns copies, not references', () => {
      store.savePreset(makePreset('A'));
      const first = store.getPresets();
      const second = store.getPresets();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(first[0]).not.toBe(second[0]);
    });

    it('handles corrupt localStorage gracefully', () => {
      storage.setItem(STORAGE_KEY, '{{not valid json!!!');
      expect(store.getPresets()).toEqual([]);
    });
  });

  describe('savePreset', () => {
    it('stores and retrieves a preset', () => {
      store.savePreset(makePreset('Engineering Levels'));
      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Engineering Levels');
      expect(presets[0].levelMappings).toEqual(makeMappings());
    });

    it('overwrites existing preset with same name', () => {
      store.savePreset(makePreset('Eng'));
      const updated: LevelMapping[] = [
        { rawLevel: 'L30', displayTitle: 'Staff Engineer' },
      ];
      store.savePreset(makePreset('Eng', updated));

      const presets = store.getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].levelMappings).toEqual(updated);
    });

    it('emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.savePreset(makePreset('A'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws on empty name', () => {
      expect(() => store.savePreset(makePreset(''))).toThrow();
      expect(() => store.savePreset(makePreset('  '))).toThrow();
    });

    it('throws on empty levelMappings array', () => {
      expect(() => store.savePreset(makePreset('Bad', []))).toThrow();
    });

    it('validates mappings have rawLevel and displayTitle', () => {
      expect(() =>
        store.savePreset(
          makePreset('Bad', [{ rawLevel: '', displayTitle: 'Engineer' }]),
        ),
      ).toThrow();
      expect(() =>
        store.savePreset(
          makePreset('Bad', [{ rawLevel: 'L10', displayTitle: '' }]),
        ),
      ).toThrow();
    });

    it('preserves levelDisplayMode', () => {
      const preset: LevelMappingPreset = {
        name: 'Original Mode',
        levelMappings: makeMappings(),
        levelDisplayMode: 'original',
      };
      store.savePreset(preset);
      expect(store.getPreset('Original Mode')!.levelDisplayMode).toBe('original');
    });

    it('preserves managerDisplayTitle on mappings', () => {
      store.savePreset(makePreset('WithManager'));
      const preset = store.getPreset('WithManager')!;
      expect(preset.levelMappings[0].managerDisplayTitle).toBe('Director');
      expect(preset.levelMappings[1].managerDisplayTitle).toBeUndefined();
    });
  });

  describe('getPreset', () => {
    it('returns a single preset by name', () => {
      store.savePreset(makePreset('Alpha'));
      store.savePreset(makePreset('Beta'));

      const preset = store.getPreset('Beta');
      expect(preset).toBeDefined();
      expect(preset!.name).toBe('Beta');
      expect(preset!.levelMappings).toEqual(makeMappings());
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
