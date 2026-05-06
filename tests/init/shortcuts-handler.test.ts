import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import en from '../../src/i18n/en';
import { registerShortcuts } from '../../src/init/shortcuts-handler';
import type { ShortcutsDeps } from '../../src/init/shortcuts-handler';

vi.mock('../../src/ui/command-palette', () => {
  return {
    CommandPalette: class {
      isOpen() {
        return false;
      }
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
      saveVersion: vi
        .fn()
        .mockResolvedValue({ id: 'v1', chartId: 'c1', name: 'v', createdAt: '', tree: {} }),
      getActiveChartId: vi.fn(() => 'c1'),
      getCharts: vi.fn().mockResolvedValue([]),
      createChart: vi.fn(),
      switchChart: vi.fn(),
    } as unknown as ShortcutsDeps['chartStore'],
    themeManager: {
      getTheme: vi.fn(() => 'light'),
      toggle: vi.fn(),
    } as unknown as ShortcutsDeps['themeManager'],
    search: {
      focus: vi.fn(),
      isActive: false,
      clear: vi.fn(),
    } as unknown as ShortcutsDeps['search'],
    focusMode: { isFocused: false, exit: vi.fn() } as unknown as ShortcutsDeps['focusMode'],
    propertyPanel: {
      isVisible: vi.fn(() => false),
      hide: vi.fn(),
    } as unknown as ShortcutsDeps['propertyPanel'],
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
    const saveItem = items.find((i) => i.id === 'save-version')!;
    await saveItem.action();

    expect(deps.chartStore.saveVersion).toHaveBeenCalledWith(
      'My Version',
      expect.anything(),
      expect.anything(),
    );
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
    const saveItem = items.find((i) => i.id === 'save-version')!;
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
    const saveItem = items.find((i) => i.id === 'save-version')!;
    await saveItem.action();

    expect(deps.chartStore.saveVersion).not.toHaveBeenCalled();
  });
});

describe('shortcuts-handler — undo/redo', () => {
  let cleanup: (() => void) | null = null;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);
  }

  it('Ctrl+Z calls store.undo and announces on success', async () => {
    const { announce } = await import('../../src/ui/announcer');
    const deps = makeDeps({
      store: { ...makeDeps().store, undo: vi.fn(() => true) } as unknown as ShortcutsDeps['store'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('z', { ctrlKey: true });
    expect(deps.store.undo).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(t('announce.undo'));
  });

  it('Ctrl+Z does not announce when undo returns false', async () => {
    const { announce } = await import('../../src/ui/announcer');
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('z', { ctrlKey: true });
    expect(deps.store.undo).toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it('Ctrl+Shift+Z calls store.redo and announces on success', async () => {
    const { announce } = await import('../../src/ui/announcer');
    const deps = makeDeps({
      store: { ...makeDeps().store, redo: vi.fn(() => true) } as unknown as ShortcutsDeps['store'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('z', { ctrlKey: true, shiftKey: true });
    expect(deps.store.redo).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(t('announce.redo'));
  });

  it('Ctrl+Y calls store.redo', () => {
    const deps = makeDeps({
      store: { ...makeDeps().store, redo: vi.fn(() => true) } as unknown as ShortcutsDeps['store'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('y', { ctrlKey: true });
    expect(deps.store.redo).toHaveBeenCalled();
  });
});

describe('shortcuts-handler — export, search, settings, help', () => {
  let cleanup: (() => void) | null = null;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);
  }

  it('Ctrl+E calls exportCurrentChart', () => {
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('e', { ctrlKey: true });
    expect(deps.exportCurrentChart).toHaveBeenCalled();
  });

  it('Ctrl+F calls search.focus', () => {
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('f', { ctrlKey: true });
    expect(deps.search.focus).toHaveBeenCalled();
  });

  it('Ctrl+, clicks settings button', () => {
    const deps = makeDeps();
    const clickSpy = vi.spyOn(deps.settingsBtn, 'click');
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey(',', { ctrlKey: true });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('? opens help dialog', async () => {
    const { showHelpDialog } = await import('../../src/ui/help-dialog');
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireKey('?');
    expect(showHelpDialog).toHaveBeenCalled();
  });
});

describe('shortcuts-handler — Escape precedence', () => {
  let cleanup: (() => void) | null = null;
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  function fireEscape(): void {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);
  }

  it('Escape dismisses version viewer when active', async () => {
    const { isVersionViewerActive, dismissVersionViewer } =
      await import('../../src/ui/version-viewer');
    (isVersionViewerActive as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(dismissVersionViewer).toHaveBeenCalled();
  });

  it('Escape exits comparison mode when active', async () => {
    const { isComparisonBannerActive } = await import('../../src/ui/comparison-banner');
    (isComparisonBannerActive as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(deps.exitComparisonMode).toHaveBeenCalled();
  });

  it('Escape clears search when active', () => {
    const deps = makeDeps({
      search: {
        focus: vi.fn(),
        isActive: true,
        clear: vi.fn(),
      } as unknown as ShortcutsDeps['search'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(deps.search.clear).toHaveBeenCalled();
  });

  it('Escape exits focus mode when focused', () => {
    const deps = makeDeps({
      focusMode: { isFocused: true, exit: vi.fn() } as unknown as ShortcutsDeps['focusMode'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(deps.focusMode.exit).toHaveBeenCalled();
  });

  it('Escape hides property panel when visible', () => {
    const deps = makeDeps({
      propertyPanel: {
        isVisible: vi.fn(() => true),
        hide: vi.fn(),
      } as unknown as ShortcutsDeps['propertyPanel'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(deps.propertyPanel.hide).toHaveBeenCalled();
    expect(deps.renderer.setSelectedNode).toHaveBeenCalledWith(null);
  });

  it('Escape deselects node as final fallback', () => {
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(deps.formEditor.selectNode).toHaveBeenCalledWith(null);
    expect(deps.renderer.setSelectedNode).toHaveBeenCalledWith(null);
  });

  it('Escape prioritizes version viewer over search when both active', async () => {
    const { isVersionViewerActive, dismissVersionViewer } =
      await import('../../src/ui/version-viewer');
    (isVersionViewerActive as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const deps = makeDeps({
      search: {
        focus: vi.fn(),
        isActive: true,
        clear: vi.fn(),
      } as unknown as ShortcutsDeps['search'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    fireEscape();
    expect(dismissVersionViewer).toHaveBeenCalled();
    expect(deps.search.clear).not.toHaveBeenCalled();
  });
});

describe('shortcuts-handler — command palette actions', () => {
  let cleanup: (() => void) | null = null;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('theme action toggles theme', async () => {
    const deps = makeDeps();
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    const items = await result.buildCommandItems();
    const themeItem = items.find((i) => i.id === 'theme')!;
    themeItem.action();
    expect(deps.themeManager.toggle).toHaveBeenCalled();
  });

  it('import action clicks import button', async () => {
    const deps = makeDeps();
    const clickSpy = vi.spyOn(deps.importBtn, 'click');
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    const items = await result.buildCommandItems();
    const importItem = items.find((i) => i.id === 'import')!;
    importItem.action();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('includes dynamic chart entries for switching', async () => {
    const deps = makeDeps({
      chartStore: {
        ...makeDeps().chartStore,
        getActiveChartId: vi.fn(() => 'c1'),
        getCharts: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'Active' },
          { id: 'c2', name: 'Other Chart' },
        ]),
      } as unknown as ShortcutsDeps['chartStore'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    const items = await result.buildCommandItems();
    const chartItems = items.filter((i) => i.id.startsWith('chart-'));
    expect(chartItems).toHaveLength(1);
    expect(chartItems[0].label).toBe('Other Chart');
  });

  it('chart switch action calls handleBeforeSwitch and switchChart', async () => {
    const deps = makeDeps({
      chartStore: {
        ...makeDeps().chartStore,
        getActiveChartId: vi.fn(() => 'c1'),
        getCharts: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'Active' },
          { id: 'c2', name: 'Other' },
        ]),
        switchChart: vi.fn().mockResolvedValue({ id: 'c2', name: 'Other' }),
      } as unknown as ShortcutsDeps['chartStore'],
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    const items = await result.buildCommandItems();
    const chartItem = items.find((i) => i.id === 'chart-c2')!;
    await chartItem.action();
    expect(deps.handleBeforeSwitch).toHaveBeenCalled();
    expect(deps.chartStore.switchChart).toHaveBeenCalledWith('c2');
    expect(deps.handleChartSwitched).toHaveBeenCalled();
  });

  it('chart switch does not proceed when handleBeforeSwitch returns false', async () => {
    const deps = makeDeps({
      chartStore: {
        ...makeDeps().chartStore,
        getActiveChartId: vi.fn(() => 'c1'),
        getCharts: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'Active' },
          { id: 'c2', name: 'Other' },
        ]),
        switchChart: vi.fn(),
      } as unknown as ShortcutsDeps['chartStore'],
      handleBeforeSwitch: vi.fn().mockResolvedValue(false),
    });
    const result = registerShortcuts(deps);
    cleanup = () => result.shortcuts.destroy();
    const items = await result.buildCommandItems();
    const chartItem = items.find((i) => i.id === 'chart-c2')!;
    await chartItem.action();
    expect(deps.handleBeforeSwitch).toHaveBeenCalled();
    expect(deps.chartStore.switchChart).not.toHaveBeenCalled();
    expect(deps.handleChartSwitched).not.toHaveBeenCalled();
  });
});
