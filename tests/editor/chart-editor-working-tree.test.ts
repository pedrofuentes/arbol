import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartEditor, type ChartEditorOptions } from '../../src/editor/chart-editor';
import { t } from '../../src/i18n';
import { OrgStore } from '../../src/store/org-store';
import type { ChartRecord, OrgNode, VersionRecord } from '../../src/types';

vi.mock('../../src/ui/input-dialog', () => ({
  showInputDialog: vi.fn().mockResolvedValue('Snapshot'),
}));

function makeTree(id: string, peopleCount: number): OrgNode {
  return {
    id,
    name: `${id} root`,
    title: 'CEO',
    children: Array.from({ length: peopleCount - 1 }, (_, index) => ({
      id: `${id}-person-${index + 1}`,
      name: `Person ${index + 1}`,
      title: 'Engineer',
    })),
  };
}

function makeChart(id: string, peopleCount: number): ChartRecord {
  return {
    id,
    name: `${id} chart`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workingTree: makeTree(id, peopleCount),
    categories: [],
  };
}

function expectedMeta(peopleCount: number, versionCount: number): string {
  const versionSuffix =
    versionCount === 1 ? t('chart_editor.version_suffix') : t('chart_editor.versions_suffix');
  return `${peopleCount} ${t('chart_editor.people_suffix')} · ${versionCount} ${versionSuffix}`;
}

function createChartStore(charts: ChartRecord[]) {
  let activeChartId = charts[0]?.id ?? null;
  let versions: VersionRecord[] = [];
  let workingTreeSavedListener: ((event: { chartId: string; peopleCount: number }) => void) | null =
    null;
  const unsubscribeWorkingTreeSaved = vi.fn(() => {
    workingTreeSavedListener = null;
  });

  return {
    getCharts: vi.fn(async () => charts),
    getActiveChartId: vi.fn(() => activeChartId),
    getVersions: vi.fn(async (chartId?: string) =>
      versions.filter((version) => version.chartId === (chartId ?? activeChartId)),
    ),
    onChange: vi.fn(() => () => {}),
    onWorkingTreeSaved: vi.fn(
      (listener: (event: { chartId: string; peopleCount: number }) => void) => {
        workingTreeSavedListener = listener;
        return unsubscribeWorkingTreeSaved;
      },
    ),
    unsubscribeWorkingTreeSaved,
    switchChart: vi.fn(async (chartId: string) => {
      const chart = charts.find((candidate) => candidate.id === chartId)!;
      activeChartId = chartId;
      return chart;
    }),
    saveWorkingTree: vi.fn(async (tree: OrgNode) => {
      const chart = charts.find((candidate) => candidate.id === activeChartId)!;
      chart.workingTree = tree;
      workingTreeSavedListener?.({
        chartId: chart.id,
        peopleCount: 1 + (tree.children?.length ?? 0),
      });
    }),
    saveVersion: vi.fn(async (name: string, tree: OrgNode) => {
      const version: VersionRecord = {
        id: `version-${versions.length + 1}`,
        chartId: activeChartId!,
        name,
        createdAt: new Date().toISOString(),
        tree,
      };
      versions = [...versions, version];
      return version;
    }),
    restoreVersion: vi.fn(
      async (versionId: string) => versions.find((version) => version.id === versionId)!.tree,
    ),
    createChart: vi.fn(),
    getActiveChart: vi.fn(async () => charts.find((candidate) => candidate.id === activeChartId)),
    deleteChart: vi.fn(),
    renameChart: vi.fn(),
    duplicateChart: vi.fn(),
    deleteVersion: vi.fn(),
    isDirty: vi.fn(() => false),
  };
}

describe('ChartEditor working-tree people counts', () => {
  let editor: ChartEditor | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    editor?.destroy();
    container?.remove();
    editor = null;
    container = null;
  });

  async function render(charts: ChartRecord[]) {
    const chartStore = createChartStore(charts);
    const orgStore = new OrgStore(charts[0].workingTree);
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = new ChartEditor({
      container,
      chartStore: chartStore as unknown as ChartEditorOptions['chartStore'],
      onChartSwitch: (chart) => orgStore.replaceTree(chart.workingTree),
      onVersionRestore: (tree) => orgStore.replaceTree(tree),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => orgStore.getTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container!.querySelector('[data-chart-id]')).not.toBeNull();
    });
    return { chartStore, orgStore };
  }

  function getChartRow(chartId: string): HTMLElement {
    return container!.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`)!;
  }

  function getMeta(chartId: string): HTMLElement {
    return getChartRow(chartId).querySelector<HTMLElement>('.chart-item-meta')!;
  }

  it('patches meta in place after the debounced working-tree save without reloading lists', async () => {
    const chart = makeChart('active', 1);
    const { chartStore, orgStore } = await render([chart]);
    const rowBeforeSave = getChartRow(chart.id);
    rowBeforeSave.focus();
    chartStore.getCharts.mockClear();
    chartStore.getVersions.mockClear();
    const replacementTree = makeTree('sample', 3);

    orgStore.fromJSON(JSON.stringify(replacementTree));
    await chartStore.saveWorkingTree(orgStore.getTree());

    const rowAfterSave = getChartRow(chart.id);
    expect(chartStore.onWorkingTreeSaved).toHaveBeenCalledOnce();
    expect(getMeta(chart.id).textContent).toBe(expectedMeta(3, 0));
    expect(rowAfterSave).toBe(rowBeforeSave);
    expect(document.activeElement).toBe(rowBeforeSave);
    expect(chartStore.getCharts).not.toHaveBeenCalled();
    expect(chartStore.getVersions).not.toHaveBeenCalled();
  });

  it('keeps a saved people count when a stale refresh snapshot resolves afterward', async () => {
    const chart = makeChart('active', 1);
    const { chartStore, orgStore } = await render([chart]);
    let resolveCharts!: (charts: ChartRecord[]) => void;
    const staleSnapshot = makeChart('active', 1);
    chartStore.getCharts.mockImplementationOnce(
      () =>
        new Promise<ChartRecord[]>((resolve) => {
          resolveCharts = resolve;
        }),
    );

    const refresh = editor!.refresh();
    await vi.waitFor(() => {
      expect(container!.querySelector('[data-chart-id]')).toBeNull();
    });

    const replacementTree = makeTree('saved-during-refresh', 3);
    orgStore.fromJSON(JSON.stringify(replacementTree));
    await chartStore.saveWorkingTree(orgStore.getTree());
    resolveCharts([staleSnapshot]);
    await refresh;

    expect(getMeta(chart.id).textContent).toBe(expectedMeta(3, 0));
  });

  it('quietly retains a saved count while the active chart is filtered out', async () => {
    const chart = makeChart('active', 1);
    const { chartStore, orgStore } = await render([chart]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const searchInput = container!.querySelector<HTMLInputElement>('.chart-search')!;
      searchInput.value = 'does not match';
      searchInput.dispatchEvent(new Event('input'));
      await vi.waitFor(() => {
        expect(container!.querySelector('[data-chart-id]')).toBeNull();
      });

      const replacementTree = makeTree('saved-while-filtered', 3);
      orgStore.fromJSON(JSON.stringify(replacementTree));
      await expect(chartStore.saveWorkingTree(orgStore.getTree())).resolves.toBeUndefined();
      expect(warn).not.toHaveBeenCalled();

      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      await vi.waitFor(() => {
        expect(getMeta(chart.id).textContent).toBe(expectedMeta(3, 0));
      });
    } finally {
      warn.mockRestore();
    }
  });

  it('unsubscribes working-tree save updates when destroyed', async () => {
    const chart = makeChart('active', 1);
    const { chartStore, orgStore } = await render([chart]);
    const renderedMeta = getMeta(chart.id);
    const originalMeta = renderedMeta.textContent;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      editor!.destroy();
      editor = null;
      expect(chartStore.unsubscribeWorkingTreeSaved).toHaveBeenCalledOnce();

      const replacementTree = makeTree('saved-after-destroy', 3);
      orgStore.fromJSON(JSON.stringify(replacementTree));
      await chartStore.saveWorkingTree(orgStore.getTree());

      expect(renderedMeta.textContent).toBe(originalMeta);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('shows the target chart people count immediately after switching charts', async () => {
    const initial = makeChart('initial', 1);
    const target = makeChart('larger', 4);
    await render([initial, target]);

    getChartRow(target.id).click();

    await vi.waitFor(() => {
      expect(getChartRow(target.id).classList.contains('active')).toBe(true);
      expect(getMeta(target.id).textContent).toBe(expectedMeta(4, 0));
    });
  });

  it('keeps people and version counts correct after saving and restoring a version', async () => {
    const chart = makeChart('active', 1);
    const { chartStore, orgStore } = await render([chart]);
    orgStore.fromJSON(JSON.stringify(makeTree('saved', 3)));
    await chartStore.saveWorkingTree(orgStore.getTree());

    container!.querySelector<HTMLButtonElement>('.version-section-header button')!.click();

    await vi.waitFor(() => {
      expect(chartStore.saveVersion).toHaveBeenCalledOnce();
      expect(getMeta(chart.id).textContent).toBe(expectedMeta(3, 1));
    });
    const version = await chartStore.saveVersion.mock.results[0].value;

    orgStore.fromJSON(JSON.stringify(makeTree('changed', 2)));
    await chartStore.saveWorkingTree(orgStore.getTree());
    expect(getMeta(chart.id).textContent).toBe(expectedMeta(2, 1));

    await editor!.restoreVersion(version);
    await chartStore.saveWorkingTree(orgStore.getTree());

    expect(getMeta(chart.id).textContent).toBe(expectedMeta(3, 1));
  });
});
