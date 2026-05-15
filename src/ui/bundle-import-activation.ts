import type { ChartRecord } from '../types';

export interface BundleImportActivationDeps {
  refreshChartEditor: () => Promise<void>;
  handleChartSwitched: (chart: ChartRecord) => void;
  fitToContent: () => void;
  closeWizard: () => void;
  resetWizardState: () => void;
  showImportToast: () => void;
}

export async function completeBundleImportActivation(
  chart: ChartRecord,
  deps: BundleImportActivationDeps,
): Promise<void> {
  await deps.refreshChartEditor();
  deps.handleChartSwitched(chart);
  deps.fitToContent();
  deps.closeWizard();
  deps.resetWizardState();
  deps.showImportToast();
}
