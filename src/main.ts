import { setLocale, t } from './i18n';
import en from './i18n/en';
import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { exportToPptx } from './export/pptx-exporter';
import { ThemeManager, Theme } from './store/theme-manager';
import { SettingsStore, PersistableSettings } from './store/settings-store';
import { CategoryStore } from './store/category-store';
import { flattenTree, findNodeById, findParent, isLeaf, isM1, countLeaves, countManagersByLevel } from './utils/tree';
import { showHelpDialog } from './ui/help-dialog';
import { ShortcutManager } from './utils/shortcuts';
import { timestampedFilename } from './utils/filename';
import { APP_VERSION } from './version';
import { showContextMenu, dismissContextMenu, ContextMenuItem } from './ui/context-menu';
import { showInlineEditor, dismissInlineEditor } from './ui/inline-editor';
import { showAddPopover, dismissAddPopover } from './ui/add-popover';
import { showManagerPicker } from './ui/manager-picker';
import { showConfirmDialog } from './ui/confirm-dialog';
import { showToast } from './ui/toast';
import { showInputDialog } from './ui/input-dialog';
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
import { showWelcomeBanner } from './ui/welcome-banner';
import { CommandPalette, CommandItem } from './ui/command-palette';
import { PropertyPanel } from './ui/property-panel';
import { FloatingActions } from './ui/floating-actions';
import { SettingsModal } from './ui/settings-modal';
import { ImportWizard } from './ui/import-wizard';
import type { ComparisonState, VersionRecord } from './types';

async function main(): Promise<void> {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  // Offscreen host for editors that need to exist but aren't visible in the sidebar
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;';
  document.body.appendChild(offscreenHost);

  setLocale('en', en);

  // Show loading state during IndexedDB initialization
  const appLoadingEl = document.createElement('div');
  appLoadingEl.className = 'app-loading';
  appLoadingEl.setAttribute('role', 'status');
  appLoadingEl.setAttribute('aria-live', 'polite');
  const loadingSpinner = document.createElement('span');
  loadingSpinner.className = 'loading-spinner';
  loadingSpinner.setAttribute('aria-hidden', 'true');
  appLoadingEl.appendChild(loadingSpinner);
  const loadingText = document.createElement('span');
  loadingText.textContent = t('app.loading');
  appLoadingEl.appendChild(loadingText);
  chartArea.appendChild(appLoadingEl);

  // Initialize chart database and store
  const chartDB = new ChartDB();
  await chartDB.open();
  const chartStore = new ChartStore(chartDB);
  const activeChart = await chartStore.initialize();

  appLoadingEl.remove();

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
    sideBySideRenderer.setDimUnchanged(dimUnchanged);
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
      newLabel = t('comparison.working_tree');
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
  focusMode.onExit(() => announce(t('focus.exited')));

  // Theme toggle
  const themeManager = new ThemeManager();
  const headerRight = document.getElementById('header-right')!;

  const themeBtn = document.createElement('button');
  themeBtn.className = 'icon-btn';
  themeBtn.setAttribute('data-tooltip', t('toolbar.toggle_theme'));
  themeBtn.setAttribute('aria-label', t('toolbar.toggle_theme_aria'));
  const themeIcon = document.createElement('span');
  themeIcon.setAttribute('aria-hidden', 'true');
  themeIcon.textContent = themeManager.getTheme() === 'dark' ? t('toolbar.theme_icon_dark') : t('toolbar.theme_icon_light');
  themeBtn.appendChild(themeIcon);
  themeBtn.addEventListener('click', () => {
    themeManager.toggle();
  });
  themeManager.onChange((theme: Theme) => {
    themeIcon.textContent = theme === 'dark' ? t('toolbar.theme_icon_dark') : t('toolbar.theme_icon_light');
    announce(t('toolbar.theme_switched', { theme }));
  });
  headerRight.appendChild(themeBtn);

  // Help button
  const helpBtn = document.createElement('button');
  helpBtn.className = 'icon-btn';
  helpBtn.setAttribute('data-tooltip', t('toolbar.help_tooltip'));
  helpBtn.setAttribute('aria-label', t('toolbar.help_aria'));
  helpBtn.textContent = t('toolbar.help_text');
  helpBtn.style.fontWeight = '700';
  helpBtn.addEventListener('click', () => showHelpDialog());
  headerRight.appendChild(helpBtn);

  // Undo/Redo buttons (inserted before theme button)
  const undoBtn = document.createElement('button');
  undoBtn.className = 'icon-btn';
  undoBtn.setAttribute('data-tooltip', t('toolbar.undo_tooltip'));
  undoBtn.setAttribute('aria-label', t('toolbar.undo_aria'));
  undoBtn.setAttribute('aria-keyshortcuts', 'Control+Z');
  const undoIcon = document.createElement('span');
  undoIcon.setAttribute('aria-hidden', 'true');
  undoIcon.textContent = t('toolbar.undo_icon');
  undoBtn.appendChild(undoIcon);
  undoBtn.disabled = true;
  undoBtn.addEventListener('click', () => {
    if (store.undo()) announce(t('announce.undo'));
  });
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn= document.createElement('button');
  redoBtn.className = 'icon-btn';
  redoBtn.setAttribute('data-tooltip', t('toolbar.redo_tooltip'));
  redoBtn.setAttribute('aria-label', t('toolbar.redo_aria'));
  redoBtn.setAttribute('aria-keyshortcuts', 'Control+Shift+Z');
  const redoIcon = document.createElement('span');
  redoIcon.setAttribute('aria-hidden', 'true');
  redoIcon.textContent = t('toolbar.redo_icon');
  redoBtn.appendChild(redoIcon);
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', () => {
    if (store.redo()) announce(t('announce.redo'));
  });
  headerRight.insertBefore(redoBtn, themeBtn);

  // Visual divider between undo/redo and theme toggle
  const divider = document.createElement('span');
  divider.className = 'header-divider';
  headerRight.insertBefore(divider, themeBtn);

  // Settings modal (opens via header button)
  const settingsModal = new SettingsModal({
    onClose: () => {},
    onApply: () => { rerender(); },
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'icon-btn';
  settingsBtn.setAttribute('data-tooltip', t('toolbar.settings_tooltip'));
  settingsBtn.setAttribute('aria-label', t('toolbar.settings_aria'));
  settingsBtn.setAttribute('aria-keyshortcuts', 'Control+,');
  const settingsIcon = document.createElement('span');
  settingsIcon.setAttribute('aria-hidden', 'true');
  settingsIcon.textContent = '⚙️';
  settingsBtn.appendChild(settingsIcon);
  settingsBtn.addEventListener('click', () => { settingsModal.open(); });
  headerRight.insertBefore(settingsBtn, divider);

  // Import wizard (opens via header button)
  const importWizard = new ImportWizard({
    steps: [
      { id: 'source', label: t('import_wizard.step_source') },
      { id: 'mapping', label: t('import_wizard.step_mapping') },
      { id: 'preview', label: t('import_wizard.step_preview') },
      { id: 'import', label: t('import_wizard.step_import') },
    ],
    onClose: () => {},
    onStepChange: () => {},
    onComplete: () => { importWizard.close(); },
  });

  const importBtn = document.createElement('button');
  importBtn.className = 'icon-btn';
  importBtn.setAttribute('data-tooltip', t('toolbar.import_tooltip'));
  importBtn.setAttribute('aria-label', t('toolbar.import_aria'));
  const importIcon = document.createElement('span');
  importIcon.setAttribute('aria-hidden', 'true');
  importIcon.textContent = '📂';
  importBtn.appendChild(importIcon);
  importBtn.appendChild(document.createTextNode(' Import'));
  importBtn.addEventListener('click', () => { importWizard.open(); });
  headerRight.insertBefore(importBtn, settingsBtn);

  const exportHeaderBtn = document.createElement('button');
  exportHeaderBtn.className = 'icon-btn';
  exportHeaderBtn.setAttribute('data-tooltip', t('toolbar.export_tooltip'));
  exportHeaderBtn.setAttribute('aria-label', t('toolbar.export_aria'));
  exportHeaderBtn.setAttribute('aria-keyshortcuts', 'Control+e');
  const exportHeaderIcon = document.createElement('span');
  exportHeaderIcon.setAttribute('aria-hidden', 'true');
  exportHeaderIcon.textContent = '📤';
  exportHeaderBtn.appendChild(exportHeaderIcon);
  exportHeaderBtn.appendChild(document.createTextNode(' Export'));
  exportHeaderBtn.addEventListener('click', () => { exportCurrentChart(); });
  headerRight.insertBefore(exportHeaderBtn, settingsBtn);

  const updateUndoRedoState = () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    undoBtn.style.opacity = store.canUndo() ? '1' : '0.4';
    redoBtn.style.opacity = store.canRedo() ? '1' : '0.4';
  };
  store.onChange(updateUndoRedoState);
  updateUndoRedoState();

  // Chart name header (moved offscreen — name shown in sidebar)
  const headerLeft = document.querySelector('.header-left')!;
  const chartNameContainer = document.createElement('div');
  chartNameContainer.style.cssText = 'display:flex;align-items:center;margin-left:12px;';
  offscreenHost.appendChild(chartNameContainer);

  const chartNameHeader = new ChartNameHeader({
    container: chartNameContainer,
    initialName: activeChart.name,
    onRename: async (newName: string) => {
      const id = chartStore.getActiveChartId();
      if (id) await chartStore.renameChart(id, newName);
    },
    onSaveVersion: async () => {
      const name = await showInputDialog({
        title: t('dialog.save_version.title'),
        label: t('dialog.save_version.label'),
        placeholder: t('dialog.save_version.placeholder'),
        maxLength: 100,
      });
      if (name?.trim()) {
        chartStore.saveVersion(name.trim(), store.getTree());
        announce(t('announce.chart_saved'));
      }
    },
  });

  // Update dirty indicator on every store change
  store.onChange(() => {
    chartNameHeader.setDirty(chartStore.isDirty(store.getTree()));
  });

  // Mobile sidebar toggle (hamburger menu)
  const menuToggle = document.createElement('button');
  menuToggle.className = 'menu-toggle icon-btn';
  menuToggle.setAttribute('aria-label', t('toolbar.toggle_sidebar'));
  menuToggle.setAttribute('aria-expanded', 'false');
  const menuIcon = document.createElement('span');
  menuIcon.setAttribute('aria-hidden', 'true');
  menuIcon.textContent = t('toolbar.hamburger_icon');
  menuToggle.appendChild(menuIcon);
  headerLeft.insertBefore(menuToggle, headerLeft.firstChild);

  const sidebarBackdrop = document.createElement('div');
  sidebarBackdrop.className = 'sidebar-backdrop';
  document.body.appendChild(sidebarBackdrop);

  const closeSidebar = () => {
    sidebar.classList.remove('sidebar-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    sidebarBackdrop.classList.remove('visible');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('sidebar-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    sidebarBackdrop.classList.toggle('visible', isOpen);
  });

  sidebarBackdrop.addEventListener('click', closeSidebar);

  // Search UI
  const headerCenter = document.getElementById('header-center')!;

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-wrapper';

  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.setAttribute('role', 'searchbox');
  searchInput.setAttribute('aria-label', t('search.aria'));
  searchInput.setAttribute('aria-keyshortcuts', 'Control+F');
  searchInput.placeholder = t('search.placeholder');
  searchWrapper.appendChild(searchInput);

  const noResultsHint = document.createElement('span');
  noResultsHint.className = 'search-no-results';
  noResultsHint.setAttribute('data-testid', 'search-no-results');
  noResultsHint.textContent = t('search.no_results');
  noResultsHint.style.display = 'none';
  searchWrapper.appendChild(noResultsHint);

  headerCenter.appendChild(searchWrapper);

  const search = new SearchController(searchInput, store, renderer, 200, (count) => {
    announce(count > 0 ? t('search.results_found', { count }) : t('search.no_results'));
    noResultsHint.style.display = count === 0 ? '' : 'none';
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length === 0) {
      noResultsHint.style.display = 'none';
    }
  });

  // Editors hosted offscreen (still instantiated for API calls)
  const formEditorHost = document.createElement('div');
  offscreenHost.appendChild(formEditorHost);
  const formEditor = new FormEditor(formEditorHost, store);

  const jsonEditorHost = document.createElement('div');
  offscreenHost.appendChild(jsonEditorHost);
  const jsonEditor = new JsonEditor(jsonEditorHost, store);

  // Charts — mounted directly in sidebar (no tabs)
  const handleBeforeSwitch = async (): Promise<boolean> => {
    if (!chartStore.isDirty(store.getTree())) return true;
    const confirmed = await showConfirmDialog({
      title: t('dialog.unsaved.title'),
      message: t('dialog.unsaved.message'),
      confirmLabel: t('dialog.unsaved.confirm'),
      danger: true,
    });
    return confirmed;
  };

  new ChartEditor({
    container: sidebar,
    chartStore,
    getCurrentTree: () => store.getTree(),
    getCurrentCategories: () => categoryStore.getAll(),
    onBeforeSwitch: handleBeforeSwitch,
    onChartSwitch: (chart) => {
      focusMode.clear();
      dismissVersionViewer();
      clearMultiSelection();
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
      announce(t('announce.chart_switched', { name: chart.name }));
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

  // Sidebar collapse toggle
  const sidebarToggle = document.createElement('button');
  sidebarToggle.className = 'sidebar-toggle';
  sidebarToggle.textContent = '\u2039';
  sidebarToggle.setAttribute('aria-label', t('toolbar.toggle_sidebar'));
  const mainEl = document.getElementById('main')!;
  mainEl.appendChild(sidebarToggle);

  sidebarToggle.addEventListener('click', () => {
    const collapsed = mainEl.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed', collapsed);
    sidebarToggle.textContent = collapsed ? '\u203A' : '\u2039';
  });

  // Sidebar footer with ⌘K button
  const sidebarFooter = document.createElement('div');
  sidebarFooter.className = 'chart-nav-footer';
  const cmdKBtn = document.createElement('button');
  cmdKBtn.className = 'chart-nav-cmdk';
  cmdKBtn.textContent = t('toolbar.quick_actions');
  cmdKBtn.addEventListener('click', () => {
    commandPalette.setItems(buildCommandItems());
    commandPalette.open();
  });
  sidebarFooter.appendChild(cmdKBtn);
  sidebar.appendChild(sidebarFooter);

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

  // ─── Property Panel (right-side contextual panel) ───────────────────
  const propertyPanel = new PropertyPanel({
    container: chartArea,
    onEdit: (nodeId, name, title) => {
      store.updateNode(nodeId, { name, title });
    },
    onAddChild: (nodeId) => {
      const rect = renderer.getNodeScreenRect(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (!rect || !node) return;
      showAddPopover({
        anchor: rect,
        parentName: node.name,
        onAdd: (name, title) => { store.addChild(nodeId, { name, title }); },
        onCancel: () => {},
      });
    },
    onMove: (nodeId) => {
      const tree = store.getTree();
      const node = findNodeById(tree, nodeId);
      if (!node) return;
      const allNodes = flattenTree(tree);
      const descendants = flattenTree(node);
      const descendantIds = new Set(descendants.map((n) => n.id));
      const managers = allNodes
        .filter((n) => !descendantIds.has(n.id))
        .map((n) => ({ id: n.id, name: n.name, title: n.title }));
      showManagerPicker({
        title: t('picker.move_to', { name: node.name }),
        managers,
        showDottedLineOption: true,
      }).then((result) => {
        if (result) {
          store.moveNode(nodeId, result.managerId, result.dottedLine);
          const targetNode = findNodeById(tree, result.managerId);
          announce(t('announce.moved', { name: node.name, target: targetNode?.name ?? t('announce.move_fallback_target') }));
        }
      }).catch((e) => {
        showToast(e instanceof Error ? e.message : String(e), 'error');
      });
    },
    onRemove: (nodeId) => {
      const tree = store.getTree();
      const node = findNodeById(tree, nodeId);
      if (!node) return;
      if (isLeaf(node)) {
        showConfirmDialog({
          title: t('dialog.remove_person.title'),
          message: t('dialog.remove_person.message', { name: node.name }),
          confirmLabel: t('dialog.remove_person.confirm'),
          danger: true,
        }).then((confirmed) => {
          if (confirmed) {
            store.removeNode(nodeId);
            propertyPanel.hide();
            floatingActions.hide();
            announce(t('announce.removed', { name: node.name }));
          }
        });
      } else {
        const descendants = flattenTree(node);
        const descendantCount = descendants.length - 1;
        showConfirmDialog({
          title: t('dialog.remove_manager.title'),
          message: t('dialog.remove_manager.message', { name: node.name, count: String(descendantCount) }),
          confirmLabel: t('dialog.remove_manager.reassign'),
          cancelLabel: t('dialog.remove_manager.remove_all', { count: String(descendantCount) }),
          danger: false,
        }).then((reassign) => {
          if (reassign) {
            const allNodes = flattenTree(tree);
            const descendantIds = new Set(descendants.map((n) => n.id));
            const managers = allNodes
              .filter((n) => !descendantIds.has(n.id))
              .map((n) => ({ id: n.id, name: n.name, title: n.title }));
            showManagerPicker({
              title: t('picker.reassign_to', { name: node.name }),
              managers,
            }).then((result) => {
              if (result) {
                store.removeNodeWithReassign(nodeId, result.managerId);
                propertyPanel.hide();
                floatingActions.hide();
                announce(t('announce.removed', { name: node.name }));
              }
            });
          }
        });
      }
    },
    onFocus: (nodeId) => {
      const node = findNodeById(store.getTree(), nodeId);
      if (!node) return;
      focusMode.enter(nodeId);
      announce(t('focus.entered', { name: node.name }));
    },
    onCategoryChange: (nodeId, categoryId) => {
      store.setNodeCategory(nodeId, categoryId);
    },
    onClose: () => {
      propertyPanel.hide();
      floatingActions.hide();
      renderer.setSelectedNode(null);
      announce(t('announce.panel_closed'));
    },
  });

  const showPropertyPanel = (nodeId: string) => {
    const tree = store.getTree();
    const node = findNodeById(tree, nodeId);
    if (!node) return;
    const parent = findParent(tree, nodeId);
    const directReports = node.children?.length ?? 0;
    const totalOrg = store.getDescendantCount(nodeId);
    const categories = categoryStore.getAll().map((c) => ({ id: c.id, label: c.label, color: c.color }));
    propertyPanel.show(node, parent?.name ?? null, directReports, totalOrg, categories);
  };

  // ─── Floating Actions (bottom toolbar) ──────────────────────────────
  const floatingActions = new FloatingActions({
    container: chartArea,
    onEdit: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      const rect = renderer.getNodeScreenRect(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (!rect || !node) return;
      showInlineEditor({
        rect, name: node.name, title: node.title,
        onSave: (name, title) => { store.updateNode(nodeId, { name, title }); },
        onCancel: () => {},
      });
    },
    onAdd: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      const rect = renderer.getNodeScreenRect(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (!rect || !node) return;
      showAddPopover({
        anchor: rect, parentName: node.name,
        onAdd: (name, title) => { store.addChild(nodeId, { name, title }); },
        onCancel: () => {},
      });
    },
    onFocus: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      propertyPanel['options'].onFocus(nodeId);
    },
    onMove: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      propertyPanel['options'].onMove(nodeId);
    },
    onCategory: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      const node = findNodeById(store.getTree(), nodeId);
      if (!node) return;
      showContextMenu({
        x: window.innerWidth / 2,
        y: window.innerHeight - 80,
        items: [
          { label: t('menu.category_none'), icon: node.categoryId ? ' ' : t('menu.category_check'),
            action: () => { store.setNodeCategory(nodeId, null); } },
          ...categoryStore.getAll().map((cat): ContextMenuItem => ({
            label: cat.label,
            icon: node.categoryId === cat.id ? t('menu.category_check') : ' ',
            swatch: cat.color,
            action: () => { store.setNodeCategory(nodeId, cat.id); },
          })),
        ],
      });
    },
    onRemove: () => {
      const nodeId = propertyPanel.getNodeId();
      if (!nodeId) return;
      propertyPanel['options'].onRemove(nodeId);
    },
  });

  store.onChange(() => {
    rerender();
    formEditor.refresh();
    jsonEditor.refresh();
    clearMultiSelection();
    // Refresh property panel if visible
    const panelNodeId = propertyPanel.getNodeId();
    if (panelNodeId && propertyPanel.isVisible()) {
      const tree = store.getTree();
      const node = findNodeById(tree, panelNodeId);
      if (node) {
        const parent = findParent(tree, panelNodeId);
        const categories = categoryStore.getAll().map((c) => ({ id: c.id, label: c.label, color: c.color }));
        propertyPanel.update(node, parent?.name ?? null, node.children?.length ?? 0, store.getDescendantCount(panelNodeId), categories);
      } else {
        propertyPanel.hide();
        floatingActions.hide();
        renderer.setSelectedNode(null);
      }
    }
  });

  categoryStore.onChange(() => {
    rerender();
  });

  renderer.setNodeClickHandler((nodeId: string, event: MouseEvent) => {
    if (event.shiftKey) {
      const tree = store.getTree();
      if (tree.id === nodeId) return;
      selection.toggle(nodeId);
      syncSelectionToRenderer();
      updateSelectionIndicator();
      announce(t('announce.multi_selected', { count: selection.count }));
      if (selection.hasSelection) {
        propertyPanel.hide();
        floatingActions.showMulti(selection.count);
      } else {
        floatingActions.hide();
      }
    } else {
      clearMultiSelection();
      renderer.setSelectedNode(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (node) {
        announce(t('announce.selected', { name: node.name, title: node.title }));
        showPropertyPanel(nodeId);
        floatingActions.showSingle({
          isRoot: store.getTree().id === nodeId,
          isLeaf: isLeaf(node),
        });
      }
    }
  });

  // Dismiss all floating UI on chart zoom/pan
  const dismissAllOverlays = () => {
    dismissContextMenu();
    dismissInlineEditor();
    dismissAddPopover();
    propertyPanel.hide();
    floatingActions.hide();
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
          label: t('menu.edit'),
          icon: t('menu.edit_icon'),
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
          label: t('menu.add'),
          icon: t('menu.add_icon'),
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
          label: t('menu.focus'),
          icon: t('menu.focus_icon'),
          disabled: nodeIsLeaf || focusMode.focusedId === nodeId,
          action: () => {
            focusMode.enter(nodeId);
            announce(t('focus.entered', { name: node.name }));
          },
        },
        {
          label: t('menu.category'),
          icon: t('menu.category_icon'),
          submenu: [
            {
              label: t('menu.category_none'),
              icon: node.categoryId ? ' ' : t('menu.category_check'),
              action: () => {
                store.setNodeCategory(nodeId, null);
              },
            },
            ...categoryStore.getAll().map(
              (cat): ContextMenuItem => ({
                label: cat.label,
                icon: node.categoryId === cat.id ? t('menu.category_check') : ' ',
                swatch: cat.color,
                action: () => {
                  store.setNodeCategory(nodeId, cat.id);
                },
              }),
            ),
          ],
        },
        {
          label: node.dottedLine ? t('menu.dotted_line_remove') : t('menu.dotted_line_set'),
          icon: t('menu.dotted_line_icon'),
          disabled: isRoot || nodeIsIC,
          action: () => {
            store.setDottedLine(nodeId, !node.dottedLine);
          },
        },
        {
          label: t('menu.move'),
          icon: t('menu.move_icon'),
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
                title: t('picker.move_to', { name: node.name }),
                managers,
                showDottedLineOption: true,
              });
              if (result) {
                const targetNode = findNodeById(tree, result.managerId);
                store.moveNode(nodeId, result.managerId, result.dottedLine);
                announce(t('announce.moved', { name: node.name, target: targetNode?.name ?? t('announce.move_fallback_target') }));
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
        {
          label: t('menu.remove'),
          icon: t('menu.remove_icon'),
          danger: true,
          disabled: isRoot,
          action: async () => {
            try {
              if (nodeIsLeaf) {
                const confirmed = await showConfirmDialog({
                  title: t('dialog.remove_person.title'),
                  message: t('dialog.remove_person.message', { name: node.name }),
                  confirmLabel: t('dialog.remove_person.confirm'),
                  danger: true,
                });
                if (confirmed) {
                  store.removeNode(nodeId);
                  announce(t('announce.removed', { name: node.name }));
                }
              } else {
                const descendants = flattenTree(node);
                const descendantCount = descendants.length - 1;

                const reassign = await showConfirmDialog({
                  title: t('dialog.remove_manager.title'),
                  message: t('dialog.remove_manager.message', { name: node.name, count: String(descendantCount) }),
                  confirmLabel: t('dialog.remove_manager.reassign'),
                  cancelLabel: t('dialog.remove_manager.remove_all', { count: String(descendantCount) }),
                  danger: false,
                });

                if (reassign) {
                  const allNodes = flattenTree(tree);
                  const descendantIds = new Set(descendants.map((n) => n.id));
                  const managers = allNodes
                    .filter((n) => !descendantIds.has(n.id))
                    .map((n) => ({ id: n.id, name: n.name, title: n.title }));

                  const result = await showManagerPicker({
                    title: t('picker.reassign_to', { name: node.name }),
                    managers,
                  });
                  if (result) {
                    store.removeNodeWithReassign(nodeId, result.managerId);
                    announce(t('announce.removed', { name: node.name }));
                  }
                } else {
                  const confirmed = await showConfirmDialog({
                    title: t('dialog.remove_manager.remove_all_confirm_title'),
                    message: t('dialog.remove_manager.remove_all_confirm_message', { name: node.name, count: String(descendantCount) }),
                    confirmLabel: t('dialog.remove_manager.remove_all_confirm'),
                    danger: true,
                  });
                  if (confirmed) {
                    store.removeNode(nodeId);
                    announce(t('announce.removed_with_org', { name: node.name, count: String(descendantCount) }));
                  }
                }
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
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
          label: t('menu.multi_category', { count }),
          icon: '🏷️',
          submenu: [
            {
              label: t('menu.category_none'),
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
          label: t('menu.multi_move', { count }),
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
                title: t('picker.multi_move_to', { count }),
                managers,
              });
              if (result) {
                store.bulkMoveNodes(selectedArray, result.managerId);
                const targetNode = findNodeById(store.getTree(), result.managerId);
                announce(t('announce.multi_moved', { count, target: targetNode?.name ?? t('announce.move_fallback_target') }));
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
        {
          label: t('menu.multi_remove', { count }),
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
                  title: t('picker.reassign_managers'),
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
                  announce(t('announce.multi_removed', { count }));
                }
              } else {
                // All leaves — simple confirm and bulk remove
                const confirmed = await showConfirmDialog({
                  title: t('dialog.remove_selected.title'),
                  message: t('dialog.remove_selected.message', { count }),
                  confirmLabel: t('dialog.remove_selected.confirm'),
                  danger: true,
                });
                if (confirmed) {
                  store.bulkRemoveNodes(selectedArray);
                  announce(t('announce.multi_removed', { count }));
                }
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
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
  versionLabel.textContent = t('footer.version', { version: APP_VERSION });
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
  saveIndicator.textContent = t('footer.saved');
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
    const parts = [`${prefix}${t('footer.people', { count: total })}`, t('footer.managers', { count: managerCount }), t('footer.ics', { count: icCount })];
    const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
    for (const [depth, count] of sortedLevels) {
      parts.push(t('footer.manager_level', { count, depth }));
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
  githubLink.textContent = t('footer.built_with');
  footerCenter.appendChild(githubLink);

  const centerSeparator = document.createElement('span');
  centerSeparator.style.color = 'var(--text-tertiary)';
  centerSeparator.textContent = '·';
  footerCenter.appendChild(centerSeparator);

  const issuesLink = document.createElement('a');
  issuesLink.href = 'https://github.com/pedrofuentes/arbol/issues';
  issuesLink.target = '_blank';
  issuesLink.rel = 'noopener noreferrer';
  issuesLink.textContent = t('footer.report_bugs');
  footerCenter.appendChild(issuesLink);

  footer.appendChild(footerCenter);

  // Update selection indicator when multi-select changes
  updateSelectionIndicator = () => {
    if (selection.hasSelection) {
      selectionIndicator.textContent = t('footer.selected', { count: selection.count });
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
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);min-width:36px;text-align:end;';

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

  // Footer: Buttons (right side) — hidden, controls moved to canvas/header
  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'display:none;';
  footer.appendChild(footerRight);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'footer-btn';
  exportBtn.dataset.action = 'export-pptx';
  const exportIconSpan = document.createElement('span');
  exportIconSpan.setAttribute('aria-hidden', 'true');
  exportIconSpan.textContent = t('footer.export_icon');
  exportBtn.appendChild(exportIconSpan);
  const exportLabel = document.createTextNode(t('footer.export_label'));
  exportBtn.appendChild(exportLabel);
  exportBtn.setAttribute('aria-label', t('footer.export_aria'));
  exportBtn.setAttribute('aria-keyshortcuts', 'Control+E');
  exportBtn.setAttribute('data-tooltip', t('footer.export_tooltip'));
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
        title: t('dialog.large_export.title'),
        message: t('dialog.large_export.message'),
        confirmLabel: t('dialog.large_export.confirm'),
        danger: false,
      });
      if (!confirmed) return;
    }

    exportIconSpan.textContent = t('footer.exporting_icon');
    exportLabel.textContent = t('footer.exporting_label');
    exportBtn.classList.add('btn-loading');
    exportBtn.disabled = true;

    try {
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
      showToast(t('footer.exported'), 'success');
    } catch (e) {
      showToast(t('footer.export_failed', { error: e instanceof Error ? e.message : String(e) }), 'error');
    } finally {
      exportIconSpan.textContent = t('footer.export_icon');
      exportLabel.textContent = t('footer.export_label');
      exportBtn.classList.remove('btn-loading');
      exportBtn.disabled = false;
    }
  };

  exportBtn.addEventListener('click', exportCurrentChart);

  const fitBtn = document.createElement('button');
  fitBtn.className = 'footer-btn';
  fitBtn.dataset.action = 'fit';
  const fitIcon = document.createElement('span');
  fitIcon.setAttribute('aria-hidden', 'true');
  fitIcon.textContent = t('footer.fit_icon');
  fitBtn.appendChild(fitIcon);
  fitBtn.appendChild(document.createTextNode(t('footer.fit_label')));
  fitBtn.setAttribute('aria-label', t('footer.fit_aria'));
  fitBtn.setAttribute('data-tooltip', t('footer.fit_tooltip'));
  footerRight.appendChild(fitBtn);

  fitBtn.addEventListener('click', () => {
    if (sideBySideRenderer) {
      sideBySideRenderer.fitToContent();
    } else {
      renderer.getZoomManager()?.fitToContent();
    }
  });

  const resetZoomBtn = document.createElement('button');
  resetZoomBtn.className = 'footer-btn';
  resetZoomBtn.dataset.action = 'reset-zoom';
  const resetIcon = document.createElement('span');
  resetIcon.setAttribute('aria-hidden', 'true');
  resetIcon.textContent = t('footer.reset_icon');
  resetZoomBtn.appendChild(resetIcon);
  resetZoomBtn.appendChild(document.createTextNode(t('footer.reset_label')));
  resetZoomBtn.setAttribute('aria-label', t('footer.reset_aria'));
  resetZoomBtn.setAttribute('data-tooltip', t('footer.reset_tooltip'));
  footerRight.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    if (sideBySideRenderer) {
      sideBySideRenderer.centerAtRealSize();
    } else {
      renderer.getZoomManager()?.centerAtRealSize();
    }
  });

  // Zoom level indicator (right side, after Reset)
  const zoomSeparator = document.createElement('span');
  zoomSeparator.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  footerRight.appendChild(zoomSeparator);
  footerRight.appendChild(zoomIndicator);

  // Floating zoom controls on canvas
  const zoomControls = document.createElement('div');
  zoomControls.className = 'zoom-controls-float';

  const zoomOutFloatBtn = document.createElement('button');
  zoomOutFloatBtn.className = 'zoom-btn zoom-btn-icon';
  zoomOutFloatBtn.textContent = '\u2212';
  zoomOutFloatBtn.title = 'Zoom out';
  zoomOutFloatBtn.addEventListener('click', () => { renderer.getZoomManager()?.zoomOut(); });

  const zoomInFloatBtn = document.createElement('button');
  zoomInFloatBtn.className = 'zoom-btn zoom-btn-icon';
  zoomInFloatBtn.textContent = '+';
  zoomInFloatBtn.title = 'Zoom in';
  zoomInFloatBtn.addEventListener('click', () => { renderer.getZoomManager()?.zoomIn(); });

  const zoomPctEl = document.createElement('span');
  zoomPctEl.className = 'zoom-pct';
  zoomPctEl.textContent = '100%';

  const fitCanvasBtn = document.createElement('button');
  fitCanvasBtn.className = 'zoom-btn';
  fitCanvasBtn.textContent = '\u2293 Fit';
  fitCanvasBtn.addEventListener('click', () => {
    if (sideBySideRenderer) {
      sideBySideRenderer.fitToContent();
    } else {
      renderer.getZoomManager()?.fitToContent();
    }
  });

  const resetCanvasBtn = document.createElement('button');
  resetCanvasBtn.className = 'zoom-btn';
  resetCanvasBtn.textContent = '\u21BA Reset';
  resetCanvasBtn.addEventListener('click', () => {
    if (sideBySideRenderer) {
      sideBySideRenderer.centerAtRealSize();
    } else {
      renderer.getZoomManager()?.centerAtRealSize();
    }
  });

  zoomControls.append(zoomOutFloatBtn, zoomInFloatBtn, zoomPctEl, fitCanvasBtn, resetCanvasBtn);
  chartArea.appendChild(zoomControls);

  zoomManager?.onZoom(() => {
    const pct = zoomManager?.getRelativeZoomPercent();
    if (pct !== undefined) zoomPctEl.textContent = `${Math.round(pct)}%`;
  });

  // Keyboard shortcuts
  const shortcuts = new ShortcutManager();

  shortcuts.register({
    key: 'z',
    ctrl: true,
    handler: () => { if (store.undo()) announce(t('announce.undo')); },
    description: t('shortcut.undo'),
  });

  shortcuts.register({
    key: 'z',
    ctrl: true,
    shift: true,
    handler: () => { if (store.redo()) announce(t('announce.redo')); },
    description: t('shortcut.redo'),
  });

  shortcuts.register({
    key: 'y',
    ctrl: true,
    handler: () => { if (store.redo()) announce(t('announce.redo')); },
    description: t('shortcut.redo_alt'),
  });

  shortcuts.register({
    key: 'e',
    ctrl: true,
    handler: exportCurrentChart,
    description: t('shortcut.export'),
  });

  shortcuts.register({
    key: 'f',
    ctrl: true,
    handler: () => {
      search.focus();
    },
    description: t('shortcut.search'),
  });

  // Command Palette (Ctrl+K)
  const commandPalette = new CommandPalette({
    onDismiss: () => {},
  });

  const buildCommandItems = (): CommandItem[] => [
    {
      id: 'export',
      label: t('command_palette.item_export'),
      icon: '📊',
      shortcut: 'Ctrl+E',
      group: t('command_palette.group_actions'),
      action: () => { exportBtn.click(); },
    },
    {
      id: 'undo',
      label: t('command_palette.item_undo'),
      icon: '↩',
      shortcut: 'Ctrl+Z',
      group: t('command_palette.group_actions'),
      action: () => { if (store.undo()) { announce(t('announce.undo')); } },
    },
    {
      id: 'redo',
      label: t('command_palette.item_redo'),
      icon: '↪',
      shortcut: 'Ctrl+Shift+Z',
      group: t('command_palette.group_actions'),
      action: () => { if (store.redo()) { announce(t('announce.redo')); } },
    },
    {
      id: 'search',
      label: t('command_palette.item_search'),
      icon: '🔍',
      shortcut: 'Ctrl+F',
      group: t('command_palette.group_navigation'),
      action: () => { search.focus(); },
    },
  ];

  shortcuts.register({
    key: 'k',
    ctrl: true,
    handler: () => {
      if (commandPalette.isOpen()) {
        commandPalette.close();
      } else {
        commandPalette.setItems(buildCommandItems());
        commandPalette.open();
      }
    },
    description: t('shortcut.command_palette'),
  });

  shortcuts.register({
    key: 'Escape',
    handler: () => {
      // Dismiss command palette if open
      if (commandPalette.isOpen()) {
        commandPalette.close();
        return;
      }
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
        noResultsHint.style.display = 'none';
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
      // Close property panel + floating actions
      if (propertyPanel.isVisible()) {
        propertyPanel.hide();
        floatingActions.hide();
        renderer.setSelectedNode(null);
        return;
      }
      // Deselect node
      formEditor.selectNode(null);
      renderer.setSelectedNode(null);
    },
    description: t('shortcut.escape'),
  });

  window.addEventListener('beforeunload', (e) => {
    if (chartStore.isDirty(store.getTree())) {
      e.preventDefault();
    }
  });

  rerender();
  showWelcomeBanner(chartArea);
}

document.addEventListener('DOMContentLoaded', main);
