import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { TabSwitcher } from './editor/tab-switcher';
import { SettingsEditor } from './editor/settings-editor';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { ImportEditor } from './editor/import-editor';
import { UtilitiesEditor } from './editor/utilities-editor';
import { exportToPptx } from './export/pptx-exporter';
import { ThemeManager, Theme } from './store/theme-manager';
import { SettingsStore, PersistableSettings } from './store/settings-store';
import { CategoryStore } from './store/category-store';
import { flattenTree, findNodeById, findParent, isLeaf, isM1, countLeaves, countManagersByLevel } from './utils/tree';
import { SAMPLE_ORG } from './data/sample-org';
import { showHelpDialog } from './ui/help-dialog';
import { ShortcutManager } from './utils/shortcuts';
import { timestampedFilename } from './utils/filename';
import { APP_VERSION } from './version';
import { showContextMenu, dismissContextMenu, ContextMenuItem } from './ui/context-menu';
import { showInlineEditor, dismissInlineEditor } from './ui/inline-editor';
import { showAddPopover, dismissAddPopover } from './ui/add-popover';
import { showManagerPicker } from './ui/manager-picker';
import { showConfirmDialog } from './ui/confirm-dialog';
import { showCategoryLegend, dismissCategoryLegend } from './ui/category-legend';
import { ChartDB } from './store/chart-db';
import { ChartStore } from './store/chart-store';
import { ChartEditor } from './editor/chart-editor';
import { ChartNameHeader } from './ui/chart-name-header';
import { showVersionViewer, dismissVersionViewer, isVersionViewerActive } from './ui/version-viewer';
import { showComparisonBanner, dismissComparisonBanner, isComparisonBannerActive } from './ui/comparison-banner';
import { showVersionPicker } from './ui/version-picker';
import { compareTrees, buildMergedTree, getDiffStats } from './utils/tree-diff';
import { SideBySideRenderer } from './renderer/side-by-side-renderer';
import { FocusModeController } from './controllers/focus-mode';
import { SelectionManager } from './controllers/selection-manager';
import { SearchController } from './controllers/search-controller';
import { announce } from './ui/announcer';
import type { ComparisonState, VersionRecord } from './types';

async function main(): Promise<void> {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  // Initialize chart database and store
  const chartDB = new ChartDB();
  await chartDB.open();
  const chartStore = new ChartStore(chartDB);
  const activeChart = await chartStore.initialize();

  const store = new OrgStore(activeChart.workingTree);

  // Settings persistence
  const settingsStore = new SettingsStore();
  const defaultSettings: PersistableSettings = {
    nodeWidth: 160,
    nodeHeight: 34,
    horizontalSpacing: 50,
    branchSpacing: 20,
    topVerticalSpacing: 10,
    bottomVerticalSpacing: 20,
    icNodeWidth: 141,
    icGap: 6,
    icContainerPadding: 10,
    palTopGap: 12,
    palBottomGap: 12,
    palRowGap: 6,
    palCenterGap: 70,
    nameFontSize: 11,
    titleFontSize: 9,
    textPaddingTop: 6,
    textGap: 2,
    textAlign: 'center',
    textPaddingHorizontal: 8,
    fontFamily: 'Calibri',
    nameColor: '#1e293b',
    titleColor: '#64748b',
    linkColor: '#94a3b8',
    linkWidth: 1.5,
    dottedLineDash: '6,4',
    cardFill: '#ffffff',
    cardStroke: '#22c55e',
    cardStrokeWidth: 1,
    cardBorderRadius: 0,
    icContainerFill: '#e5e7eb',
    icContainerBorderRadius: 0,
    showHeadcount: false,
    headcountBadgeColor: '#9ca3af',
    headcountBadgeTextColor: '#1e293b',
    headcountBadgeFontSize: 11,
    headcountBadgeRadius: 4,
    headcountBadgePadding: 8,
    headcountBadgeHeight: 22,
    legendRows: 0,
  };
  const savedSettings = settingsStore.load(defaultSettings);

  // Category store
  const categoryStore = new CategoryStore();

  // Load per-chart categories
  if (activeChart.categories.length > 0) {
    categoryStore.replaceAll(activeChart.categories);
  }

  const renderer= new ChartRenderer({
    container: chartArea,
    ...savedSettings,
    textAlign: savedSettings.textAlign as 'left' | 'center' | 'right',
    categories: categoryStore.getAll(),
  });

  let onSettingsSaved: (() => void) | null = null;

  // Controllers (initialized after rerender is defined)
  let focusMode: FocusModeController;
  const selection = new SelectionManager();

  // Comparison mode: show diff between two trees
  let comparisonState: ComparisonState | null = null;
  let sideBySideRenderer: SideBySideRenderer | null = null;
  let dimUnchanged = true;

  const exitComparisonMode = () => {
    comparisonState = null;
    dimUnchanged = true;
    renderer.setDiffMap(null);
    dismissComparisonBanner();
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }
    // Show main SVG again if it was hidden
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.removeAttribute('style');
    rerender();
    renderer.getZoomManager()?.fitToContent();
  };

  const showMergedView = (state: ComparisonState) => {
    // Tear down side-by-side if active
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }
    // Show main SVG
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.removeAttribute('style');

    const merged = buildMergedTree(state.oldTree, state.newTree, state.diff);
    renderer.setDiffMap(state.diff);
    renderer.updateOptions({ categories: categoryStore.getAll() });
    renderer.render(merged);
    renderer.getZoomManager()?.fitToContent();
  };

  const showSideBySideView = (state: ComparisonState) => {
    // Hide main SVG
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.setAttribute('style', 'display:none');

    // Tear down previous side-by-side if any
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }

    sideBySideRenderer = new SideBySideRenderer({
      container: chartArea,
      rendererOptions: { ...renderer.getOptions(), container: chartArea },
      oldLabel: state.oldLabel,
      newLabel: state.newLabel,
    });
    sideBySideRenderer.render(state.oldTree, state.newTree, state.diff);
  };

  const handleToggleDim = (enabled: boolean) => {
    dimUnchanged = enabled;
    renderer.setDimUnchanged(enabled);
    if (!comparisonState) return;

    if (comparisonState.viewMode === 'merged') {
      showMergedView(comparisonState);
    } else {
      showSideBySideView(comparisonState);
    }
  };

  const toggleComparisonView = () => {
    if (!comparisonState) return;

    const newMode = comparisonState.viewMode === 'merged' ? 'side-by-side' : 'merged';
    comparisonState.viewMode = newMode;

    if (newMode === 'merged') {
      showMergedView(comparisonState);
    } else {
      showSideBySideView(comparisonState);
    }

    // Re-show banner with updated mode
    const stats = getDiffStats(comparisonState.diff);
    dismissComparisonBanner();
    showComparisonBanner({
      container: chartArea,
      oldLabel: comparisonState.oldLabel,
      newLabel: comparisonState.newLabel,
      stats,
      viewMode: newMode,
      dimUnchanged,
      onToggleView: toggleComparisonView,
      onToggleDimUnchanged: handleToggleDim,
      onExit: exitComparisonMode,
    });
  };

  const enterComparisonMode = async (baseVersion: VersionRecord) => {
    // Exit any active modes first
    if (focusMode.isFocused) { focusMode.clear(); }
    if (isVersionViewerActive()) { dismissVersionViewer(); }
    if (comparisonState) {
      renderer.setDiffMap(null);
      dismissComparisonBanner();
      if (sideBySideRenderer) { sideBySideRenderer.destroy(); sideBySideRenderer = null; }
      const svgEl = chartArea.querySelector('svg');
      if (svgEl) svgEl.removeAttribute('style');
      comparisonState = null;
    }

    // Get all versions for the picker
    const allVersions = await chartStore.getVersions();

    const target = await showVersionPicker({
      versions: allVersions,
      excludeVersionId: baseVersion.id,
      includeWorkingTree: true,
    });

    if (!target) return;

    // Determine old (base) and new (target) trees
    const oldTree = baseVersion.tree;
    const oldLabel = baseVersion.name;
    let newTree: typeof oldTree;
    let newLabel: string;

    if (target.type === 'working') {
      newTree = store.getTree();
      newLabel = 'Working tree';
    } else {
      newTree = target.version.tree;
      newLabel = target.version.name;
    }

    // Compute diff
    const diff = compareTrees(oldTree, newTree);
    const stats = getDiffStats(diff);

    comparisonState = { oldTree, newTree, oldLabel, newLabel, diff, viewMode: 'merged' };

    // Show merged view by default
    showMergedView(comparisonState);

    showComparisonBanner({
      container: chartArea,
      oldLabel,
      newLabel,
      stats,
      viewMode: 'merged',
      dimUnchanged,
      onToggleView: toggleComparisonView,
      onToggleDimUnchanged: handleToggleDim,
      onExit: exitComparisonMode,
    });
  };

  const rerender = () => {
    const fullTree = store.getTree();

    // Validate focus target still exists
    focusMode.validate();

    const treeToRender = focusMode.getVisibleTree();

    // Refresh categories so renderer picks up any changes
    renderer.updateOptions({ categories: categoryStore.getAll() });
    renderer.render(treeToRender);
    const opts = renderer.getOptions();
    settingsStore.save(opts as unknown as Partial<PersistableSettings>);
    chartStore.saveWorkingTree(fullTree, categoryStore.getAll());

    focusMode.showBanner(chartArea);

    onSettingsSaved?.();

    // Update category legend on the chart
    const categories = categoryStore.getAll();
    if (categories.length > 0) {
      showCategoryLegend({ categories, container: chartArea, legendRows: renderer.getOptions().legendRows });
    } else {
      dismissCategoryLegend();
    }
  };

  // Initialize focus mode controller now that rerender is defined
  focusMode = new FocusModeController(store, renderer, rerender);
  focusMode.onExit(() => announce('Showing full org'));

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
  themeManager.onChange((theme: Theme) => {
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    announce(`Switched to ${theme} theme`);
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
    if (store.undo()) announce('Undo');
  });
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn = document.createElement('button');
  redoBtn.className = 'icon-btn';
  redoBtn.setAttribute('data-tooltip', 'Redo (Ctrl+Shift+Z)');
  redoBtn.setAttribute('aria-label', 'Redo');
  redoBtn.textContent = '↪';
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', () => {
    if (store.redo()) announce('Redo');
  });
  headerRight.insertBefore(redoBtn, themeBtn);

  // Visual divider between undo/redo and theme toggle
  const divider = document.createElement('span');
  divider.className = 'header-divider';
  headerRight.insertBefore(divider, themeBtn);

  const updateUndoRedoState = () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    undoBtn.style.opacity = store.canUndo() ? '1' : '0.4';
    redoBtn.style.opacity = store.canRedo() ? '1' : '0.4';
  };
  store.onChange(updateUndoRedoState);
  updateUndoRedoState();

  // Chart name header (between logo and search)
  const headerLeft = document.querySelector('.header-left')!;
  const chartNameContainer = document.createElement('div');
  chartNameContainer.style.cssText = 'display:flex;align-items:center;margin-left:12px;';
  headerLeft.appendChild(chartNameContainer);

  const chartNameHeader = new ChartNameHeader({
    container: chartNameContainer,
    initialName: activeChart.name,
    onRename: async (newName: string) => {
      const id = chartStore.getActiveChartId();
      if (id) await chartStore.renameChart(id, newName);
    },
    onSaveVersion: () => {
      const name = prompt('Version name:');
      if (name?.trim()) {
        chartStore.saveVersion(name.trim(), store.getTree());
        announce('Chart saved');
      }
    },
  });

  // Update dirty indicator on every store change
  store.onChange(() => {
    chartNameHeader.setDirty(chartStore.isDirty(store.getTree()));
  });

  // Search UI
  const headerCenter = document.getElementById('header-center')!;

  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.setAttribute('role', 'searchbox');
  searchInput.setAttribute('aria-label', 'Search people by name or title');
  searchInput.placeholder = 'Search people... (Ctrl+F)';
  headerCenter.appendChild(searchInput);

  const search = new SearchController(searchInput, store, renderer, 200, (count) => {
    announce(count > 0 ? `${count} results found` : 'No results found');
  });

  // Sidebar tabs
  const tabSwitcher = new TabSwitcher(sidebar, [
    { id: 'charts', label: 'Charts' },
    { id: 'people', label: 'People' },
    { id: 'import', label: 'Import' },
    { id: 'settings', label: 'Settings' },
  ]);

  const peopleContainer = tabSwitcher.getContentContainer('people')!;
  const formEditor = new FormEditor(peopleContainer, store);

  const importContainer = tabSwitcher.getContentContainer('import')!;
  const importEditorWrapper = document.createElement('div');
  importContainer.appendChild(importEditorWrapper);
  new ImportEditor(importEditorWrapper, store, async (tree, name) => {
    const chart = await chartStore.createChartFromTree(name, tree);
    focusMode.clear();
    dismissVersionViewer();
    clearMultiSelection();
    store.replaceTree(chart.workingTree);
    categoryStore.replaceAll(chart.categories);
    chartNameHeader.setName(chart.name);
    chartNameHeader.setDirty(false);
    rerender();
    renderer.getZoomManager()?.fitToContent();
    formEditor.refresh();
    jsonEditor.refresh();
  }, chartStore, (chart) => {
    focusMode.clear();
    dismissVersionViewer();
    clearMultiSelection();
    store.replaceTree(chart.workingTree);
    categoryStore.replaceAll(chart.categories);
    chartNameHeader.setName(chart.name);
    chartNameHeader.setDirty(false);
    rerender();
    renderer.getZoomManager()?.fitToContent();
    formEditor.refresh();
    jsonEditor.refresh();
  });

  // Text normalization section
  const normSeparator = document.createElement('hr');
  normSeparator.style.cssText =
    'border:none;border-top:1px solid var(--border-subtle);margin:16px 0;';
  importContainer.appendChild(normSeparator);
  const normWrapper = document.createElement('div');
  importContainer.appendChild(normWrapper);
  new UtilitiesEditor(normWrapper, store);

  // JSON Editor as collapsible details
  const jsonSeparator = document.createElement('hr');
  jsonSeparator.style.cssText =
    'border:none;border-top:1px solid var(--border-subtle);margin:16px 0;';
  importContainer.appendChild(jsonSeparator);

  const jsonDetails = document.createElement('details');
  jsonDetails.style.cssText = 'margin-bottom:14px;';

  const jsonSummary = document.createElement('summary');
  jsonSummary.style.cssText =
    'padding:6px 0;font-size:11px;font-weight:700;font-family:var(--font-sans);' +
    'color:var(--text-tertiary);cursor:pointer;user-select:none;text-transform:uppercase;letter-spacing:0.08em;' +
    'list-style:none;display:flex;align-items:center;gap:6px;';

  const jsonArrow = document.createElement('span');
  jsonArrow.style.cssText = 'font-size:8px;transition:transform 150ms ease;display:inline-block;';
  jsonArrow.textContent = '▶';
  jsonSummary.appendChild(jsonArrow);
  jsonSummary.appendChild(document.createTextNode('Edit JSON'));
  jsonDetails.appendChild(jsonSummary);

  jsonDetails.addEventListener('toggle', () => {
    jsonArrow.style.transform = jsonDetails.open ? 'rotate(90deg)' : '';
  });

  const jsonContent = document.createElement('div');
  jsonDetails.appendChild(jsonContent);
  importContainer.appendChild(jsonDetails);

  const jsonEditor = new JsonEditor(jsonContent, store);

  // Load sample org button (after Edit JSON, at the bottom)
  const sampleSeparator = document.createElement('hr');
  sampleSeparator.style.cssText =
    'border:none;border-top:1px solid var(--border-subtle);margin:14px 0;';
  importContainer.appendChild(sampleSeparator);

  const sampleBtn = document.createElement('button');
  sampleBtn.className = 'btn btn-secondary';
  sampleBtn.textContent = '🌳 Load Sample Org Chart';
  sampleBtn.style.cssText = 'width:100%;padding:8px;font-size:12px;';
  sampleBtn.addEventListener('click', () => {
    store.fromJSON(JSON.stringify(SAMPLE_ORG));
  });
  importContainer.appendChild(sampleBtn);

  const settingsContainer = tabSwitcher.getContentContainer('settings')!;
  new SettingsEditor(settingsContainer, renderer, rerender, settingsStore, categoryStore, chartDB);

  // Charts tab
  const chartsContainer = tabSwitcher.getContentContainer('charts')!;

  const handleBeforeSwitch = async (): Promise<boolean> => {
    if (!chartStore.isDirty(store.getTree())) return true;
    const confirmed = await showConfirmDialog({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Would you like to save a version before switching?',
      confirmLabel: 'Switch without saving',
      danger: true,
    });
    return confirmed;
  };

  new ChartEditor({
    container: chartsContainer,
    chartStore,
    getCurrentTree: () => store.getTree(),
    getCurrentCategories: () => categoryStore.getAll(),
    onBeforeSwitch: handleBeforeSwitch,
    onChartSwitch: (chart) => {
      // Exit focus mode and version viewer
      focusMode.clear();
      dismissVersionViewer();
      clearMultiSelection();
      // Load the new chart's data
      store.replaceTree(chart.workingTree);
      if (chart.categories.length > 0) {
        categoryStore.replaceAll(chart.categories);
      } else {
        categoryStore.replaceAll([]);
      }
      chartNameHeader.setName(chart.name);
      chartNameHeader.setDirty(false);
      rerender();
      renderer.getZoomManager()?.fitToContent();
      formEditor.refresh();
      jsonEditor.refresh();
      announce(`Switched to ${chart.name}`);
    },
    onVersionRestore: (tree) => {
      dismissVersionViewer();
      store.replaceTree(tree);
      chartNameHeader.setDirty(false);
      rerender();
      renderer.getZoomManager()?.fitToContent();
      formEditor.refresh();
      jsonEditor.refresh();
    },
    onVersionView: (version) => {
      // Enter read-only view mode
      const savedTree = store.getTree();
      store.replaceTree(version.tree);
      rerender();
      renderer.getZoomManager()?.fitToContent();
      showVersionViewer({
        versionName: version.name,
        container: chartArea,
        onRestore: async () => {
          const shouldProceed = await handleBeforeSwitch();
          if (!shouldProceed) return;
          await chartStore.restoreVersion(version.id);
          dismissVersionViewer();
          chartNameHeader.setDirty(false);
          rerender();
        },
        onClose: () => {
          // Restore the working tree
          store.replaceTree(savedTree);
          dismissVersionViewer();
          rerender();
          renderer.getZoomManager()?.fitToContent();
        },
      });
    },
    onVersionCompare: (version) => {
      enterComparisonMode(version);
    },
  });

  // Multi-select helpers
  let updateSelectionIndicator: () => void = () => {};

  const syncSelectionToRenderer = () => {
    renderer.setMultiSelectedNodes(selection.hasSelection ? selection.ids : null);
  };

  const clearMultiSelection = () => {
    selection.clear();
    syncSelectionToRenderer();
    updateSelectionIndicator();
  };

  store.onChange(() => {
    rerender();
    formEditor.refresh();
    jsonEditor.refresh();
    clearMultiSelection();
  });

  categoryStore.onChange(() => {
    rerender();
  });

  renderer.setNodeClickHandler((nodeId: string, event: MouseEvent) => {
    if (event.shiftKey) {
      // Shift+click: toggle multi-selection (root excluded)
      const tree = store.getTree();
      if (tree.id === nodeId) return;

      selection.toggle(nodeId);
      syncSelectionToRenderer();
      updateSelectionIndicator();
      announce(`${selection.count} people selected`);
    } else {
      // Regular click: clear multi-selection, highlight card only (no sidebar form)
      clearMultiSelection();
      renderer.setSelectedNode(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (node) announce(`Selected ${node.name}, ${node.title}`);
    }
  });

  // Dismiss all floating UI on chart zoom/pan
  const dismissAllOverlays = () => {
    dismissContextMenu();
    dismissInlineEditor();
    dismissAddPopover();
  };
  renderer.getZoomManager().onZoom(dismissAllOverlays);

  // Helper: show single-card context menu
  const showSingleCardMenu = (nodeId: string, event: MouseEvent) => {
    const tree = store.getTree();
    const node = findNodeById(tree, nodeId);
    if (!node) return;

    const isRoot = tree.id === nodeId;
    const nodeIsLeaf = isLeaf(node);
    const parent = findParent(tree, nodeId);
    const nodeIsIC = nodeIsLeaf && parent !== null && isM1(parent);

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: 'Edit',
          icon: '✏️',
          action: () => {
            const rect = renderer.getNodeScreenRect(nodeId);
            if (!rect) return;
            showInlineEditor({
              rect,
              name: node.name,
              title: node.title,
              onSave: (name, title) => {
                store.updateNode(nodeId, { name, title });
              },
              onCancel: () => {},
            });
          },
        },
        {
          label: 'Add',
          icon: '➕',
          action: () => {
            const rect = renderer.getNodeScreenRect(nodeId);
            if (!rect) return;
            showAddPopover({
              anchor: rect,
              parentName: node.name,
              onAdd: (name, title) => {
                store.addChild(nodeId, { name, title });
              },
              onCancel: () => {},
            });
          },
        },
        {
          label: 'Focus on sub-org',
          icon: '🔎',
          disabled: nodeIsLeaf || focusMode.focusedId === nodeId,
          action: () => {
            focusMode.enter(nodeId);
            announce(`Focused on ${node.name} org`);
          },
        },
        {
          label: 'Set Category',
          icon: '🏷️',
          submenu: [
            {
              label: 'None (default)',
              icon: node.categoryId ? ' ' : '✓',
              action: () => {
                store.setNodeCategory(nodeId, null);
              },
            },
            ...categoryStore.getAll().map(
              (cat): ContextMenuItem => ({
                label: cat.label,
                icon: node.categoryId === cat.id ? '✓' : ' ',
                swatch: cat.color,
                action: () => {
                  store.setNodeCategory(nodeId, cat.id);
                },
              }),
            ),
          ],
        },
        {
          label: node.dottedLine ? 'Remove dotted line' : 'Set as dotted line',
          icon: '┈',
          disabled: isRoot || nodeIsIC,
          action: () => {
            store.setDottedLine(nodeId, !node.dottedLine);
          },
        },
        {
          label: 'Move',
          icon: '↗️',
          disabled: isRoot,
          action: async () => {
            try {
              const allNodes = flattenTree(tree);
              const descendants = flattenTree(node);
              const descendantIds = new Set(descendants.map((n) => n.id));
              const managers = allNodes
                .filter((n) => !descendantIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const result = await showManagerPicker({
                title: `Move "${node.name}" to…`,
                managers,
                showDottedLineOption: true,
              });
              if (result) {
                const targetNode = findNodeById(tree, result.managerId);
                store.moveNode(nodeId, result.managerId, result.dottedLine);
                announce(`${node.name} moved to ${targetNode?.name ?? 'new manager'}`);
              }
            } catch (e) {
              console.error('Operation failed:', e);
            }
          },
        },
        {
          label: 'Remove',
          icon: '🗑️',
          danger: true,
          disabled: isRoot,
          action: async () => {
            try {
              if (nodeIsLeaf) {
                const confirmed = await showConfirmDialog({
                  title: 'Remove Person',
                  message: `Remove "${node.name}"? This cannot be undone (but you can use Ctrl+Z to undo).`,
                  confirmLabel: 'Remove',
                  danger: true,
                });
                if (confirmed) {
                  store.removeNode(nodeId);
                  announce(`${node.name} removed`);
                }
              } else {
                const allNodes = flattenTree(tree);
                const descendants = flattenTree(node);
                const descendantIds = new Set(descendants.map((n) => n.id));
                const managers = allNodes
                  .filter((n) => !descendantIds.has(n.id))
                  .map((n) => ({ id: n.id, name: n.name, title: n.title }));

                const result = await showManagerPicker({
                  title: `Reassign "${node.name}"'s reports to…`,
                  managers,
                });
                if (result) {
                  store.removeNodeWithReassign(nodeId, result.managerId);
                  announce(`${node.name} removed`);
                }
              }
            } catch (e) {
              console.error('Operation failed:', e);
            }
          },
        },
      ],
    });
  };

  // Helper: show multi-select context menu
  const showMultiSelectMenu = (event: MouseEvent) => {
    const count = selection.count;
    const selectedArray = selection.toArray();

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: `Set Category (${count} people)`,
          icon: '🏷️',
          submenu: [
            {
              label: 'None (default)',
              action: () => {
                store.bulkSetCategory(selectedArray, null);
              },
            },
            ...categoryStore.getAll().map(
              (cat): ContextMenuItem => ({
                label: cat.label,
                swatch: cat.color,
                action: () => {
                  store.bulkSetCategory(selectedArray, cat.id);
                },
              }),
            ),
          ],
        },
        {
          label: `Move all (${count} people)`,
          icon: '↗️',
          action: async () => {
            try {
              const tree = store.getTree();
              const allNodes = flattenTree(tree);
              // Exclude selected nodes and their descendants
              const excludeIds = new Set<string>();
              for (const id of selectedArray) {
                const n = findNodeById(tree, id);
                if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
              }
              const managers = allNodes
                .filter((n) => !excludeIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const result = await showManagerPicker({
                title: `Move ${count} people to…`,
                managers,
              });
              if (result) {
                store.bulkMoveNodes(selectedArray, result.managerId);
                const targetNode = findNodeById(store.getTree(), result.managerId);
                announce(`${count} people moved to ${targetNode?.name ?? 'new manager'}`);
              }
            } catch (e) {
              console.error('Operation failed:', e);
            }
          },
        },
        {
          label: `Remove all (${count} people)`,
          icon: '🗑️',
          danger: true,
          action: async () => {
            try {
              const tree = store.getTree();
              // Check if any selected nodes have children
              const hasManagers = selectedArray.some((id) => {
                const n = findNodeById(tree, id);
                return n && !isLeaf(n);
              });

              if (hasManagers) {
                // Some are managers — ask where to reassign children
                const allNodes = flattenTree(tree);
                const excludeIds = new Set<string>();
                for (const id of selectedArray) {
                  const n = findNodeById(tree, id);
                  if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
                }
                const managers = allNodes
                  .filter((n) => !excludeIds.has(n.id))
                  .map((n) => ({ id: n.id, name: n.name, title: n.title }));

                const result = await showManagerPicker({
                  title: `Reassign children of selected managers to…`,
                  managers,
                });
                if (result) {
                  // Reassign children of managers first, then remove all
                  for (const id of selectedArray) {
                    const n = findNodeById(store.getTree(), id);
                    if (n && !isLeaf(n)) {
                      store.removeNodeWithReassign(id, result.managerId);
                    } else if (n) {
                      store.removeNode(id);
                    }
                  }
                  announce(`${count} people removed`);
                }
              } else {
                // All leaves — simple confirm and bulk remove
                const confirmed = await showConfirmDialog({
                  title: 'Remove Selected',
                  message: `Remove ${count} people? You can use Ctrl+Z to undo.`,
                  confirmLabel: 'Remove All',
                  danger: true,
                });
                if (confirmed) {
                  store.bulkRemoveNodes(selectedArray);
                  announce(`${count} people removed`);
                }
              }
            } catch (e) {
              console.error('Operation failed:', e);
            }
          },
        },
      ],
    });
  };

  // Right-click context menu
  renderer.setNodeRightClickHandler((nodeId: string, event: MouseEvent) => {
    dismissAllOverlays();

    if (selection.hasSelection && selection.isSelected(nodeId)) {
      // Right-clicked on a multi-selected card → show bulk menu
      showMultiSelectMenu(event);
    } else {
      // Right-clicked on non-selected card → clear multi-selection, show single menu
      clearMultiSelection();
      showSingleCardMenu(nodeId, event);
    }
  });

  // Footer
  const footer = document.getElementById('footer')!;

  // Footer: Status area (left side)
  const footerLeft = document.createElement('div');
  footerLeft.className = 'footer-left';
  footerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:auto;';
  footer.appendChild(footerLeft);

  const versionLabel = document.createElement('span');
  versionLabel.className = 'footer-version';
  versionLabel.id = 'footer-version';
  versionLabel.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionLabel.textContent = `v${APP_VERSION}`;
  footerLeft.appendChild(versionLabel);

  const versionSeparator = document.createElement('span');
  versionSeparator.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionSeparator.textContent = '·';
  footerLeft.appendChild(versionSeparator);

  const statusText = document.createElement('span');
  statusText.className = 'footer-status';
  statusText.id = 'footer-status';
  statusText.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
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
    const tree = focusMode.getVisibleTree();
    const allNodes = flattenTree(tree);
    const total = allNodes.length;
    const managerCount = allNodes.filter((n) => !isLeaf(n)).length;
    const icCount = countLeaves(tree);
    const levels = countManagersByLevel(tree);

    const activeChartName = chartNameHeader.getName();
    const prefix = activeChartName ? `${activeChartName} · ` : '';
    const parts = [`${prefix}${total} people`, `${managerCount} managers`, `${icCount} ICs`];
    const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
    for (const [depth, count] of sortedLevels) {
      parts.push(`${count} M${depth}`);
    }
    statusText.textContent = parts.join(' · ');
  };
  store.onChange(updateStatus);
  updateStatus();

  // Footer: Center area (GitHub links + selection indicator)
  const footerCenter = document.createElement('div');
  footerCenter.className = 'footer-center';
  footerCenter.style.cssText =
    'position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;font-size:11px;font-family:var(--font-sans);';

  const selectionIndicator = document.createElement('span');
  selectionIndicator.style.cssText = 'color:var(--accent);font-weight:600;display:none;';
  footerCenter.appendChild(selectionIndicator);

  const githubLink = document.createElement('a');
  githubLink.href = 'https://github.com/pedrofuentes/arbol';
  githubLink.target = '_blank';
  githubLink.rel = 'noopener noreferrer';
  githubLink.textContent = '✦ Built with Arbol';
  footerCenter.appendChild(githubLink);

  const centerSeparator = document.createElement('span');
  centerSeparator.style.color = 'var(--text-tertiary)';
  centerSeparator.textContent = '·';
  footerCenter.appendChild(centerSeparator);

  const issuesLink = document.createElement('a');
  issuesLink.href = 'https://github.com/pedrofuentes/arbol/issues';
  issuesLink.target = '_blank';
  issuesLink.rel = 'noopener noreferrer';
  issuesLink.textContent = 'Report bugs & request features';
  footerCenter.appendChild(issuesLink);

  footer.appendChild(footerCenter);

  // Update selection indicator when multi-select changes
  updateSelectionIndicator = () => {
    if (selection.hasSelection) {
      selectionIndicator.textContent = `${selection.count} selected`;
      selectionIndicator.style.display = '';
      // Hide links when selection is active
      githubLink.style.display = 'none';
      centerSeparator.style.display = 'none';
      issuesLink.style.display = 'none';
    } else {
      selectionIndicator.style.display = 'none';
      githubLink.style.display = '';
      centerSeparator.style.display = '';
      issuesLink.style.display = '';
    }
  };

  // Zoom indicator (will be appended to footer right, after Reset button)
  const zoomIndicator = document.createElement('span');
  zoomIndicator.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);min-width:36px;text-align:right;';

  const zoomManager = renderer.getZoomManager();
  const updateZoomIndicator = () => {
    if (zoomManager) {
      const pct = zoomManager.getRelativeZoomPercent();
      zoomIndicator.textContent = `${pct}%`;
    }
  };
  zoomManager?.onZoom(() => {
    updateZoomIndicator();
  });
  updateZoomIndicator();

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

  const exportCurrentChart = async () => {
    const layout = renderer.getLastLayout();
    if (!layout) return;

    // Warn if chart will be scaled down due to PowerPoint's 56" limit
    const PX_TO_IN = 1 / 96;
    const MAX_SLIDE = 56;
    const chartW = layout.boundingBox.width * PX_TO_IN + 1;
    const chartH = layout.boundingBox.height * PX_TO_IN + 1;
    if (chartW > MAX_SLIDE || chartH > MAX_SLIDE) {
      const confirmed = await showConfirmDialog({
        title: 'Large Org Chart',
        message:
          'This org chart is too large to fit at full size on a PowerPoint slide (max 56″). ' +
          'It will be scaled down and may be hard to read.\n\n' +
          'Tip: Right-click a manager and choose "Focus on sub-org" to export a smaller section instead.',
        confirmLabel: 'Export anyway',
        danger: false,
      });
      if (!confirmed) return;
    }

    const rendererOpts = renderer.getOptions();
    const activeChart = await chartStore.getActiveChart();
    const chartName = activeChart?.name ?? 'org-chart';
    const safeChartName = chartName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').toLowerCase();
    await exportToPptx(layout, {
      fileName: timestampedFilename(`${safeChartName}.pptx`),
      categories: categoryStore.getAll(),
      nameFontSize: rendererOpts.nameFontSize,
      titleFontSize: rendererOpts.titleFontSize,
      cardFill: rendererOpts.cardFill,
      cardStroke: rendererOpts.cardStroke,
      cardStrokeWidth: rendererOpts.cardStrokeWidth,
      icContainerFill: rendererOpts.icContainerFill,
      linkColor: rendererOpts.linkColor,
      linkWidth: rendererOpts.linkWidth,
      nameColor: rendererOpts.nameColor,
      titleColor: rendererOpts.titleColor,
      showHeadcount: rendererOpts.showHeadcount,
      headcountBadgeColor: rendererOpts.headcountBadgeColor,
      headcountBadgeTextColor: rendererOpts.headcountBadgeTextColor,
      headcountBadgeFontSize: rendererOpts.headcountBadgeFontSize,
      headcountBadgeRadius: rendererOpts.headcountBadgeRadius,
      headcountBadgePadding: rendererOpts.headcountBadgePadding,
      headcountBadgeHeight: rendererOpts.headcountBadgeHeight,
      legendRows: rendererOpts.legendRows,
      textAlign: rendererOpts.textAlign as 'left' | 'center' | 'right',
      cardBorderRadius: rendererOpts.cardBorderRadius as number,
      fontFamily: rendererOpts.fontFamily as string,
    });
  };

  exportBtn.addEventListener('click', exportCurrentChart);

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
  resetZoomBtn.setAttribute('data-tooltip', 'Reset zoom');
  footerRight.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.centerAtRealSize();
  });

  // Zoom level indicator (right side, after Reset)
  const zoomSeparator = document.createElement('span');
  zoomSeparator.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  footerRight.appendChild(zoomSeparator);
  footerRight.appendChild(zoomIndicator);

  // Keyboard shortcuts
  const shortcuts = new ShortcutManager();

  shortcuts.register({
    key: 'z',
    ctrl: true,
    handler: () => { if (store.undo()) announce('Undo'); },
    description: 'Undo',
  });

  shortcuts.register({
    key: 'z',
    ctrl: true,
    shift: true,
    handler: () => { if (store.redo()) announce('Redo'); },
    description: 'Redo',
  });

  shortcuts.register({
    key: 'y',
    ctrl: true,
    handler: () => { if (store.redo()) announce('Redo'); },
    description: 'Redo (alt)',
  });

  shortcuts.register({
    key: 'e',
    ctrl: true,
    handler: exportCurrentChart,
    description: 'Export PPTX',
  });

  shortcuts.register({
    key: 'f',
    ctrl: true,
    handler: () => {
      search.focus();
    },
    description: 'Search',
  });

  shortcuts.register({
    key: 'Escape',
    handler: () => {
      // Dismiss version viewer if active
      if (isVersionViewerActive()) {
        dismissVersionViewer();
        return;
      }
      // Exit comparison mode if active
      if (isComparisonBannerActive()) {
        exitComparisonMode();
        return;
      }
      // Clear search if active
      if (search.isActive) {
        search.clear();
        searchInput.blur();
        return;
      }
      // Exit focus mode if active
      if (focusMode.isFocused) {
        focusMode.exit();
        return;
      }
      // Clear multi-selection
      clearMultiSelection();
      // Deselect node
      formEditor.selectNode(null);
      renderer.setSelectedNode(null);
    },
    description: 'Deselect / Clear search',
  });

  window.addEventListener('beforeunload', (e) => {
    if (chartStore.isDirty(store.getTree())) {
      e.preventDefault();
    }
  });

  rerender();
}

document.addEventListener('DOMContentLoaded', main);
