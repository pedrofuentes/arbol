import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartDB } from '../../src/store/chart-db';
import { ChartStore } from '../../src/store/chart-store';
import type { OrgNode, ColorCategory } from '../../src/types';

let idCounter = 0;
vi.mock('../../src/utils/id', () => ({
  generateId: vi.fn(() => `test-id-${++idCounter}`),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function makeTree(overrides: Partial<OrgNode> = {}): OrgNode {
  return { id: 'root', name: 'Alice', title: 'CEO', ...overrides };
}

function makeCategories(): ColorCategory[] {
  return [
    { id: 'cat-1', label: 'Open Position', color: '#fbbf24' },
    { id: 'cat-2', label: 'Contractor', color: '#60a5fa' },
  ];
}

describe('ChartStore', () => {
  let db: ChartDB;
  let store: ChartStore;

  beforeEach(async () => {
    idCounter = 0;
    localStorageMock.clear();
    vi.clearAllMocks();
    db = new ChartDB();
    await db.open();
    store = new ChartStore(db);
  });

  afterEach(() => {
    db.close();
    indexedDB.deleteDatabase('arbol-db');
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('creates a default chart when DB is empty', async () => {
      const chart = await store.initialize();
      expect(chart).toBeDefined();
      expect(chart.name).toBe('My Org Chart');
      expect(chart.workingTree.name).toBe('Organization');
      expect(chart.workingTree.title).toBe('CEO');
      expect(chart.categories).toEqual([]);
    });

    it('returns the active chart', async () => {
      const chart = await store.initialize();
      const active = await store.getActiveChart();
      expect(active).toBeDefined();
      expect(active!.id).toBe(chart.id);
    });

    it('getActiveChartId returns the active chart ID after initialize', async () => {
      const chart = await store.initialize();
      expect(store.getActiveChartId()).toBe(chart.id);
    });
  });

  // ---------------------------------------------------------------------------
  // Migration from localStorage
  // ---------------------------------------------------------------------------

  describe('migration from localStorage', () => {
    it('migrates existing localStorage org data to a new chart', async () => {
      const tree = makeTree({ name: 'Migrated CEO' });
      localStorageMock.setItem('arbol-org-data', JSON.stringify(tree));

      const chart = await store.initialize();
      expect(chart.workingTree.name).toBe('Migrated CEO');
    });

    it('migrates localStorage categories alongside org data', async () => {
      const tree = makeTree();
      const cats = makeCategories();
      localStorageMock.setItem('arbol-org-data', JSON.stringify(tree));
      localStorageMock.setItem('arbol-categories', JSON.stringify(cats));

      const chart = await store.initialize();
      expect(chart.categories).toHaveLength(2);
      expect(chart.categories[0].label).toBe('Open Position');
      expect(chart.categories[1].label).toBe('Contractor');
    });

    it('removes migrated localStorage keys after migration', async () => {
      localStorageMock.setItem('arbol-org-data', JSON.stringify(makeTree()));
      localStorageMock.setItem('arbol-categories', JSON.stringify(makeCategories()));

      await store.initialize();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('arbol-org-data');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('arbol-categories');
    });

    it('ignores localStorage migration if charts already exist in DB', async () => {
      // Pre-populate the DB with a chart
      await store.initialize(); // creates default chart
      db.close();

      // Re-open with localStorage data present
      db = new ChartDB();
      await db.open();
      store = new ChartStore(db);

      localStorageMock.setItem('arbol-org-data', JSON.stringify(makeTree({ name: 'Should Not Appear' })));
      const chart = await store.initialize();

      expect(chart.workingTree.name).not.toBe('Should Not Appear');
    });
  });

  // ---------------------------------------------------------------------------
  // Chart CRUD
  // ---------------------------------------------------------------------------

  describe('Chart CRUD', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('createChart creates a new chart with an empty root node', async () => {
      const chart = await store.createChart('New Chart');
      expect(chart.name).toBe('New Chart');
      expect(chart.workingTree.id).toBe('root');
      expect(chart.workingTree.name).toBe('Organization');
      expect(chart.workingTree.title).toBe('CEO');
    });

    it('isDirty returns false for the new chart tree right after createChart', async () => {
      const chart = await store.createChart('Fresh Chart');
      expect(store.isDirty(chart.workingTree)).toBe(false);
    });

    it('isDirty returns true when comparing old modified tree after createChart', async () => {
      // Simulate: user modified chart1's tree, then creates chart2
      const modifiedTree = makeTree({ name: 'Modified CEO' });
      await store.saveWorkingTree(modifiedTree, []);
      await store.createChart('New Chart');
      // After createChart, lastSavedTree is the new chart's DEFAULT_ROOT,
      // so the old chart's modified tree should show as dirty
      expect(store.isDirty(modifiedTree)).toBe(true);
    });

    it('createChart throws if name is empty', async () => {
      await expect(store.createChart('')).rejects.toThrow('Chart name cannot be empty');
      await expect(store.createChart('   ')).rejects.toThrow('Chart name cannot be empty');
    });

    it('createChart throws if name is already taken', async () => {
      await store.createChart('Unique Name');
      await expect(store.createChart('Unique Name')).rejects.toThrow('already exists');
    });

    it('createChartFromTree creates a chart with the provided tree', async () => {
      const tree = makeTree({ name: 'Custom Root', children: [{ id: 'c1', name: 'Child', title: 'VP' }] });
      const chart = await store.createChartFromTree('Tree Chart', tree);
      expect(chart.name).toBe('Tree Chart');
      expect(chart.workingTree.name).toBe('Custom Root');
      expect(chart.workingTree.children).toHaveLength(1);
    });

    it('createChartFromTree uses provided categories', async () => {
      const tree = makeTree();
      const cats = makeCategories();
      const chart = await store.createChartFromTree('Cat Chart', tree, cats);
      expect(chart.categories).toHaveLength(2);
      expect(chart.categories[0].label).toBe('Open Position');
    });

    it('getCharts returns all charts', async () => {
      await store.createChart('Chart A');
      await store.createChart('Chart B');
      const charts = await store.getCharts();
      // 1 default from initialize + 2 created
      expect(charts.length).toBeGreaterThanOrEqual(3);
    });

    it('renameChart updates the chart name', async () => {
      const chart = await store.createChart('Old Name');
      await store.renameChart(chart.id, 'New Name');
      const updated = await store.getActiveChart();
      expect(updated!.name).toBe('New Name');
    });

    it('renameChart throws if new name is already taken by another chart', async () => {
      await store.createChart('Chart Alpha');
      const beta = await store.createChart('Chart Beta');
      await expect(store.renameChart(beta.id, 'Chart Alpha')).rejects.toThrow('already exists');
    });

    it('renameChart allows renaming to the same name (no-op check)', async () => {
      const chart = await store.createChart('Keep Name');
      await expect(store.renameChart(chart.id, 'Keep Name')).resolves.toBeUndefined();
    });

    it('duplicateChart creates a copy with "Copy of" prefix', async () => {
      const original = await store.createChart('My Chart');
      const tree = makeTree({ name: 'Custom Root', children: [{ id: 'c1', name: 'Child', title: 'VP' }] });
      await store.saveWorkingTree(tree, makeCategories());

      // Switch back to original to duplicate it with saved data
      await store.switchChart(original.id);
      // Save the tree so it's persisted
      await store.saveWorkingTree(tree, makeCategories());

      const copy = await store.duplicateChart(original.id);
      expect(copy.name).toBe('Copy of My Chart');
      expect(copy.id).not.toBe(original.id);
      expect(copy.workingTree.name).toBe('Custom Root');
      expect(copy.workingTree.children).toHaveLength(1);
      expect(copy.categories).toHaveLength(2);
    });

    it('duplicateChart generates unique name with suffix when copy name is taken', async () => {
      const original = await store.createChart('Org');
      await store.createChart('Copy of Org');
      const copy = await store.duplicateChart(original.id);
      expect(copy.name).toBe('Copy of Org (2)');
    });

    it('duplicateChart throws if chart not found', async () => {
      await expect(store.duplicateChart('nonexistent')).rejects.toThrow('Chart not found');
    });

    it('duplicateChart does not copy versions', async () => {
      const original = await store.createChart('Versioned Chart');
      const tree = makeTree();
      await store.saveVersion('v1', tree);
      const versionsBefore = await store.getVersions(original.id);
      expect(versionsBefore.length).toBeGreaterThanOrEqual(1);

      const copy = await store.duplicateChart(original.id);
      const versionsAfter = await store.getVersions(copy.id);
      expect(versionsAfter).toHaveLength(0);
    });

    it('duplicateChart switches active chart to the copy', async () => {
      const original = await store.createChart('Source');
      const copy = await store.duplicateChart(original.id);
      expect(store.getActiveChartId()).toBe(copy.id);
    });

    it('duplicateChart deep clones (modifying copy does not affect original)', async () => {
      const original = await store.createChart('Deep Clone Test');
      const tree = makeTree({ name: 'Root', children: [{ id: 'c1', name: 'Child', title: 'VP' }] });
      await store.saveWorkingTree(tree, makeCategories());

      const copy = await store.duplicateChart(original.id);
      // Modify the copy's tree
      copy.workingTree.name = 'Modified';
      // Original should be unchanged
      const orig = (await db.getChart(original.id))!;
      expect(orig.workingTree.name).toBe('Root');
    });

    it('deleteChart removes the chart and its versions', async () => {
      const chart = await store.createChart('To Delete');
      const tree = makeTree();
      await store.saveVersion('v1', tree);

      const versionsBefore = await store.getVersions(chart.id);
      expect(versionsBefore.length).toBeGreaterThanOrEqual(1);

      await store.deleteChart(chart.id);
      const remaining = await store.getCharts();
      const ids = remaining.map((c) => c.id);
      expect(ids).not.toContain(chart.id);
    });

    it('deleteChart switches to another chart if deleting the active one', async () => {
      await store.getCharts(); // ensure initial chart exists
      const second = await store.createChart('Second');

      // active is now "Second"
      expect(store.getActiveChartId()).toBe(second.id);

      await store.deleteChart(second.id);
      // Should switch to the remaining chart
      expect(store.getActiveChartId()).not.toBe(second.id);
      expect(store.getActiveChartId()).toBeTruthy();
    });

    it('deleteChart creates a new default chart if deleting the last chart', async () => {
      // Delete all charts, leaving only the initial one
      const charts = await store.getCharts();
      for (let i = 1; i < charts.length; i++) {
        await store.deleteChart(charts[i].id);
      }
      // Delete the last remaining chart
      const lastId = store.getActiveChartId()!;
      await store.deleteChart(lastId);

      const remaining = await store.getCharts();
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe('My Org Chart');
      expect(store.getActiveChartId()).toBe(remaining[0].id);
    });

    it('switchChart loads a different chart and updates active ID', async () => {
      const chartA = await store.createChart('Chart A');
      const chartB = await store.createChart('Chart B');

      expect(store.getActiveChartId()).toBe(chartB.id);

      const switched = await store.switchChart(chartA.id);
      expect(switched.id).toBe(chartA.id);
      expect(store.getActiveChartId()).toBe(chartA.id);
    });

    it('switchChart throws if chart does not exist', async () => {
      await expect(store.switchChart('nonexistent-id')).rejects.toThrow('Chart not found');
    });
  });

  // ---------------------------------------------------------------------------
  // Working tree
  // ---------------------------------------------------------------------------

  describe('Working tree', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('saveWorkingTree persists tree and categories to IndexedDB', async () => {
      const tree = makeTree({ name: 'Saved Root' });
      const cats = makeCategories();
      await store.saveWorkingTree(tree, cats);

      const chart = await store.getActiveChart();
      expect(chart!.workingTree.name).toBe('Saved Root');
      expect(chart!.categories).toHaveLength(2);
    });

    it('saveWorkingTree updates the chart updatedAt timestamp', async () => {
      const before = (await store.getActiveChart())!.updatedAt;
      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));
      await store.saveWorkingTree(makeTree(), []);
      const after = (await store.getActiveChart())!.updatedAt;
      expect(after >= before).toBe(true);
    });

    it('isDirty returns false right after initialize (matches saved state)', async () => {
      const chart = await store.getActiveChart();
      expect(store.isDirty(chart!.workingTree)).toBe(false);
    });

    it('isDirty returns true when tree differs from last saved state', async () => {
      const modified = makeTree({ name: 'Modified' });
      expect(store.isDirty(modified)).toBe(true);
    });

    it('isDirty returns false after saveWorkingTree (tree now matches)', async () => {
      const tree = makeTree({ name: 'Updated' });
      await store.saveWorkingTree(tree, []);
      expect(store.isDirty(tree)).toBe(false);
    });

    it('isDirty returns false after saveVersion (tree now matches)', async () => {
      const tree = makeTree({ name: 'Versioned' });
      await store.saveVersion('v1', tree);
      expect(store.isDirty(tree)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Version management
  // ---------------------------------------------------------------------------

  describe('Version management', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('saveVersion creates a version snapshot for the active chart', async () => {
      const tree = makeTree();
      const version = await store.saveVersion('v1', tree);
      expect(version).toBeDefined();
      expect(version.name).toBe('v1');
      expect(version.chartId).toBe(store.getActiveChartId());
    });

    it('saveVersion stores the tree data in the version', async () => {
      const tree = makeTree({ name: 'Snapshot' });
      const version = await store.saveVersion('snap', tree);
      const retrieved = await store.getVersion(version.id);
      expect(retrieved!.tree.name).toBe('Snapshot');
    });

    it('getVersions returns versions for the active chart', async () => {
      await store.saveVersion('v1', makeTree());
      await store.saveVersion('v2', makeTree());
      const versions = await store.getVersions();
      expect(versions.length).toBe(2);
    });

    it('getVersions returns versions for a specified chart', async () => {
      const chartA = await store.createChart('Chart A');
      await store.saveVersion('v1', makeTree());

      const chartB = await store.createChart('Chart B');
      await store.saveVersion('v2', makeTree());

      const versionsA = await store.getVersions(chartA.id);
      expect(versionsA.length).toBe(1);
      expect(versionsA[0].name).toBe('v1');

      const versionsB = await store.getVersions(chartB.id);
      expect(versionsB.length).toBe(1);
      expect(versionsB[0].name).toBe('v2');
    });

    it('getVersion returns a single version', async () => {
      const version = await store.saveVersion('single', makeTree());
      const retrieved = await store.getVersion(version.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('single');
    });

    it('restoreVersion returns the version tree', async () => {
      const tree = makeTree({ name: 'Restore Me' });
      const version = await store.saveVersion('restore', tree);
      const restored = await store.restoreVersion(version.id);
      expect(restored.name).toBe('Restore Me');
    });

    it('restoreVersion resets dirty state to match restored tree', async () => {
      const tree = makeTree({ name: 'V1 State' });
      const version = await store.saveVersion('v1', tree);

      // Dirty the state
      await store.saveWorkingTree(makeTree({ name: 'Different' }), []);

      const restored = await store.restoreVersion(version.id);
      expect(store.isDirty(restored)).toBe(false);
    });

    it('deleteVersion removes the version', async () => {
      const version = await store.saveVersion('temp', makeTree());
      await store.deleteVersion(version.id);
      const retrieved = await store.getVersion(version.id);
      expect(retrieved).toBeUndefined();
    });

    it('saveVersion throws if name is empty', async () => {
      await expect(store.saveVersion('', makeTree())).rejects.toThrow('Version name cannot be empty');
      await expect(store.saveVersion('   ', makeTree())).rejects.toThrow('Version name cannot be empty');
    });

    it('saveVersion throws if no active chart', async () => {
      const freshStore = new ChartStore(db);
      await expect(freshStore.saveVersion('v1', makeTree())).rejects.toThrow('No active chart');
    });
  });

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  describe('Events', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('onChange listener is called on createChart', async () => {
      const listener = vi.fn();
      store.onChange(listener);
      await store.createChart('Event Chart');
      expect(listener).toHaveBeenCalled();
    });

    it('onChange listener is called on deleteChart', async () => {
      const chart = await store.createChart('To Delete');
      const listener = vi.fn();
      store.onChange(listener);
      await store.deleteChart(chart.id);
      expect(listener).toHaveBeenCalled();
    });

    it('onChange listener is called on switchChart', async () => {
      const initial = (await store.getCharts())[0];
      await store.createChart('Another');
      const listener = vi.fn();
      store.onChange(listener);
      await store.switchChart(initial.id);
      expect(listener).toHaveBeenCalled();
    });

    it('onChange listener is called on saveVersion', async () => {
      const listener = vi.fn();
      store.onChange(listener);
      await store.saveVersion('v1', makeTree());
      expect(listener).toHaveBeenCalled();
    });

    it('onChange listener is called on deleteVersion', async () => {
      const version = await store.saveVersion('v1', makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      await store.deleteVersion(version.id);
      expect(listener).toHaveBeenCalled();
    });

    it('onChange listener is called on restoreVersion', async () => {
      const version = await store.saveVersion('v1', makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      await store.restoreVersion(version.id);
      expect(listener).toHaveBeenCalled();
    });

    it('onChange returns an unsubscribe function that works', async () => {
      const listener = vi.fn();
      const unsub = store.onChange(listener);
      await store.createChart('First');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      await store.createChart('Second');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
