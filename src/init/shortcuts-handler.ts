import { t } from '../i18n';
import { ShortcutManager } from '../utils/shortcuts';
import { CommandPalette, type CommandItem } from '../ui/command-palette';
import { showHelpDialog } from '../ui/help-dialog';
import { showInputDialog } from '../ui/input-dialog';
import { dismissVersionViewer, isVersionViewerActive } from '../ui/version-viewer';
import { isComparisonBannerActive } from '../ui/comparison-banner';
import { announce } from '../ui/announcer';
import type { OrgStore } from '../store/org-store';
import type { ChartStore } from '../store/chart-store';
import type { ThemeManager } from '../store/theme-manager';
import type { SearchController } from '../controllers/search-controller';
import type { FocusModeController } from '../controllers/focus-mode';
import type { PropertyPanel } from '../ui/property-panel';
import type { FormEditor } from '../editor/form-editor';
import type { ChartRenderer } from '../renderer/chart-renderer';
import type { ChartRecord } from '../types';

export interface ShortcutsDeps {
  store: OrgStore;
  chartStore: ChartStore;
  themeManager: ThemeManager;
  search: SearchController;
  focusMode: FocusModeController;
  propertyPanel: PropertyPanel;
  formEditor: FormEditor;
  renderer: ChartRenderer;
  noResultsHint: HTMLElement;
  searchInput: HTMLInputElement;
  settingsBtn: HTMLButtonElement;
  importBtn: HTMLButtonElement;
  exportCurrentChart: () => void;
  exitComparisonMode: () => void;
  clearMultiSelection: () => void;
  handleBeforeSwitch: () => Promise<boolean>;
  handleChartSwitched: (chart: ChartRecord) => void;
}

export interface ShortcutsResult {
  shortcuts: ShortcutManager;
  commandPalette: CommandPalette;
  buildCommandItems: () => Promise<CommandItem[]>;
}

export function registerShortcuts(deps: ShortcutsDeps): ShortcutsResult {
  const {
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
    exitComparisonMode,
    clearMultiSelection,
    handleBeforeSwitch,
    handleChartSwitched,
  } = deps;

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

  const buildCommandItems = async (): Promise<CommandItem[]> => {
    const items: CommandItem[] = [
      {
        id: 'export',
        label: t('command_palette.item_export'),
        icon: '📊',
        shortcut: 'Ctrl+E',
        group: t('command_palette.group_actions'),
        action: () => { exportCurrentChart(); },
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
        id: 'settings',
        label: t('command_palette.item_settings'),
        icon: '⚙️',
        shortcut: 'Ctrl+,',
        group: t('command_palette.group_actions'),
        action: () => { settingsBtn.click(); },
      },
      {
        id: 'search',
        label: t('command_palette.item_search'),
        icon: '🔍',
        shortcut: 'Ctrl+F',
        group: t('command_palette.group_navigation'),
        action: () => { search.focus(); },
      },
      {
        id: 'help',
        label: t('command_palette.item_help'),
        icon: '❓',
        shortcut: '?',
        group: t('command_palette.group_navigation'),
        action: () => { showHelpDialog(); },
      },
      {
        id: 'theme',
        label: t('command_palette.item_theme'),
        icon: themeManager.getTheme() === 'dark' ? '☀️' : '🌙',
        group: t('command_palette.group_actions'),
        action: () => { themeManager.toggle(); },
      },
      {
        id: 'new-chart',
        label: t('command_palette.item_new_chart'),
        icon: '➕',
        group: t('command_palette.group_charts'),
        action: async () => {
          const name = await showInputDialog({
            title: t('chart_editor.new_chart_dialog_title'),
            label: t('chart_editor.new_chart_dialog_label'),
            placeholder: t('chart_editor.new_chart_placeholder'),
            maxLength: 100,
          });
          if (name?.trim()) {
            const proceed = await handleBeforeSwitch();
            if (!proceed) return;
            const chart = await chartStore.createChart(name.trim());
            handleChartSwitched(chart);
          }
        },
      },
      {
        id: 'save-version',
        label: t('command_palette.item_save_version'),
        icon: '💾',
        group: t('command_palette.group_charts'),
        action: async () => {
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
      },
      {
        id: 'import',
        label: t('command_palette.item_import'),
        icon: '📥',
        group: t('command_palette.group_actions'),
        action: () => { importBtn.click(); },
      },
    ];

    // Dynamic chart entries
    const activeId = chartStore.getActiveChartId();
    const allCharts = await chartStore.getCharts();
    for (const chart of allCharts) {
      if (chart.id === activeId) continue;
      items.push({
        id: `chart-${chart.id}`,
        label: chart.name,
        icon: '🌳',
        group: t('command_palette.group_charts'),
        action: async () => {
          const proceed = await handleBeforeSwitch();
          if (!proceed) return;
          const switched = await chartStore.switchChart(chart.id);
          handleChartSwitched(switched);
        },
      });
    }

    return items;
  };

  shortcuts.register({
    key: 'k',
    ctrl: true,
    handler: async () => {
      if (commandPalette.isOpen()) {
        commandPalette.close();
      } else {
        commandPalette.setItems(await buildCommandItems());
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
      // Close property panel
      if (propertyPanel.isVisible()) {
        propertyPanel.hide();
        renderer.setSelectedNode(null);
        return;
      }
      // Deselect node
      formEditor.selectNode(null);
      renderer.setSelectedNode(null);
    },
    description: t('shortcut.escape'),
  });

  shortcuts.register({
    key: '?',
    handler: () => showHelpDialog(),
    description: t('shortcut.help'),
  });

  shortcuts.register({
    key: ',',
    ctrl: true,
    handler: () => { settingsBtn.click(); },
    description: t('shortcut.settings'),
  });

  return { shortcuts, commandPalette, buildCommandItems };
}
