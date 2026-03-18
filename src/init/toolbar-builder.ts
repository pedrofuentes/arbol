import { t } from '../i18n';
import { createIconButton } from '../utils/dom-builder';
import type { ThemeManager } from '../store/theme-manager';
import type { OrgStore } from '../store/org-store';
import { announce } from '../ui/announcer';
import { showHelpDialog, type HelpDialogOptions } from '../ui/help-dialog';
import { SAMPLE_ORG } from '../data/sample-org';

export interface ToolbarDeps {
  store: OrgStore;
  themeManager: ThemeManager;
  headerRight: HTMLElement;
  headerLeft: HTMLElement;
  sidebar: HTMLElement;
  onSettingsClick: () => void;
  onImportClick: () => void;
  onExportClick: () => void;
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
    icon: themeManager.getTheme() === 'dark' ? t('toolbar.theme_icon_dark') : t('toolbar.theme_icon_light'),
    tooltip: t('toolbar.toggle_theme'),
    ariaLabel: t('toolbar.toggle_theme_aria'),
    onClick: () => { themeManager.toggle(); },
  });
  const themeIcon = themeBtn.querySelector('span')!;
  themeManager.onChange(() => {
    const theme = themeManager.getTheme();
    themeIcon.textContent = theme === 'dark' ? t('toolbar.theme_icon_dark') : t('toolbar.theme_icon_light');
    announce(t('toolbar.theme_switched', { theme }));
  });
  headerRight.appendChild(themeBtn);

  // Help button — uses textContent directly (bold "?"), not an icon span
  const helpBtn = document.createElement('button');
  helpBtn.className = 'icon-btn';
  helpBtn.setAttribute('data-tooltip', t('toolbar.help_tooltip'));
  helpBtn.setAttribute('aria-label', t('toolbar.help_aria'));
  helpBtn.textContent = t('toolbar.help_text');
  helpBtn.style.fontWeight = '700';
  helpBtn.addEventListener('click', () => showHelpDialog({
    onLoadSample: () => store.fromJSON(JSON.stringify(SAMPLE_ORG)),
  }));
  headerRight.appendChild(helpBtn);

  // Undo / Redo (inserted before theme button to preserve DOM order)
  const undoBtn = createIconButton({
    icon: t('toolbar.undo_icon'),
    tooltip: t('toolbar.undo_tooltip'),
    ariaLabel: t('toolbar.undo_aria'),
    ariaKeyshortcuts: 'Control+Z',
    onClick: () => { if (store.undo()) announce(t('announce.undo')); },
  });
  undoBtn.disabled = true;
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn = createIconButton({
    icon: t('toolbar.redo_icon'),
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
    icon: '⚙️',
    tooltip: t('toolbar.settings_tooltip'),
    ariaLabel: t('toolbar.settings_aria'),
    ariaKeyshortcuts: 'Control+,',
    onClick: deps.onSettingsClick,
  });
  headerRight.insertBefore(settingsBtn, divider);

  // Import button (icon + text label)
  const importBtn = createIconButton({
    icon: '📂',
    tooltip: t('toolbar.import_tooltip'),
    ariaLabel: t('toolbar.import_aria'),
    onClick: deps.onImportClick,
  });
  importBtn.appendChild(document.createTextNode(' Import'));
  headerRight.insertBefore(importBtn, settingsBtn);

  // Export button (icon + text label)
  const exportBtn = createIconButton({
    icon: '📤',
    tooltip: t('toolbar.export_tooltip'),
    ariaLabel: t('toolbar.export_aria'),
    ariaKeyshortcuts: 'Control+e',
    onClick: deps.onExportClick,
  });
  exportBtn.appendChild(document.createTextNode(' Export'));
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
