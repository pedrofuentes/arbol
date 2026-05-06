import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreFullReplace,
  restoreMerge,
  getBackupSummary,
  type ArbolBackup,
} from '../../src/store/backup-manager';
import type { ChartDB } from '../../src/store/chart-db';
import type { ChartRecord, VersionRecord } from '../../src/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

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
    _getStore: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function makeChart(id: string, name: string): ChartRecord {
  return {
    id,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    workingTree: { id: 'root', name: 'Root', title: 'CEO' },
    categories: [],
  };
}

function makeVersion(id: string, chartId: string): VersionRecord {
  return {
    id,
    chartId,
    name: `Version ${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    tree: { id: 'root', name: 'Root', title: 'CEO' },
  };
}

function createMockDB(charts: ChartRecord[] = [], versions: VersionRecord[] = []): ChartDB {
  const chartsMap = new Map(charts.map((c) => [c.id, { ...c }]));
  const versionsMap = new Map(versions.map((v) => [v.id, { ...v }]));

  return {
    getAllCharts: vi.fn(async () => [...chartsMap.values()]),
    getChart: vi.fn(async (id: string) => chartsMap.get(id)),
    putChart: vi.fn(async (chart: ChartRecord) => {
      chartsMap.set(chart.id, chart);
    }),
    deleteChart: vi.fn(async (id: string) => {
      chartsMap.delete(id);
      for (const [vid, v] of versionsMap) {
        if (v.chartId === id) versionsMap.delete(vid);
      }
    }),
    getVersionsByChart: vi.fn(async (chartId: string) =>
      [...versionsMap.values()].filter((v) => v.chartId === chartId),
    ),
    putVersion: vi.fn(async (version: VersionRecord) => {
      versionsMap.set(version.id, version);
    }),
    deleteVersion: vi.fn(async (id: string) => {
      versionsMap.delete(id);
    }),
    _charts: chartsMap,
    _versions: versionsMap,
  } as unknown as ChartDB;
}

function makeValidBackup(overrides?: Partial<ArbolBackup>): ArbolBackup {
  return {
    formatVersion: 1,
    appVersion: '1.0.0',
    createdAt: '2026-03-13T00:00:00.000Z',
    data: {
      charts: [makeChart('c1', 'Chart One')],
      versions: [makeVersion('v1', 'c1')],
      settings: { version: 1, settings: { nodeWidth: 200 } },
      theme: 'dark',
      csvMappings: [{ name: 'Test', mapping: {} }],
      customPresets: null,
      accordionState: { presets: true },
    },
    ...overrides,
  };
}

function fileFromJSON(data: unknown, size?: number): File {
  const json = JSON.stringify(data);
  const file = new File([json], 'backup.json', { type: 'application/json' });
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BackupManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ── createBackup ─────────────────────────────────────────────────────────

  describe('createBackup', () => {
    it('collects all charts and versions from ChartDB', async () => {
      const charts = [makeChart('c1', 'Chart 1'), makeChart('c2', 'Chart 2')];
      const versions = [makeVersion('v1', 'c1'), makeVersion('v2', 'c1'), makeVersion('v3', 'c2')];
      const db = createMockDB(charts, versions);

      const backup = await createBackup(db);

      expect(backup.data.charts).toHaveLength(2);
      expect(backup.data.versions).toHaveLength(3);
      expect(backup.formatVersion).toBe(1);
      expect(backup.appVersion).toBeDefined();
      expect(backup.createdAt).toBeTruthy();
    });

    it('collects all localStorage keys', async () => {
      localStorageMock.setItem('arbol-settings', JSON.stringify({ version: 1, settings: {} }));
      localStorageMock.setItem('arbol-theme', 'dark');
      localStorageMock.setItem('arbol-csv-mappings', JSON.stringify([{ name: 'test' }]));
      localStorageMock.setItem('arbol-custom-presets', JSON.stringify([{ id: 'p1' }]));
      localStorageMock.setItem('arbol-accordion-state', JSON.stringify({ presets: true }));

      const db = createMockDB();
      const backup = await createBackup(db);

      expect(backup.data.settings).toEqual({ version: 1, settings: {} });
      expect(backup.data.theme).toBe('dark');
      expect(backup.data.csvMappings).toEqual([{ name: 'test' }]);
      expect(backup.data.customPresets).toEqual([{ id: 'p1' }]);
      expect(backup.data.accordionState).toEqual({ presets: true });
    });

    it('handles empty state gracefully', async () => {
      const db = createMockDB();
      const backup = await createBackup(db);

      expect(backup.data.charts).toHaveLength(0);
      expect(backup.data.versions).toHaveLength(0);
      expect(backup.data.settings).toBeNull();
      expect(backup.data.theme).toBeNull();
      expect(backup.data.csvMappings).toBeNull();
      expect(backup.data.customPresets).toBeNull();
      expect(backup.data.accordionState).toBeNull();
    });
  });

  // ── readBackupFile ───────────────────────────────────────────────────────

  describe('readBackupFile', () => {
    it('parses a valid backup file', async () => {
      const data = makeValidBackup();
      const file = fileFromJSON(data);

      const result = await readBackupFile(file);
      expect(result.formatVersion).toBe(1);
      expect(result.data.charts).toHaveLength(1);
    });

    it('rejects files over size limit', async () => {
      const file = fileFromJSON(makeValidBackup(), 51 * 1024 * 1024);
      await expect(readBackupFile(file)).rejects.toThrow('too large');
    });

    it('rejects invalid JSON', async () => {
      const file = new File(['not json{{{'], 'bad.json');
      await expect(readBackupFile(file)).rejects.toThrow('Invalid JSON');
    });

    it('rejects non-object JSON', async () => {
      const file = new File(['"just a string"'], 'bad.json');
      await expect(readBackupFile(file)).rejects.toThrow('expected a JSON object');
    });

    it('rejects missing formatVersion', async () => {
      const file = fileFromJSON({ data: { charts: [], versions: [] } });
      await expect(readBackupFile(file)).rejects.toThrow('missing formatVersion');
    });

    it('rejects future format versions', async () => {
      const file = fileFromJSON({ formatVersion: 999, data: { charts: [], versions: [] } });
      await expect(readBackupFile(file)).rejects.toThrow('newer app version');
    });

    it('rejects missing data section', async () => {
      const file = fileFromJSON({ formatVersion: 1 });
      await expect(readBackupFile(file)).rejects.toThrow('missing data section');
    });

    it('rejects missing charts array', async () => {
      const file = fileFromJSON({ formatVersion: 1, data: { versions: [] } });
      await expect(readBackupFile(file)).rejects.toThrow('missing charts array');
    });

    it('rejects missing versions array', async () => {
      const file = fileFromJSON({ formatVersion: 1, data: { charts: [] } });
      await expect(readBackupFile(file)).rejects.toThrow('missing versions array');
    });
  });

  // ── getBackupSummary ─────────────────────────────────────────────────────

  describe('getBackupSummary', () => {
    it('returns correct counts and metadata', () => {
      const backup = makeValidBackup();
      const summary = getBackupSummary(backup);

      expect(summary.chartCount).toBe(1);
      expect(summary.versionCount).toBe(1);
      expect(summary.appVersion).toBe('1.0.0');
      expect(summary.createdAt).toBe('2026-03-13T00:00:00.000Z');
    });

    it('handles empty backup', () => {
      const backup = makeValidBackup({
        data: {
          charts: [],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });
      const summary = getBackupSummary(backup);
      expect(summary.chartCount).toBe(0);
      expect(summary.versionCount).toBe(0);
    });
  });

  // ── restoreFullReplace ───────────────────────────────────────────────────

  describe('restoreFullReplace', () => {
    it('clears existing data and writes backup', async () => {
      const existingCharts = [makeChart('existing-1', 'Old')];
      const db = createMockDB(existingCharts);

      const backup = makeValidBackup();
      await restoreFullReplace(db, backup);

      expect(db.deleteChart).toHaveBeenCalledWith('existing-1');
      expect(db.putChart).toHaveBeenCalledWith(backup.data.charts[0]);
      expect(db.putVersion).toHaveBeenCalledWith(backup.data.versions[0]);
    });

    it('writes all localStorage keys from backup', async () => {
      const db = createMockDB();
      const backup = makeValidBackup();
      await restoreFullReplace(db, backup);

      const store = localStorageMock._getStore();
      expect(JSON.parse(store['arbol-settings'])).toEqual(backup.data.settings);
      expect(store['arbol-theme']).toBe('dark');
      expect(JSON.parse(store['arbol-csv-mappings'])).toEqual(backup.data.csvMappings);
      expect(JSON.parse(store['arbol-accordion-state'])).toEqual(backup.data.accordionState);
    });

    it('handles null localStorage values gracefully', async () => {
      const db = createMockDB();
      localStorageMock.setItem('arbol-settings', 'old-value');

      const backup = makeValidBackup({
        data: {
          charts: [],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      await restoreFullReplace(db, backup);

      // Old keys should be removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('arbol-settings');
      // Null values should NOT be written
      const store = localStorageMock._getStore();
      expect(store['arbol-settings']).toBeUndefined();
    });

    it('clears all existing charts before writing', async () => {
      const existingCharts = [makeChart('e1', 'Old1'), makeChart('e2', 'Old2')];
      const db = createMockDB(existingCharts);

      await restoreFullReplace(db, makeValidBackup());

      expect(db.deleteChart).toHaveBeenCalledTimes(2);
    });

    it('skips charts with invalid workingTree', async () => {
      const validChart = makeChart('c1', 'Valid');
      const invalidChart: ChartRecord = {
        ...makeChart('c2', 'Invalid'),
        workingTree: { id: '', name: 'Bad', title: 'No ID' } as any,
      };
      const db = createMockDB();

      const backup = makeValidBackup({
        data: {
          charts: [validChart, invalidChart],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      await restoreFullReplace(db, backup);

      expect(db.putChart).toHaveBeenCalledTimes(1);
      expect(db.putChart).toHaveBeenCalledWith(validChart);
    });

    it('skips charts with deeply nested tree exceeding max depth', async () => {
      // Build a tree >100 levels deep
      let tree: any = { id: 'leaf', name: 'Leaf', title: 'IC' };
      for (let i = 100; i >= 0; i--) {
        tree = { id: `n${i}`, name: `Node ${i}`, title: 'Mgr', children: [tree] };
      }
      const deepChart: ChartRecord = { ...makeChart('deep', 'Deep'), workingTree: tree };
      const db = createMockDB();

      const backup = makeValidBackup({
        data: {
          charts: [deepChart],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      await restoreFullReplace(db, backup);

      expect(db.putChart).not.toHaveBeenCalled();
    });

    it('skips versions with invalid tree during full replace', async () => {
      const validVersion = makeVersion('v-good', 'c1');
      const invalidVersion: VersionRecord = {
        ...makeVersion('v-bad', 'c1'),
        tree: { id: '', name: 'Bad', title: 'No ID' } as never,
      };

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Chart')],
          versions: [validVersion, invalidVersion],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const db = createMockDB();
      await restoreFullReplace(db, backup);

      expect(db.putVersion).toHaveBeenCalledTimes(1);
      expect(db.putVersion).toHaveBeenCalledWith(validVersion);
    });

    it('preserves existing data when backup write fails mid-restore', async () => {
      const existing = [makeChart('e1', 'Existing')];
      const existingVersions = [makeVersion('ve1', 'e1')];
      const db = createMockDB(existing, existingVersions);
      const storage = {
        getItem: vi.fn((key: string) => (key === 'arbol-settings' ? '{"old":true}' : null)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      // Make putChart throw to simulate a write failure
      const putChartFn = db.putChart as ReturnType<typeof vi.fn>;
      putChartFn.mockRejectedValueOnce(new Error('IndexedDB write failed'));

      const backup = makeValidBackup();

      await expect(restoreFullReplace(db, backup, storage)).rejects.toThrow();

      // Existing chart should be preserved (rollback)
      const charts = await db.getAllCharts();
      expect(charts).toHaveLength(1);
      expect(charts[0].id).toBe('e1');

      // Existing versions should be preserved
      const versions = await db.getVersionsByChart('e1');
      expect(versions).toHaveLength(1);
      expect(versions[0].id).toBe('ve1');

      // localStorage should be restored
      expect(storage.setItem).toHaveBeenCalledWith('arbol-settings', '{"old":true}');
    });

    it('cleans up partial writes when a later write fails mid-restore', async () => {
      const existing = [makeChart('e1', 'Existing')];
      const db = createMockDB(existing);
      const storage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const chart1 = makeChart('b1', 'Backup1');
      const chart2 = makeChart('b2', 'Backup2');
      const backup = makeValidBackup({
        data: {
          charts: [chart1, chart2],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      // First putChart succeeds (writing chart1), second fails (writing chart2)
      const putChartFn = db.putChart as ReturnType<typeof vi.fn>;
      putChartFn
        .mockResolvedValueOnce(undefined) // succeeds for chart1
        .mockRejectedValueOnce(new Error('Write failed')); // fails for chart2

      await expect(restoreFullReplace(db, backup, storage)).rejects.toThrow();

      // Rollback should have restored original data — no mixed old+new state
      const charts = await db.getAllCharts();
      expect(charts).toHaveLength(1);
      expect(charts[0].id).toBe('e1');
    });

    it('removes originally-absent localStorage keys during rollback', async () => {
      const existing = [makeChart('e1', 'Existing')];
      const db = createMockDB(existing);
      const lsStore: Record<string, string> = { 'arbol-settings': '{"v":1}' };
      const storage = {
        getItem: vi.fn((key: string) => lsStore[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          lsStore[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete lsStore[key];
        }),
        clear: vi.fn(),
      };

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Chart')],
          versions: [],
          settings: { newSettings: true },
          theme: 'dark',
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      // Make putChart fail to trigger rollback
      const putChartFn = db.putChart as ReturnType<typeof vi.fn>;
      putChartFn.mockRejectedValueOnce(new Error('fail'));

      await expect(restoreFullReplace(db, backup, storage)).rejects.toThrow();

      // arbol-settings was present → should be restored
      expect(storage.setItem).toHaveBeenCalledWith('arbol-settings', '{"v":1}');
      // arbol-theme was absent → should be explicitly removed (not left with backup value)
      expect(storage.removeItem).toHaveBeenCalledWith('arbol-theme');
    });

    it('rollback continues past individual recovery failures', async () => {
      const existing = [makeChart('e1', 'Existing'), makeChart('e2', 'Existing2')];
      const existingVersions = [makeVersion('ve1', 'e1')];
      const db = createMockDB(existing, existingVersions);
      const storage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const backup = makeValidBackup();

      // Make the initial putChart fail to trigger rollback
      const putChartFn = db.putChart as ReturnType<typeof vi.fn>;
      putChartFn
        .mockRejectedValueOnce(new Error('write fail')) // triggers rollback
        .mockRejectedValueOnce(new Error('rollback fail for e1')) // first rollback putChart fails
        .mockResolvedValueOnce(undefined); // second rollback putChart succeeds

      await expect(restoreFullReplace(db, backup, storage)).rejects.toThrow('write fail');

      // Despite e1 rollback failing, e2 should still have been attempted
      expect(putChartFn).toHaveBeenCalledTimes(3);
    });

    it('rolls back on version write failure', async () => {
      const existing = [makeChart('e1', 'Existing')];
      const db = createMockDB(existing);
      const storage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Chart')],
          versions: [makeVersion('v1', 'c1'), makeVersion('v2', 'c1')],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      // putChart succeeds, first putVersion succeeds, second fails
      const putVersionFn = db.putVersion as ReturnType<typeof vi.fn>;
      putVersionFn
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('version write failed'));

      await expect(restoreFullReplace(db, backup, storage)).rejects.toThrow();

      // Rollback should have restored original data
      const charts = await db.getAllCharts();
      expect(charts).toHaveLength(1);
      expect(charts[0].id).toBe('e1');
    });

    it('skips charts with name exceeding 500 chars', async () => {
      const longNameChart: ChartRecord = {
        ...makeChart('long', 'Long Name'),
        workingTree: { id: 'root', name: 'A'.repeat(501), title: 'CEO' },
      };
      const db = createMockDB();

      const backup = makeValidBackup({
        data: {
          charts: [longNameChart],
          versions: [],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      await restoreFullReplace(db, backup);

      expect(db.putChart).not.toHaveBeenCalled();
    });
  });

  // ── restoreMerge ─────────────────────────────────────────────────────────

  describe('restoreMerge', () => {
    it('adds new charts and skips existing ones', async () => {
      const existing = [makeChart('c1', 'Existing')];
      const db = createMockDB(existing);

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Dup'), makeChart('c2', 'New')],
          versions: [makeVersion('v1', 'c1'), makeVersion('v2', 'c2')],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const result = await restoreMerge(db, backup);

      expect(result.chartsAdded).toBe(1);
      expect(result.chartsSkipped).toBe(1);
    });

    it('restores versions only for newly-added charts', async () => {
      const existing = [makeChart('c1', 'Existing')];
      const db = createMockDB(existing);

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Dup'), makeChart('c2', 'New')],
          versions: [makeVersion('v1', 'c1'), makeVersion('v2', 'c2')],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const result = await restoreMerge(db, backup);

      expect(result.versionsAdded).toBe(1);
      // Only c2's version should be added
      expect(db.putVersion).toHaveBeenCalledTimes(1);
      expect(db.putVersion).toHaveBeenCalledWith(expect.objectContaining({ chartId: 'c2' }));
    });

    it('does not overwrite existing settings', async () => {
      localStorageMock.setItem('arbol-settings', 'existing-settings');
      const db = createMockDB();

      const backup = makeValidBackup();
      await restoreMerge(db, backup);

      // Settings should NOT be overwritten
      expect(localStorageMock._getStore()['arbol-settings']).toBe('existing-settings');
    });

    it('skips charts with invalid workingTree during merge', async () => {
      const invalidChart: ChartRecord = {
        ...makeChart('bad', 'Bad'),
        workingTree: { id: 'root', name: 123, title: 'CEO' } as any,
      };
      const db = createMockDB();

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('good', 'Good'), invalidChart],
          versions: [makeVersion('v1', 'good'), makeVersion('v2', 'bad')],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const result = await restoreMerge(db, backup);

      expect(result.chartsAdded).toBe(1);
      expect(result.chartsSkipped).toBe(1);
      // Versions for invalid chart should not be restored
      expect(db.putVersion).toHaveBeenCalledTimes(1);
      expect(db.putVersion).toHaveBeenCalledWith(expect.objectContaining({ chartId: 'good' }));
    });

    it('skips versions with invalid tree during merge', async () => {
      const validVersion = makeVersion('v-good', 'c2');
      const invalidVersion: VersionRecord = {
        ...makeVersion('v-bad', 'c2'),
        tree: { id: '', name: 'Bad', title: 'No ID' } as never,
      };

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c2', 'New Chart')],
          versions: [validVersion, invalidVersion],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const db = createMockDB();
      const result = await restoreMerge(db, backup);

      expect(db.putVersion).toHaveBeenCalledTimes(1);
      expect(db.putVersion).toHaveBeenCalledWith(validVersion);
      expect(result.versionsAdded).toBe(1);
    });

    it('returns accurate MergeResult summary', async () => {
      const db = createMockDB([makeChart('c1', 'Existing')]);

      const backup = makeValidBackup({
        data: {
          charts: [makeChart('c1', 'Dup1'), makeChart('c2', 'New1'), makeChart('c3', 'New2')],
          versions: [
            makeVersion('v1', 'c1'),
            makeVersion('v2', 'c2'),
            makeVersion('v3', 'c2'),
            makeVersion('v4', 'c3'),
          ],
          settings: null,
          theme: null,
          csvMappings: null,
          customPresets: null,
          accordionState: null,
        },
      });

      const result = await restoreMerge(db, backup);
      expect(result.chartsAdded).toBe(2);
      expect(result.chartsSkipped).toBe(1);
      expect(result.versionsAdded).toBe(3);
    });
  });

  // ── downloadBackup ───────────────────────────────────────────────────────

  describe('downloadBackup', () => {
    it('creates correct filename with date', () => {
      const backup = makeValidBackup();

      const createObjectURL = vi.fn(() => 'blob:test');
      const revokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = createObjectURL;
      globalThis.URL.revokeObjectURL = revokeObjectURL;

      const clickSpy = vi.fn();
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          // Capture anchor properties before click
          expect(node.download).toMatch(/^\d{12}-arbol-backup\.json$/);
          expect(node.href).toBe('blob:test');
        }
        return node;
      });
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      // Mock click
      HTMLAnchorElement.prototype.click = clickSpy;

      downloadBackup(backup);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
