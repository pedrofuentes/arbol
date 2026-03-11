import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { TabSwitcher } from './editor/tab-switcher';
import { SettingsEditor } from './editor/settings-editor';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { ImportEditor } from './editor/import-editor';
import { exportToPptx } from './export/pptx-exporter';
import { ThemeManager } from './store/theme-manager';
import { SettingsStore, PersistableSettings } from './store/settings-store';
import { getMatchingNodeIds } from './utils/search';
import { OrgNode } from './types';
import { flattenTree } from './utils/tree';
import { showConfirmDialog } from './ui/confirm-dialog';
import { showHelpDialog } from './ui/help-dialog';
import { ShortcutManager } from './utils/shortcuts';

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

  // Settings persistence
  const settingsStore = new SettingsStore();
  const defaultSettings: PersistableSettings = {
    nodeWidth: 110,
    nodeHeight: 22,
    horizontalSpacing: 30,
    branchSpacing: 10,
    topVerticalSpacing: 5,
    bottomVerticalSpacing: 12,
    icNodeWidth: 99,
    icGap: 4,
    icContainerPadding: 6,
    palTopGap: 7,
    palBottomGap: 7,
    palRowGap: 4,
    palCenterGap: 50,
    nameFontSize: 8,
    titleFontSize: 7,
    textPaddingTop: 4,
    textGap: 1,
    linkColor: '#94a3b8',
    linkWidth: 1.5,
    cardFill: '#ffffff',
    cardStroke: '#22c55e',
    cardStrokeWidth: 1,
    icContainerFill: '#e5e7eb',
  };
  const savedSettings = settingsStore.load(defaultSettings);

  const renderer = new ChartRenderer({
    container: chartArea,
    ...savedSettings,
  });

  let onSettingsSaved: (() => void) | null = null;

  const rerender = () => {
    renderer.render(store.getTree());
    const opts = renderer.getOptions();
    settingsStore.save(opts as unknown as Partial<PersistableSettings>);
    onSettingsSaved?.();
  };

  // Theme toggle
  const themeManager = new ThemeManager();
  const headerRight = document.getElementById('header-right')!;

  const themeBtn = document.createElement('button');
  themeBtn.className = 'icon-btn';
  themeBtn.setAttribute('data-tooltip', 'Toggle theme');
  themeBtn.setAttribute('aria-label', 'Toggle dark/light theme');
  themeBtn.textContent = themeManager.getTheme() === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    themeManager.toggle();
  });
  themeManager.onChange((theme) => {
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
  headerRight.appendChild(themeBtn);

  // Help button
  const helpBtn = document.createElement('button');
  helpBtn.className = 'icon-btn';
  helpBtn.setAttribute('data-tooltip', 'Help & shortcuts');
  helpBtn.setAttribute('aria-label', 'Show help');
  helpBtn.textContent = '?';
  helpBtn.style.fontWeight = '700';
  helpBtn.addEventListener('click', () => showHelpDialog());
  headerRight.appendChild(helpBtn);

  // Undo/Redo buttons (inserted before theme button)
  const undoBtn = document.createElement('button');
  undoBtn.className = 'icon-btn';
  undoBtn.setAttribute('data-tooltip', 'Undo (Ctrl+Z)');
  undoBtn.setAttribute('aria-label', 'Undo');
  undoBtn.textContent = '↩';
  undoBtn.disabled = true;
  undoBtn.addEventListener('click', () => {
    store.undo();
  });
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn = document.createElement('button');
  redoBtn.className = 'icon-btn';
  redoBtn.setAttribute('data-tooltip', 'Redo (Ctrl+Shift+Z)');
  redoBtn.setAttribute('aria-label', 'Redo');
  redoBtn.textContent = '↪';
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', () => {
    store.redo();
  });
  headerRight.insertBefore(redoBtn, themeBtn);

  // Visual divider between undo/redo and theme toggle
  const divider = document.createElement('span');
  divider.className = 'header-divider';
  headerRight.insertBefore(divider, themeBtn);

  const updateUndoRedoState= () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    undoBtn.style.opacity = store.canUndo() ? '1' : '0.4';
    redoBtn.style.opacity = store.canRedo() ? '1' : '0.4';
  };
  store.onChange(updateUndoRedoState);
  updateUndoRedoState();

  // Search UI
  const headerCenter = document.getElementById('header-center')!;

  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.setAttribute('role', 'searchbox');
  searchInput.setAttribute('aria-label', 'Search people by name or title');
  searchInput.placeholder = 'Search people... (Ctrl+F)';
  headerCenter.appendChild(searchInput);

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  searchInput.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length === 0) {
        (renderer as any).setHighlightedNodes(null);
      } else {
        const matchIds = getMatchingNodeIds(store.getTree(), query);
        (renderer as any).setHighlightedNodes(matchIds.size > 0 ? matchIds : null);
      }
    }, 200);
  });

  // Sidebar tabs
  const tabSwitcher = new TabSwitcher(sidebar, [
    { id: 'form', label: 'Form' },
    { id: 'import', label: 'Load Data' },
    { id: 'json', label: 'Edit Tree' },
    { id: 'settings', label: 'Settings' },
  ]);

  const formContainer = tabSwitcher.getContentContainer('form')!;
  const formEditor = new FormEditor(formContainer, store);

  const jsonContainer = tabSwitcher.getContentContainer('json')!;
  const jsonEditor = new JsonEditor(jsonContainer, store);

  const importContainer = tabSwitcher.getContentContainer('import')!;
  new ImportEditor(importContainer, store);

  const settingsContainer = tabSwitcher.getContentContainer('settings')!;
  new SettingsEditor(settingsContainer, renderer, rerender, settingsStore);

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

  // Wire drag-and-drop with confirmation for large moves
  renderer.setNodeMoveHandler(async (nodeId: string, newParentId: string) => {
    const descendantCount = store.getDescendantCount(nodeId);

    if (descendantCount > 5) {
      const allNodes = flattenTree(store.getTree());
      const draggedNode = allNodes.find(n => n.id === nodeId);
      const targetNode = allNodes.find(n => n.id === newParentId);

      const confirmed = await showConfirmDialog({
        title: 'Move Team',
        message: `Move ${draggedNode?.name ?? 'this person'} and ${descendantCount} reports under ${targetNode?.name ?? 'target'}?`,
        confirmLabel: 'Move',
        danger: false,
      });

      if (!confirmed) return;
    }

    try {
      store.moveNode(nodeId, newParentId);
    } catch {
      // Silently fail — re-render will snap back to original position
    }
  });

  // Footer
  const footer = document.getElementById('footer')!;
  const countNodes = (tree: OrgNode) => flattenTree(tree).length;

  // Footer: Status area (left side)
  const footerLeft = document.createElement('div');
  footerLeft.className = 'footer-left';
  footerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:auto;';
  footer.appendChild(footerLeft);

  const statusText = document.createElement('span');
  statusText.className = 'footer-status';
  statusText.id = 'footer-status';
  statusText.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  footerLeft.appendChild(statusText);

  // Save indicator — flashes briefly when settings are persisted
  const saveIndicator = document.createElement('span');
  saveIndicator.style.cssText =
    'font-size:10px;color:var(--accent);font-family:var(--font-sans);font-weight:600;' +
    'opacity:0;transition:opacity 200ms ease;';
  saveIndicator.textContent = '✓ Saved';
  footerLeft.appendChild(saveIndicator);

  let saveFlashTimer: ReturnType<typeof setTimeout> | null = null;
  const flashSaved = () => {
    saveIndicator.style.opacity = '1';
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => {
      saveIndicator.style.opacity = '0';
    }, 1500);
  };
  onSettingsSaved = flashSaved;

  const updateStatus = () => {
    const tree = store.getTree();
    const count = countNodes(tree);
    statusText.textContent = `${count} people`;
  };
  store.onChange(updateStatus);
  updateStatus();

  // Footer: Buttons (right side)
  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'display:flex;align-items:center;gap:6px;';
  footer.appendChild(footerRight);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'footer-btn';
  exportBtn.dataset.action = 'export-pptx';
  exportBtn.textContent = '📊 Export PPTX';
  exportBtn.setAttribute('aria-label', 'Export to PowerPoint');
  exportBtn.setAttribute('data-tooltip', 'Export to PowerPoint (Ctrl+E)');
  footerRight.appendChild(exportBtn);

  exportBtn.addEventListener('click', async () => {
    const layout = renderer.getLastLayout();
    if (layout) {
      await exportToPptx(layout);
    }
  });

  const fitBtn = document.createElement('button');
  fitBtn.className = 'footer-btn';
  fitBtn.dataset.action = 'fit';
  fitBtn.textContent = '⊞ Fit';
  fitBtn.setAttribute('aria-label', 'Fit chart to screen');
  fitBtn.setAttribute('data-tooltip', 'Fit chart to screen');
  footerRight.appendChild(fitBtn);

  fitBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.fitToContent();
  });

  const resetZoomBtn = document.createElement('button');
  resetZoomBtn.className = 'footer-btn';
  resetZoomBtn.dataset.action = 'reset-zoom';
  resetZoomBtn.textContent = '⟲ Reset';
  resetZoomBtn.setAttribute('aria-label', 'Reset zoom');
  resetZoomBtn.setAttribute('data-tooltip', 'Reset zoom to 100%');
  footerRight.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.resetZoom();
  });

  // Keyboard shortcuts
  const shortcuts = new ShortcutManager();

  shortcuts.register({
    key: 'z', ctrl: true,
    handler: () => store.undo(),
    description: 'Undo',
  });

  shortcuts.register({
    key: 'z', ctrl: true, shift: true,
    handler: () => store.redo(),
    description: 'Redo',
  });

  shortcuts.register({
    key: 'y', ctrl: true,
    handler: () => store.redo(),
    description: 'Redo (alt)',
  });

  shortcuts.register({
    key: 'e', ctrl: true,
    handler: async () => {
      const layout = renderer.getLastLayout();
      if (layout) await exportToPptx(layout);
    },
    description: 'Export PPTX',
  });

  shortcuts.register({
    key: 'f', ctrl: true,
    handler: () => {
      searchInput.focus();
    },
    description: 'Search',
  });

  shortcuts.register({
    key: 'Escape',
    handler: () => {
      // Clear search if active
      if (document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        (renderer as any).setHighlightedNodes(null);
        return;
      }
      // Deselect node
      formEditor.selectNode(null);
      renderer.setSelectedNode(null);
    },
    description: 'Deselect / Clear search',
  });

  rerender();
}

document.addEventListener('DOMContentLoaded', main);
