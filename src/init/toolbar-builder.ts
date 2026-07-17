import { t } from '../i18n';
import { createIconButton } from '../utils/dom-builder';
import { createIcon, setIcon } from '../ui/icon';
import type { ThemeManager } from '../store/theme-manager';
import type { OrgStore } from '../store/org-store';
import { announce } from '../ui/announcer';
import { showHelpDialog } from '../ui/help-dialog';

export interface ToolbarDeps {
  store: OrgStore;
  themeManager: ThemeManager;
  headerRight: HTMLElement;
  headerLeft: HTMLElement;
  sidebar: HTMLElement;
  onSettingsClick: () => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onLoadSample: () => void;
}

export interface ToolbarElements {
  undoBtn: HTMLButtonElement;
  redoBtn: HTMLButtonElement;
  settingsBtn: HTMLButtonElement;
  importBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  themeBtn: HTMLButtonElement;
  closeSidebar: () => void;
  updateUndoRedoState: () => void;
}

export function buildToolbar(deps: ToolbarDeps): ToolbarElements {
  const { store, themeManager, headerRight, headerLeft, sidebar } = deps;

  // Theme toggle
  const themeBtn = createIconButton({
    icon: themeManager.getTheme() === 'dark' ? 'sun' : 'moon',
    tooltip: t('toolbar.toggle_theme'),
    ariaLabel: t('toolbar.toggle_theme_aria'),
    onClick: () => { themeManager.toggle(); },
  });
  const themeIcon = themeBtn.querySelector('svg')!;
  themeManager.onChange(() => {
    const theme = themeManager.getTheme();
    setIcon(themeIcon, theme === 'dark' ? 'sun' : 'moon');
    announce(t('toolbar.theme_switched', { theme }));
  });
  headerRight.appendChild(themeBtn);

  const helpBtn = createIconButton({
    icon: 'help',
    tooltip: t('toolbar.help_tooltip'),
    ariaLabel: t('toolbar.help_aria'),
    onClick: () => showHelpDialog({ onLoadSample: deps.onLoadSample }),
  });
  headerRight.appendChild(helpBtn);

  // Undo / Redo (inserted before theme button to preserve DOM order)
  const undoBtn = createIconButton({
    icon: 'undo',
    tooltip: t('toolbar.undo_tooltip'),
    ariaLabel: t('toolbar.undo_aria'),
    ariaKeyshortcuts: 'Control+Z',
    onClick: () => { if (store.undo()) announce(t('announce.undo')); },
  });
  undoBtn.disabled = true;
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn = createIconButton({
    icon: 'redo',
    tooltip: t('toolbar.redo_tooltip'),
    ariaLabel: t('toolbar.redo_aria'),
    ariaKeyshortcuts: 'Control+Shift+Z',
    onClick: () => { if (store.redo()) announce(t('announce.redo')); },
  });
  redoBtn.disabled = true;
  headerRight.insertBefore(redoBtn, themeBtn);

  // Divider between undo/redo and theme toggle
  const divider = document.createElement('span');
  divider.className = 'header-divider';
  headerRight.insertBefore(divider, themeBtn);

  // Settings button
  const settingsBtn = createIconButton({
    icon: 'settings',
    tooltip: t('toolbar.settings_tooltip'),
    ariaLabel: t('toolbar.settings_aria'),
    ariaKeyshortcuts: 'Control+,',
    onClick: deps.onSettingsClick,
  });
  headerRight.insertBefore(settingsBtn, divider);

  // Import button (icon + text label)
  const importBtn = createIconButton({
    icon: 'import',
    tooltip: t('toolbar.import_tooltip'),
    ariaLabel: t('toolbar.import_aria'),
    onClick: deps.onImportClick,
  });
  importBtn.appendChild(document.createTextNode(' ' + t('toolbar.import_label')));
  headerRight.insertBefore(importBtn, settingsBtn);

  // Export button (icon + text label)
  const exportBtn = createIconButton({
    icon: 'export',
    tooltip: t('toolbar.export_tooltip'),
    ariaLabel: t('toolbar.export_aria'),
    ariaKeyshortcuts: 'Control+e',
    onClick: deps.onExportClick,
  });
  exportBtn.appendChild(document.createTextNode(' ' + t('toolbar.export_label')));
  headerRight.insertBefore(exportBtn, settingsBtn);

  // Reposition divider: between Export and Settings
  headerRight.insertBefore(divider, settingsBtn);
  // Second divider between Redo and Import
  const divider2 = document.createElement('span');
  divider2.className = 'header-divider';
  headerRight.insertBefore(divider2, importBtn);

  // Undo/redo disabled-state sync
  const updateUndoRedoState = () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    undoBtn.style.opacity = store.canUndo() ? '1' : '0.4';
    redoBtn.style.opacity = store.canRedo() ? '1' : '0.4';
  };
  store.onChange(updateUndoRedoState);
  updateUndoRedoState();

  // Mobile hamburger menu
  const menuToggle = document.createElement('button');
  menuToggle.className = 'menu-toggle icon-btn';
  menuToggle.setAttribute('aria-label', t('toolbar.toggle_sidebar'));
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.appendChild(createIcon('menu'));
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

  return {
    undoBtn,
    redoBtn,
    settingsBtn,
    importBtn,
    exportBtn,
    themeBtn,
    closeSidebar,
    updateUndoRedoState,
  };
}
