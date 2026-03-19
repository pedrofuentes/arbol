import { setLocale, t } from './i18n';
import en from './i18n/en';
import { OrgStore } from './store/org-store';
import { ChartRenderer, type RendererOptions } from './renderer/chart-renderer';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { ThemeManager } from './store/theme-manager';
import { SettingsStore, PersistableSettings } from './store/settings-store';
import { MappingStore } from './store/mapping-store';
import { CategoryStore } from './store/category-store';
import { flattenTree, findNodeById, findParent, isLeaf, avgSpanOfControl } from './utils/tree';
import { dismissContextMenu } from './ui/context-menu';
import { dismissInlineEditor } from './ui/inline-editor';
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
import { showVersionViewer, dismissVersionViewer } from './ui/version-viewer';
import { createComparisonHandler } from './init/comparison-handler';
import { FocusModeController } from './controllers/focus-mode';
import { SelectionManager } from './controllers/selection-manager';
import { SearchController } from './controllers/search-controller';
import { announce } from './ui/announcer';
import { createShowSingleCardMenu, createShowMultiSelectMenu, type ContextMenuDeps } from './init/context-menu-handler';
import { buildToolbar, type ToolbarElements } from './init/toolbar-builder';
import { buildFooter } from './init/footer-builder';
import { showWelcomeBanner } from './ui/welcome-banner';
import { PropertyPanel } from './ui/property-panel';
import { SettingsModal } from './ui/settings-modal';
import { SettingsEditor } from './editor/settings-editor';
import { ImportWizard } from './ui/import-wizard';
import { WizardState, renderSourceStep, renderMappingStep, renderPreviewStep, renderImportStep } from './ui/import-wizard-steps';
import { registerShortcuts } from './init/shortcuts-handler';
import type { ChartRecord, VersionRecord } from './types';

async function main(): Promise<void> {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  // Offscreen host for editors that need to exist but aren't visible in the sidebar
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;';
  document.body.appendChild(offscreenHost);

  // Load saved locale preference, default to 'en'
  const { getSavedLocale } = await import('./i18n');
  const savedLocale = getSavedLocale() ?? 'en';

  if (savedLocale === 'es') {
    const { default: es } = await import('./i18n/es');
    setLocale('es', es);
  } else {
    setLocale('en', en);
  }

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
  const mappingStore = new MappingStore();
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

  // Comparison handler (initialized after rerender, before footer)
  let comparison: ReturnType<typeof createComparisonHandler>;

  const rerender = () => {
    const fullTree = store.getTree();

    // Validate focus target still exists
    focusMode?.validate();

    const treeToRender = focusMode?.getVisibleTree() ?? store.getTree();

    // Refresh categories so renderer picks up any changes
    renderer.updateOptions({ categories: categoryStore.getAll() });
    renderer.render(treeToRender);
    const opts = renderer.getOptions();
    settingsStore.save(opts as unknown as Partial<PersistableSettings>);
    chartStore.saveWorkingTree(fullTree, categoryStore.getAll(), store.mutationVersion).catch(() => {
      showToast(t('footer.save_failed'), 'error');
    });

    focusMode?.showBanner(chartArea);

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

  // Initialize comparison handler now that rerender and focusMode are defined
  comparison = createComparisonHandler({
    store,
    renderer,
    chartStore,
    categoryStore,
    chartArea,
    focusMode,
    rerender,
  });

  // Theme manager + header references
  const themeManager = new ThemeManager();
  const headerRight = document.getElementById('header-right')!;

  // Settings modal (opens via header button)
  const SECTION_TAB_MAP: Record<string, string> = {
    'presets': 'presets',
    'categories': 'categories',
    'card-dimensions': 'layout',
    'tree-spacing': 'layout',
    'ic-options': 'ic',
    'advisor-options': 'advisors',
    'typography': 'typography',
    'link-style': 'connectors',
    'card-style': 'cards',
    'headcount-badge': 'badges',
    'categories-legend': 'categories',
    'settings-io': 'backup',
    'backup-restore': 'backup',

  };

  function filterSettingsSections(tabId: string): void {
    const contentArea = settingsModal.getContentArea();
    const sections = contentArea.querySelectorAll('[data-section-id]');
    sections.forEach((section) => {
      const sectionId = section.getAttribute('data-section-id')!;
      const sectionTab = SECTION_TAB_MAP[sectionId];
      (section as HTMLElement).style.display = sectionTab === tabId ? '' : 'none';
    });
  }

  let settingsEditorInstance: SettingsEditor | null = null;

  let settingsSnapshot: Partial<RendererOptions> | null = null;

  const settingsModal = new SettingsModal({
    onClose: () => {},
    onApply: () => {},
    onDone: async () => {
      if (!settingsSnapshot) return;
      const currentOpts = renderer.getOptions();
      const hasChanges = Object.keys(settingsSnapshot).some((key) => {
        const k = key as keyof typeof currentOpts;
        if (k === 'categories') return false;
        return settingsSnapshot![k] !== currentOpts[k];
      });
      if (hasChanges && settingsEditorInstance && !settingsEditorInstance.matchesExistingPreset()) {
        const name = await showInputDialog({
          title: t('settings.save_preset_prompt_title'),
          label: t('settings.save_preset_prompt_label'),
          placeholder: t('settings.preset_name_placeholder'),
          confirmLabel: t('settings.save_preset_button'),
          cancelLabel: t('settings.save_preset_skip'),
        });
        if (name) {
          settingsEditorInstance.saveCurrentAsPreset(name);
        }
      }
      settingsSnapshot = null;
    },
    onCancel: () => {
      // Revert to snapshot taken when modal was opened
      if (settingsSnapshot) {
        renderer.updateOptions(settingsSnapshot);
        rerender();
        settingsSnapshot = null;
      }
    },
    onTabChange: (tabId) => { filterSettingsSections(tabId); },
  });

  // Import wizard (opens via header button)
  let wizardState: WizardState = {};

  const importWizard = new ImportWizard({
    steps: [
      { id: 'source', label: t('import_wizard.step_source') },
      { id: 'mapping', label: t('import_wizard.step_mapping') },
      { id: 'preview', label: t('import_wizard.step_preview') },
      { id: 'import', label: t('import_wizard.step_import') },
    ],
    onClose: () => { wizardState = {}; },
    onStepChange: async (stepId) => {
      const content = importWizard.getStepContentArea();
      const setNext = (ready: boolean) => importWizard.setNextEnabled(ready);

      // Prompt to save preset when leaving mapping step with a new mapping
      if (stepId === 'preview' && wizardState.format === 'CSV' && wizardState.mapping && !wizardState.matchedPresetName) {
        // Suggest name from filename (e.g. "hr-export.csv" → "hr-export")
        const suggestedName = wizardState.fileName
          ? wizardState.fileName.replace(/\.[^.]+$/, '')
          : '';
        const presetName = await showInputDialog({
          title: t('import_wizard.save_preset_prompt'),
          label: t('import_wizard.save_preset_label'),
          placeholder: t('import_wizard.save_preset_placeholder'),
          initialValue: suggestedName,
          confirmLabel: t('dialog.ok'),
        });
        if (presetName) {
          mappingStore.savePreset({ name: presetName, mapping: wizardState.mapping });
          showToast(`✓ Preset "${presetName}" saved`, 'success');
        }
      }

      switch (stepId) {
        case 'source': renderSourceStep(content, wizardState, setNext); break;
        case 'mapping': renderMappingStep(content, wizardState, setNext, mappingStore.getPresets()); break;
        case 'preview': renderPreviewStep(content, wizardState, setNext); break;
        case 'import': renderImportStep(content, wizardState, setNext); break;
      }
    },
    onComplete: async () => {
      if (!wizardState.tree) return;
      try {
        let finalTree = wizardState.tree;
        if (wizardState.nameNormalization || wizardState.titleNormalization) {
          const { normalizeTreeText } = await import('./utils/text-normalize');
          finalTree = normalizeTreeText(finalTree, wizardState.nameNormalization ?? 'none', wizardState.titleNormalization ?? 'none');
        }
        if (wizardState.destination === 'new' && wizardState.chartName) {
          const chart = await chartStore.createChartFromTree(wizardState.chartName, finalTree);
          await chartStore.saveVersion(t('import_wizard.original_version'), chart.workingTree);
          // Ensure sidebar chart list reflects the new active chart before continuing
          await chartEditor.refresh();
          // Switch the live OrgStore to the new chart's tree
          store.replaceTree(chart.workingTree);
          if (chart.categories.length > 0) {
            categoryStore.replaceAll(chart.categories);
          }
          chartNameHeader.setName(chart.name);
          chartNameHeader.setDirty(false);
          rerender();
          renderer.getZoomManager()?.fitToContent();
          announce(t('announce.chart_switched', { name: wizardState.chartName }));
        } else {
          store.fromJSON(JSON.stringify(finalTree));
          renderer.getZoomManager()?.fitToContent();
        }
        importWizard.close();
        wizardState = {};
        showToast(t('footer.imported'), 'success');
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), 'error');
      }
    },
  });

  // Build all toolbar buttons (theme, help, undo, redo, settings, import, export, mobile menu)
  const toolbar = buildToolbar({
    store,
    themeManager,
    headerRight,
    headerLeft: document.querySelector('.header-left')!,
    sidebar,
    onSettingsClick: () => {
      // Snapshot current settings so Cancel can revert
      settingsSnapshot = { ...renderer.getOptions() };
      settingsModal.open();
      if (!settingsEditorInstance) {
        settingsEditorInstance = new SettingsEditor(
          settingsModal.getContentArea(),
          renderer,
          rerender,
          settingsStore,
          categoryStore,
          chartDB,
        );
        settingsEditorInstance.setPreviewArea(settingsModal.getPreviewArea());
        settingsEditorInstance.wirePreviewControls(
          settingsModal.getPreviewFitBtn(),
          settingsModal.getPreviewResetBtn(),
          settingsModal.getPreviewZoomPct(),
        );
        settingsEditorInstance.onBuild(() => {
          filterSettingsSections(settingsModal.getActiveTab());
        });
      }
      filterSettingsSections(settingsModal.getActiveTab());
    },
    onImportClick: () => {
      wizardState = {};
      importWizard.open();
      const content = importWizard.getStepContentArea();
      renderSourceStep(content, wizardState, (ready) => importWizard.setNextEnabled(ready));
    },
    onExportClick: () => { exportCurrentChart(); },
  });
  const { undoBtn, redoBtn, settingsBtn, importBtn } = toolbar;

  // Chart name header (moved offscreen — name shown in sidebar)
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
        chartStore.saveVersion(name.trim(), store.getTree(), store.mutationVersion);
        announce(t('announce.chart_saved'));
      }
    },
  });

  // Update dirty indicator on every store change
  store.onChange(() => {
    chartNameHeader.setDirty(chartStore.isDirty(store.getTree(), store.mutationVersion));
  });

  // Search UI — floating over the chart canvas
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-float';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '🔍';
  searchWrapper.appendChild(searchIcon);

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

  chartArea.appendChild(searchWrapper);

  // Make search bar draggable — click-vs-drag disambiguation
  {
    const DRAG_THRESHOLD = 5;
    let pending = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    searchWrapper.addEventListener('mousedown', (e: MouseEvent) => {
      if (document.activeElement === searchInput) return;
      const rect = searchWrapper.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      pending = true;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!pending && !dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (pending && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        pending = false;
        dragging = true;
        searchInput.blur();
        searchWrapper.style.cursor = 'grabbing';
      }

      if (dragging) {
        const parentRect = chartArea.getBoundingClientRect();
        searchWrapper.style.left = `${e.clientX - parentRect.left - offsetX}px`;
        searchWrapper.style.top = `${e.clientY - parentRect.top - offsetY}px`;
        searchWrapper.style.transform = 'none';
      }
    });

    window.addEventListener('mouseup', () => {
      pending = false;
      if (dragging) {
        dragging = false;
        searchWrapper.style.cursor = '';
      }
    });
  }

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
    if (!chartStore.isDirty(store.getTree(), store.mutationVersion)) return true;
    const confirmed = await showConfirmDialog({
      title: t('dialog.unsaved.title'),
      message: t('dialog.unsaved.message'),
      confirmLabel: t('dialog.unsaved.confirm'),
      danger: true,
    });
    return confirmed;
  };

  const handleChartSwitched = (chart: ChartRecord) => {
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
  };

  const chartEditor = new ChartEditor({
    container: sidebar,
    chartStore,
    getCurrentTree: () => store.getTree(),
    getCurrentCategories: () => categoryStore.getAll(),
    onBeforeSwitch: handleBeforeSwitch,
    onChartSwitch: handleChartSwitched,
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
      chartEditor.setViewingVersion(version.id);
      showVersionViewer({
        versionName: version.name,
        container: chartArea,
        onCompare: () => {
          store.replaceTree(savedTree);
          dismissVersionViewer();
          chartEditor.setViewingVersion(null);
          rerender();
          renderer.getZoomManager()?.fitToContent();
          comparison.enterComparisonMode(version);
        },
        onRestore: async () => {
          const shouldProceed = await handleBeforeSwitch();
          if (!shouldProceed) return;
          await chartStore.restoreVersion(version.id);
          dismissVersionViewer();
          chartEditor.setViewingVersion(null);
          chartNameHeader.setDirty(false);
          rerender();
        },
        onClose: () => {
          store.replaceTree(savedTree);
          dismissVersionViewer();
          chartEditor.setViewingVersion(null);
          rerender();
          renderer.getZoomManager()?.fitToContent();
        },
      });
    },
    onVersionCompare: (version) => {
      comparison.enterComparisonMode(version);
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

  // Sidebar footer with ⌘K button (handler wired after registerShortcuts)
  const sidebarFooter = document.createElement('div');
  sidebarFooter.className = 'chart-nav-footer';
  const cmdKBtn = document.createElement('button');
  cmdKBtn.className = 'chart-nav-cmdk';
  cmdKBtn.textContent = t('toolbar.quick_actions');
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
    onToggleDottedLine: (nodeId) => {
      const node = findNodeById(store.getTree(), nodeId);
      if (node) store.setDottedLine(nodeId, !node.dottedLine);
    },
    onClose: () => {
      propertyPanel.hide();
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
    const avgSpan = avgSpanOfControl(node);
    const categories = categoryStore.getAll().map((c) => ({ id: c.id, label: c.label, color: c.color }));
    propertyPanel.show(node, parent?.name ?? null, directReports, totalOrg, avgSpan, categories);
  };

  store.onChange(() => {
    clearMultiSelection();
    rerender();
    formEditor.refresh();
    jsonEditor.refresh();
    // Refresh property panel if visible
    const panelNodeId = propertyPanel.getNodeId();
    if (panelNodeId && propertyPanel.isVisible()) {
      const tree = store.getTree();
      const node = findNodeById(tree, panelNodeId);
      if (node) {
        const parent = findParent(tree, panelNodeId);
        const categories = categoryStore.getAll().map((c) => ({ id: c.id, label: c.label, color: c.color }));
        propertyPanel.update(node, parent?.name ?? null, node.children?.length ?? 0, store.getDescendantCount(panelNodeId), avgSpanOfControl(node), categories);
      } else {
        propertyPanel.hide();
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
      }
    } else {
      clearMultiSelection();
      renderer.setSelectedNode(nodeId);
      const node = findNodeById(store.getTree(), nodeId);
      if (node) {
        announce(t('announce.selected', { name: node.name, title: node.title }));
        showPropertyPanel(nodeId);
      }
    }
  });

  // Dismiss all floating UI on chart zoom/pan
  const dismissAllOverlays = () => {
    dismissContextMenu();
    dismissInlineEditor();
    dismissAddPopover();
    propertyPanel.hide();
  };
  renderer.getZoomManager()?.onZoom(dismissAllOverlays);

  const contextMenuDeps: ContextMenuDeps = { store, categoryStore, renderer, focusMode, selection };
  const showSingleCardMenu = createShowSingleCardMenu(contextMenuDeps);
  const showMultiSelectMenu = createShowMultiSelectMenu(contextMenuDeps);

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
  const footerResult = buildFooter({
    store,
    renderer,
    categoryStore,
    chartStore,
    focusMode,
    selection,
    footer: document.getElementById('footer')!,
    getChartName: () => chartNameHeader.getName(),
    getSideBySideRenderer: () => comparison.getSideBySideRenderer(),
  });
  const { exportCurrentChart } = footerResult;
  updateSelectionIndicator = footerResult.updateSelectionIndicator;
  onSettingsSaved = footerResult.notifySettingsSaved;

  // Keyboard shortcuts + Command Palette
  const { commandPalette, buildCommandItems } = registerShortcuts({
    store,
    chartStore,
    themeManager,
    search,
    focusMode,
    propertyPanel,
    formEditor,
    renderer,
    noResultsHint,
    searchInput,
    settingsBtn,
    importBtn,
    exportCurrentChart,
    exitComparisonMode: comparison.exitComparisonMode,
    clearMultiSelection,
    handleBeforeSwitch,
    handleChartSwitched,
  });

  // Wire ⌘K button now that commandPalette exists
  cmdKBtn.addEventListener('click', async () => {
    commandPalette.setItems(await buildCommandItems());
    commandPalette.open();
  });

  window.addEventListener('beforeunload', (e) => {
    if (chartStore.isDirty(store.getTree(), store.mutationVersion)) {
      e.preventDefault();
    }
  });

  rerender();
  showWelcomeBanner(chartArea);
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
  showToast(t('error.unexpected', { message }), 'error');
  event.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
  main().catch((e) => {
    console.error('Fatal initialization error:', e);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fatal-error';
      errorDiv.setAttribute('role', 'alert');
      const heading = document.createElement('h2');
      heading.textContent = t('app.fatal_error') || 'Failed to start Arbol';
      const message = document.createElement('p');
      message.textContent = e instanceof Error ? e.message : 'An unexpected error occurred';
      const hint = document.createElement('p');
      hint.textContent = t('app.refresh_hint') || 'Try refreshing the page. If the issue persists, clear your browser data for this site.';
      errorDiv.appendChild(heading);
      errorDiv.appendChild(message);
      errorDiv.appendChild(hint);
      app.appendChild(errorDiv);
    }
  });
});
