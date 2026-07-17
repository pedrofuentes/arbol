import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrashPanel } from '../../../src/editor/settings/trash-panel';
import type { ChartStore } from '../../../src/store/chart-store';
import type { ChartRecord, VersionRecord } from '../../../src/types';

vi.mock('../../../src/ui/confirm-dialog', () => ({
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));

import { showConfirmDialog } from '../../../src/ui/confirm-dialog';

const deletedAt = new Date('2026-07-16T12:00:00.000Z').getTime();

function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    id: 'chart-1',
    name: 'Product Org',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    workingTree: { id: 'root', name: 'Alice', title: 'CEO' },
    categories: [],
    ...overrides,
  };
}

function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: 'version-1',
    chartId: 'chart-1',
    name: 'Approved plan',
    createdAt: '2026-02-01T00:00:00.000Z',
    tree: { id: 'root', name: 'Alice', title: 'CEO' },
    ...overrides,
  };
}

function makeStore(charts: ChartRecord[], versions: VersionRecord[]): ChartStore {
  return {
    getCharts: vi.fn(async () => charts),
    getAllVersions: vi.fn(async () => versions),
    restoreChart: vi.fn(async () => {}),
    deleteChartForever: vi.fn(async () => {}),
    restoreDeletedVersion: vi.fn(async () => {}),
    deleteVersionForever: vi.fn(async () => {}),
  } as unknown as ChartStore;
}

describe('TrashPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists trashed charts and versions with deleted dates and chart association', async () => {
    const chart = makeChart({ deletedAt });
    const version = makeVersion({ deletedAt });
    const store = makeStore([chart], [version]);

    const panel = new TrashPanel({ chartStore: store });
    const element = panel.build();

    await vi.waitFor(() => {
      expect(element.querySelector('[data-trash-chart-id="chart-1"]')).not.toBeNull();
      expect(element.querySelector('[data-trash-version-id="version-1"]')).not.toBeNull();
    });
    expect(element.textContent).toContain('Product Org');
    expect(element.textContent).toContain('Approved plan');
    expect(element.textContent).toContain('Product Org');
    expect(element.querySelector('[data-trash-chart-id] [data-icon="restore"]')).not.toBeNull();
    expect(element.textContent).not.toContain('trash.deleted_date');
  });

  it('restores charts and versions through per-item actions', async () => {
    const chart = makeChart({ deletedAt });
    const version = makeVersion({ deletedAt });
    const store = makeStore([chart], [version]);
    const element = new TrashPanel({ chartStore: store }).build();
    await vi.waitFor(() => expect(element.querySelectorAll('[data-trash-item]')).toHaveLength(2));

    const restoreButtons = element.querySelectorAll<HTMLButtonElement>(
      '[data-trash-action="restore"]',
    );
    restoreButtons[0].click();
    restoreButtons[1].click();

    await vi.waitFor(() => {
      expect(store.restoreChart).toHaveBeenCalledWith(chart.id);
      expect(store.restoreDeletedVersion).toHaveBeenCalledWith(version.id);
    });
  });

  it('requires permanent confirmation before deleting forever', async () => {
    const chart = makeChart({ deletedAt });
    const store = makeStore([chart], []);
    const element = new TrashPanel({ chartStore: store }).build();
    await vi.waitFor(() => expect(element.querySelector('[data-trash-item]')).not.toBeNull());

    element.querySelector<HTMLButtonElement>('[data-trash-action="delete-forever"]')!.click();

    await vi.waitFor(() => expect(showConfirmDialog).toHaveBeenCalled());
    expect(showConfirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('permanently'),
        danger: true,
      }),
    );
    expect(store.deleteChartForever).toHaveBeenCalledWith(chart.id);
  });

  it('shows a localized empty state when Trash is empty', async () => {
    const element = new TrashPanel({ chartStore: makeStore([], []) }).build();

    await vi.waitFor(() => expect(element.querySelector('[data-trash-empty]')).not.toBeNull());
    expect(element.textContent).toContain('Trash is empty');
  });
});
