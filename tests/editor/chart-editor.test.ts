import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartRecord, VersionRecord, OrgNode, ColorCategory } from '../../src/types';
import { ChartEditor, ChartEditorOptions } from '../../src/editor/chart-editor';

vi.mock('../../src/ui/chart-export-dialog', () => ({
  showChartExportDialog: vi.fn().mockReturnValue({ destroy: () => {} }),
}));
vi.mock('../../src/export/chart-exporter', () => ({
  buildChartBundle: vi.fn().mockReturnValue({ format: 'arbol-chart', version: 1, chart: {}, versions: [] }),
  downloadChartBundle: vi.fn(),
}));
vi.mock('../../src/ui/confirm-dialog', () => ({
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../src/ui/input-dialog', () => ({
  showInputDialog: vi.fn().mockResolvedValue(null),
}));

import { showChartExportDialog } from '../../src/ui/chart-export-dialog';
import { buildChartBundle, downloadChartBundle } from '../../src/export/chart-exporter';
import { showInputDialog } from '../../src/ui/input-dialog';

function makeTree(): OrgNode {
  return { id: 'root', name: 'Alice', title: 'CEO', children: [] };
}

function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    id: 'chart-1',
    name: 'Test Chart',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    tree: makeTree(),
    ...overrides,
  };
}

function mockChartStore(charts: ChartRecord[] = [], versions: VersionRecord[] = []) {
  return {
    getCharts: vi.fn().mockResolvedValue(charts),
    getActiveChartId: vi.fn().mockReturnValue(charts[0]?.id ?? null),
    getVersions: vi.fn().mockResolvedValue(versions),
    onChange: vi.fn().mockReturnValue(() => {}),
    createChart: vi.fn().mockResolvedValue(charts[0] ?? makeChart()),
    switchChart: vi.fn().mockResolvedValue(charts[0] ?? makeChart()),
    getActiveChart: vi.fn().mockImplementation(async () => charts[0]),
    deleteChart: vi.fn().mockResolvedValue(undefined),
    renameChart: vi.fn().mockResolvedValue(undefined),
    duplicateChart: vi.fn().mockResolvedValue(makeChart({ id: 'chart-dup', name: 'Copy' })),
    saveVersion: vi.fn().mockResolvedValue(makeVersion()),
    saveWorkingTree: vi.fn().mockResolvedValue(undefined),
    restoreVersion: vi.fn().mockResolvedValue(makeTree()),
    deleteVersion: vi.fn().mockResolvedValue(undefined),
    isDirty: vi.fn().mockReturnValue(false),
  } as unknown as ChartEditorOptions['chartStore'];
}

describe('ChartEditor – Export button', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  const chart = makeChart();
  const versions = [makeVersion(), makeVersion({ id: 'ver-2', name: 'v2' })];

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart], versions);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    // Wait for async refresh (renderChartList / renderVersionList)
    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('renders an Export button in each chart item', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const buttons = chartItem.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.getAttribute('data-tooltip'));
    expect(labels).toContain('Export');
  });

  it('places Export between Duplicate and Delete', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const buttons = chartItem.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.getAttribute('data-tooltip'));
    const dupIdx = labels.indexOf('Duplicate');
    const expIdx = labels.indexOf('Export');
    const delIdx = labels.indexOf('Delete');
    expect(expIdx).toBe(dupIdx + 1);
    expect(delIdx).toBe(expIdx + 1);
  });

  it('clicking Export calls showChartExportDialog with chart name and versions', async () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Export',
    )!;
    exportBtn.click();

    // Wait for async handler (getVersions is async)
    await vi.waitFor(() => {
      expect(showChartExportDialog).toHaveBeenCalled();
    });

    expect(store.getVersions).toHaveBeenCalledWith(chart.id);
    const dialogOpts = (showChartExportDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(dialogOpts.chartName).toBe('Test Chart');
    expect(dialogOpts.versions).toEqual(versions);
    expect(typeof dialogOpts.onExport).toBe('function');
    expect(typeof dialogOpts.onCancel).toBe('function');
  });

  it('onExport callback builds and downloads the bundle', async () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Export',
    )!;
    exportBtn.click();

    await vi.waitFor(() => {
      expect(showChartExportDialog).toHaveBeenCalled();
    });

    const dialogOpts = (showChartExportDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];

    // Simulate user selecting ver-1 only
    dialogOpts.onExport(['ver-1']);

    expect(buildChartBundle).toHaveBeenCalledWith(chart, [versions[0]]);
    expect(downloadChartBundle).toHaveBeenCalledWith(
      { format: 'arbol-chart', version: 1, chart: {}, versions: [] },
      'Test Chart',
    );
  });

  it('shows error when getVersions fails', async () => {
    store.getVersions = vi.fn().mockRejectedValue(new Error('DB error'));

    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Export',
    )!;
    exportBtn.click();

    await vi.waitFor(() => {
      const errorEl = container.querySelector('div');
      const allText = container.textContent ?? '';
      expect(allText).toContain('DB error');
    });

    expect(showChartExportDialog).not.toHaveBeenCalled();
  });

  it('Export button has ghost styling, not danger', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Export',
    )!;
    expect(exportBtn.className).toContain('btn-ghost');
    expect(exportBtn.className).not.toContain('btn-danger');
  });
});

describe('ChartEditor – Compare button', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  let onVersionCompare: ReturnType<typeof vi.fn<(version: VersionRecord) => void>>;
  const chart = makeChart();
  const versions = [makeVersion(), makeVersion({ id: 'ver-2', name: 'v2' })];

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart], versions);
    onVersionCompare = vi.fn();

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare,
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('renders a Compare button in each version item', async () => {
    // Expand versions — click the chart item to show version list
    await vi.waitFor(() => {
      const allButtons = Array.from(container.querySelectorAll('button'));
      const labels = allButtons.map((b) => b.getAttribute('data-tooltip'));
      expect(labels).toContain('Compare');
    });
    const compareButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.getAttribute('data-tooltip') === 'Compare',
    );
    expect(compareButtons.length).toBe(versions.length);
  });

  it('calls onVersionCompare when Compare button is clicked', async () => {
    await vi.waitFor(() => {
      const allButtons = Array.from(container.querySelectorAll('button'));
      expect(allButtons.map((b) => b.getAttribute('data-tooltip'))).toContain('Compare');
    });

    const compareBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Compare',
    )!;
    compareBtn.click();

    expect(onVersionCompare).toHaveBeenCalledTimes(1);
    const calledWith = onVersionCompare.mock.calls[0][0];
    expect(calledWith).toHaveProperty('id');
    expect(calledWith).toHaveProperty('chartId');
    expect(calledWith).toHaveProperty('name');
    expect(calledWith).toHaveProperty('tree');
  });

  it('places Compare button between View and Restore', async () => {
    await vi.waitFor(() => {
      const allButtons = Array.from(container.querySelectorAll('button'));
      expect(allButtons.map((b) => b.getAttribute('data-tooltip'))).toContain('Compare');
    });

    // Get buttons within the first version item's action row
    const allButtons = Array.from(container.querySelectorAll('button'));
    const versionActionButtons = allButtons.filter(
      (b) => ['View', 'Compare', 'Restore', 'Delete'].includes(b.getAttribute('data-tooltip') ?? ''),
    );
    // First group of 4 = first version item
    const labels = versionActionButtons.slice(0, 4).map((b) => b.getAttribute('data-tooltip'));
    const viewIdx = labels.indexOf('View');
    const compareIdx = labels.indexOf('Compare');
    const restoreIdx = labels.indexOf('Restore');
    expect(compareIdx).toBe(viewIdx + 1);
    expect(restoreIdx).toBe(compareIdx + 1);
  });
});

describe('ChartEditor – chart item keyboard accessibility', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  const chart1 = makeChart({ id: 'chart-1', name: 'Active Chart' });
  const chart2 = makeChart({ id: 'chart-2', name: 'Other Chart' });

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart1, chart2], []);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('inactive chart item has role="listitem" and tabindex="0"', () => {
    const inactiveItem = container.querySelector('[data-chart-id="chart-2"]') as HTMLElement;
    expect(inactiveItem).not.toBeNull();
    expect(inactiveItem.getAttribute('role')).toBe('listitem');
    expect(inactiveItem.getAttribute('tabindex')).toBe('0');
  });

  it('active chart item does not have role="button"', () => {
    const activeItem = container.querySelector('[data-chart-id="chart-1"]') as HTMLElement;
    expect(activeItem).not.toBeNull();
    expect(activeItem.getAttribute('role')).toBe('listitem');
  });

  it('Enter key on inactive chart item switches chart', async () => {
    const inactiveItem = container.querySelector('[data-chart-id="chart-2"]') as HTMLElement;
    inactiveItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => {
      expect(store.switchChart).toHaveBeenCalledWith('chart-2');
    });
  });

  it('Space key on inactive chart item switches chart', async () => {
    const inactiveItem = container.querySelector('[data-chart-id="chart-2"]') as HTMLElement;
    inactiveItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(store.switchChart).toHaveBeenCalledWith('chart-2');
    });
  });
});

describe('ChartEditor – action button accessibility', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  const chart = makeChart();
  const versions = [makeVersion()];

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    const store = mockChartStore([chart], versions);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('chart action buttons have data-tooltip and aria-label attributes', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const buttons = Array.from(chartItem.querySelectorAll('button'));
    const expectedLabels = ['Rename', 'Duplicate', 'Export', 'Delete'];

    for (const label of expectedLabels) {
      const btn = buttons.find((b) => b.getAttribute('data-tooltip') === label);
      expect(btn, `button with data-tooltip "${label}" should exist`).not.toBeUndefined();
      expect(btn!.getAttribute('aria-label')).toBe(label);
    }
  });

  it('chart action buttons render icon-only (no text labels)', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const buttons = Array.from(chartItem.querySelectorAll('button'));
    const actionBtns = buttons.filter((b) =>
      ['Rename', 'Duplicate', 'Export', 'Delete'].includes(b.getAttribute('data-tooltip') ?? ''),
    );
    expect(actionBtns.length).toBe(4);
    for (const btn of actionBtns) {
      expect(btn.textContent!.length).toBeLessThanOrEqual(3);
    }
  });

  it('version action buttons have data-tooltip and aria-label attributes', async () => {
    await vi.waitFor(() => {
      const buttons = Array.from(container.querySelectorAll('button'));
      expect(buttons.map((b) => b.getAttribute('data-tooltip'))).toContain('View');
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const expectedLabels = ['View', 'Compare', 'Restore', 'Delete'];

    for (const label of expectedLabels) {
      const btn = buttons.find((b) => b.getAttribute('data-tooltip') === label);
      expect(btn, `button with data-tooltip "${label}" should exist`).not.toBeUndefined();
      expect(btn!.getAttribute('aria-label')).toBe(label);
    }
  });
});

describe('ChartEditor – active vs inactive chart actions', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  const chart1 = makeChart({ id: 'chart-1', name: 'Active Chart' });
  const chart2 = makeChart({ id: 'chart-2', name: 'Other Chart' });

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    const store = mockChartStore([chart1, chart2], []);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('active chart item has action buttons', () => {
    const activeItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const actions = activeItem.querySelector('.chart-item-actions');
    expect(actions).not.toBeNull();
  });

  it('inactive chart item does not have action buttons', () => {
    const inactiveItem = container.querySelector('[data-chart-id="chart-2"]')!;
    const actions = inactiveItem.querySelector('.chart-item-actions');
    expect(actions).toBeNull();
  });
});

describe('ChartEditor – rename via dialog', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  const chart = makeChart({ id: 'chart-1', name: 'Original Name' });

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart], []);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('clicking rename button opens input dialog', async () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const renameBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Rename',
    )!;
    renameBtn.click();

    await vi.waitFor(() => {
      expect(showInputDialog).toHaveBeenCalledTimes(1);
    });

    const opts = (showInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(opts.title).toBe('Rename Chart');
    expect(opts.initialValue).toBe('Original Name');
  });

  it('submitting new name calls chartStore.renameChart', async () => {
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce('New Name');

    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const renameBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Rename',
    )!;
    renameBtn.click();

    await vi.waitFor(() => {
      expect(store.renameChart).toHaveBeenCalledWith('chart-1', 'New Name');
    });
  });

  it('canceling dialog does not call renameChart', async () => {
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const renameBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Rename',
    )!;
    renameBtn.click();

    await vi.waitFor(() => {
      expect(showInputDialog).toHaveBeenCalledTimes(1);
    });
    expect(store.renameChart).not.toHaveBeenCalled();
  });

  it('entering same name does not call renameChart', async () => {
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Original Name');

    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const renameBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Rename',
    )!;
    renameBtn.click();

    await vi.waitFor(() => {
      expect(showInputDialog).toHaveBeenCalledTimes(1);
    });
    expect(store.renameChart).not.toHaveBeenCalled();
  });

  it('chart search input has aria-label for screen readers', async () => {
    const searchInput = container.querySelector('.chart-search');
    expect(searchInput).not.toBeNull();
    expect(searchInput!.getAttribute('aria-label')).toBe('Search charts');
  });

});

describe('ChartEditor – shows newly imported chart as active after refresh', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  const chart1 = makeChart({ id: 'chart-1', name: 'Original Org' });

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart1], []);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('shows newly imported chart as active after createChartFromTree', async () => {
    // Verify initial state: chart-1 is active
    let activeItems = container.querySelectorAll('.chart-item.active');
    expect(activeItems.length).toBe(1);
    expect(activeItems[0]!.textContent).toContain('Original Org');

    // Simulate import: store now has a new chart as active
    const importedChart = makeChart({ id: 'chart-2', name: 'Imported Org' });
    store.getCharts = vi.fn().mockResolvedValue([importedChart, chart1]);
    store.getActiveChartId = vi.fn().mockReturnValue('chart-2');

    // Explicitly refresh (this is what main.ts must do after createChartFromTree)
    await editor.refresh();

    // The ChartEditor should now show the imported chart as active
    activeItems = container.querySelectorAll('.chart-item.active');
    expect(activeItems.length).toBe(1);
    expect(activeItems[0]!.textContent).toContain('Imported Org');
  });
});

describe('ChartEditor – delete active chart calls onChartSwitch', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  let onChartSwitch: ReturnType<typeof vi.fn<(chart: ChartRecord) => void>>;
  const chart1 = makeChart({ id: 'chart-1', name: 'Active Chart' });
  const chart2 = makeChart({
    id: 'chart-2',
    name: 'Other Chart',
    workingTree: { id: 'r2', name: 'Bob', title: 'CTO', children: [] },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart1, chart2], []);
    onChartSwitch = vi.fn();

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch,
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('calls onChartSwitch with remaining chart after deleting active chart', async () => {
    // deleteChart mock simulates the real behavior: after deletion, active switches to chart2
    store.deleteChart = vi.fn().mockImplementation(async () => {
      store.getActiveChartId = vi.fn().mockReturnValue('chart-2');
      store.getActiveChart = vi.fn().mockResolvedValue(chart2);
      store.getCharts = vi.fn().mockResolvedValue([chart2]);
    });

    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const deleteBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.getAttribute('data-tooltip') === 'Delete',
    )!;
    deleteBtn.click();

    await vi.waitFor(() => {
      expect(store.deleteChart).toHaveBeenCalledWith('chart-1');
    });

    await vi.waitFor(() => {
      expect(onChartSwitch).toHaveBeenCalledTimes(1);
      expect(onChartSwitch.mock.calls[0][0].id).toBe('chart-2');
    });
  });
});
