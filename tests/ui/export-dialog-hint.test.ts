import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showExportDialog } from '../../src/ui/export-dialog';
describe('export-dialog hint', () => {
  let onExport: any, onCancel: any;
  beforeEach(() => { document.body.innerHTML = ''; onExport = vi.fn(); onCancel = vi.fn(); });
  afterEach(() => { document.body.innerHTML = ''; });
  it('hint shown', () => { showExportDialog({ chartName: 'T', versions: [{ id: 'v1', chartId: 'c1', name: 'V1', createdAt: '2024-01-01', tree: { id: 'r', name: 'R', title: 'T' } as any }], onExport, onCancel }); expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Select which saved versions'); });
  it('no hint', () => { showExportDialog({ chartName: 'T', versions: [], onExport, onCancel }); expect(document.querySelector('[role="dialog"]')!.textContent).not.toContain('Select which saved versions'); });
});
