import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { CategoryStore } from '../../src/store/category-store';
import { contrastingTextColor, contrastingTitleColor } from '../../src/utils/contrast';

const STORAGE_KEY = 'arbol-categories';

let setItemSpy: ReturnType<typeof vi.spyOn>;

vi.mock('../../src/utils/id', () => ({
  generateId: vi.fn(() => 'test-uuid-1234'),
}));

const DEFAULT_CATEGORIES = [
  {
    id: 'open-position',
    label: 'Open Position',
    color: '#fbbf24',
    nameColor: contrastingTextColor('#fbbf24'),
    titleColor: contrastingTitleColor('#fbbf24'),
  },
  {
    id: 'offer-pending',
    label: 'Offer Pending',
    color: '#60a5fa',
    nameColor: contrastingTextColor('#60a5fa'),
    titleColor: contrastingTitleColor('#60a5fa'),
  },
  {
    id: 'future-start',
    label: 'Future Start',
    color: '#a78bfa',
    nameColor: contrastingTextColor('#a78bfa'),
    titleColor: contrastingTitleColor('#a78bfa'),
  },
];

beforeAll(() => {
  setItemSpy = vi.spyOn(localStorage, 'setItem');
});

afterAll(() => {
  setItemSpy.mockRestore();
});

describe('CategoryStore', () => {
  let store: CategoryStore;

  beforeEach(() => {
    localStorage.clear();
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

      const result = store.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('custom-1');
      expect(result[0].nameColor).toBe(contrastingTextColor('#ff0000'));
      expect(result[0].titleColor).toBe(contrastingTitleColor('#ff0000'));
    });

    it('returns defaults when localStorage has invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{{not valid json');

      expect(store.getAll()).toEqual(DEFAULT_CATEGORIES);
    });

    it('returns defaults when localStorage has non-array data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'array' }));

      expect(store.getAll()).toEqual(DEFAULT_CATEGORIES);
    });

    it('default categories have correct ids, labels, and colors', () => {
      const categories = store.getAll();

      expect(categories[0]).toEqual({
        id: 'open-position',
        label: 'Open Position',
        color: '#fbbf24',
        nameColor: contrastingTextColor('#fbbf24'),
        titleColor: contrastingTitleColor('#fbbf24'),
      });
      expect(categories[1]).toEqual({
        id: 'offer-pending',
        label: 'Offer Pending',
        color: '#60a5fa',
        nameColor: contrastingTextColor('#60a5fa'),
        titleColor: contrastingTitleColor('#60a5fa'),
      });
      expect(categories[2]).toEqual({
        id: 'future-start',
        label: 'Future Start',
        color: '#a78bfa',
        nameColor: contrastingTextColor('#a78bfa'),
        titleColor: contrastingTitleColor('#a78bfa'),
      });
    });

    it('does not auto-save defaults to localStorage', () => {
      store.getAll();

      expect(setItemSpy).not.toHaveBeenCalled();
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

      expect(category).toEqual({
        id: 'test-uuid-1234',
        label: 'New Hire',
        color: '#00ff00',
        nameColor: contrastingTextColor('#00ff00'),
        titleColor: contrastingTitleColor('#00ff00'),
      });
    });

    it('saves to localStorage', () => {
      store.add('New Hire', '#00ff00');

      const stored = JSON.parse(setItemSpy.mock.calls[0][1] as string);
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

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
      const stored = JSON.parse(setItemSpy.mock.calls[0][1] as string);
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

      expect(setItemSpy).toHaveBeenCalled();
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

  describe('caching', () => {
    let getItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      getItemSpy = vi.spyOn(localStorage, 'getItem');
    });

    afterEach(() => {
      getItemSpy.mockRestore();
    });

    it('getAll reads from cache on second call', () => {
      store.getAll(); // populates cache
      getItemSpy.mockClear();

      store.getAll(); // should use cache
      expect(getItemSpy).not.toHaveBeenCalled();
    });

    it('add updates cache without re-reading storage', () => {
      store.add('New', '#ff0000');
      getItemSpy.mockClear();

      const all = store.getAll();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(all.find((c) => c.label === 'New')).toBeDefined();
    });

    it('update updates cache without re-reading storage', () => {
      store.update('open-position', { label: 'Vacant' });
      getItemSpy.mockClear();

      const all = store.getAll();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(all.find((c) => c.id === 'open-position')!.label).toBe('Vacant');
    });

    it('remove updates cache', () => {
      store.remove('open-position');
      getItemSpy.mockClear();

      const all = store.getAll();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(all.find((c) => c.id === 'open-position')).toBeUndefined();
    });

    it('replaceAll updates cache', () => {
      const custom = [
        { id: 'x', label: 'X', color: '#abcdef', nameColor: '#111111', titleColor: '#222222' },
      ];
      store.replaceAll(custom);
      getItemSpy.mockClear();

      const all = store.getAll();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('x');
    });

    it('invalidateCache forces next read from storage', () => {
      store.getAll(); // populates cache
      getItemSpy.mockClear();

      store.invalidateCache();
      store.getAll(); // should re-read from storage
      expect(getItemSpy).toHaveBeenCalled();
    });

    it('getAll returns copies so callers cannot mutate the cache', () => {
      const first = store.getAll();
      first[0].label = 'MUTATED';

      const second = store.getAll();
      expect(second[0].label).not.toBe('MUTATED');
    });
  });

  describe('text color auto-contrast', () => {
    it('add() auto-computes nameColor and titleColor from background', () => {
      const cat = store.add('Dark BG', '#1e293b');
      expect(cat.nameColor).toBe(contrastingTextColor('#1e293b'));
      expect(cat.titleColor).toBe(contrastingTitleColor('#1e293b'));
    });

    it('add() gives light text for dark backgrounds', () => {
      const cat = store.add('Dark', '#000000');
      expect(cat.nameColor).toBe('#ffffff');
      expect(cat.titleColor).toBe('#cbd5e1');
    });

    it('add() gives dark text for light backgrounds', () => {
      const cat = store.add('Light', '#ffffff');
      expect(cat.nameColor).toBe('#1e293b');
      expect(cat.titleColor).toBe('#475569');
    });

    it('update color recomputes text colors', () => {
      store.update('open-position', { color: '#000000' });
      const updated = store.getById('open-position')!;
      expect(updated.nameColor).toBe('#ffffff');
      expect(updated.titleColor).toBe('#cbd5e1');
    });

    it('update nameColor only does not recompute from background', () => {
      store.update('open-position', { nameColor: '#abcdef' });
      const updated = store.getById('open-position')!;
      expect(updated.nameColor).toBe('#abcdef');
    });

    it('update titleColor only does not recompute from background', () => {
      store.update('open-position', { titleColor: '#fedcba' });
      const updated = store.getById('open-position')!;
      expect(updated.titleColor).toBe('#fedcba');
    });

    it('update color + nameColor: color recomputes first, then nameColor overrides', () => {
      store.update('open-position', { color: '#000000', nameColor: '#abcdef' });
      const updated = store.getById('open-position')!;
      expect(updated.nameColor).toBe('#abcdef');
      expect(updated.titleColor).toBe('#cbd5e1');
    });

    it('throws on invalid nameColor format', () => {
      expect(() => store.update('open-position', { nameColor: 'bad' })).toThrow(
        'Invalid color format',
      );
    });

    it('throws on invalid titleColor format', () => {
      expect(() => store.update('open-position', { titleColor: 'bad' })).toThrow(
        'Invalid color format',
      );
    });

    it('migrates old categories without text colors on getAll()', () => {
      const legacy = [{ id: 'legacy', label: 'Legacy', color: '#ff0000' }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

      const result = store.getAll();
      expect(result[0].nameColor).toBe(contrastingTextColor('#ff0000'));
      expect(result[0].titleColor).toBe(contrastingTitleColor('#ff0000'));
    });

    it('preserves existing text colors from storage', () => {
      const stored = [
        { id: 'custom', label: 'Custom', color: '#ff0000', nameColor: '#111111', titleColor: '#222222' },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      const result = store.getAll();
      expect(result[0].nameColor).toBe('#111111');
      expect(result[0].titleColor).toBe('#222222');
    });

    it('default categories all have text colors', () => {
      const categories = store.getAll();
      for (const cat of categories) {
        expect(cat.nameColor).toBeDefined();
        expect(cat.titleColor).toBeDefined();
      }
    });
  });
});
