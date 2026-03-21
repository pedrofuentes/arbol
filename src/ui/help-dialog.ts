import { createOverlay, trapFocus } from './dialog-utils';
import { showConfirmDialog } from './confirm-dialog';
import { t } from '../i18n';
import { type IStorage, browserStorage } from '../utils/storage';

const ARBOL_STORAGE_KEYS = [
  'arbol-org-data',
  'arbol-settings',
  'arbol-categories',
  'arbol-csv-mappings',
  'arbol-accordion-state',
  'arbol-custom-presets',
  'arbol-theme',
];

type HelpFragment = string | { tag: string; text: string };

interface ShortcutEntry {
  keys: string[];
  desc: string;
}

interface HelpSection {
  titleKey: string;
  type?: 'shortcuts-grid';
  shortcuts?: ShortcutEntry[];
  items?: HelpFragment[][];
  hasClearData?: boolean;
  hasSampleOrg?: boolean;
}

function getHelpSections(): HelpSection[] {
  return [
    {
      titleKey: 'help.shortcuts.title',
      type: 'shortcuts-grid',
      shortcuts: [
        { keys: ['Ctrl+Z'], desc: t('help.shortcuts.undo') },
        { keys: ['Ctrl+Shift+Z', 'Ctrl+Y'], desc: t('help.shortcuts.redo') },
        { keys: ['Ctrl+E'], desc: t('help.shortcuts.export') },
        { keys: ['Ctrl+F'], desc: t('help.shortcuts.search') },
        { keys: ['Ctrl+K'], desc: t('help.shortcuts.command_palette') },
        { keys: ['Ctrl+,'], desc: t('help.shortcuts.settings') },
        { keys: ['?'], desc: t('help.shortcuts.help') },
        { keys: ['Escape'], desc: t('help.shortcuts.escape') },
        { keys: ['↑ ↓ ← →'], desc: t('help.shortcuts.nav_arrows') },
        { keys: ['Enter'], desc: t('help.shortcuts.nav_select') },
        { keys: ['Space'], desc: t('help.shortcuts.nav_multiselect') },
        { keys: ['Home', 'End'], desc: t('help.shortcuts.nav_home_end') },
        { keys: ['Shift+F10'], desc: t('help.shortcuts.nav_context_menu') },
      ],
    },
    {
      titleKey: 'help.getting_started.title',
      hasSampleOrg: true,
      items: [
        [t('help.getting_started.pan_zoom')],
        [t('help.getting_started.right_click')],
        [t('help.getting_started.sidebar')],
      ],
    },
    {
      titleKey: 'help.chart_works.title',
      items: [
        [
          { tag: 'strong', text: t('help.chart_works.managers_label') },
          t('help.chart_works.managers_desc'),
        ],
        [
          { tag: 'strong', text: t('help.chart_works.ics_label') },
          t('help.chart_works.ics_desc'),
        ],
        [
          { tag: 'strong', text: t('help.chart_works.advisors_label') },
          t('help.chart_works.advisors_desc'),
        ],
        [t('help.chart_works.auto_detect')],
      ],
    },
    {
      titleKey: 'help.sidebar_tabs.title',
      items: [
        [
          { tag: 'strong', text: t('help.sidebar_tabs.sidebar_label') },
          t('help.sidebar_tabs.sidebar_desc'),
        ],
        [
          { tag: 'strong', text: t('help.sidebar_tabs.settings_label') },
          t('help.sidebar_tabs.settings_desc'),
        ],
        [
          { tag: 'strong', text: t('help.sidebar_tabs.import_label') },
          t('help.sidebar_tabs.import_desc'),
        ],
        [
          { tag: 'strong', text: t('help.sidebar_tabs.export_label') },
          t('help.sidebar_tabs.export_desc'),
        ],
      ],
    },
    {
      titleKey: 'help.charts_versions.title',
      items: [
        [
          t('help.charts_versions.multiple_1'),
          { tag: 'strong', text: t('help.charts_versions.multiple_strong') },
          t('help.charts_versions.multiple_2'),
          { tag: 'strong', text: t('help.charts_versions.multiple_tab') },
          t('help.charts_versions.multiple_3'),
        ],
        [t('help.charts_versions.header')],
        [
          { tag: 'strong', text: t('help.charts_versions.save_label') },
          t('help.charts_versions.save_desc'),
        ],
        [
          { tag: 'strong', text: t('help.charts_versions.view_label') },
          t('help.charts_versions.view_desc'),
        ],
        [t('help.charts_versions.unsaved')],
      ],
    },
    {
      titleKey: 'help.importing.title',
      items: [
        [
          t('help.importing.how_1'),
          { tag: 'strong', text: t('help.importing.how_strong') },
          t('help.importing.how_2'),
        ],
        [t('help.importing.wizard')],
        [
          { tag: 'strong', text: t('help.importing.json_label') },
          t('help.importing.json_desc'),
        ],
        [
          { tag: 'strong', text: t('help.importing.csv_label') },
          t('help.importing.csv_desc'),
        ],
        [t('help.importing.normalize')],
        [t('help.importing.limit')],
      ],
    },
    {
      titleKey: 'help.interactions.title',
      items: [
        [
          { tag: 'strong', text: t('help.interactions.click_label') },
          t('help.interactions.click_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.right_click_label') },
          t('help.interactions.right_click_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.shift_click_label') },
          t('help.interactions.shift_click_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.escape_label') },
          t('help.interactions.escape_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.inline_label') },
          t('help.interactions.inline_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.search_label') },
          t('help.interactions.search_desc'),
        ],
        [
          { tag: 'strong', text: t('help.interactions.dotted_label') },
          t('help.interactions.dotted_desc'),
        ],
      ],
    },
    {
      titleKey: 'help.categories.title',
      items: [
        [
          t('help.categories.assign_1'),
          { tag: 'strong', text: t('help.categories.assign_strong') },
          t('help.categories.assign_2'),
        ],
        [
          t('help.categories.defaults_1'),
          { tag: 'strong', text: t('help.categories.defaults_open') },
          t('help.categories.defaults_2'),
          { tag: 'strong', text: t('help.categories.defaults_offer') },
          t('help.categories.defaults_3'),
          { tag: 'strong', text: t('help.categories.defaults_future') },
          t('help.categories.defaults_4'),
        ],
        [
          t('help.categories.manage_1'),
          { tag: 'strong', text: t('help.categories.manage_strong') },
          t('help.categories.manage_2'),
        ],
        [t('help.categories.legend')],
      ],
    },
    {
      titleKey: 'help.focus_mode.title',
      items: [
        [
          t('help.focus_mode.enter_1'),
          { tag: 'strong', text: t('help.focus_mode.enter_strong') },
          t('help.focus_mode.enter_2'),
        ],
        [
          t('help.focus_mode.exit_1'),
          { tag: 'kbd', text: t('help.focus_mode.exit_kbd') },
          t('help.focus_mode.exit_2'),
          { tag: 'strong', text: t('help.focus_mode.exit_strong') },
          t('help.focus_mode.exit_3'),
        ],
        [t('help.focus_mode.export')],
      ],
    },
    {
      titleKey: 'help.headcount.title',
      items: [
        [
          t('help.headcount.enable_1'),
          { tag: 'strong', text: t('help.headcount.enable_settings') },
          t('help.headcount.enable_2'),
          { tag: 'strong', text: t('help.headcount.enable_strong') },
          t('help.headcount.enable_3'),
        ],
        [t('help.headcount.customize')],
      ],
    },
    {
      titleKey: 'help.analytics.title',
      items: [
        [
          { tag: 'strong', text: t('help.analytics.headcount_label') },
          t('help.analytics.headcount_desc'),
        ],
        [
          { tag: 'strong', text: t('help.analytics.depth_label') },
          t('help.analytics.depth_desc'),
        ],
        [
          { tag: 'strong', text: t('help.analytics.ratio_label') },
          t('help.analytics.ratio_desc'),
        ],
        [
          { tag: 'strong', text: t('help.analytics.span_label') },
          t('help.analytics.span_desc'),
        ],
        [
          { tag: 'strong', text: t('help.analytics.alerts_label') },
          t('help.analytics.alerts_desc'),
        ],
        [t('analytics.disclaimer')],
      ],
    },
    {
      titleKey: 'help.comparison.title',
      items: [
        [t('help.comparison.desc')],
      ],
    },
    {
      titleKey: 'help.your_data.title',
      hasClearData: true,
      items: [
        [
          t('help.your_data.privacy_1'),
          { tag: 'strong', text: t('help.your_data.privacy_strong') },
          t('help.your_data.privacy_2'),
        ],
        [t('help.your_data.no_server')],
      ],
    },
    {
      titleKey: 'help.settings.title',
      items: [
        [t('help.settings.auto_save')],
        [t('help.settings.modal')],
        [t('help.settings.presets')],
        [t('help.settings.preview')],
        [
          t('help.settings.backup_1'),
          { tag: 'strong', text: t('help.settings.backup_strong') },
          t('help.settings.backup_2'),
        ],
        [
          t('help.settings.restore_1'),
          { tag: 'strong', text: t('help.settings.restore_strong') },
          t('help.settings.restore_2'),
        ],
      ],
    },
    {
      titleKey: 'help.exporting.title',
      items: [
        [
          { tag: 'strong', text: t('help.exporting.pptx_label') },
          t('help.exporting.pptx_desc'),
        ],
        [t('help.exporting.versions')],
        [t('help.exporting.scale')],
      ],
    },
    {
      titleKey: 'help.links.title',
      items: [
        [t('help.links.built_with')],
        [t('help.links.report_bugs')],
      ],
    },
  ];
}

function buildHelpItem(fragments: HelpFragment[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const part of fragments) {
    if (typeof part === 'string') {
      frag.appendChild(document.createTextNode(part));
    } else {
      const el = document.createElement(part.tag);
      el.textContent = part.text;
      frag.appendChild(el);
    }
  }
  return frag;
}

function buildShortcutsGrid(shortcuts: ShortcutEntry[]): HTMLDivElement {
  const grid = document.createElement('div');
  grid.className = 'help-shortcuts-grid';

  for (const entry of shortcuts) {
    const keyCell = document.createElement('div');
    keyCell.className = 'help-shortcut-key';
    for (let i = 0; i < entry.keys.length; i++) {
      if (i > 0) {
        keyCell.appendChild(document.createTextNode(' / '));
      }
      const kbd = document.createElement('kbd');
      kbd.textContent = entry.keys[i];
      keyCell.appendChild(kbd);
    }
    grid.appendChild(keyCell);

    const descCell = document.createElement('div');
    descCell.className = 'help-shortcut-desc';
    descCell.textContent = entry.desc;
    grid.appendChild(descCell);
  }

  return grid;
}

function buildClearDataButton(storage: IStorage): HTMLButtonElement {
  const clearBtn = document.createElement('button');
  clearBtn.textContent = t('help.clear_data_button');
  clearBtn.setAttribute('aria-label', t('help.clear_data_aria'));
  clearBtn.style.cssText = `
    margin-top:10px;padding:5px 14px;font-size:12px;
    font-family:var(--font-sans);cursor:pointer;
    background:transparent;color:var(--text-tertiary);
    border:1px solid var(--border-default);border-radius:var(--radius-md);
    transition:background var(--transition-fast),color var(--transition-fast),border-color var(--transition-fast);
  `;
  clearBtn.addEventListener('mouseenter', () => {
    clearBtn.style.background = 'var(--bg-danger, #fef2f2)';
    clearBtn.style.color = 'var(--text-danger, #dc2626)';
    clearBtn.style.borderColor = 'var(--text-danger, #dc2626)';
  });
  clearBtn.addEventListener('mouseleave', () => {
    clearBtn.style.background = 'transparent';
    clearBtn.style.color = 'var(--text-tertiary)';
    clearBtn.style.borderColor = 'var(--border-default)';
  });
  clearBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: 'Clear All Data',
      message:
        'This will permanently delete all your org charts, versions, settings, themes, and preferences. ' +
        'This cannot be undone.\n\nAre you sure?',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (confirmed) {
      for (const key of ARBOL_STORAGE_KEYS) {
        storage.removeItem(key);
      }
      indexedDB.deleteDatabase('arbol-db');
      window.location.reload();
    }
  });
  return clearBtn;
}

function buildSampleOrgButton(onLoad: () => void, closeDialog: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = t('help.sample_org_button');
  btn.setAttribute('aria-label', t('help.sample_org_aria'));
  btn.style.cssText = `
    margin-top:10px;margin-bottom:6px;padding:5px 14px;font-size:12px;
    font-family:var(--font-sans);cursor:pointer;display:block;margin-left:auto;margin-right:auto;
    background:transparent;color:var(--text-tertiary);
    border:1px solid var(--border-default);border-radius:var(--radius-md);
    transition:background var(--transition-fast),color var(--transition-fast),border-color var(--transition-fast);
  `;
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'var(--bg-accent, #f0fdf4)';
    btn.style.color = 'var(--accent, #22c55e)';
    btn.style.borderColor = 'var(--accent, #22c55e)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent';
    btn.style.color = 'var(--text-tertiary)';
    btn.style.borderColor = 'var(--border-default)';
  });
  btn.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: t('help.sample_org_confirm_title'),
      message: t('help.sample_org_confirm_message'),
      confirmLabel: t('help.sample_org_button'),
    });
    if (confirmed) {
      onLoad();
      closeDialog();
    }
  });
  return btn;
}

export interface HelpDialogOptions {
  storage?: IStorage;
  onLoadSample?: () => void;
}

export function showHelpDialog(options: HelpDialogOptions = {}): void {
  const storage = options.storage ?? browserStorage;
  const previouslyFocused = document.activeElement;
  const overlay = createOverlay();
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.backdropFilter = 'blur(3px)';

  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', t('help.dialog_aria'));
  dialog.style.cssText = `
    background:var(--bg-surface);
    border:1px solid var(--border-default);
    border-radius:var(--radius-xl);
    padding:0;
    width:520px;
    max-width:90vw;
    max-height:80vh;
    display:flex;
    flex-direction:column;
    box-shadow:var(--shadow-lg);
    animation:slideUp 200ms cubic-bezier(0.22,1,0.36,1);
    overflow:hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:16px 20px;border-bottom:1px solid var(--border-subtle);
    flex-shrink:0;
  `;
  const titleEl = document.createElement('h2');
  titleEl.textContent = t('help.title');
  titleEl.style.cssText = `
    font-size:16px;font-weight:700;color:var(--text-primary);
    font-family:var(--font-sans);margin:0;
  `;
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn';
  closeBtn.setAttribute('aria-label', t('help.close_aria'));
  closeBtn.textContent = '✕';
  closeBtn.style.cssText += 'font-size:14px;width:28px;height:28px;';
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.cssText = 'overflow-y:auto;padding:16px 20px;flex:1;';
  content.style.scrollbarWidth = 'thin';

  const sections = getHelpSections();
  const closeRef = { fn: () => {} };
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isFirst = i === 0;

    const sectionEl = document.createElement('div');
    sectionEl.className = isFirst ? 'help-section open' : 'help-section';

    // Accordion header (button for keyboard accessibility)
    const headerBtn = document.createElement('button');
    headerBtn.className = 'help-section-header';
    headerBtn.setAttribute('aria-expanded', String(isFirst));
    const sectionTitle = t(section.titleKey);
    headerBtn.setAttribute('aria-label', t('help.section_toggle_aria', { section: sectionTitle }));

    const chevron = document.createElement('span');
    chevron.className = 'help-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▸';
    headerBtn.appendChild(chevron);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = sectionTitle;
    headerBtn.appendChild(titleSpan);

    headerBtn.addEventListener('click', () => {
      const wasOpen = sectionEl.classList.contains('open');
      // Close all other sections (exclusive accordion)
      const allSections = content.querySelectorAll('.help-section.open');
      allSections.forEach((s) => {
        s.classList.remove('open');
        const btn = s.querySelector('.help-section-header');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      // Toggle the clicked section
      if (!wasOpen) {
        sectionEl.classList.add('open');
        headerBtn.setAttribute('aria-expanded', 'true');
      }
    });

    sectionEl.appendChild(headerBtn);

    // Accordion body
    const body = document.createElement('div');
    body.className = 'help-section-body';

    if (section.type === 'shortcuts-grid' && section.shortcuts) {
      body.appendChild(buildShortcutsGrid(section.shortcuts));
    } else if (section.items) {
      const list = document.createElement('ul');
      list.className = 'help-section-list';

      for (const item of section.items) {
        const li = document.createElement('li');
        li.className = 'help-section-item';
        li.appendChild(buildHelpItem(item));

        const bullet = document.createElement('span');
        bullet.className = 'help-item-bullet';
        li.prepend(bullet);
        list.appendChild(li);
      }

      body.appendChild(list);
    }

    if (section.hasClearData) {
      body.appendChild(buildClearDataButton(storage));
    }

    if (section.hasSampleOrg && options.onLoadSample) {
      body.appendChild(buildSampleOrgButton(options.onLoadSample, () => closeRef.fn()));
    }

    sectionEl.appendChild(body);
    content.appendChild(sectionEl);
  }

  dialog.appendChild(content);
  overlay.appendChild(dialog);

  // Scoped styles for kbd and code elements
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .help-dialog kbd {
      display:inline-block;padding:1px 5px;font-size:11px;
      font-family:var(--font-mono);background:var(--bg-base);
      border:1px solid var(--border-default);border-radius:3px;
      color:var(--text-primary);line-height:1.4;
    }
    .help-dialog code {
      font-family:var(--font-mono);font-size:11px;
      background:var(--bg-base);padding:1px 4px;border-radius:3px;
      color:var(--accent);
    }
  `;
  dialog.classList.add('help-dialog');
  dialog.prepend(styleTag);

  const removeTrap = trapFocus(dialog);

  const close = () => {
    removeTrap();
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener('keydown', escHandler);
    if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  };
  closeRef.fn = close;

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  closeBtn.focus();
}
