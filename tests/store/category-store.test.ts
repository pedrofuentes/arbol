import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryStore } from '../../src/store/category-store';

const STORAGE_KEY = 'arbol-categories';

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

vi.mock('../../src/utils/id', () => ({
  generateId: vi.fn(() => 'test-uuid-1234'),
}));

const DEFAULT_CATEGORIES = [
  { id: 'open-position', label: 'Open Position', color: '#fbbf24' },
  { id: 'offer-pending', label: 'Offer Pending', color: '#60a5fa' },
  { id: 'future-start', label: 'Future Start', color: '#a78bfa' },
];

describe('CategoryStore', () => {
  let store: CategoryStore;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    store = new CategoryStore();
  });

  describe('getAll', () => {
    it('returns default categories when localStorage is empty', () => {
      const categories = store.getAll();
      expect(categories).toEqual(DEFAULT_CATEGORIES);
    });

    it('returns stored categories when localStorage has data', () => {
      const custom = [{ id: 'custom-1', label: 'Custom', color: '#ff0000' }];
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(custom));

      expect(store.getAll()).toEqual(custom);
    });

    it('returns defaults when localStorage has invalid JSON', () => {
      localStorageMock.setItem(STORAGE_KEY, '{{not valid json');

      expect(store.getAll()).toEqual(DEFAULT_CATEGORIES);
    });

    it('returns defaults when localStorage has non-array data', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ not: 'array' }));

      expect(store.getAll()).toEqual(DEFAULT_CATEGORIES);
    });

    it('default categories have correct ids, labels, and colors', () => {
      const categories = store.getAll();

      expect(categories[0]).toEqual({
        id: 'open-position',
        label: 'Open Position',
        color: '#fbbf24',
      });
      expect(categories[1]).toEqual({
        id: 'offer-pending',
        label: 'Offer Pending',
        color: '#60a5fa',
      });
      expect(categories[2]).toEqual({
        id: 'future-start',
        label: 'Future Start',
        color: '#a78bfa',
      });
    });

    it('does not auto-save defaults to localStorage', () => {
      store.getAll();

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('finds existing category by id', () => {
      const category = store.getById('open-position');

      expect(category).toBeDefined();
      expect(category!.label).toBe('Open Position');
      expect(category!.color).toBe('#fbbf24');
    });

    it('returns undefined for unknown id', () => {
      expect(store.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('creates a new category with generated id', () => {
      const category = store.add('New Hire', '#00ff00');

      expect(category).toEqual({ id: 'test-uuid-1234', label: 'New Hire', color: '#00ff00' });
    });

    it('saves to localStorage', () => {
      store.add('New Hire', '#00ff00');

      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(4); // 3 defaults + 1 new
      expect(stored[3].label).toBe('New Hire');
    });

    it('emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.add('New Hire', '#00ff00');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws on empty label', () => {
      expect(() => store.add('', '#00ff00')).toThrow('label must not be empty');
      expect(() => store.add('   ', '#00ff00')).toThrow('label must not be empty');
    });

    it('throws on invalid color format', () => {
      expect(() => store.add('Test', 'not-a-color')).toThrow('Invalid color format');
      expect(() => store.add('Test', '#gggggg')).toThrow('Invalid color format');
      expect(() => store.add('Test', 'ff0000')).toThrow('Invalid color format');
    });

    it('trims the label', () => {
      const category = store.add('  Padded Label  ', '#ff0000');
      expect(category.label).toBe('Padded Label');
    });

    it('accepts 3-digit hex colors', () => {
      const category = store.add('Short Hex', '#f00');
      expect(category.color).toBe('#f00');
    });
  });

  describe('update', () => {
    it('updates label only', () => {
      store.update('open-position', { label: 'Vacant' });

      const updated = store.getById('open-position');
      expect(updated!.label).toBe('Vacant');
      expect(updated!.color).toBe('#fbbf24');
    });

    it('updates color only', () => {
      store.update('open-position', { color: '#ff0000' });

      const updated = store.getById('open-position');
      expect(updated!.label).toBe('Open Position');
      expect(updated!.color).toBe('#ff0000');
    });

    it('updates both label and color', () => {
      store.update('open-position', { label: 'Vacant', color: '#ff0000' });

      const updated = store.getById('open-position');
      expect(updated!.label).toBe('Vacant');
      expect(updated!.color).toBe('#ff0000');
    });

    it('throws when category not found', () => {
      expect(() => store.update('nonexistent', { label: 'Test' })).toThrow('Category not found');
    });

    it('emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.update('open-position', { label: 'Vacant' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws on invalid color format', () => {
      expect(() => store.update('open-position', { color: 'bad' })).toThrow('Invalid color format');
    });

    it('throws on empty label', () => {
      expect(() => store.update('open-position', { label: '' })).toThrow('label must not be empty');
      expect(() => store.update('open-position', { label: '   ' })).toThrow(
        'label must not be empty',
      );
    });

    it('saves to localStorage', () => {
      store.update('open-position', { label: 'Vacant' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      const updated = stored.find((c: { id: string }) => c.id === 'open-position');
      expect(updated.label).toBe('Vacant');
    });
  });

  describe('remove', () => {
    it('removes existing category', () => {
      store.remove('open-position');

      const categories = store.getAll();
      expect(categories.find((c) => c.id === 'open-position')).toBeUndefined();
      expect(categories).toHaveLength(2);
    });

    it('emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.remove('open-position');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('no error when removing non-existent category (idempotent)', () => {
      expect(() => store.remove('nonexistent')).not.toThrow();
    });

    it('saves to localStorage', () => {
      store.remove('open-position');

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    it('listener is called on add', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.add('Test', '#ff0000');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('listener is called on update', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.update('open-position', { label: 'Vacant' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('listener is called on remove', () => {
      const listener = vi.fn();
      store.onChange(listener);

      store.remove('open-position');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe function works', () => {
      const listener = vi.fn();
      const unsubscribe = store.onChange(listener);

      store.add('Test1', '#ff0000');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      store.add('Test2', '#00ff00');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('multiple listeners are notified', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store.onChange(listener1);
      store.onChange(listener2);

      store.add('Test', '#ff0000');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});
