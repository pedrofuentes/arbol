import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChartEditor, type ChartEditorOptions } from '../src/editor/chart-editor';
import { ChartDB } from '../src/store/chart-db';
import { ChartStore } from '../src/store/chart-store';
import { OrgStore } from '../src/store/org-store';
import { showConfirmDialog } from '../src/ui/confirm-dialog';
import type { OrgNode, VersionRecord } from '../src/types';

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

  it('hands the original preview tree to the version-viewer restore action', () => {
    expect(mainSource).toContain('await chartEditor.restoreVersion(version, savedTree)');
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

    return { chartStore, orgStore, targetVersion, workingTreeBeforePreview, older, newest };
  }

  async function clickSidebarRestore(version: VersionRecord): Promise<void> {
    let restoreButton: HTMLButtonElement | null = null;
    await vi.waitFor(() => {
      const row = container!.querySelector<HTMLElement>(`[data-version-id="${version.id}"]`);
      restoreButton =
        row?.querySelector<HTMLButtonElement>('button[data-tooltip="Restore"]') ?? null;
      expect(restoreButton).not.toBeNull();
    });
    restoreButton!.click();
  }

  async function expectSafetyVersion(
    chartStore: ChartStore,
    originalVersions: VersionRecord[],
    expectedTree: OrgNode,
  ): Promise<void> {
    await vi.waitFor(async () => {
      const versions = await chartStore.getVersions();
      const safetyVersions = versions.filter(
        (version) => !originalVersions.some((original) => original.id === version.id),
      );
      expect(safetyVersions).toHaveLength(1);
      expect(safetyVersions[0].tree).toEqual(expectedTree);
    });
  }

  it('saves pre-preview edits when sidebar Restore targets an older version', async () => {
    const { chartStore, orgStore, targetVersion, workingTreeBeforePreview, older, newest } =
      await createPreviewScenario('older');
    editor!.setViewingVersion(targetVersion.id, workingTreeBeforePreview);
    orgStore.replaceTree(targetVersion.tree);

    await clickSidebarRestore(targetVersion);

    await expectSafetyVersion(chartStore, [older, newest], workingTreeBeforePreview);
    expect(orgStore.getTree()).toEqual(targetVersion.tree);
  });

  it('creates a safety version when sidebar Restore targets the newest version', async () => {
    const { chartStore, orgStore, targetVersion, workingTreeBeforePreview, older, newest } =
      await createPreviewScenario('newest');
    editor!.setViewingVersion(targetVersion.id, workingTreeBeforePreview);
    orgStore.replaceTree(targetVersion.tree);

    await clickSidebarRestore(targetVersion);

    await expectSafetyVersion(chartStore, [older, newest], workingTreeBeforePreview);
    expect(orgStore.getTree()).toEqual(targetVersion.tree);
  });

  it('keeps the original pre-preview tree across nested previews before restore', async () => {
    const { chartStore, orgStore, workingTreeBeforePreview, older, newest } =
      await createPreviewScenario('older');
    editor!.setViewingVersion(older.id, workingTreeBeforePreview);
    orgStore.replaceTree(older.tree);
    editor!.setViewingVersion(newest.id, orgStore.getTree());
    orgStore.replaceTree(newest.tree);

    await clickSidebarRestore(newest);

    await expectSafetyVersion(chartStore, [older, newest], workingTreeBeforePreview);
    expect(orgStore.getTree()).toEqual(newest.tree);
  });

  it('restores the working tree without creating a version when the preview is closed', async () => {
    const { chartStore, orgStore, targetVersion, workingTreeBeforePreview } =
      await createPreviewScenario('older');
    const versionCountBeforePreview = (await chartStore.getVersions()).length;
    editor!.setViewingVersion(targetVersion.id, workingTreeBeforePreview);
    orgStore.replaceTree(targetVersion.tree);

    const treeToRestore = editor!.setViewingVersion(null) as unknown as OrgNode | null;
    if (treeToRestore) orgStore.replaceTree(treeToRestore);

    expect(orgStore.getTree()).toEqual(workingTreeBeforePreview);
    expect(await chartStore.getVersions()).toHaveLength(versionCountBeforePreview);
  });
});
