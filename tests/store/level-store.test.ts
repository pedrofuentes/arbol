import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelStore } from '../../src/store/level-store';
import type { ChartRecord, OrgNode } from '../../src/types';

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

    it('addMapping stores managerDisplayTitle when provided', () => {
      store.addMapping('L10', 'IC', 'Manager');
      const mapping = store.getMapping('L10');
      expect(mapping?.managerDisplayTitle).toBe('Manager');
    });

    it('addMapping omits managerDisplayTitle when not provided', () => {
      store.addMapping('L10', 'IC');
      const mapping = store.getMapping('L10');
      expect(mapping?.managerDisplayTitle).toBeUndefined();
    });

    it('addMapping validates managerDisplayTitle max length', () => {
      expect(() => store.addMapping('L10', 'IC', 'x'.repeat(101))).toThrow('managerDisplayTitle');
      expect(() => store.addMapping('L10', 'IC', 'x'.repeat(100))).not.toThrow();
    });

    it('addMapping trims managerDisplayTitle', () => {
      store.addMapping('L10', 'IC', '  Director  ');
      expect(store.getMapping('L10')?.managerDisplayTitle).toBe('Director');
    });

    it('addMapping ignores empty managerDisplayTitle', () => {
      store.addMapping('L10', 'IC', '   ');
      expect(store.getMapping('L10')?.managerDisplayTitle).toBeUndefined();
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
    it('default display mode is original', () => {
      expect(store.getDisplayMode()).toBe('original');
    });

    it('setDisplayMode changes mode', () => {
      store.setDisplayMode('mapped');
      expect(store.getDisplayMode()).toBe('mapped');
      store.setDisplayMode('original');
      expect(store.getDisplayMode()).toBe('original');
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

    it('resolve in original mode returns rawLevel as-is', () => {
      store.setDisplayMode('original');
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

    // resolveTitle tests
    it('resolveTitle returns undefined when mode is original', () => {
      store.setDisplayMode('original');
      expect(store.resolveTitle('L10')).toBeUndefined();
    });

    it('resolveTitle returns mapped title when mode is mapped', () => {
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('L10')).toBe('IC');
      expect(store.resolveTitle('E5')).toBe('Senior');
    });

    it('resolveTitle returns undefined when no mapping exists', () => {
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('UNKNOWN')).toBeUndefined();
    });

    it('resolveTitle returns undefined for undefined input', () => {
      store.setDisplayMode('mapped');
      expect(store.resolveTitle(undefined)).toBeUndefined();
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
      expect(csv).toBe('raw_level,display_title,manager_display_title\nL10,IC,\nE5,Senior,');
    });

    it('exportToCsv with no mappings returns header only', () => {
      expect(store.exportToCsv()).toBe('raw_level,display_title,manager_display_title');
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
      expect(store.getDisplayMode()).toBe('original');
    });

    it('loadFromChart replaces current state', () => {
      store.addMapping('L10', 'IC');
      store.setDisplayMode('mapped');

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
      store.setDisplayMode('mapped');
      const data = store.toChartData();
      expect(data).toEqual({
        levelMappings: [{ rawLevel: 'L10', displayTitle: 'IC' }],
        levelDisplayMode: 'mapped',
      });
    });

    it('loadFromChart then toChartData round-trips', () => {
      const chart = makeChart({
        levelMappings: [
          { rawLevel: 'L10', displayTitle: 'IC' },
          { rawLevel: 'E5', displayTitle: 'Senior' },
        ],
        levelDisplayMode: 'mapped',
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

  // ── Dual-track (Manager/IC) ────────────────────────────

  describe('Dual-track (Manager/IC)', () => {
    it('resolveTitle returns IC title when isManager is false', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('L20', false)).toBe('Principal Engineer');
    });

    it('resolveTitle returns manager title when isManager is true', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('L20', true)).toBe('Director');
    });

    it('resolveTitle falls back to IC title when no managerDisplayTitle', () => {
      store.addMapping('L20', 'Principal Engineer');
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('L20', true)).toBe('Principal Engineer');
    });

    it('resolveTitle returns IC title when isManager is undefined', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      store.setDisplayMode('mapped');
      expect(store.resolveTitle('L20')).toBe('Principal Engineer');
    });

    it('resolveTitle returns undefined in original mode regardless of isManager', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      expect(store.resolveTitle('L20', true)).toBeUndefined();
      expect(store.resolveTitle('L20', false)).toBeUndefined();
    });

    it('updateMapping can set managerDisplayTitle', () => {
      store.addMapping('L20', 'IC');
      store.updateMapping('L20', 'IC', 'Director');
      expect(store.getMapping('L20')!.managerDisplayTitle).toBe('Director');
    });

    it('updateMapping can clear managerDisplayTitle', () => {
      store.addMapping('L20', 'IC', 'Director');
      store.updateMapping('L20', 'IC', '');
      expect(store.getMapping('L20')!.managerDisplayTitle).toBeUndefined();
    });

    it('updateMapping preserves managerDisplayTitle when not passed', () => {
      store.addMapping('L20', 'IC', 'Director');
      store.updateMapping('L20', 'Senior');
      expect(store.getMapping('L20')!.managerDisplayTitle).toBe('Director');
    });

    it('replaceAll preserves managerDisplayTitle', () => {
      store.replaceAll([
        { rawLevel: 'L20', displayTitle: 'IC', managerDisplayTitle: 'Director' },
        { rawLevel: 'L21', displayTitle: 'Senior' },
      ]);
      expect(store.getMapping('L20')!.managerDisplayTitle).toBe('Director');
      expect(store.getMapping('L21')!.managerDisplayTitle).toBeUndefined();
    });
  });

  // ── CSV with dual-track ────────────────────────────────

  describe('CSV with dual-track', () => {
    it('exports 3-column CSV with manager title', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      store.addMapping('L21', 'Senior Engineer');
      const csv = store.exportToCsv();
      const lines = csv.split('\n');
      expect(lines[0]).toBe('raw_level,display_title,manager_display_title');
      expect(lines[1]).toBe('L20,Principal Engineer,Director');
      expect(lines[2]).toBe('L21,Senior Engineer,');
    });

    it('imports 3-column CSV', () => {
      const csv = 'raw_level,display_title,manager_display_title\nL20,IC,Director\nL21,Senior,';
      store.importFromCsv(csv);
      expect(store.getMapping('L20')!.managerDisplayTitle).toBe('Director');
      expect(store.getMapping('L21')!.managerDisplayTitle).toBeUndefined();
    });

    it('imports 2-column CSV (backward compatible)', () => {
      const csv = 'raw_level,display_title\nL20,IC\nL21,Senior';
      store.importFromCsv(csv);
      expect(store.getMapping('L20')!.displayTitle).toBe('IC');
      expect(store.getMapping('L20')!.managerDisplayTitle).toBeUndefined();
    });

    it('round-trips 3-column CSV', () => {
      store.addMapping('L20', 'Principal Engineer', 'Director');
      store.addMapping('L21', 'Senior');
      const csv = store.exportToCsv();

      const store2 = new LevelStore();
      store2.importFromCsv(csv);
      expect(store2.getMapping('L20')).toEqual(store.getMapping('L20'));
      expect(store2.getMapping('L21')).toEqual(store.getMapping('L21'));
    });

    it('CSV import clears managerDisplayTitle when 3rd column is empty', () => {
      store.addMapping('L20', 'IC', 'Director');
      store.importFromCsv('raw_level,display_title,manager_display_title\nL20,IC,');
      expect(store.getMapping('L20')!.managerDisplayTitle).toBeUndefined();
    });
  });

  // ── Chart integration with dual-track ──────────────────

  describe('Chart integration with dual-track', () => {
    it('loadFromChart preserves managerDisplayTitle', () => {
      const chart = makeChart({
        levelMappings: [
          { rawLevel: 'L20', displayTitle: 'IC', managerDisplayTitle: 'Director' },
        ],
      });
      store.loadFromChart(chart);
      expect(store.getMapping('L20')!.managerDisplayTitle).toBe('Director');
    });

    it('toChartData includes managerDisplayTitle', () => {
      store.addMapping('L20', 'IC', 'Director');
      const data = store.toChartData();
      expect(data.levelMappings[0].managerDisplayTitle).toBe('Director');
    });
  });
});
