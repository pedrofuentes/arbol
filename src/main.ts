import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { OrgNode } from './types';

const SAMPLE_DATA: OrgNode = {
  id: 'ceo-1',
  name: 'Sarah Chen',
  title: 'CEO',
};

function main(): void {
  const chartArea = document.getElementById('chart-area')!;

  const store = new OrgStore(SAMPLE_DATA);

  const renderer = new ChartRenderer({
    container: chartArea,
    nodeWidth: 110,
    nodeHeight: 26,
    horizontalSpacing: 20,
    verticalSpacing: 40,
  });

  store.onChange(() => {
    renderer.render(store.getTree());
  });

  renderer.render(store.getTree());
}

document.addEventListener('DOMContentLoaded', main);
