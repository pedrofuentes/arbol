import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartRecord, VersionRecord, OrgNode, ColorCategory } from '../../src/types';
import { ChartEditor, ChartEditorOptions } from '../../src/editor/chart-editor';

vi.mock('../../src/ui/export-dialog', () => ({
  showExportDialog: vi.fn().mockReturnValue({ destroy: () => {} }),
}));
vi.mock('../../src/export/chart-exporter', () => ({
  buildChartBundle: vi.fn().mockReturnValue({ format: 'arbol-chart', version: 1, chart: {}, versions: [] }),
  downloadChartBundle: vi.fn(),
}));
vi.mock('../../src/ui/confirm-dialog', () => ({
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));

import { showExportDialog } from '../../src/ui/export-dialog';
import { buildChartBundle, downloadChartBundle } from '../../src/export/chart-exporter';

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
    const labels = Array.from(buttons).map((b) => b.textContent);
    expect(labels).toContain('Export');
  });

  it('places Export between Duplicate and Delete', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const buttons = chartItem.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent);
    const dupIdx = labels.indexOf('Duplicate');
    const expIdx = labels.indexOf('Export');
    const delIdx = labels.indexOf('Delete');
    expect(expIdx).toBe(dupIdx + 1);
    expect(delIdx).toBe(expIdx + 1);
  });

  it('clicking Export calls showExportDialog with chart name and versions', async () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    )!;
    exportBtn.click();

    // Wait for async handler (getVersions is async)
    await vi.waitFor(() => {
      expect(showExportDialog).toHaveBeenCalled();
    });

    expect(store.getVersions).toHaveBeenCalledWith(chart.id);
    const dialogOpts = (showExportDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(dialogOpts.chartName).toBe('Test Chart');
    expect(dialogOpts.versions).toEqual(versions);
    expect(typeof dialogOpts.onExport).toBe('function');
    expect(typeof dialogOpts.onCancel).toBe('function');
  });

  it('onExport callback builds and downloads the bundle', async () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    )!;
    exportBtn.click();

    await vi.waitFor(() => {
      expect(showExportDialog).toHaveBeenCalled();
    });

    const dialogOpts = (showExportDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];

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
      (b) => b.textContent === 'Export',
    )!;
    exportBtn.click();

    await vi.waitFor(() => {
      const errorEl = container.querySelector('div');
      const allText = container.textContent ?? '';
      expect(allText).toContain('DB error');
    });

    expect(showExportDialog).not.toHaveBeenCalled();
  });

  it('Export button has secondary styling, not danger', () => {
    const chartItem = container.querySelector('[data-chart-id="chart-1"]')!;
    const exportBtn = Array.from(chartItem.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    )!;
    expect(exportBtn.className).toContain('btn-secondary');
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
      const labels = allButtons.map((b) => b.textContent);
      expect(labels).toContain('Compare');
    });
    const compareButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent === 'Compare',
    );
    expect(compareButtons.length).toBe(versions.length);
  });

  it('calls onVersionCompare when Compare button is clicked', async () => {
    await vi.waitFor(() => {
      const allButtons = Array.from(container.querySelectorAll('button'));
      expect(allButtons.map((b) => b.textContent)).toContain('Compare');
    });

    const compareBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Compare',
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
      expect(allButtons.map((b) => b.textContent)).toContain('Compare');
    });

    // Get buttons within the first version item's action row
    const allButtons = Array.from(container.querySelectorAll('button'));
    const versionActionButtons = allButtons.filter(
      (b) => ['View', 'Compare', 'Restore', 'Delete'].includes(b.textContent ?? ''),
    );
    // First group of 4 = first version item
    const labels = versionActionButtons.slice(0, 4).map((b) => b.textContent);
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

  it('inactive chart item has role="button" and tabindex="0"', () => {
    const inactiveItem = container.querySelector('[data-chart-id="chart-2"]') as HTMLElement;
    expect(inactiveItem).not.toBeNull();
    expect(inactiveItem.getAttribute('role')).toBe('button');
    expect(inactiveItem.getAttribute('tabindex')).toBe('0');
  });

  it('active chart item does not have role="button"', () => {
    const activeItem = container.querySelector('[data-chart-id="chart-1"]') as HTMLElement;
    expect(activeItem).not.toBeNull();
    expect(activeItem.hasAttribute('role')).toBe(false);
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
