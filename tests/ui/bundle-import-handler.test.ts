import { describe, it, expect, beforeAll, vi } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { importBundle, BundleImportDeps } from '../../src/ui/bundle-import-handler';
import type { ChartBundle, ChartRecord } from '../../src/types';

beforeAll(() => {
  setLocale('en', en);
});

function makeBundle(overrides?: Partial<ChartBundle>): ChartBundle {
  return {
    format: 'arbol-chart',
    version: 1,
    chart: {
      name: 'Test Chart',
      workingTree: { id: '1', name: 'Alice', title: 'CEO' },
      categories: [{ id: 'cat-1', label: 'Engineering', color: '#3b82f6' }],
    },
    versions: [
      {
        name: 'v1',
        createdAt: '2025-01-01T00:00:00Z',
        tree: { id: '1', name: 'Alice', title: 'CEO' },
      },
    ],
    ...overrides,
  };
}

function makeChart(): ChartRecord {
  return {
    id: 'chart-1',
    name: 'Test Chart',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    workingTree: { id: '1', name: 'Alice', title: 'CEO' },
    categories: [{ id: 'cat-1', label: 'Engineering', color: '#3b82f6' }],
  };
}

function makeDeps(
  overrides?: Partial<{
    wouldReplace: boolean;
    confirmResult: boolean;
    chart: ChartRecord;
  }>,
): BundleImportDeps & {
  importChartAsNew: ReturnType<typeof vi.fn>;
  importChartReplaceCurrent: ReturnType<typeof vi.fn>;
  showConfirmDialog: ReturnType<typeof vi.fn>;
  wouldReplaceLevelMappings: ReturnType<typeof vi.fn>;
} {
  const chart = overrides?.chart ?? makeChart();
  const importChartAsNew = vi.fn().mockResolvedValue(chart);
  const importChartReplaceCurrent = vi.fn().mockResolvedValue(chart);
  const wouldReplaceLevelMappings = vi.fn().mockResolvedValue(overrides?.wouldReplace ?? false);
  const showConfirmDialog = vi.fn().mockResolvedValue(overrides?.confirmResult ?? true);

  return {
    importChartAsNew,
    importChartReplaceCurrent,
    wouldReplaceLevelMappings,
    showConfirmDialog,
    chartStore: {
      importChartAsNew,
      importChartReplaceCurrent,
      wouldReplaceLevelMappings,
    } as unknown as BundleImportDeps['chartStore'],
  };
}

describe('importBundle', () => {
  it('calls importChartAsNew for destination "new"', async () => {
    const bundle = makeBundle();
    const deps = makeDeps();
    const result = await importBundle(bundle, 'new', deps);
    expect(deps.importChartAsNew).toHaveBeenCalledWith(bundle);
    expect(deps.importChartReplaceCurrent).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test Chart');
  });

  it('calls importChartReplaceCurrent for destination "replace" when no mapping conflict', async () => {
    const bundle = makeBundle();
    const deps = makeDeps({ wouldReplace: false });
    const result = await importBundle(bundle, 'replace', deps);
    expect(deps.wouldReplaceLevelMappings).toHaveBeenCalledWith(bundle);
    expect(deps.showConfirmDialog).not.toHaveBeenCalled();
    expect(deps.importChartReplaceCurrent).toHaveBeenCalledWith(bundle);
    expect(result).not.toBeNull();
  });

  it('shows confirmation dialog when replacing level mappings', async () => {
    const bundle = makeBundle();
    const deps = makeDeps({ wouldReplace: true, confirmResult: true });
    const result = await importBundle(bundle, 'replace', deps);
    expect(deps.showConfirmDialog).toHaveBeenCalledOnce();
    expect(deps.showConfirmDialog).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(deps.importChartReplaceCurrent).toHaveBeenCalledWith(bundle);
    expect(result).not.toBeNull();
  });

  it('returns null when user cancels replace confirmation', async () => {
    const bundle = makeBundle();
    const deps = makeDeps({ wouldReplace: true, confirmResult: false });
    const result = await importBundle(bundle, 'replace', deps);
    expect(deps.showConfirmDialog).toHaveBeenCalledOnce();
    expect(deps.importChartReplaceCurrent).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('does not show confirmation for destination "new"', async () => {
    const bundle = makeBundle();
    const deps = makeDeps({ wouldReplace: true });
    await importBundle(bundle, 'new', deps);
    expect(deps.wouldReplaceLevelMappings).not.toHaveBeenCalled();
    expect(deps.showConfirmDialog).not.toHaveBeenCalled();
  });

  it('overrides bundle chart name with a trimmed user-provided chartName', async () => {
    const bundle = makeBundle();
    const deps = makeDeps();
    await importBundle(bundle, 'new', deps, '  Custom Name  ');
    const passedBundle = deps.importChartAsNew.mock.calls[0][0] as ChartBundle;
    expect(passedBundle.chart.name).toBe('Custom Name');
    // Original bundle should not be mutated
    expect(bundle.chart.name).toBe('Test Chart');
  });

  it('uses bundle chart name when no chartName override provided', async () => {
    const bundle = makeBundle();
    const deps = makeDeps();
    await importBundle(bundle, 'new', deps);
    const passedBundle = deps.importChartAsNew.mock.calls[0][0] as ChartBundle;
    expect(passedBundle.chart.name).toBe('Test Chart');
  });

  it('ignores whitespace-only chartName overrides for new imports', async () => {
    const bundle = makeBundle();
    const deps = makeDeps();
    await importBundle(bundle, 'new', deps, '   ');
    const passedBundle = deps.importChartAsNew.mock.calls[0][0] as ChartBundle;
    expect(passedBundle.chart.name).toBe('Test Chart');
  });

  it('ignores chartName overrides that only differ by surrounding whitespace', async () => {
    const bundle = makeBundle();
    const deps = makeDeps();
    await importBundle(bundle, 'new', deps, '  Test Chart  ');
    const passedBundle = deps.importChartAsNew.mock.calls[0][0] as ChartBundle;
    expect(passedBundle.chart.name).toBe('Test Chart');
  });

  it('ignores chartName override for replace imports', async () => {
    const bundle = makeBundle();
    const deps = makeDeps({ wouldReplace: false });
    await importBundle(bundle, 'replace', deps, 'Ignored Name');
    const passedBundle = deps.importChartReplaceCurrent.mock.calls[0][0] as ChartBundle;
    expect(passedBundle.chart.name).toBe('Test Chart');
  });
});
