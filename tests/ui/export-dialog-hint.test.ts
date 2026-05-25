import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showExportDialog } from '../../src/ui/export-dialog';
import type { ExportFormat } from '../../src/ui/export-dialog';
import type { OrgNode, VersionRecord } from '../../src/types';

const versionTree: OrgNode = { id: 'r', name: 'R', title: 'T' };

describe('export-dialog hint', () => {
  let onExport: ReturnType<typeof vi.fn<(format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => void>>;
  let onCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    document.body.innerHTML = '';
    onExport = vi.fn<(format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => void>();
    onCancel = vi.fn<() => void>();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('hint shown', () => {
    const versions: VersionRecord[] = [{ id: 'v1', chartId: 'c1', name: 'V1', createdAt: '2024-01-01', tree: versionTree }];
    showExportDialog({ chartName: 'T', versions, onExport, onCancel });
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Select which saved versions');
  });

  it('no hint', () => {
    showExportDialog({ chartName: 'T', versions: [], onExport, onCancel });
    expect(document.querySelector('[role="dialog"]')!.textContent).not.toContain('Select which saved versions');
  });
});
