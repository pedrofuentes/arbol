import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showExportDialog } from '../../src/ui/export-dialog';
import type { ExportFormat } from '../../src/ui/export-dialog';
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

describe('showExportDialog', () => {
  let onExport: (format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => void;
  let onCancel: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    onExport = vi.fn<(format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => void>();
    onCancel = vi.fn<() => void>();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog with title "Export to PowerPoint, SVG, or PNG"', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const title = dialog!.querySelector('h3');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Export to PowerPoint, SVG, or PNG');
  });

  it('displays chart name', () => {
    showExportDialog({
      chartName: 'Engineering Org',
      versions: [],
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.textContent).toContain('Engineering Org');
  });

  it('renders version checkboxes for each version', () => {
    showExportDialog({
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

  it('all version checkboxes are checked by default', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(true);
    });
  });

  it('shows "No saved versions to include." when versions array is empty', () => {
    showExportDialog({
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

  it('export button calls onExport with format and all version IDs when all checked', () => {
    showExportDialog({
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
    expect(onExport).toHaveBeenCalledWith('pptx', ['v-1', 'v-2', 'v-3'], undefined);
  });

  it('export button calls onExport with subset of IDs when some unchecked', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes[1].checked = false;

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith('pptx', ['v-1', 'v-3'], undefined);
  });

  it('export button calls onExport with empty array when all unchecked', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.checked = false;
    });

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith('pptx', [], undefined);
  });

  it('cancel button calls onCancel', () => {
    showExportDialog({
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
    showExportDialog({
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
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const overlay = document.querySelector('[role="dialog"]')!.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('"Deselect all" / "Select all" toggle works', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const toggleLink = document.querySelector('a')!;
    expect(toggleLink.textContent).toBe('Deselect all');

    // Click to deselect all
    toggleLink.click();

    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(false);
    });
    expect(toggleLink.textContent).toBe('Select all');

    // Click to select all again
    toggleLink.click();

    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(true);
    });
    expect(toggleLink.textContent).toBe('Deselect all');
  });

  it('destroy() removes dialog from DOM', () => {
    const { destroy } = showExportDialog({
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
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-labelledby')).toBe('export-dialog-title');

    const title = document.getElementById('export-dialog-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Export to PowerPoint, SVG, or PNG');
  });

  // --- Format picker tests ---

  it('renders format radio buttons (PPTX, SVG, PNG)', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');
    expect(radios.length).toBe(3);

    const values = Array.from(radios).map((r) => r.value);
    expect(values).toEqual(['pptx', 'svg', 'png']);

    // PPTX is checked by default
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
    expect(radios[2].checked).toBe(false);
  });

  it('shows version selection only when PPTX selected', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const versionSection = document.querySelector('.export-version-section') as HTMLElement;
    const scaleGroup = document.querySelector('.export-scale-group') as HTMLElement;
    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');

    // PPTX selected by default: version section visible, scale hidden
    expect(versionSection.style.display).not.toBe('none');
    expect(scaleGroup.style.display).toBe('none');

    // Switch to SVG: version section hidden, scale hidden
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(versionSection.style.display).toBe('none');
    expect(scaleGroup.style.display).toBe('none');

    // Switch back to PPTX: version section visible again
    radios[0].checked = true;
    radios[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(versionSection.style.display).not.toBe('none');
  });

  it('shows scale selector only when PNG selected', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: sampleVersions,
      onExport,
      onCancel,
    });

    const scaleGroup = document.querySelector('.export-scale-group') as HTMLElement;
    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');

    // PPTX selected by default: scale hidden
    expect(scaleGroup.style.display).toBe('none');

    // Switch to PNG: scale visible
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));
    expect(scaleGroup.style.display).not.toBe('none');

    // Switch to SVG: scale hidden
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(scaleGroup.style.display).toBe('none');
  });

  it('passes format to onExport callback', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: [],
      onExport,
      onCancel,
    });

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');

    // Select SVG
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change', { bubbles: true }));

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith('svg', [], undefined);
  });

  it('passes scale for PNG exports', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: [],
      onExport,
      onCancel,
    });

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');

    // Select PNG
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));

    // Default scale is 2
    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith('png', [], 2);
  });

  it('passes selected scale value for PNG exports', () => {
    showExportDialog({
      chartName: 'My Org',
      versions: [],
      onExport,
      onCancel,
    });

    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="export-format"]');
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));

    // Change scale to 3
    const scaleSelect = document.querySelector('.export-scale-group select') as HTMLSelectElement;
    scaleSelect.value = '3';

    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export',
    );
    exportBtn!.click();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith('png', [], 3);
  });
});
