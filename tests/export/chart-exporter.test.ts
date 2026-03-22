import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChartRecord, VersionRecord, OrgNode, ColorCategory } from '../../src/types';
import { buildChartBundle, downloadChartBundle } from '../../src/export/chart-exporter';

function makeTree(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: 'node-1',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'node-2', name: 'Bob', title: 'VP', categoryId: 'cat-1' },
      { id: 'node-3', name: 'Carol', title: 'VP' },
    ],
    ...overrides,
  };
}

function makeCategories(): ColorCategory[] {
  return [
    { id: 'cat-1', label: 'Open Position', color: '#fbbf24' },
    { id: 'cat-2', label: 'Contractor', color: '#60a5fa', nameColor: '#ffffff', titleColor: '#e0e0e0' },
  ];
}

function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    id: 'chart-id-1',
    name: 'My Org Chart',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    workingTree: makeTree(),
    categories: makeCategories(),
    ...overrides,
  };
}

function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: 'version-id-1',
    chartId: 'chart-id-1',
    name: 'Q1 Snapshot',
    createdAt: '2024-03-01T00:00:00.000Z',
    tree: makeTree({ name: 'Alice (Q1)' }),
    ...overrides,
  };
}

describe('buildChartBundle', () => {
  it('produces a bundle with correct format and version fields', () => {
    const bundle = buildChartBundle(makeChart(), []);
    expect(bundle.format).toBe('arbol-chart');
    expect(bundle.version).toBe(1);
  });

  it('contains chart name, workingTree, and categories', () => {
    const chart = makeChart();
    const bundle = buildChartBundle(chart, []);

    expect(bundle.chart.name).toBe('My Org Chart');
    expect(bundle.chart.workingTree).toEqual(chart.workingTree);
    expect(bundle.chart.categories).toEqual(chart.categories);
  });

  it('contains selected versions with name, createdAt, and tree', () => {
    const v1 = makeVersion({ name: 'V1', createdAt: '2024-01-01T00:00:00.000Z' });
    const v2 = makeVersion({ id: 'version-id-2', name: 'V2', createdAt: '2024-02-01T00:00:00.000Z' });
    const bundle = buildChartBundle(makeChart(), [v1, v2]);

    expect(bundle.versions).toHaveLength(2);
    expect(bundle.versions[0]).toEqual({ name: 'V1', createdAt: '2024-01-01T00:00:00.000Z', tree: v1.tree });
    expect(bundle.versions[1]).toEqual({ name: 'V2', createdAt: '2024-02-01T00:00:00.000Z', tree: v2.tree });
  });

  it('does NOT contain chart.id, chart.createdAt, or chart.updatedAt', () => {
    const bundle = buildChartBundle(makeChart(), []);
    const chartObj = bundle.chart as Record<string, unknown>;

    expect(chartObj).not.toHaveProperty('id');
    expect(chartObj).not.toHaveProperty('createdAt');
    expect(chartObj).not.toHaveProperty('updatedAt');
  });

  it('does NOT contain version.id or version.chartId', () => {
    const bundle = buildChartBundle(makeChart(), [makeVersion()]);
    const versionObj = bundle.versions[0] as unknown as Record<string, unknown>;

    expect(versionObj).not.toHaveProperty('id');
    expect(versionObj).not.toHaveProperty('chartId');
  });

  it('preserves OrgNode internal IDs', () => {
    const bundle = buildChartBundle(makeChart(), [makeVersion()]);

    expect(bundle.chart.workingTree.id).toBe('node-1');
    expect(bundle.chart.workingTree.children![0].id).toBe('node-2');
    expect(bundle.chart.workingTree.children![1].id).toBe('node-3');
    expect(bundle.versions[0].tree.id).toBe('node-1');
  });

  it('preserves category IDs', () => {
    const bundle = buildChartBundle(makeChart(), []);

    expect(bundle.chart.categories[0].id).toBe('cat-1');
    expect(bundle.chart.categories[1].id).toBe('cat-2');
  });

  it('handles empty versions array', () => {
    const bundle = buildChartBundle(makeChart(), []);

    expect(bundle.versions).toEqual([]);
  });

  it('includes levelMappings when chart has them', () => {
    const chart = makeChart({
      levelMappings: [
        { rawLevel: 'L20', displayTitle: 'Principal Engineer', managerDisplayTitle: 'Director' },
        { rawLevel: 'L21', displayTitle: 'Senior Engineer' },
      ],
      levelDisplayMode: 'mapped',
    });
    const bundle = buildChartBundle(chart, []);

    expect(bundle.chart.levelMappings).toEqual(chart.levelMappings);
    expect(bundle.chart.levelDisplayMode).toBe('mapped');
  });

  it('omits levelMappings when chart has none', () => {
    const bundle = buildChartBundle(makeChart(), []);

    expect(bundle.chart.levelMappings).toBeUndefined();
    expect(bundle.chart.levelDisplayMode).toBeUndefined();
  });

  it('omits levelMappings when array is empty', () => {
    const chart = makeChart({ levelMappings: [] });
    const bundle = buildChartBundle(chart, []);

    expect(bundle.chart.levelMappings).toBeUndefined();
  });

  it('omits levelDisplayMode when it is original', () => {
    const chart = makeChart({
      levelMappings: [{ rawLevel: 'L20', displayTitle: 'IC' }],
      levelDisplayMode: 'original',
    });
    const bundle = buildChartBundle(chart, []);

    expect(bundle.chart.levelMappings).toEqual(chart.levelMappings);
    expect(bundle.chart.levelDisplayMode).toBeUndefined();
  });
});

describe('downloadChartBundle', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let capturedAnchor: HTMLAnchorElement;

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
    mockRevokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        capturedAnchor = anchor;
        return anchor;
      }
      return document.createElement(tag);
    });

    globalThis.URL.createObjectURL = mockCreateObjectURL as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL as typeof URL.revokeObjectURL;
  });

  it('creates a download with correct sanitized filename', () => {
    const bundle = buildChartBundle(makeChart(), []);
    downloadChartBundle(bundle, 'My Org Chart!');

    expect(capturedAnchor.download).toMatch(/^\d{12}-my-org-chart\.arbol\.json$/);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('serializes bundle with 2-space indent', () => {
    const bundle = buildChartBundle(makeChart(), []);
    downloadChartBundle(bundle, 'Test');

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
  });

  it('revokes the object URL after download', () => {
    const bundle = buildChartBundle(makeChart(), []);
    downloadChartBundle(bundle, 'Test');

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('lowercases and replaces non-alphanumeric chars in filename', () => {
    const bundle = buildChartBundle(makeChart(), []);
    downloadChartBundle(bundle, 'Acme Corp (2024) — Final');

    expect(capturedAnchor.download).toMatch(/^\d{12}-acme-corp-2024-final\.arbol\.json$/);
  });
});
