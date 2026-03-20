import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelStore } from '../../src/store/level-store';
import type { ChartRecord, OrgNode } from '../../src/types';

const SEPARATOR = ' \u2014 '; // em dash with spaces

function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  const tree: OrgNode = { id: 'root', name: 'Root', title: 'CEO' };
  return {
    id: 'chart-1',
    name: 'Test Chart',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    workingTree: tree,
    categories: [],
    ...overrides,
  };
}

describe('LevelStore', () => {
  let store: LevelStore;

  beforeEach(() => {
    store = new LevelStore();
  });

  // ── CRUD ──────────────────────────────────────────────

  describe('CRUD', () => {
    it('starts with empty mappings', () => {
      expect(store.getMappings()).toEqual([]);
    });

    it('addMapping adds a new mapping', () => {
      store.addMapping('L10', 'IC');
      expect(store.getMappings()).toEqual([{ rawLevel: 'L10', displayTitle: 'IC' }]);
    });

    it('addMapping throws on empty rawLevel', () => {
      expect(() => store.addMapping('', 'IC')).toThrow();
      expect(() => store.addMapping('   ', 'IC')).toThrow();
    });

    it('addMapping throws on empty displayTitle', () => {
      expect(() => store.addMapping('L10', '')).toThrow();
      expect(() => store.addMapping('L10', '   ')).toThrow();
    });

    it('addMapping throws on duplicate rawLevel', () => {
      store.addMapping('L10', 'IC');
      expect(() => store.addMapping('L10', 'Senior')).toThrow();
    });

    it('addMapping validates max length (50 chars rawLevel, 100 chars displayTitle)', () => {
      expect(() => store.addMapping('x'.repeat(51), 'IC')).toThrow();
      expect(() => store.addMapping('L10', 'x'.repeat(101))).toThrow();
      // at the limit should be fine
      expect(() => store.addMapping('x'.repeat(50), 'x'.repeat(100))).not.toThrow();
    });

    it('getMapping returns existing mapping', () => {
      store.addMapping('L10', 'IC');
      const m = store.getMapping('L10');
      expect(m).toEqual({ rawLevel: 'L10', displayTitle: 'IC' });
    });

    it('getMapping returns undefined for non-existent', () => {
      expect(store.getMapping('L99')).toBeUndefined();
    });

    it('getMappings returns copies (not references)', () => {
      store.addMapping('L10', 'IC');
      const first = store.getMappings();
      first[0].displayTitle = 'MUTATED';
      const second = store.getMappings();
      expect(second[0].displayTitle).toBe('IC');
    });

    it('updateMapping changes displayTitle', () => {
      store.addMapping('L10', 'IC');
      store.updateMapping('L10', 'Senior');
      expect(store.getMapping('L10')!.displayTitle).toBe('Senior');
    });

    it('updateMapping throws if rawLevel not found', () => {
      expect(() => store.updateMapping('L99', 'IC')).toThrow();
    });

    it('removeMapping removes by rawLevel', () => {
      store.addMapping('L10', 'IC');
      store.removeMapping('L10');
      expect(store.getMappings()).toEqual([]);
    });

    it('removeMapping is no-op for non-existent rawLevel', () => {
      store.addMapping('L10', 'IC');
      store.removeMapping('L99');
      expect(store.getMappings()).toHaveLength(1);
    });

    it('replaceAll replaces entire array', () => {
      store.addMapping('L10', 'IC');
      store.replaceAll([
        { rawLevel: 'E5', displayTitle: 'Senior' },
        { rawLevel: 'E6', displayTitle: 'Staff' },
      ]);
      expect(store.getMappings()).toHaveLength(2);
      expect(store.getMapping('L10')).toBeUndefined();
      expect(store.getMapping('E5')!.displayTitle).toBe('Senior');
    });

    it('replaceAll validates no duplicate rawLevels', () => {
      expect(() =>
        store.replaceAll([
          { rawLevel: 'L10', displayTitle: 'IC' },
          { rawLevel: 'L10', displayTitle: 'Senior' },
        ]),
      ).toThrow();
    });
  });

  // ── Display Mode ──────────────────────────────────────

  describe('Display Mode', () => {
    it('default display mode is raw', () => {
      expect(store.getDisplayMode()).toBe('raw');
    });

    it('setDisplayMode changes mode', () => {
      store.setDisplayMode('mapped');
      expect(store.getDisplayMode()).toBe('mapped');
      store.setDisplayMode('both');
      expect(store.getDisplayMode()).toBe('both');
      store.setDisplayMode('raw');
      expect(store.getDisplayMode()).toBe('raw');
    });

    it('setDisplayMode throws on invalid mode', () => {
      expect(() => store.setDisplayMode('invalid' as any)).toThrow();
    });
  });

  // ── Resolution ────────────────────────────────────────

  describe('Resolution', () => {
    beforeEach(() => {
      store.addMapping('L10', 'IC');
      store.addMapping('E5', 'Senior');
    });

    it('resolve returns empty string for undefined', () => {
      expect(store.resolve(undefined)).toBe('');
    });

    it('resolve returns empty string for empty string', () => {
      expect(store.resolve('')).toBe('');
    });

    it('resolve in raw mode returns rawLevel as-is', () => {
      store.setDisplayMode('raw');
      expect(store.resolve('L10')).toBe('L10');
      expect(store.resolve('UNKNOWN')).toBe('UNKNOWN');
    });

    it('resolve in mapped mode returns displayTitle when mapping exists', () => {
      store.setDisplayMode('mapped');
      expect(store.resolve('L10')).toBe('IC');
      expect(store.resolve('E5')).toBe('Senior');
    });

    it('resolve in mapped mode returns rawLevel when no mapping exists', () => {
      store.setDisplayMode('mapped');
      expect(store.resolve('UNKNOWN')).toBe('UNKNOWN');
    });

    it('resolve in both mode returns "rawLevel — displayTitle" when mapping exists', () => {
      store.setDisplayMode('both');
      expect(store.resolve('L10')).toBe(`L10${SEPARATOR}IC`);
      expect(store.resolve('E5')).toBe(`E5${SEPARATOR}Senior`);
    });

    it('resolve in both mode returns rawLevel when no mapping exists', () => {
      store.setDisplayMode('both');
      expect(store.resolve('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  // ── CSV Import/Export ─────────────────────────────────

  describe('CSV Import/Export', () => {
    it('importFromCsv parses simple CSV', () => {
      const csv = 'raw_level,display_title\nL10,IC\nE5,Senior';
      store.importFromCsv(csv);
      expect(store.getMappings()).toEqual([
        { rawLevel: 'L10', displayTitle: 'IC' },
        { rawLevel: 'E5', displayTitle: 'Senior' },
      ]);
    });

    it('importFromCsv skips header row', () => {
      const csv = 'raw_level,display_title\nL10,IC';
      const count = store.importFromCsv(csv);
      expect(count).toBe(1);
      expect(store.getMappings()).toHaveLength(1);
    });

    it('importFromCsv returns count of imported mappings', () => {
      const csv = 'raw_level,display_title\nL10,IC\nE5,Senior\nE6,Staff';
      expect(store.importFromCsv(csv)).toBe(3);
    });

    it('importFromCsv replaces existing mappings with same rawLevel', () => {
      store.addMapping('L10', 'OldTitle');
      const csv = 'raw_level,display_title\nL10,NewTitle';
      store.importFromCsv(csv);
      expect(store.getMapping('L10')!.displayTitle).toBe('NewTitle');
    });

    it('importFromCsv handles empty CSV', () => {
      expect(store.importFromCsv('')).toBe(0);
      expect(store.getMappings()).toEqual([]);
    });

    it('importFromCsv handles CSV with blank lines', () => {
      const csv = 'raw_level,display_title\n\nL10,IC\n\nE5,Senior\n';
      expect(store.importFromCsv(csv)).toBe(2);
    });

    it('exportToCsv generates correct CSV', () => {
      store.addMapping('L10', 'IC');
      store.addMapping('E5', 'Senior');
      const csv = store.exportToCsv();
      expect(csv).toBe('raw_level,display_title\nL10,IC\nE5,Senior');
    });

    it('exportToCsv with no mappings returns header only', () => {
      expect(store.exportToCsv()).toBe('raw_level,display_title');
    });
  });

  // ── Chart Integration ─────────────────────────────────

  describe('Chart Integration', () => {
    it('loadFromChart loads mappings and mode', () => {
      const chart = makeChart({
        levelMappings: [{ rawLevel: 'L10', displayTitle: 'IC' }],
        levelDisplayMode: 'mapped',
      });
      store.loadFromChart(chart);
      expect(store.getMappings()).toEqual([{ rawLevel: 'L10', displayTitle: 'IC' }]);
      expect(store.getDisplayMode()).toBe('mapped');
    });

    it('loadFromChart handles chart with no mappings (undefined)', () => {
      const chart = makeChart();
      store.addMapping('L10', 'IC');
      store.loadFromChart(chart);
      expect(store.getMappings()).toEqual([]);
      expect(store.getDisplayMode()).toBe('raw');
    });

    it('loadFromChart replaces current state', () => {
      store.addMapping('L10', 'IC');
      store.setDisplayMode('both');

      const chart = makeChart({
        levelMappings: [{ rawLevel: 'E5', displayTitle: 'Senior' }],
        levelDisplayMode: 'mapped',
      });
      store.loadFromChart(chart);

      expect(store.getMappings()).toEqual([{ rawLevel: 'E5', displayTitle: 'Senior' }]);
      expect(store.getDisplayMode()).toBe('mapped');
    });

    it('toChartData returns current state', () => {
      store.addMapping('L10', 'IC');
      store.setDisplayMode('both');
      const data = store.toChartData();
      expect(data).toEqual({
        levelMappings: [{ rawLevel: 'L10', displayTitle: 'IC' }],
        levelDisplayMode: 'both',
      });
    });

    it('loadFromChart then toChartData round-trips', () => {
      const chart = makeChart({
        levelMappings: [
          { rawLevel: 'L10', displayTitle: 'IC' },
          { rawLevel: 'E5', displayTitle: 'Senior' },
        ],
        levelDisplayMode: 'both',
      });
      store.loadFromChart(chart);
      const data = store.toChartData();
      expect(data.levelMappings).toEqual(chart.levelMappings);
      expect(data.levelDisplayMode).toBe(chart.levelDisplayMode);
    });
  });

  // ── Events ────────────────────────────────────────────

  describe('Events', () => {
    it('addMapping emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.addMapping('L10', 'IC');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('updateMapping emits change event', () => {
      store.addMapping('L10', 'IC');
      const listener = vi.fn();
      store.onChange(listener);
      store.updateMapping('L10', 'Senior');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('removeMapping emits change event', () => {
      store.addMapping('L10', 'IC');
      const listener = vi.fn();
      store.onChange(listener);
      store.removeMapping('L10');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('replaceAll emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.replaceAll([{ rawLevel: 'L10', displayTitle: 'IC' }]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('setDisplayMode emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.setDisplayMode('mapped');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('loadFromChart emits change event', () => {
      const listener = vi.fn();
      store.onChange(listener);
      store.loadFromChart(makeChart());
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
