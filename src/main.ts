import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { OrgNode } from './types';

const SAMPLE_DATA: OrgNode = {
  id: 'ceo-1',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    {
      id: 'cto-1',
      name: 'Marcus Johnson',
      title: 'CTO',
      children: [
        { id: 'eng-1', name: 'Priya Patel', title: 'VP Engineering', children: [
          { id: 'dev-1', name: 'Ana Torres', title: 'Sr Engineer' },
          { id: 'dev-2', name: 'Mike Chang', title: 'Sr Engineer' },
          { id: 'dev-3', name: 'Sara Ali', title: 'Engineer' },
          { id: 'dev-4', name: 'Tom Reed', title: 'Engineer' },
          { id: 'dev-5', name: 'Nina Volkov', title: 'Jr Engineer' },
          { id: 'dev-6', name: 'Leo Martins', title: 'Jr Engineer' },
        ]},
        { id: 'eng-2', name: 'James Wilson', title: 'VP Platform', children: [
          { id: 'plat-1', name: 'Rachel Green', title: 'Sr Engineer' },
          { id: 'plat-2', name: 'Omar Hassan', title: 'Sr Engineer' },
          { id: 'plat-3', name: 'Emily Sato', title: 'Engineer' },
          { id: 'plat-4', name: 'Jake Novak', title: 'Engineer' },
          { id: 'plat-5', name: 'Mei Lin', title: 'Jr Engineer' },
          { id: 'plat-6', name: 'Dan Okafor', title: 'Jr Engineer' },
        ]},
      ],
    },
    {
      id: 'cfo-1',
      name: 'Lisa Park',
      title: 'CFO',
    },
    {
      id: 'coo-1',
      name: 'David Kim',
      title: 'COO',
    },
  ],
};

function main(): void {
  const chartArea = document.getElementById('chart-area')!;

  const store = new OrgStore(SAMPLE_DATA);

  const renderer = new ChartRenderer({
    container: chartArea,
    nodeWidth: 110,
    nodeHeight: 22,
    horizontalSpacing: 20,
    verticalSpacing: 40,
    icNodeWidth: 100,
    icGap: 4,
  });

  store.onChange(() => {
    renderer.render(store.getTree());
  });

  renderer.setCollapseToggleHandler(() => {
    renderer.render(store.getTree());
  });

  renderer.render(store.getTree());
}

document.addEventListener('DOMContentLoaded', main);
