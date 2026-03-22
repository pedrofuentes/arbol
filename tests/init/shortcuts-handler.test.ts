import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import en from '../../src/i18n/en';
import { registerShortcuts } from '../../src/init/shortcuts-handler';
import type { ShortcutsDeps } from '../../src/init/shortcuts-handler';

vi.mock('../../src/ui/command-palette', () => {
  return {
    CommandPalette: class {
      isOpen() { return false; }
      open() {}
      close() {}
      setItems() {}
    },
  };
});
vi.mock('../../src/ui/help-dialog', () => ({ showHelpDialog: vi.fn() }));
vi.mock('../../src/ui/input-dialog', () => ({ showInputDialog: vi.fn() }));
vi.mock('../../src/ui/version-viewer', () => ({
  dismissVersionViewer: vi.fn(),
  isVersionViewerActive: vi.fn(() => false),
}));
vi.mock('../../src/ui/comparison-banner', () => ({
  isComparisonBannerActive: vi.fn(() => false),
}));
vi.mock('../../src/ui/announcer', () => ({ announce: vi.fn() }));
vi.mock('../../src/ui/toast', () => ({ showToast: vi.fn() }));

beforeAll(() => {
  setLocale('en', en);
});

function makeDeps(overrides?: Partial<ShortcutsDeps>): ShortcutsDeps {
  return {
    store: {
      undo: vi.fn(() => false),
      redo: vi.fn(() => false),
      getTree: vi.fn(() => ({ id: 'r', name: 'Root', title: 'CEO' })),
      fromJSON: vi.fn(),
      mutationVersion: 0,
    } as unknown as ShortcutsDeps['store'],
    chartStore: {
      saveVersion: vi.fn().mockResolvedValue({ id: 'v1', chartId: 'c1', name: 'v', createdAt: '', tree: {} }),
      getActiveChartId: vi.fn(() => 'c1'),
      getCharts: vi.fn().mockResolvedValue([]),
      createChart: vi.fn(),
      switchChart: vi.fn(),
    } as unknown as ShortcutsDeps['chartStore'],
    themeManager: { getTheme: vi.fn(() => 'light'), toggle: vi.fn() } as unknown as ShortcutsDeps['themeManager'],
    search: { focus: vi.fn(), isActive: false, clear: vi.fn() } as unknown as ShortcutsDeps['search'],
    focusMode: { isFocused: false, exit: vi.fn() } as unknown as ShortcutsDeps['focusMode'],
    propertyPanel: { isVisible: vi.fn(() => false), hide: vi.fn() } as unknown as ShortcutsDeps['propertyPanel'],
    formEditor: { selectNode: vi.fn() } as unknown as ShortcutsDeps['formEditor'],
    renderer: { setSelectedNode: vi.fn() } as unknown as ShortcutsDeps['renderer'],
    noResultsHint: document.createElement('span'),
    searchInput: document.createElement('input'),
    settingsBtn: document.createElement('button'),
    importBtn: document.createElement('button'),
    exportCurrentChart: vi.fn(),
    exitComparisonMode: vi.fn(),
    clearMultiSelection: vi.fn(),
    handleBeforeSwitch: vi.fn().mockResolvedValue(true),
    handleChartSwitched: vi.fn(),
    ...overrides,
  };
}

describe('shortcuts-handler save-version error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('announces success when saveVersion succeeds', async () => {
    const { showInputDialog } = await import('../../src/ui/input-dialog');
    const { announce } = await import('../../src/ui/announcer');
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValue('My Version');

    const deps = makeDeps();
    const { buildCommandItems } = registerShortcuts(deps);
    const items = await buildCommandItems();
    const saveItem = items.find(i => i.id === 'save-version')!;
    await saveItem.action();

    expect(deps.chartStore.saveVersion).toHaveBeenCalledWith('My Version', expect.anything(), expect.anything());
    expect(announce).toHaveBeenCalledWith(t('announce.chart_saved'));
  });

  it('shows error toast when saveVersion fails', async () => {
    const { showInputDialog } = await import('../../src/ui/input-dialog');
    const { showToast } = await import('../../src/ui/toast');
    const { announce } = await import('../../src/ui/announcer');
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValue('My Version');

    const deps = makeDeps({
      chartStore: {
        saveVersion: vi.fn().mockRejectedValue(new Error('quota exceeded')),
        getActiveChartId: vi.fn(() => 'c1'),
        getCharts: vi.fn().mockResolvedValue([]),
      } as unknown as ShortcutsDeps['chartStore'],
    });
    const { buildCommandItems } = registerShortcuts(deps);
    const items = await buildCommandItems();
    const saveItem = items.find(i => i.id === 'save-version')!;
    await saveItem.action();

    expect(announce).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(t('error.version_save_failed'), 'error');
  });

  it('does not call saveVersion when input is cancelled', async () => {
    const { showInputDialog } = await import('../../src/ui/input-dialog');
    (showInputDialog as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const deps = makeDeps();
    const { buildCommandItems } = registerShortcuts(deps);
    const items = await buildCommandItems();
    const saveItem = items.find(i => i.id === 'save-version')!;
    await saveItem.action();

    expect(deps.chartStore.saveVersion).not.toHaveBeenCalled();
  });
});
