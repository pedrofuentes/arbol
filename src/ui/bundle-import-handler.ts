import type { ChartBundle, ChartRecord } from '../types';
import type { ChartStore } from '../store/chart-store';
import { t } from '../i18n';

export interface BundleImportDeps {
  chartStore: ChartStore;
  showConfirmDialog: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    danger: boolean;
  }) => Promise<boolean>;
}

/**
 * Handles the chart-store side of a bundle import: confirmation dialogs
 * for destructive replace and delegation to the appropriate chartStore method.
 *
 * When chartName is provided, overrides the bundle's chart name (without
 * mutating the original bundle object).
 *
 * Returns the imported ChartRecord, or null if the user cancelled.
 */
export async function importBundle(
  bundle: ChartBundle,
  destination: 'new' | 'replace',
  deps: BundleImportDeps,
  chartName?: string,
): Promise<ChartRecord | null> {
  const effectiveBundle =
    chartName && chartName !== bundle.chart.name
      ? { ...bundle, chart: { ...bundle.chart, name: chartName } }
      : bundle;

  if (destination === 'replace') {
    const wouldReplace = await deps.chartStore.wouldReplaceLevelMappings(effectiveBundle);
    if (wouldReplace) {
      const proceed = await deps.showConfirmDialog({
        title: t('dialog.replace_mappings.title'),
        message: t('dialog.replace_mappings.message'),
        confirmLabel: t('dialog.replace_mappings.confirm'),
        cancelLabel: t('dialog.replace_mappings.cancel'),
        danger: true,
      });
      if (!proceed) return null;
    }
    return deps.chartStore.importChartReplaceCurrent(effectiveBundle);
  }
  return deps.chartStore.importChartAsNew(effectiveBundle);
}
