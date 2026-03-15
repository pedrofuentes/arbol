import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartDB } from '../../src/store/chart-db';
import { ChartStore } from '../../src/store/chart-store';
import { OrgStore } from '../../src/store/org-store';
import { CategoryStore } from '../../src/store/category-store';
import { createBackup, restoreFullReplace } from '../../src/store/backup-manager';
import { parseCsvToTree } from '../../src/utils/csv-parser';
import { findNodeById, flattenTree } from '../../src/utils/tree';
import type { OrgNode, ColorCategory } from '../../src/types';
import type { IStorage } from '../../src/utils/storage';

// ---------------------------------------------------------------------------
// Deterministic ID generation
// ---------------------------------------------------------------------------

let idCounter = 0;
vi.mock('../../src/utils/id', () => ({
  generateId: vi.fn(() => `int-id-${++idCounter}`),
}));

// ---------------------------------------------------------------------------
// In-memory localStorage for isolation
// ---------------------------------------------------------------------------

function createMemoryStorage(): IStorage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTree(overrides: Partial<OrgNode> = {}): OrgNode {
  return { id: 'root', name: 'Alice', title: 'CEO', ...overrides };
}

function makeCategories(prefix = ''): ColorCategory[] {
  return [
    { id: `${prefix}cat-1`, label: `${prefix}Engineering`, color: '#ef4444' },
    { id: `${prefix}cat-2`, label: `${prefix}Design`, color: '#3b82f6' },
  ];
}

const CSV_DATA = `name,title,manager_name
Alice,CEO,
Bob,VP Engineering,Alice
Carol,VP Design,Alice
Dave,Senior Engineer,Bob
Eve,Designer,Carol`;

// ---------------------------------------------------------------------------
// Workflow integration tests
// ---------------------------------------------------------------------------

describe('Integration Workflows', () => {
  let db: ChartDB;
  let storage: IStorage;

  beforeEach(async () => {
    idCounter = 0;
    vi.clearAllMocks();
    db = new ChartDB();
    await db.open();
    storage = createMemoryStorage();
  });

  afterEach(() => {
    db.close();
    indexedDB.deleteDatabase('arbol-db');
  });

  // =========================================================================
  // Workflow 1: Import CSV → Edit → Save Version
  // =========================================================================

  describe('Workflow 1: Import CSV → Edit → Save Version', () => {
    it('parses CSV, edits tree, saves version, then restores original', async () => {
      // Step 1: Parse CSV into a tree
      const { tree: csvTree, nodeCount } = parseCsvToTree(CSV_DATA);
      expect(nodeCount).toBe(5);
      expect(csvTree.name).toBe('Alice');

      // Step 2: Load tree into OrgStore
      const orgStore = new OrgStore(csvTree);
      const tree = orgStore.getTree();
      expect(tree.name).toBe('Alice');
      expect(tree.children).toHaveLength(2);

      // Step 3a: Create chart and save initial version
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();
      const chart = await chartStore.createChartFromTree('CSV Import', structuredClone(orgStore.getTree()));
      const initialVersion = await chartStore.saveVersion('v1-initial', orgStore.getTree());

      // Step 3b: Make edits — addChild
      const newChild = orgStore.addChild(tree.id, { name: 'Frank', title: 'CFO' });
      expect(findNodeById(orgStore.getTree(), newChild.id)).toBeDefined();

      // Step 3c: Make edits — updateNode
      const bob = orgStore.getTree().children!.find((c) => c.name === 'Bob')!;
      orgStore.updateNode(bob.id, { title: 'CTO' });
      expect(findNodeById(orgStore.getTree(), bob.id)!.title).toBe('CTO');

      // Step 3d: Make edits — setNodeCategory
      const categories = makeCategories();
      orgStore.setNodeCategory(bob.id, categories[0].id);
      expect(findNodeById(orgStore.getTree(), bob.id)!.categoryId).toBe(categories[0].id);

      // Step 4: Save edited version
      const editedVersion = await chartStore.saveVersion('v2-edited', orgStore.getTree());

      // Step 5: Verify the edited version contains all edits
      const restoredEdited = await chartStore.restoreVersion(editedVersion.id);
      expect(findNodeById(restoredEdited, newChild.id)).toBeDefined();
      expect(findNodeById(restoredEdited, bob.id)!.title).toBe('CTO');
      expect(findNodeById(restoredEdited, bob.id)!.categoryId).toBe(categories[0].id);

      // Step 6: Restore the initial version — verify edits are gone
      const restoredInitial = await chartStore.restoreVersion(initialVersion.id);
      expect(findNodeById(restoredInitial, newChild.id)).toBeNull();
      const restoredBob = restoredInitial.children!.find((c) => c.name === 'Bob')!;
      expect(restoredBob.title).toBe('VP Engineering');
      expect(restoredBob.categoryId).toBeUndefined();
    });

    it('version list grows with each save', async () => {
      const { tree } = parseCsvToTree(CSV_DATA);
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();
      await chartStore.createChartFromTree('Test Chart', tree);

      await chartStore.saveVersion('v1', tree);
      await chartStore.saveVersion('v2', tree);
      await chartStore.saveVersion('v3', tree);

      const versions = await chartStore.getVersions();
      expect(versions).toHaveLength(3);
      expect(versions.map((v) => v.name)).toEqual(
        expect.arrayContaining(['v1', 'v2', 'v3']),
      );
    });
  });

  // =========================================================================
  // Workflow 2: Chart Switching with Dirty State
  // =========================================================================

  describe('Workflow 2: Chart Switching with Dirty State', () => {
    it('tracks dirty state across chart switches', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      // Step 1: Create Chart A and Chart B
      const chartA = await chartStore.createChart('Chart A');
      const chartB = await chartStore.createChart('Chart B');

      // Step 2: Switch to A, make edits via OrgStore
      const activeA = await chartStore.switchChart(chartA.id);
      const orgStore = new OrgStore(activeA.workingTree);
      orgStore.addChild(activeA.workingTree.id, { name: 'New Person', title: 'Manager' });

      // Step 3: Verify isDirty on the modified tree
      expect(chartStore.isDirty(orgStore.getTree())).toBe(true);

      // Save Chart A's edits before switching
      const categoriesA = makeCategories('a-');
      await chartStore.saveWorkingTree(orgStore.getTree(), categoriesA);

      // Step 4: Switch to B — verify B is clean
      const activeB = await chartStore.switchChart(chartB.id);
      const orgStoreB = new OrgStore(activeB.workingTree);
      expect(chartStore.isDirty(orgStoreB.getTree())).toBe(false);

      // Step 5: Switch back to A — verify edits are preserved
      const backToA = await chartStore.switchChart(chartA.id);
      expect(backToA.workingTree.children).toBeDefined();
      expect(backToA.workingTree.children!.some((c) => c.name === 'New Person')).toBe(true);
      expect(backToA.categories).toEqual(categoriesA);

      // After reloading, A should not be dirty (was saved)
      expect(chartStore.isDirty(backToA.workingTree)).toBe(false);
    });

    it('unsaved edits are lost when switching without saving', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      const chartA = await chartStore.createChart('Chart A');
      const chartB = await chartStore.createChart('Chart B');

      // Make edits on A but don't save
      const activeA = await chartStore.switchChart(chartA.id);
      const orgStore = new OrgStore(activeA.workingTree);
      orgStore.addChild(activeA.workingTree.id, { name: 'Unsaved', title: 'Ghost' });
      expect(chartStore.isDirty(orgStore.getTree())).toBe(true);

      // Switch away and back without saving
      await chartStore.switchChart(chartB.id);
      const reloadedA = await chartStore.switchChart(chartA.id);

      // The unsaved edit should be gone (chart was not saved)
      const allNodes = flattenTree(reloadedA.workingTree);
      expect(allNodes.find((n) => n.name === 'Unsaved')).toBeUndefined();
    });
  });

  // =========================================================================
  // Workflow 3: Undo/Redo Across Mixed Operations
  // =========================================================================

  describe('Workflow 3: Undo/Redo Across Mixed Operations', () => {
    it('undo/redo through addChild → updateNode → setNodeCategory → moveNode', () => {
      const root: OrgNode = {
        id: 'root',
        name: 'Alice',
        title: 'CEO',
        children: [
          { id: 'bob', name: 'Bob', title: 'VP Eng' },
          { id: 'carol', name: 'Carol', title: 'VP Design' },
        ],
      };
      const orgStore = new OrgStore(root);

      // Capture initial state
      const initialJson = orgStore.toJSON();

      // Operation 1: addChild
      const dave = orgStore.addChild('bob', { name: 'Dave', title: 'Engineer' });
      const afterAdd = orgStore.toJSON();
      expect(findNodeById(orgStore.getTree(), dave.id)).toBeDefined();

      // Operation 2: updateNode
      orgStore.updateNode('bob', { title: 'CTO' });
      const afterUpdate = orgStore.toJSON();
      expect(findNodeById(orgStore.getTree(), 'bob')!.title).toBe('CTO');

      // Operation 3: setNodeCategory
      orgStore.setNodeCategory('carol', 'cat-eng');
      const afterCategory = orgStore.toJSON();
      expect(findNodeById(orgStore.getTree(), 'carol')!.categoryId).toBe('cat-eng');

      // Operation 4: moveNode — move Carol under Bob
      orgStore.moveNode('carol', 'bob');
      const afterMove = orgStore.toJSON();
      expect(findNodeById(orgStore.getTree(), 'bob')!.children).toHaveLength(2);
      expect(orgStore.getTree().children).toHaveLength(1); // only Bob remains under root

      // Undo moveNode → back to afterCategory state
      expect(orgStore.undo()).toBe(true);
      expect(orgStore.toJSON()).toBe(afterCategory);
      expect(orgStore.getTree().children).toHaveLength(2);

      // Undo setNodeCategory → back to afterUpdate state
      expect(orgStore.undo()).toBe(true);
      expect(orgStore.toJSON()).toBe(afterUpdate);
      expect(findNodeById(orgStore.getTree(), 'carol')!.categoryId).toBeUndefined();

      // Undo updateNode → back to afterAdd state
      expect(orgStore.undo()).toBe(true);
      expect(orgStore.toJSON()).toBe(afterAdd);
      expect(findNodeById(orgStore.getTree(), 'bob')!.title).toBe('VP Eng');

      // Undo addChild → back to initial state
      expect(orgStore.undo()).toBe(true);
      expect(orgStore.toJSON()).toBe(initialJson);
      expect(findNodeById(orgStore.getTree(), dave.id)).toBeNull();

      // No more undo
      expect(orgStore.canUndo()).toBe(false);

      // Redo all 4 operations
      expect(orgStore.redo()).toBe(true); // addChild
      expect(orgStore.toJSON()).toBe(afterAdd);

      expect(orgStore.redo()).toBe(true); // updateNode
      expect(orgStore.toJSON()).toBe(afterUpdate);

      expect(orgStore.redo()).toBe(true); // setNodeCategory
      expect(orgStore.toJSON()).toBe(afterCategory);

      expect(orgStore.redo()).toBe(true); // moveNode
      expect(orgStore.toJSON()).toBe(afterMove);

      // No more redo
      expect(orgStore.canRedo()).toBe(false);

      // Final state matches the fully-applied state
      expect(findNodeById(orgStore.getTree(), 'bob')!.title).toBe('CTO');
      expect(findNodeById(orgStore.getTree(), 'carol')!.categoryId).toBe('cat-eng');
      expect(findNodeById(orgStore.getTree(), 'bob')!.children).toHaveLength(2);
    });

    it('redo stack is cleared when a new mutation follows undo', () => {
      const orgStore = new OrgStore(makeTree({
        children: [{ id: 'child1', name: 'Child', title: 'IC' }],
      }));

      orgStore.addChild('root', { name: 'A', title: 'A' });
      orgStore.addChild('root', { name: 'B', title: 'B' });

      // Undo last addChild
      orgStore.undo();
      expect(orgStore.canRedo()).toBe(true);

      // New mutation clears redo
      orgStore.updateNode('child1', { name: 'Updated' });
      expect(orgStore.canRedo()).toBe(false);
    });
  });

  // =========================================================================
  // Workflow 4: Backup → Restore → Verify All State
  // =========================================================================

  describe('Workflow 4: Backup → Restore → Verify All State', () => {
    it('creates backup and restores charts, versions, and settings', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      // Step 1: Create chart with edits and categories
      const categories: ColorCategory[] = [
        { id: 'cat-eng', label: 'Engineering', color: '#ef4444' },
        { id: 'cat-des', label: 'Design', color: '#3b82f6' },
      ];
      const tree: OrgNode = {
        id: 'root',
        name: 'Alice',
        title: 'CEO',
        children: [
          { id: 'bob', name: 'Bob', title: 'VP Eng', categoryId: 'cat-eng' },
          { id: 'carol', name: 'Carol', title: 'VP Design', categoryId: 'cat-des' },
        ],
      };
      const chart = await chartStore.createChartFromTree('Test Chart', tree, categories);

      // Create versions
      const v1 = await chartStore.saveVersion('Release 1.0', tree);
      const modifiedTree = structuredClone(tree);
      modifiedTree.children![0].title = 'CTO';
      const v2 = await chartStore.saveVersion('Release 2.0', modifiedTree);

      // Save settings to storage
      storage.setItem('arbol-settings', JSON.stringify({ fontFamily: 'Arial' }));
      storage.setItem('arbol-theme', 'dark');

      // Step 2: Create backup
      const backup = await createBackup(db, storage);
      expect(backup.data.charts).toHaveLength(2); // default + Test Chart
      expect(backup.data.versions).toHaveLength(2);

      // Step 3: Clear all state
      const freshDb = new ChartDB();
      await freshDb.open();
      const freshStorage = createMemoryStorage();

      // Step 4: Restore from backup
      await restoreFullReplace(freshDb, backup, freshStorage);

      // Step 5: Verify charts restored
      const restoredCharts = await freshDb.getAllCharts();
      expect(restoredCharts).toHaveLength(2);

      const restoredChart = restoredCharts.find((c) => c.name === 'Test Chart');
      expect(restoredChart).toBeDefined();
      expect(restoredChart!.categories).toHaveLength(2);
      expect(restoredChart!.categories.map((c) => c.label)).toEqual(
        expect.arrayContaining(['Engineering', 'Design']),
      );

      // Verify tree data
      expect(restoredChart!.workingTree.children).toHaveLength(2);
      expect(findNodeById(restoredChart!.workingTree, 'bob')!.categoryId).toBe('cat-eng');

      // Verify versions restored
      const restoredVersions = await freshDb.getVersionsByChart(restoredChart!.id);
      expect(restoredVersions).toHaveLength(2);
      expect(restoredVersions.map((v) => v.name)).toEqual(
        expect.arrayContaining(['Release 1.0', 'Release 2.0']),
      );

      // Verify settings restored
      expect(freshStorage.getItem('arbol-settings')).toBe(JSON.stringify({ fontFamily: 'Arial' }));
      expect(freshStorage.getItem('arbol-theme')).toBe('dark');

      freshDb.close();
    });

    it('backup summary is accurate', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      const tree = makeTree({ children: [{ id: 'c1', name: 'C1', title: 'T1' }] });
      await chartStore.createChartFromTree('Chart 1', structuredClone(tree));
      await chartStore.saveVersion('v1', tree);

      await chartStore.createChartFromTree('Chart 2', structuredClone(tree));
      await chartStore.saveVersion('v2', tree);

      const backup = await createBackup(db, storage);
      // 1 default chart + 2 created = 3 charts
      expect(backup.data.charts.length).toBe(3);
      expect(backup.data.versions.length).toBe(2);
      expect(backup.formatVersion).toBe(1);
    });
  });

  // =========================================================================
  // Workflow 5: Category Lifecycle Across Chart Switch
  // =========================================================================

  describe('Workflow 5: Category Lifecycle Across Chart Switch', () => {
    it('preserves per-chart categories and node assignments through switches', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      // Step 1: Create Chart A with 2 categories and assign to nodes
      const categoriesA: ColorCategory[] = [
        { id: 'a-cat-1', label: 'A-Engineering', color: '#ef4444' },
        { id: 'a-cat-2', label: 'A-Design', color: '#3b82f6' },
      ];
      const treeA: OrgNode = {
        id: 'root-a',
        name: 'Alice',
        title: 'CEO',
        children: [
          { id: 'bob-a', name: 'Bob', title: 'VP Eng', categoryId: 'a-cat-1' },
          { id: 'carol-a', name: 'Carol', title: 'VP Design', categoryId: 'a-cat-2' },
        ],
      };
      const chartA = await chartStore.createChartFromTree('Chart A', treeA, categoriesA);

      // Step 2: Create Chart B with different categories
      const categoriesB: ColorCategory[] = [
        { id: 'b-cat-1', label: 'B-Marketing', color: '#10b981' },
        { id: 'b-cat-2', label: 'B-Sales', color: '#f59e0b' },
      ];
      const treeB: OrgNode = {
        id: 'root-b',
        name: 'Xavier',
        title: 'CEO',
        children: [
          { id: 'yara-b', name: 'Yara', title: 'VP Marketing', categoryId: 'b-cat-1' },
        ],
      };
      const chartB = await chartStore.createChartFromTree('Chart B', treeB, categoriesB);

      // Step 3: Switch A → B → A
      await chartStore.switchChart(chartB.id);
      const activeB = await chartStore.getActiveChart();
      expect(activeB!.categories.map((c) => c.label)).toEqual(
        expect.arrayContaining(['B-Marketing', 'B-Sales']),
      );
      expect(findNodeById(activeB!.workingTree, 'yara-b')!.categoryId).toBe('b-cat-1');

      await chartStore.switchChart(chartA.id);

      // Step 4: Verify A's categories and node assignments are preserved
      const reloadedA = await chartStore.getActiveChart();
      expect(reloadedA!.categories).toHaveLength(2);
      expect(reloadedA!.categories.map((c) => c.label)).toEqual(
        expect.arrayContaining(['A-Engineering', 'A-Design']),
      );
      expect(findNodeById(reloadedA!.workingTree, 'bob-a')!.categoryId).toBe('a-cat-1');
      expect(findNodeById(reloadedA!.workingTree, 'carol-a')!.categoryId).toBe('a-cat-2');
    });

    it('CategoryStore works with OrgStore for tagging nodes', () => {
      const catStore = new CategoryStore(storage);

      // Add categories
      const engCat = catStore.add('Engineering', '#ef4444');
      const desCat = catStore.add('Design', '#3b82f6');

      // Create OrgStore and tag nodes
      const tree: OrgNode = {
        id: 'root',
        name: 'Alice',
        title: 'CEO',
        children: [
          { id: 'bob', name: 'Bob', title: 'VP Eng' },
          { id: 'carol', name: 'Carol', title: 'VP Design' },
        ],
      };
      const orgStore = new OrgStore(tree);

      orgStore.setNodeCategory('bob', engCat.id);
      orgStore.setNodeCategory('carol', desCat.id);

      // Verify category assignments
      expect(findNodeById(orgStore.getTree(), 'bob')!.categoryId).toBe(engCat.id);
      expect(findNodeById(orgStore.getTree(), 'carol')!.categoryId).toBe(desCat.id);

      // Verify categories exist in CategoryStore
      expect(catStore.getById(engCat.id)!.label).toBe('Engineering');
      expect(catStore.getById(desCat.id)!.label).toBe('Design');

      // Remove category assignment
      orgStore.setNodeCategory('bob', null);
      expect(findNodeById(orgStore.getTree(), 'bob')!.categoryId).toBeUndefined();

      // Bulk set category
      orgStore.bulkSetCategory(['bob', 'carol'], engCat.id);
      expect(findNodeById(orgStore.getTree(), 'bob')!.categoryId).toBe(engCat.id);
      expect(findNodeById(orgStore.getTree(), 'carol')!.categoryId).toBe(engCat.id);
    });

    it('category changes saved to chart persist through version save/restore', async () => {
      const chartStore = new ChartStore(db, storage);
      await chartStore.initialize();

      const categories: ColorCategory[] = [
        { id: 'cat-1', label: 'Open', color: '#fbbf24' },
      ];
      const tree: OrgNode = {
        id: 'root',
        name: 'Alice',
        title: 'CEO',
        children: [{ id: 'bob', name: 'Bob', title: 'VP', categoryId: 'cat-1' }],
      };

      await chartStore.createChartFromTree('Versioned Chart', tree, categories);

      // Save version with category assignment
      const v1 = await chartStore.saveVersion('with-categories', tree);

      // Modify tree — remove category
      const modifiedTree = structuredClone(tree);
      delete modifiedTree.children![0].categoryId;
      await chartStore.saveVersion('without-categories', modifiedTree);

      // Restore v1 — category should be back
      const restored = await chartStore.restoreVersion(v1.id);
      expect(findNodeById(restored, 'bob')!.categoryId).toBe('cat-1');
    });
  });
});
