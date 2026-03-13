import 'fake-indexeddb/auto';
import { ChartDB } from '../../src/store/chart-db';
import { ChartRecord, VersionRecord, OrgNode } from '../../src/types';

function makeTree(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: 'root-1',
    name: 'Alice',
    title: 'CEO',
    ...overrides,
  };
}

function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    id: 'chart-1',
    name: 'My Org',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    workingTree: makeTree(),
    categories: [],
    ...overrides,
  };
}

function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: 'ver-1',
    chartId: 'chart-1',
    name: 'v1',
    createdAt: '2025-01-01T00:00:00.000Z',
    tree: makeTree(),
    ...overrides,
  };
}

describe('ChartDB', () => {
  let db: ChartDB;

  beforeEach(async () => {
    db = new ChartDB();
    await db.open();
  });

  afterEach(() => {
    db.close();
    indexedDB.deleteDatabase('arbol-db');
  });

  describe('Database lifecycle', () => {
    it('opens the database without error', () => {
      // beforeEach already opened; reaching here means it succeeded
      expect(db).toBeDefined();
    });

    it('can close and reopen the database', async () => {
      const chart = makeChart();
      await db.putChart(chart);
      db.close();

      const db2 = new ChartDB();
      await db2.open();

      const retrieved = await db2.getChart(chart.id);
      expect(retrieved).toEqual(chart);
      db2.close();
    });
  });

  describe('Charts CRUD', () => {
    it('getAllCharts returns empty array when no charts exist', async () => {
      const charts = await db.getAllCharts();
      expect(charts).toEqual([]);
    });

    it('putChart stores a chart that can be retrieved with getChart', async () => {
      const chart = makeChart();
      await db.putChart(chart);

      const retrieved = await db.getChart(chart.id);
      expect(retrieved).toEqual(chart);
    });

    it('putChart updates an existing chart (same id)', async () => {
      const chart = makeChart();
      await db.putChart(chart);

      const updated = { ...chart, name: 'Updated Org', updatedAt: '2025-06-01T00:00:00.000Z' };
      await db.putChart(updated);

      const retrieved = await db.getChart(chart.id);
      expect(retrieved).toEqual(updated);
      expect(retrieved!.name).toBe('Updated Org');

      const all = await db.getAllCharts();
      expect(all).toHaveLength(1);
    });

    it('getAllCharts returns charts sorted by createdAt ascending', async () => {
      const oldest = makeChart({ id: 'c-old', name: 'Oldest', createdAt: '2025-01-01T00:00:00.000Z' });
      const middle = makeChart({ id: 'c-mid', name: 'Middle', createdAt: '2025-03-01T00:00:00.000Z' });
      const newest = makeChart({ id: 'c-new', name: 'Newest', createdAt: '2025-06-01T00:00:00.000Z' });

      await db.putChart(oldest);
      await db.putChart(middle);
      await db.putChart(newest);

      const charts = await db.getAllCharts();
      expect(charts).toHaveLength(3);
      expect(charts[0].id).toBe('c-old');
      expect(charts[1].id).toBe('c-mid');
      expect(charts[2].id).toBe('c-new');
    });

    it('getChart returns undefined for non-existent id', async () => {
      const result = await db.getChart('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('deleteChart removes the chart', async () => {
      const chart = makeChart();
      await db.putChart(chart);

      await db.deleteChart(chart.id);

      const retrieved = await db.getChart(chart.id);
      expect(retrieved).toBeUndefined();

      const all = await db.getAllCharts();
      expect(all).toEqual([]);
    });
  });

  describe('Chart-Version cascade', () => {
    it('deleteChart also deletes all versions belonging to that chart', async () => {
      const chart = makeChart({ id: 'chart-cascade' });
      await db.putChart(chart);

      const v1 = makeVersion({ id: 'v1', chartId: 'chart-cascade' });
      const v2 = makeVersion({ id: 'v2', chartId: 'chart-cascade' });
      await db.putVersion(v1);
      await db.putVersion(v2);

      await db.deleteChart('chart-cascade');

      const versions = await db.getVersionsByChart('chart-cascade');
      expect(versions).toEqual([]);
    });

    it('deleting a chart does not affect versions of other charts', async () => {
      const chartA = makeChart({ id: 'chart-a', name: 'Chart A' });
      const chartB = makeChart({ id: 'chart-b', name: 'Chart B' });
      await db.putChart(chartA);
      await db.putChart(chartB);

      const vA = makeVersion({ id: 'v-a', chartId: 'chart-a' });
      const vB = makeVersion({ id: 'v-b', chartId: 'chart-b' });
      await db.putVersion(vA);
      await db.putVersion(vB);

      await db.deleteChart('chart-a');

      const versionsB = await db.getVersionsByChart('chart-b');
      expect(versionsB).toHaveLength(1);
      expect(versionsB[0].id).toBe('v-b');
    });
  });

  describe('Versions CRUD', () => {
    it('getVersionsByChart returns empty array when no versions exist', async () => {
      const versions = await db.getVersionsByChart('chart-1');
      expect(versions).toEqual([]);
    });

    it('putVersion stores a version that can be retrieved with getVersion', async () => {
      const version = makeVersion();
      await db.putVersion(version);

      const retrieved = await db.getVersion(version.id);
      expect(retrieved).toEqual(version);
    });

    it('getVersionsByChart returns versions sorted by createdAt descending', async () => {
      const oldest = makeVersion({ id: 'v-old', chartId: 'chart-1', createdAt: '2025-01-01T00:00:00.000Z' });
      const middle = makeVersion({ id: 'v-mid', chartId: 'chart-1', createdAt: '2025-03-01T00:00:00.000Z' });
      const newest = makeVersion({ id: 'v-new', chartId: 'chart-1', createdAt: '2025-06-01T00:00:00.000Z' });

      await db.putVersion(oldest);
      await db.putVersion(middle);
      await db.putVersion(newest);

      const versions = await db.getVersionsByChart('chart-1');
      expect(versions).toHaveLength(3);
      expect(versions[0].id).toBe('v-new');
      expect(versions[1].id).toBe('v-mid');
      expect(versions[2].id).toBe('v-old');
    });

    it('getVersion returns undefined for non-existent id', async () => {
      const result = await db.getVersion('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('deleteVersion removes a single version', async () => {
      const v1 = makeVersion({ id: 'v1', chartId: 'chart-1' });
      const v2 = makeVersion({ id: 'v2', chartId: 'chart-1' });
      await db.putVersion(v1);
      await db.putVersion(v2);

      await db.deleteVersion('v1');

      const deleted = await db.getVersion('v1');
      expect(deleted).toBeUndefined();

      const remaining = await db.getVersion('v2');
      expect(remaining).toEqual(v2);
    });

    it('deleteVersionsByChart removes all versions for a chart', async () => {
      const vA1 = makeVersion({ id: 'v-a1', chartId: 'chart-a' });
      const vA2 = makeVersion({ id: 'v-a2', chartId: 'chart-a' });
      const vB1 = makeVersion({ id: 'v-b1', chartId: 'chart-b' });
      await db.putVersion(vA1);
      await db.putVersion(vA2);
      await db.putVersion(vB1);

      await db.deleteVersionsByChart('chart-a');

      const versionsA = await db.getVersionsByChart('chart-a');
      expect(versionsA).toEqual([]);

      const versionsB = await db.getVersionsByChart('chart-b');
      expect(versionsB).toHaveLength(1);
      expect(versionsB[0].id).toBe('v-b1');
    });
  });

  describe('error paths', () => {
    it('getAllCharts throws "Database not open" after close', () => {
      db.close();
      expect(() => db.getAllCharts()).toThrow('Database not open');
    });

    it('putChart throws "Database not open" after close', () => {
      db.close();
      expect(() => db.putChart(makeChart())).toThrow('Database not open');
    });

    it('putVersionsBatch resolves immediately for empty array', async () => {
      await expect(db.putVersionsBatch([])).resolves.toBeUndefined();
    });

    it('putVersionsBatch with multiple items writes them all', async () => {
      const versions = [
        makeVersion({ id: 'v-a', chartId: 'chart-1', name: 'Version A' }),
        makeVersion({ id: 'v-b', chartId: 'chart-1', name: 'Version B' }),
        makeVersion({ id: 'v-c', chartId: 'chart-1', name: 'Version C' }),
      ];
      await db.putVersionsBatch(versions);

      const stored = await db.getVersionsByChart('chart-1');
      expect(stored).toHaveLength(3);
      const ids = stored.map((v) => v.id).sort();
      expect(ids).toEqual(['v-a', 'v-b', 'v-c']);
    });
  });

  describe('Chart name uniqueness', () => {
    it('isChartNameTaken returns false when name is not taken', async () => {
      const result = await db.isChartNameTaken('Unused Name');
      expect(result).toBe(false);
    });

    it('isChartNameTaken returns true when name is already taken', async () => {
      await db.putChart(makeChart({ id: 'chart-1', name: 'My Org' }));

      const result = await db.isChartNameTaken('My Org');
      expect(result).toBe(true);
    });

    it('isChartNameTaken excludes the specified chart id from the check', async () => {
      await db.putChart(makeChart({ id: 'chart-1', name: 'My Org' }));

      const resultWithExclude = await db.isChartNameTaken('My Org', 'chart-1');
      expect(resultWithExclude).toBe(false);

      const resultWithoutExclude = await db.isChartNameTaken('My Org');
      expect(resultWithoutExclude).toBe(true);
    });
  });
});
