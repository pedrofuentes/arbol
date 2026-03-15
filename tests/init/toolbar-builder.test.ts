import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import en from '../../src/i18n/en';
import { buildToolbar, type ToolbarDeps } from '../../src/init/toolbar-builder';
import { OrgStore } from '../../src/store/org-store';
import { ThemeManager } from '../../src/store/theme-manager';

let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  setItemSpy = vi.spyOn(localStorage, 'setItem');
  setLocale('en', en);
});

afterAll(() => {
  setItemSpy.mockRestore();
});

function makeDeps(overrides: Partial<ToolbarDeps> = {}): ToolbarDeps {
  const headerRight = document.createElement('div');
  headerRight.id = 'header-right';
  const headerLeft = document.createElement('div');
  headerLeft.classList.add('header-left');
  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  document.body.appendChild(headerRight);
  document.body.appendChild(headerLeft);
  document.body.appendChild(sidebar);

  return {
    store: new OrgStore({ id: 'root', name: 'Root', title: 'CEO', children: [] }),
    themeManager: new ThemeManager(),
    headerRight,
    headerLeft,
    sidebar,
    onSettingsClick: vi.fn(),
    onImportClick: vi.fn(),
    onExportClick: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.documentElement.classList.remove('theme-light');
});

describe('buildToolbar', () => {
  it('returns all expected element references', () => {
    const deps = makeDeps();
    const result = buildToolbar(deps);
    expect(result.undoBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.redoBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.settingsBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.importBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.exportBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.themeBtn).toBeInstanceOf(HTMLButtonElement);
    expect(result.closeSidebar).toBeInstanceOf(Function);
    expect(result.updateUndoRedoState).toBeInstanceOf(Function);
  });

  it('appends theme and help buttons to headerRight', () => {
    const deps = makeDeps();
    buildToolbar(deps);
    const btns = deps.headerRight.querySelectorAll('button');
    expect(btns.length).toBeGreaterThanOrEqual(6);
  });

  it('sets undo/redo buttons disabled initially', () => {
    const deps = makeDeps();
    const { undoBtn, redoBtn } = buildToolbar(deps);
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);
  });

  it('enables undo after a store mutation', () => {
    const deps = makeDeps();
    const { undoBtn } = buildToolbar(deps);
    deps.store.addChild('root', { name: 'Child', title: 'Eng' });
    expect(undoBtn.disabled).toBe(false);
  });

  it('theme button has correct aria-label', () => {
    const deps = makeDeps();
    const { themeBtn } = buildToolbar(deps);
    expect(themeBtn.getAttribute('aria-label')).toBe(t('toolbar.toggle_theme_aria'));
  });

  it('theme button icon updates after toggle', () => {
    const deps = makeDeps();
    const { themeBtn } = buildToolbar(deps);
    const icon = themeBtn.querySelector('span')!;
    const initialIcon = icon.textContent;
    deps.themeManager.toggle();
    expect(icon.textContent).not.toBe(initialIcon);
  });

  it('settings button calls onSettingsClick', () => {
    const deps = makeDeps();
    const { settingsBtn } = buildToolbar(deps);
    settingsBtn.click();
    expect(deps.onSettingsClick).toHaveBeenCalledOnce();
  });

  it('import button calls onImportClick', () => {
    const deps = makeDeps();
    const { importBtn } = buildToolbar(deps);
    importBtn.click();
    expect(deps.onImportClick).toHaveBeenCalledOnce();
  });

  it('export button calls onExportClick', () => {
    const deps = makeDeps();
    const { exportBtn } = buildToolbar(deps);
    exportBtn.click();
    expect(deps.onExportClick).toHaveBeenCalledOnce();
  });

  it('import button includes text label', () => {
    const deps = makeDeps();
    const { importBtn } = buildToolbar(deps);
    expect(importBtn.textContent).toContain('Import');
  });

  it('export button includes text label', () => {
    const deps = makeDeps();
    const { exportBtn } = buildToolbar(deps);
    expect(exportBtn.textContent).toContain('Export');
  });

  it('creates two header dividers', () => {
    const deps = makeDeps();
    buildToolbar(deps);
    const dividers = deps.headerRight.querySelectorAll('.header-divider');
    expect(dividers.length).toBe(2);
  });

  it('creates mobile hamburger menu in headerLeft', () => {
    const deps = makeDeps();
    buildToolbar(deps);
    const toggle = deps.headerLeft.querySelector('.menu-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');
  });

  it('creates sidebar backdrop in document.body', () => {
    const deps = makeDeps();
    buildToolbar(deps);
    const backdrop = document.body.querySelector('.sidebar-backdrop');
    expect(backdrop).not.toBeNull();
  });

  it('hamburger toggles sidebar-open class', () => {
    const deps = makeDeps();
    buildToolbar(deps);
    const toggle = deps.headerLeft.querySelector('.menu-toggle') as HTMLElement;
    toggle.click();
    expect(deps.sidebar.classList.contains('sidebar-open')).toBe(true);
    toggle.click();
    expect(deps.sidebar.classList.contains('sidebar-open')).toBe(false);
  });

  it('closeSidebar removes sidebar-open', () => {
    const deps = makeDeps();
    const { closeSidebar } = buildToolbar(deps);
    deps.sidebar.classList.add('sidebar-open');
    closeSidebar();
    expect(deps.sidebar.classList.contains('sidebar-open')).toBe(false);
  });

  it('undo button has correct aria-keyshortcuts', () => {
    const deps = makeDeps();
    const { undoBtn } = buildToolbar(deps);
    expect(undoBtn.getAttribute('aria-keyshortcuts')).toBe('Control+Z');
  });

  it('redo button has correct aria-keyshortcuts', () => {
    const deps = makeDeps();
    const { redoBtn } = buildToolbar(deps);
    expect(redoBtn.getAttribute('aria-keyshortcuts')).toBe('Control+Shift+Z');
  });

  it('settings button has correct aria-keyshortcuts', () => {
    const deps = makeDeps();
    const { settingsBtn } = buildToolbar(deps);
    expect(settingsBtn.getAttribute('aria-keyshortcuts')).toBe('Control+,');
  });

  it('export button has correct aria-keyshortcuts', () => {
    const deps = makeDeps();
    const { exportBtn } = buildToolbar(deps);
    expect(exportBtn.getAttribute('aria-keyshortcuts')).toBe('Control+e');
  });

  describe('DOM order', () => {
    it('undo appears before redo in headerRight', () => {
      const deps = makeDeps();
      const { undoBtn, redoBtn } = buildToolbar(deps);
      const children = Array.from(deps.headerRight.children);
      expect(children.indexOf(undoBtn)).toBeLessThan(children.indexOf(redoBtn));
    });

    it('import appears before export in headerRight', () => {
      const deps = makeDeps();
      const { importBtn, exportBtn } = buildToolbar(deps);
      const children = Array.from(deps.headerRight.children);
      expect(children.indexOf(importBtn)).toBeLessThan(children.indexOf(exportBtn));
    });

    it('settings appears after the first divider and before theme', () => {
      const deps = makeDeps();
      const { settingsBtn, themeBtn } = buildToolbar(deps);
      const children = Array.from(deps.headerRight.children);
      expect(children.indexOf(settingsBtn)).toBeLessThan(children.indexOf(themeBtn));
    });
  });

  describe('updateUndoRedoState', () => {
    it('updates opacity when store has undo available', () => {
      const deps = makeDeps();
      const { undoBtn, redoBtn } = buildToolbar(deps);
      expect(undoBtn.style.opacity).toBe('0.4');
      deps.store.addChild('root', { name: 'A', title: 'T' });
      expect(undoBtn.style.opacity).toBe('1');
      expect(redoBtn.style.opacity).toBe('0.4');
    });
  });
});
