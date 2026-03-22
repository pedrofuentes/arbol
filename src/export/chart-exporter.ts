import type { ChartBundle, ChartRecord, VersionRecord } from '../types';
import { timestampedFilename } from '../utils/filename';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
}

export function buildChartBundle(chart: ChartRecord, versions: VersionRecord[]): ChartBundle {
  const bundle: ChartBundle = {
    format: 'arbol-chart',
    version: 1,
    chart: {
      name: chart.name,
      workingTree: chart.workingTree,
      categories: chart.categories,
    },
    versions: versions.map((v) => ({
      name: v.name,
      createdAt: v.createdAt,
      tree: v.tree,
    })),
  };
  if (chart.levelMappings && chart.levelMappings.length > 0) {
    bundle.chart.levelMappings = chart.levelMappings;
  }
  if (chart.levelDisplayMode && chart.levelDisplayMode !== 'original') {
    bundle.chart.levelDisplayMode = chart.levelDisplayMode;
  }
  return bundle;
}

export function downloadChartBundle(bundle: ChartBundle, chartName: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = timestampedFilename(`${sanitizeFilename(chartName)}.arbol.json`);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
