import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { TabSwitcher } from './editor/tab-switcher';
import { SettingsEditor } from './editor/settings-editor';
import { OrgNode } from './types';

const SAMPLE_DATA: OrgNode = {
  id: 'ceo-1',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    { id: 'pal-1', name: 'Alex Rivera', title: 'PAL' },
    { id: 'pal-2', name: 'Jordan Blake', title: 'PAL' },
    { id: 'pal-5', name: 'Casey Morgan', title: 'PAL' },
    {
      id: 'cto-1',
      name: 'Marcus Johnson',
      title: 'CTO',
      children: [
        { id: 'pal-3', name: 'Sam Torres', title: 'PAL' },
        { id: 'pal-4', name: 'Kim Nguyen', title: 'PAL' },
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
      children: [
        { id: 'fin-1', name: 'Tom Brown', title: 'Controller' },
        { id: 'fin-2', name: 'Amy Chen', title: 'Treasurer' },
      ],
    },
    {
      id: 'coo-1',
      name: 'David Kim',
      title: 'COO',
      children: [
        { id: 'ops-1', name: 'Maria Lopez', title: 'Ops Manager' },
        { id: 'ops-2', name: 'Ben Carter', title: 'Ops Manager' },
        { id: 'ops-3', name: 'Yuki Tanaka', title: 'Analyst' },
        { id: 'ops-4', name: 'Chris Evans', title: 'Analyst' },
        { id: 'ops-5', name: 'Fatima Zahra', title: 'Coordinator' },
        { id: 'ops-6', name: 'Liam O\'Brien', title: 'Coordinator' },
        { id: 'ops-7', name: 'Sofia Reyes', title: 'Specialist' },
        { id: 'ops-8', name: 'Noah Park', title: 'Specialist' },
        { id: 'ops-9', name: 'Ava Mitchell', title: 'Associate' },
        { id: 'ops-10', name: 'Ethan Lee', title: 'Associate' },
      ],
    },
  ],
};

function main(): void {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  const store = new OrgStore(SAMPLE_DATA);

  const renderer = new ChartRenderer({
    container: chartArea,
    nodeWidth: 110,
    nodeHeight: 22,
    horizontalSpacing: 30,
    topVerticalSpacing: 5,
    bottomVerticalSpacing: 12,
    icNodeWidth: 100,
    icGap: 4,
  });

  const rerender = () => renderer.render(store.getTree());

  // Sidebar tabs
  const tabSwitcher = new TabSwitcher(sidebar, [
    { id: 'form', label: 'Form' },
    { id: 'json', label: 'JSON' },
    { id: 'settings', label: 'Settings' },
  ]);

  const settingsContainer = tabSwitcher.getContentContainer('settings')!;
  new SettingsEditor(settingsContainer, renderer, rerender);

  store.onChange(rerender);

  renderer.setCollapseToggleHandler(rerender);

  rerender();
}

document.addEventListener('DOMContentLoaded', main);
