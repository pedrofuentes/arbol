import { describe, it, expect, vi } from 'vitest';
import type { ChartRecord } from '../../src/types';
import { completeBundleImportActivation } from '../../src/ui/bundle-import-activation';

function makeChart(): ChartRecord {
  return {
    id: 'chart-1',
    name: 'Imported Chart',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    workingTree: { id: '1', name: 'Alice', title: 'CEO' },
    categories: [],
  };
}

describe('completeBundleImportActivation', () => {
  it('routes imported charts through the shared chart switch handler', async () => {
    const deps = {
      refreshChartEditor: vi.fn().mockResolvedValue(undefined),
      handleChartSwitched: vi.fn(),
      fitToContent: vi.fn(),
      closeWizard: vi.fn(),
      resetWizardState: vi.fn(),
      showImportToast: vi.fn(),
    };

    await completeBundleImportActivation(makeChart(), deps);

    expect(deps.refreshChartEditor).toHaveBeenCalledOnce();
    expect(deps.handleChartSwitched).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Imported Chart' }),
    );
    expect(deps.fitToContent).toHaveBeenCalledOnce();
    expect(deps.closeWizard).toHaveBeenCalledOnce();
    expect(deps.resetWizardState).toHaveBeenCalledOnce();
    expect(deps.showImportToast).toHaveBeenCalledOnce();
  });
});
