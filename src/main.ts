import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { TabSwitcher } from './editor/tab-switcher';
import { SettingsEditor } from './editor/settings-editor';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { exportToPptx } from './export/pptx-exporter';
import { OrgNode } from './types';

const SAMPLE_DATA: OrgNode = {
  id: 'ceo',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    // PALs reporting directly to CEO
    { id: 'pal-ceo-1', name: 'Alex Rivera', title: 'Chief of Staff' },
    { id: 'pal-ceo-2', name: 'Jordan Blake', title: 'EA to CEO' },
    { id: 'pal-ceo-3', name: 'Casey Morgan', title: 'Strategy Advisor' },
    {
      id: 'cto',
      name: 'Marcus Johnson',
      title: 'CTO',
      children: [
        // PALs under CTO
        { id: 'pal-cto-1', name: 'Sam Torres', title: 'Tech Advisor' },
        { id: 'pal-cto-2', name: 'Kim Nguyen', title: 'EA to CTO' },
        {
          id: 'vp-eng',
          name: 'Priya Patel',
          title: 'VP Engineering',
          children: [
            // M1 with ICs
            { id: 'em-fe', name: 'Ana Torres', title: 'EM Frontend', children: [
              { id: 'fe-1', name: 'Mike Chang', title: 'Sr Engineer' },
              { id: 'fe-2', name: 'Sara Ali', title: 'Engineer' },
              { id: 'fe-3', name: 'Tom Reed', title: 'Engineer' },
              { id: 'fe-4', name: 'Nina Volkov', title: 'Jr Engineer' },
            ]},
            // M1 with ICs
            { id: 'em-be', name: 'Leo Martins', title: 'EM Backend', children: [
              { id: 'be-1', name: 'Rachel Green', title: 'Sr Engineer' },
              { id: 'be-2', name: 'Omar Hassan', title: 'Engineer' },
              { id: 'be-3', name: 'Emily Sato', title: 'Engineer' },
            ]},
            // M1 with ICs
            { id: 'em-qa', name: 'Jake Novak', title: 'EM QA', children: [
              { id: 'qa-1', name: 'Mei Lin', title: 'QA Lead' },
              { id: 'qa-2', name: 'Dan Okafor', title: 'QA Engineer' },
            ]},
          ],
        },
        {
          id: 'vp-plat',
          name: 'James Wilson',
          title: 'VP Platform',
          children: [
            // PAL under VP Platform
            { id: 'pal-plat-1', name: 'Zoe Adams', title: 'Platform Architect' },
            // M1 with ICs
            { id: 'em-infra', name: 'Chris Park', title: 'EM Infra', children: [
              { id: 'infra-1', name: 'Aisha Khan', title: 'Sr SRE' },
              { id: 'infra-2', name: 'Ryan Cole', title: 'SRE' },
              { id: 'infra-3', name: 'Tina Wu', title: 'SRE' },
              { id: 'infra-4', name: 'Mark Silva', title: 'Jr SRE' },
              { id: 'infra-5', name: 'Eva Petrov', title: 'Jr SRE' },
            ]},
            // M1 with small team
            { id: 'em-data', name: 'Liam Scott', title: 'EM Data', children: [
              { id: 'data-1', name: 'Nora Bell', title: 'Data Engineer' },
              { id: 'data-2', name: 'Oscar Ruiz', title: 'Data Engineer' },
            ]},
          ],
        },
        {
          id: 'dir-security',
          name: 'Fatima Zahra',
          title: 'Dir Security',
          children: [
            // M1 with ICs — no PALs
            { id: 'em-sec', name: 'Ethan Lee', title: 'EM AppSec', children: [
              { id: 'sec-1', name: 'Ava Mitchell', title: 'Security Engineer' },
              { id: 'sec-2', name: 'Noah Park', title: 'Security Engineer' },
              { id: 'sec-3', name: 'Lily Tran', title: 'Pentester' },
            ]},
          ],
        },
      ],
    },
    {
      id: 'cfo',
      name: 'Lisa Park',
      title: 'CFO',
      children: [
        // PAL under CFO
        { id: 'pal-cfo-1', name: 'Derek Fox', title: 'FP&A Analyst' },
        // M1 with ICs
        { id: 'ctrl', name: 'Tom Brown', title: 'Controller', children: [
          { id: 'acct-1', name: 'Amy Chen', title: 'Sr Accountant' },
          { id: 'acct-2', name: 'Ben Hayes', title: 'Accountant' },
        ]},
        // M1 with ICs
        { id: 'treas', name: 'Maria Lopez', title: 'Treasurer', children: [
          { id: 'fin-1', name: 'Yuki Tanaka', title: 'Financial Analyst' },
        ]},
      ],
    },
    {
      id: 'coo',
      name: 'David Kim',
      title: 'COO',
      children: [
        // No PALs, deep hierarchy
        {
          id: 'vp-ops',
          name: 'Sofia Reyes',
          title: 'VP Operations',
          children: [
            { id: 'em-logistics', name: 'Ben Carter', title: 'EM Logistics', children: [
              { id: 'log-1', name: 'Chris Evans', title: 'Ops Coordinator' },
              { id: 'log-2', name: 'Liam O\'Brien', title: 'Ops Coordinator' },
              { id: 'log-3', name: 'Ava Stone', title: 'Ops Specialist' },
              { id: 'log-4', name: 'Max Turner', title: 'Ops Specialist' },
              { id: 'log-5', name: 'Isla Gray', title: 'Ops Associate' },
              { id: 'log-6', name: 'Jack White', title: 'Ops Associate' },
              { id: 'log-7', name: 'Ruby Fox', title: 'Ops Intern' },
              { id: 'log-8', name: 'Finn Black', title: 'Ops Intern' },
            ]},
            { id: 'em-support', name: 'Noah Park', title: 'EM Support', children: [
              { id: 'sup-1', name: 'Ella Rose', title: 'Support Lead' },
              { id: 'sup-2', name: 'Luke Hale', title: 'Support Specialist' },
              { id: 'sup-3', name: 'Mia Frost', title: 'Support Specialist' },
            ]},
          ],
        },
        // Leaf manager — becomes M1
        { id: 'hr-mgr', name: 'Yuki Tanaka', title: 'HR Manager', children: [
          { id: 'hr-1', name: 'Grace Kim', title: 'HR Specialist' },
          { id: 'hr-2', name: 'Leo Diaz', title: 'Recruiter' },
          { id: 'hr-3', name: 'Chloe Ng', title: 'Recruiter' },
        ]},
      ],
    },
    {
      id: 'cmo',
      name: 'Elena Volkov',
      title: 'CMO',
      children: [
        // PALs under CMO
        { id: 'pal-cmo-1', name: 'Ivan Petrov', title: 'Brand Strategist' },
        { id: 'pal-cmo-2', name: 'Diana Wells', title: 'Comms Lead' },
        // M1 with ICs
        { id: 'em-growth', name: 'Peter Grant', title: 'Growth Lead', children: [
          { id: 'gr-1', name: 'Sasha Moore', title: 'Growth Engineer' },
          { id: 'gr-2', name: 'Kai Young', title: 'Growth Analyst' },
        ]},
        // M1 with ICs
        { id: 'em-design', name: 'Hana Ito', title: 'Design Lead', children: [
          { id: 'des-1', name: 'Olga Fern', title: 'Sr Designer' },
          { id: 'des-2', name: 'Ravi Shah', title: 'Designer' },
          { id: 'des-3', name: 'Emi Lau', title: 'Jr Designer' },
        ]},
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

  const formContainer = tabSwitcher.getContentContainer('form')!;
  const formEditor = new FormEditor(formContainer, store);

  const jsonContainer = tabSwitcher.getContentContainer('json')!;
  const jsonEditor = new JsonEditor(jsonContainer, store);

  const settingsContainer = tabSwitcher.getContentContainer('settings')!;
  new SettingsEditor(settingsContainer, renderer, rerender);

  store.onChange(() => {
    rerender();
    formEditor.refresh();
    jsonEditor.refresh();
  });

  renderer.setNodeClickHandler((nodeId: string) => {
    formEditor.selectNode(nodeId);
    renderer.setSelectedNode(nodeId);
  });

  formEditor.setSelectionChangeHandler((nodeId: string | null) => {
    renderer.setSelectedNode(nodeId);
  });

  renderer.setCollapseToggleHandler(rerender);

  // Footer: Export PPTX button
  const footer = document.getElementById('footer')!;
  const exportBtn = document.createElement('button');
  exportBtn.className = 'footer-btn';
  exportBtn.dataset.action = 'export-pptx';
  exportBtn.textContent = 'Export PPTX';
  footer.appendChild(exportBtn);

  exportBtn.addEventListener('click', async () => {
    const layout = renderer.getLastLayout();
    if (layout) {
      await exportToPptx(layout);
    }
  });

  // Footer: Fit to Screen button
  const fitBtn = document.createElement('button');
  fitBtn.className = 'footer-btn';
  fitBtn.dataset.action = 'fit';
  fitBtn.textContent = 'Fit to Screen';
  footer.appendChild(fitBtn);

  fitBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.fitToContent();
  });

  // Footer: Reset Zoom button
  const resetZoomBtn = document.createElement('button');
  resetZoomBtn.className = 'footer-btn';
  resetZoomBtn.dataset.action = 'reset-zoom';
  resetZoomBtn.textContent = 'Reset Zoom';
  footer.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.resetZoom();
  });

  rerender();
}

document.addEventListener('DOMContentLoaded', main);
