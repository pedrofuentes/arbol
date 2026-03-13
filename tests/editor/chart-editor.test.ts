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
