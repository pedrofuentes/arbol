import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartDB } from '../../src/store/chart-db';
import { ChartStore } from '../../src/store/chart-store';
import type { OrgNode, ColorCategory, ChartBundle, LevelMapping, LevelDisplayMode } from '../../src/types';

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

function makeLevelMappings(): LevelMapping[] {
  return [
    { rawLevel: 'L5', displayTitle: 'Senior' },
    { rawLevel: 'L6', displayTitle: 'Staff' },
  ];
}

function makeLevelData(): { levelMappings: LevelMapping[]; levelDisplayMode: LevelDisplayMode } {
  return { levelMappings: makeLevelMappings(), levelDisplayMode: 'mapped' };
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

    it('createChart with categories copies them to the new chart', async () => {
      const cats: ColorCategory[] = [{ id: 'c1', label: 'Eng', color: '#ff0000', nameColor: '#fff', titleColor: '#fff' }];
      const chart = await store.createChart('With Cats', cats);
      expect(chart.categories).toEqual(cats);
    });

    it('createChart with levelMappings copies them to the new chart', async () => {
      const mappings: LevelMapping[] = [{ rawLevel: 'L5', displayTitle: 'Senior' }];
      const chart = await store.createChart('With Levels', undefined, mappings, 'mapped');
      expect(chart.levelMappings).toEqual(mappings);
      expect(chart.levelDisplayMode).toBe('mapped');
    });

    it('createChart without optional params uses empty categories and no level data', async () => {
      const chart = await store.createChart('Plain');
      expect(chart.categories).toEqual([]);
      expect(chart.levelMappings).toBeUndefined();
      expect(chart.levelDisplayMode).toBeUndefined();
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

    it('createChartFromTree with level mappings stores them on the chart', async () => {
      const tree = makeTree();
      const cats = makeCategories();
      const levels = makeLevelMappings();
      const chart = await store.createChartFromTree('Leveled Chart', tree, cats, levels, 'mapped');
      expect(chart.levelMappings).toEqual(levels);
      expect(chart.levelDisplayMode).toBe('mapped');

      // Verify persisted to DB
      const fromDb = await db.getChart(chart.id);
      expect(fromDb!.levelMappings).toEqual(levels);
      expect(fromDb!.levelDisplayMode).toBe('mapped');
    });

    it('createChartFromTree without level mappings creates chart with undefined level fields', async () => {
      const tree = makeTree();
      const chart = await store.createChartFromTree('No Levels', tree);
      expect(chart.levelMappings).toBeUndefined();
      expect(chart.levelDisplayMode).toBeUndefined();
    });

    it('duplicateChart copies level mappings from source', async () => {
      const tree = makeTree();
      const levels = makeLevelMappings();
      const original = await store.createChartFromTree('Source', tree, makeCategories(), levels, 'mapped');

      const copy = await store.duplicateChart(original.id);
      expect(copy.levelMappings).toEqual(levels);
      expect(copy.levelDisplayMode).toBe('mapped');
      // Deep clone — modifying copy should not affect original
      copy.levelMappings![0].displayTitle = 'Changed';
      const refetched = await db.getChart(original.id);
      expect(refetched!.levelMappings![0].displayTitle).toBe('Senior');
    });

    it('duplicateChart without level mappings creates clean copy', async () => {
      const original = await store.createChart('No Level Source');
      const copy = await store.duplicateChart(original.id);
      expect(copy.levelMappings).toBeUndefined();
      expect(copy.levelDisplayMode).toBeUndefined();
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

    it('saveWorkingTree persists level data when provided', async () => {
      const tree = makeTree();
      const cats = makeCategories();
      const levelData = makeLevelData();
      await store.saveWorkingTree(tree, cats, undefined, levelData);

      const chart = await store.getActiveChart();
      expect(chart!.levelMappings).toEqual(levelData.levelMappings);
      expect(chart!.levelDisplayMode).toBe('mapped');
    });

    it('saveWorkingTree without level data does not remove existing level data', async () => {
      const tree = makeTree();
      const cats = makeCategories();
      const levelData = makeLevelData();
      await store.saveWorkingTree(tree, cats, undefined, levelData);

      // Save again without level data — existing fields must survive
      await store.saveWorkingTree(makeTree({ name: 'Updated' }), cats);

      const chart = await store.getActiveChart();
      expect(chart!.levelMappings).toEqual(levelData.levelMappings);
      expect(chart!.levelDisplayMode).toBe('mapped');
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

  // ---------------------------------------------------------------------------
  // wouldReplaceCategories
  // ---------------------------------------------------------------------------

  describe('wouldReplaceCategories', () => {
    function makeBundle(overrides?: Partial<ChartBundle>): ChartBundle {
      return {
        format: 'arbol-chart',
        version: 1,
        chart: {
          name: 'Bundle Chart',
          workingTree: { id: 'r', name: 'Root', title: 'CEO' },
          categories: [{ id: 'cat-1', label: 'Open', color: '#ff0000' }],
        },
        versions: [],
        ...overrides,
      };
    }

    it('returns false when no active chart', async () => {
      const freshStore = new ChartStore(db);
      const result = await freshStore.wouldReplaceCategories(makeBundle());
      expect(result).toBe(false);
    });

    it('returns false when active chart has no categories', async () => {
      await store.initialize();
      // Default chart has empty categories
      const result = await store.wouldReplaceCategories(makeBundle());
      expect(result).toBe(false);
    });

    it('returns true when bundle has no categories but chart does', async () => {
      await store.createChartFromTree('Categorized', makeTree(), makeCategories());
      const bundle = makeBundle({
        chart: { name: 'No Cats', workingTree: { id: 'r', name: 'Root', title: 'CEO' }, categories: [] },
      });
      const result = await store.wouldReplaceCategories(bundle);
      expect(result).toBe(true);
    });

    it('returns false when categories are identical', async () => {
      const cats = makeCategories();
      await store.createChartFromTree('Same', makeTree(), cats);
      const bundle = makeBundle({
        chart: { name: 'Same', workingTree: { id: 'r', name: 'Root', title: 'CEO' }, categories: cats },
      });
      const result = await store.wouldReplaceCategories(bundle);
      expect(result).toBe(false);
    });

    it('returns true when categories differ', async () => {
      await store.createChartFromTree('Chart', makeTree(), makeCategories());
      const bundle = makeBundle({
        chart: {
          name: 'Different',
          workingTree: { id: 'r', name: 'Root', title: 'CEO' },
          categories: [{ id: 'cat-99', label: 'New Hire', color: '#00ff00' }],
        },
      });
      const result = await store.wouldReplaceCategories(bundle);
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Bundle import
  // ---------------------------------------------------------------------------

  describe('Bundle import', () => {
    function makeBundle(overrides?: Partial<ChartBundle>): ChartBundle {
      return {
        format: 'arbol-chart',
        version: 1,
        chart: {
          name: 'Imported Chart',
          workingTree: { id: 'r', name: 'Root', title: 'CEO' },
          categories: [{ id: 'cat-1', label: 'Open', color: '#ff0000' }],
        },
        versions: [
          {
            name: 'v1',
            createdAt: '2026-01-01T00:00:00.000Z',
            tree: { id: 'r', name: 'Root v1', title: 'CEO' },
          },
        ],
        ...overrides,
      };
    }

    beforeEach(async () => {
      await store.initialize();
    });

    // --- importChartAsNew ---

    describe('importChartAsNew', () => {
      it('creates a new chart from bundle with correct tree and categories', async () => {
        const bundle = makeBundle();
        const chart = await store.importChartAsNew(bundle);

        expect(chart.name).toBe('Imported Chart');
        expect(chart.workingTree).toEqual({ id: 'r', name: 'Root', title: 'CEO' });
        expect(chart.categories).toEqual([{ id: 'cat-1', label: 'Open', color: '#ff0000' }]);
      });

      it('creates versions with correct names and trees', async () => {
        const bundle = makeBundle({
          versions: [
            { name: 'v1', createdAt: '2026-01-01T00:00:00.000Z', tree: { id: 'r', name: 'Root v1', title: 'CEO' } },
            { name: 'v2', createdAt: '2026-02-01T00:00:00.000Z', tree: { id: 'r', name: 'Root v2', title: 'CEO' } },
          ],
        });
        const chart = await store.importChartAsNew(bundle);
        const versions = await store.getVersions(chart.id);

        expect(versions).toHaveLength(2);
        const names = versions.map((v) => v.name).sort();
        expect(names).toEqual(['v1', 'v2']);
        const v1 = versions.find((v) => v.name === 'v1')!;
        expect(v1.tree.name).toBe('Root v1');
        expect(v1.createdAt).toBe('2026-01-01T00:00:00.000Z');
      });

      it('generates fresh IDs for chart and versions', async () => {
        const bundle = makeBundle();
        const chart = await store.importChartAsNew(bundle);
        const versions = await store.getVersions(chart.id);

        // IDs should come from generateId (test-id-N), not from the bundle data
        expect(chart.id).toMatch(/^test-id-/);
        for (const v of versions) {
          expect(v.id).toMatch(/^test-id-/);
          expect(v.chartId).toBe(chart.id);
        }
      });

      it('sets the new chart as active', async () => {
        const bundle = makeBundle();
        const chart = await store.importChartAsNew(bundle);
        expect(store.getActiveChartId()).toBe(chart.id);
      });

      it('handles name collision — appends " (imported)" suffix', async () => {
        await store.createChart('Imported Chart');
        const bundle = makeBundle();
        const chart = await store.importChartAsNew(bundle);
        expect(chart.name).toBe('Imported Chart (imported)');
      });

      it('handles multiple name collisions — appends " (imported 2)", " (imported 3)"', async () => {
        await store.createChart('Imported Chart');
        await store.createChart('Imported Chart (imported)');
        const chart = await store.importChartAsNew(makeBundle());
        expect(chart.name).toBe('Imported Chart (imported 2)');

        // One more collision
        const chart2 = await store.importChartAsNew(makeBundle());
        expect(chart2.name).toBe('Imported Chart (imported 3)');
      });

      it('works with empty versions array', async () => {
        const bundle = makeBundle({ versions: [] });
        const chart = await store.importChartAsNew(bundle);
        expect(chart).toBeDefined();
        expect(chart.workingTree.name).toBe('Root');
        const versions = await store.getVersions(chart.id);
        expect(versions).toHaveLength(0);
      });

      it('emits change event', async () => {
        const listener = vi.fn();
        store.onChange(listener);
        await store.importChartAsNew(makeBundle());
        expect(listener).toHaveBeenCalled();
      });
    });

    // --- importChartReplaceCurrent ---

    describe('importChartReplaceCurrent', () => {
      it('replaces active chart working tree and categories', async () => {
        const bundle = makeBundle();
        const updated = await store.importChartReplaceCurrent(bundle);

        expect(updated.workingTree).toEqual({ id: 'r', name: 'Root', title: 'CEO' });
        expect(updated.categories).toEqual([{ id: 'cat-1', label: 'Open', color: '#ff0000' }]);
      });

      it('adds bundle versions as versions of the active chart', async () => {
        const bundle = makeBundle({
          versions: [
            { name: 'imported-v1', createdAt: '2026-01-01T00:00:00.000Z', tree: { id: 'r', name: 'R1', title: 'CEO' } },
          ],
        });
        const chart = await store.importChartReplaceCurrent(bundle);
        const versions = await store.getVersions(chart.id);

        const imported = versions.find((v) => v.name === 'imported-v1');
        expect(imported).toBeDefined();
        expect(imported!.chartId).toBe(chart.id);
        expect(imported!.tree.name).toBe('R1');
      });

      it('preserves existing versions of the active chart', async () => {
        await store.saveVersion('existing-v1', makeTree());
        const bundle = makeBundle({
          versions: [
            { name: 'imported-v1', createdAt: '2026-01-01T00:00:00.000Z', tree: { id: 'r', name: 'R1', title: 'CEO' } },
          ],
        });
        const chart = await store.importChartReplaceCurrent(bundle);
        const versions = await store.getVersions(chart.id);

        const names = versions.map((v) => v.name);
        expect(names).toContain('existing-v1');
        expect(names).toContain('imported-v1');
      });

      it('generates fresh IDs for imported versions', async () => {
        const bundle = makeBundle();
        const chart = await store.importChartReplaceCurrent(bundle);
        const versions = await store.getVersions(chart.id);

        for (const v of versions) {
          expect(v.id).toMatch(/^test-id-/);
          expect(v.chartId).toBe(chart.id);
        }
      });

      it('throws if no active chart', async () => {
        const freshStore = new ChartStore(db);
        await expect(freshStore.importChartReplaceCurrent(makeBundle())).rejects.toThrow('No active chart');
      });

      it('emits change event', async () => {
        const listener = vi.fn();
        store.onChange(listener);
        await store.importChartReplaceCurrent(makeBundle());
        expect(listener).toHaveBeenCalled();
      });

      it('works with empty versions array', async () => {
        const bundle = makeBundle({ versions: [] });
        const chart = await store.importChartReplaceCurrent(bundle);
        expect(chart.workingTree.name).toBe('Root');
        // Only pre-existing versions remain (if any)
        const versions = await store.getVersions(chart.id);
        expect(versions).toHaveLength(0);
      });
    });

    // --- Tree validation (Issue 1) ---

    describe('tree validation on import', () => {
      it('importChartAsNew rejects bundle with invalid workingTree (missing name)', async () => {
        const bundle = makeBundle();
        bundle.chart.workingTree = { id: 'r', title: 'CEO' } as any;
        await expect(store.importChartAsNew(bundle)).rejects.toThrow();
      });

      it('importChartAsNew rejects bundle with invalid workingTree (non-object)', async () => {
        const bundle = makeBundle();
        bundle.chart.workingTree = 'not a tree' as any;
        await expect(store.importChartAsNew(bundle)).rejects.toThrow();
      });

      it('importChartAsNew rejects bundle with excessively deep tree', async () => {
        // Build a tree with depth > 100
        let tree: any = { id: 'leaf', name: 'Leaf', title: 'IC' };
        for (let i = 0; i < 110; i++) {
          tree = { id: `n${i}`, name: `N${i}`, title: 'Mgr', children: [tree] };
        }
        const bundle = makeBundle();
        bundle.chart.workingTree = tree;
        await expect(store.importChartAsNew(bundle)).rejects.toThrow(/depth/i);
      });

      it('importChartAsNew rejects bundle with invalid version tree', async () => {
        const bundle = makeBundle({
          versions: [
            {
              name: 'bad-version',
              createdAt: '2026-01-01T00:00:00.000Z',
              tree: { id: 'r', title: 'CEO' } as any, // missing name
            },
          ],
        });
        await expect(store.importChartAsNew(bundle)).rejects.toThrow();
      });

      it('importChartAsNew does not persist anything when validation fails', async () => {
        const chartsBefore = await store.getCharts();
        const bundle = makeBundle();
        bundle.chart.workingTree = 'invalid' as any;
        await expect(store.importChartAsNew(bundle)).rejects.toThrow();
        const chartsAfter = await store.getCharts();
        expect(chartsAfter).toHaveLength(chartsBefore.length);
      });

      it('importChartReplaceCurrent rejects bundle with invalid workingTree', async () => {
        const bundle = makeBundle();
        bundle.chart.workingTree = { id: 'r', title: 'CEO' } as any;
        await expect(store.importChartReplaceCurrent(bundle)).rejects.toThrow();
      });

      it('importChartReplaceCurrent rejects bundle with invalid version tree', async () => {
        const bundle = makeBundle({
          versions: [
            {
              name: 'bad',
              createdAt: '2026-01-01T00:00:00.000Z',
              tree: { id: '', name: 'Empty ID', title: 'CEO' }, // empty id
            },
          ],
        });
        await expect(store.importChartReplaceCurrent(bundle)).rejects.toThrow();
      });

      it('importChartReplaceCurrent does not modify chart when validation fails', async () => {
        const originalChart = await store.getActiveChart();
        const originalTree = originalChart!.workingTree.name;
        const bundle = makeBundle();
        bundle.chart.workingTree = null as any;
        await expect(store.importChartReplaceCurrent(bundle)).rejects.toThrow();
        const afterChart = await store.getActiveChart();
        expect(afterChart!.workingTree.name).toBe(originalTree);
      });

      it('importChartAsNew accepts a valid bundle', async () => {
        const bundle = makeBundle();
        const chart = await store.importChartAsNew(bundle);
        expect(chart.workingTree.name).toBe('Root');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // switchChart sanitization persistence (Issue 2)
  // ---------------------------------------------------------------------------

  describe('switchChart sanitization persistence', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('persists sanitized chart back to IndexedDB when fields are repaired', async () => {
      // Manually insert a corrupt chart into IndexedDB
      const corruptChart = {
        id: 'corrupt-chart',
        name: 'Corrupt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workingTree: { id: 123, name: 'Root', title: 'CEO' } as any, // id should be string
        categories: 'not-an-array' as any, // should be array
      };
      await db.putChart(corruptChart as any);

      // switchChart should sanitize and persist the repaired chart
      const chart = await store.switchChart('corrupt-chart');
      expect(chart.categories).toEqual([]);
      expect(typeof chart.workingTree.id).toBe('string');

      // Re-read directly from DB to verify it was persisted
      const fromDb = await db.getChart('corrupt-chart');
      expect(Array.isArray(fromDb!.categories)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isDirty mutation version fast path (Issue 3)
  // ---------------------------------------------------------------------------

  describe('isDirty mutation version fast path', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('isDirty returns false when mutation version matches saved version', async () => {
      const tree = makeTree({ name: 'Saved' });
      await store.saveWorkingTree(tree, [], 42);
      expect(store.isDirty(tree, 42)).toBe(false);
    });

    it('isDirty returns true when mutation version differs from saved version', async () => {
      const tree = makeTree({ name: 'Saved' });
      await store.saveWorkingTree(tree, [], 42);
      expect(store.isDirty(tree, 43)).toBe(true);
    });

    it('isDirty falls back to JSON comparison when no mutation version provided', async () => {
      const tree = makeTree({ name: 'Saved' });
      await store.saveWorkingTree(tree, []);
      // Same tree content → not dirty
      expect(store.isDirty(makeTree({ name: 'Saved' }))).toBe(false);
      // Different tree content → dirty
      expect(store.isDirty(makeTree({ name: 'Changed' }))).toBe(true);
    });

    it('saveVersion with mutation version enables fast path', async () => {
      const tree = makeTree({ name: 'Versioned' });
      await store.saveVersion('v1', tree, 10);
      expect(store.isDirty(tree, 10)).toBe(false);
      expect(store.isDirty(tree, 11)).toBe(true);
    });

    it('fast path resets to JSON fallback after switchChart', async () => {
      // Save with mutation version
      await store.saveWorkingTree(makeTree(), [], 5);
      expect(store.isDirty(makeTree(), 5)).toBe(false);

      // switchChart doesn't know mutation version — should reset to JSON fallback
      const otherChart = await store.createChart('Other');
      await store.switchChart(otherChart.id);
      // JSON fallback: same content → false
      expect(store.isDirty(otherChart.workingTree)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // saveWorkingTree skips JSON.stringify when mutation version provided
  // ---------------------------------------------------------------------------

  describe('saveWorkingTree dirty detection optimization', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('saveWorkingTree skips JSON.stringify for lastSavedTree when mutation version provided', async () => {
      const tree = makeTree({ name: 'Optimized' });
      await store.saveWorkingTree(tree, [], 99);

      // When mutation version was provided, lastSavedTree should be null (skipped serialization)
      // We verify indirectly: isDirty with same mutation version → false (fast path)
      expect(store.isDirty(tree, 99)).toBe(false);

      // And isDirty WITHOUT mutation version should return true (no lastSavedTree to compare against)
      expect(store.isDirty(tree)).toBe(true);
    });

    it('saveWorkingTree keeps JSON.stringify for lastSavedTree when no mutation version', async () => {
      const tree = makeTree({ name: 'Fallback' });
      await store.saveWorkingTree(tree, []);

      // Without mutation version, lastSavedTree should be populated for JSON fallback
      expect(store.isDirty(makeTree({ name: 'Fallback' }))).toBe(false);
      expect(store.isDirty(makeTree({ name: 'Different' }))).toBe(true);
    });

    it('isDirty returns true when lastSavedTree is null and no mutation version provided', async () => {
      const tree = makeTree({ name: 'NullFallback' });
      // Save with mutation version — lastSavedTree should be null
      await store.saveWorkingTree(tree, [], 7);

      // Query isDirty without mutation version — no lastSavedTree, should be true
      expect(store.isDirty(tree)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // saveWorkingTree uses patchChart (TODO 2)
  // ---------------------------------------------------------------------------

  describe('saveWorkingTree uses patchChart', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('saveWorkingTree uses patchChart instead of getChart+putChart', async () => {
      const patchSpy = vi.spyOn(db, 'patchChart');
      const getSpy = vi.spyOn(db, 'getChart');

      const tree = makeTree({ name: 'Patched' });
      await store.saveWorkingTree(tree, makeCategories());

      expect(patchSpy).toHaveBeenCalledTimes(1);
      // getChart should NOT be called during saveWorkingTree
      expect(getSpy).not.toHaveBeenCalled();

      patchSpy.mockRestore();
      getSpy.mockRestore();
    });

    it('saveWorkingTree via patchChart correctly persists data', async () => {
      const tree = makeTree({ name: 'PatchPersist' });
      const cats = makeCategories();
      await store.saveWorkingTree(tree, cats);

      const chart = await store.getActiveChart();
      expect(chart!.workingTree.name).toBe('PatchPersist');
      expect(chart!.categories).toHaveLength(2);
    });
  });
});
