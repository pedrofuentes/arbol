import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showChartExportDialog } from '../../src/ui/chart-export-dialog';
import type { VersionRecord } from '../../src/types';

function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: overrides.id ?? 'v-1',
    chartId: overrides.chartId ?? 'chart-1',
    name: overrides.name ?? 'Version 1',
    createdAt: overrides.createdAt ?? '2024-01-15T10:30:00.000Z',
    tree: overrides.tree ?? ({ id: 'root', name: 'CEO', title: 'Chief', children: [] } as any),
  };
}

const sampleVersions: VersionRecord[] = [
  makeVersion({ id: 'v-1', name: 'Q1 Snapshot' }),
  makeVersion({ id: 'v-2', name: 'Q2 Snapshot', createdAt: '2024-04-15T10:30:00.000Z' }),
  makeVersion({ id: 'v-3', name: 'Q3 Snapshot', createdAt: '2024-07-15T10:30:00.000Z' }),
];

describe('showChartExportDialog', () => {
  let onExport: (selectedVersionIds: string[]) => void;
  let onCancel: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    onExport = vi.fn<(selectedVersionIds: string[]) => void>();
    onCancel = vi.fn<() => void>();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog with title "Export Chart Data"', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const title = dialog!.querySelector('h3');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Export Chart Data');
  });

  it('displays chart name', () => {
    showChartExportDialog({
      chartName: 'Engineering Org',
      versions: [],
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.textContent).toContain('Engineering Org');
  });

  it('does NOT render format radio buttons', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios.length).toBe(0);
  });

  it('does NOT render scale selector', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const scaleGroup = document.querySelector('.export-scale-group');
    expect(scaleGroup).toBeNull();
  });

  it('renders version checkboxes for each version', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBe(sampleVersions.length);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.textContent).toContain('Q1 Snapshot');
    expect(dialog!.textContent).toContain('Q2 Snapshot');
    expect(dialog!.textContent).toContain('Q3 Snapshot');
  });

  it('all version checkboxes are unchecked by default', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(false);
    });
  });

  it('shows "No saved versions to include." when versions array is empty', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: [],
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.textContent).toContain('No saved versions to include.');

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBe(0);
  });

  it('export button calls onExport with selected version IDs', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => { cb.checked = true; });

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith(['v-1', 'v-2', 'v-3']);
  });

  it('export button calls onExport with subset of IDs when some checked', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes[0].checked = true;
    checkboxes[2].checked = true;

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith(['v-1', 'v-3']);
  });

  it('export button calls onExport with empty array when all unchecked', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith([]);
  });

  it('cancel button calls onCancel', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel',
    );
    cancelBtn!.click();

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('escape key calls onCancel and removes dialog', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('clicking overlay calls onCancel', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const overlay = document.querySelector('[role="dialog"]')!.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('"Select all" / "Deselect all" toggle works', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const toggleLink = document.querySelector('a')!;
    expect(toggleLink.textContent).toBe('Select all');

    toggleLink.click();

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(true);
    });
    expect(toggleLink.textContent).toBe('Deselect all');

    toggleLink.click();

    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(false);
    });
    expect(toggleLink.textContent).toBe('Select all');
  });

  it('destroy() removes dialog from DOM', () => {
    const { destroy } = showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    destroy();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('dialog has correct ARIA attributes', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-labelledby')).toBe('chart-export-dialog-title');

    const title = document.getElementById('chart-export-dialog-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Export Chart Data');
  });

  it('version section is always visible (no format-dependent toggling)', () => {
    showChartExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const versionSection = document.querySelector('.export-version-section') as HTMLElement;
    expect(versionSection).not.toBeNull();
    expect(versionSection.style.display).not.toBe('none');
  });
});
