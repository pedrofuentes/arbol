import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChartEditor, type ChartEditorOptions } from '../src/editor/chart-editor';
import { ChartDB } from '../src/store/chart-db';
import { ChartStore } from '../src/store/chart-store';
import { OrgStore } from '../src/store/org-store';
import { showConfirmDialog } from '../src/ui/confirm-dialog';

vi.mock('../src/ui/confirm-dialog', () => ({
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));

const mainSource = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');

describe('main version-history header wiring', () => {
  it('mounts the chart name and version status in the visible header center', () => {
    expect(mainSource).toContain("const headerCenter = document.getElementById('header-center')!");
    expect(mainSource).toContain('headerCenter.appendChild(chartNameContainer)');
    expect(mainSource).not.toContain('offscreenHost.appendChild(chartNameContainer)');
  });

  it('updates the header from edits since the last version', () => {
    expect(mainSource).toContain(
      'chartNameHeader.setEditCount(chartStore.getEditsSinceLastVersion(store.getTree()))',
    );
    expect(mainSource).not.toContain('chartNameHeader.setDirty(');
  });

  it('confirms a saved version with its name in a success toast', () => {
    expect(mainSource).toContain(
      "showToast(t('toast.version_saved', { name: name.trim() }), 'success')",
    );
  });
});

describe('version preview restore safety', () => {
  let db: ChartDB | null = null;
  let editor: ChartEditor | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    editor?.destroy();
    container?.remove();
    db?.close();
    indexedDB.deleteDatabase('arbol-db');
    editor = null;
    container = null;
    db = null;
    vi.mocked(showConfirmDialog).mockReset().mockResolvedValue(true);
  });

  async function createPreviewScenario(target: 'older' | 'newest') {
    db = new ChartDB();
    await db.open();
    const chartStore = new ChartStore(db);
    const chart = await chartStore.initialize();
    const orgStore = new OrgStore(chart.workingTree);

    const older = await chartStore.saveVersion('Older', orgStore.getTree());
    orgStore.replaceTree(structuredClone(orgStore.getTree()));
    orgStore.addChild('root', { name: 'Saved teammate', title: 'Engineer' });
    const newest = await chartStore.saveVersion('Newest', orgStore.getTree());
    orgStore.replaceTree(structuredClone(orgStore.getTree()));
    orgStore.addChild('root', { name: 'Pending teammate', title: 'Designer' });
    const workingTreeBeforePreview = structuredClone(orgStore.getTree());
    const targetVersion = target === 'older' ? older : newest;

    container = document.createElement('div');
    document.body.appendChild(container);
    const editorChartStore = new Proxy(chartStore, {
      get(target, property, receiver) {
        if (property === 'onChange' || property === 'onWorkingTreeSaved') {
          return () => () => {};
        }
        const value = Reflect.get(target, property, receiver) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    editor = new ChartEditor({
      container,
      chartStore: editorChartStore as ChartEditorOptions['chartStore'],
      onChartSwitch: vi.fn(),
      onVersionRestore: (tree) => orgStore.replaceTree(tree),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => orgStore.getTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });
    await vi.waitFor(() => {
      expect(container!.querySelector(`[data-version-id="${newest.id}"]`)).not.toBeNull();
    });

    orgStore.replaceTree(targetVersion.tree);
    return { chartStore, orgStore, targetVersion, workingTreeBeforePreview, older, newest };
  }

  it.each(['older', 'newest'] as const)(
    'saves the pre-preview edits before restoring the %s version',
    async (target) => {
      const { chartStore, orgStore, targetVersion, workingTreeBeforePreview, older, newest } =
        await createPreviewScenario(target);

      await editor!.restoreVersion(targetVersion, workingTreeBeforePreview);

      expect(orgStore.getTree()).toEqual(targetVersion.tree);
      const versions = await chartStore.getVersions();
      const safetyVersions = versions.filter(
        (version) => version.id !== older.id && version.id !== newest.id,
      );
      expect(safetyVersions).toHaveLength(1);
      expect(safetyVersions[0].tree).toEqual(workingTreeBeforePreview);
      expect(safetyVersions[0].tree).not.toEqual(targetVersion.tree);
    },
  );

  it('keeps the preview active when restore confirmation is canceled', async () => {
    const { orgStore, targetVersion, workingTreeBeforePreview } =
      await createPreviewScenario('older');
    vi.mocked(showConfirmDialog).mockResolvedValueOnce(false);

    await editor!.restoreVersion(targetVersion, workingTreeBeforePreview);

    expect(orgStore.getTree()).toEqual(targetVersion.tree);
  });
});
