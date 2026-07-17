import { t, getLocale, setLocale as i18nSetLocale } from '../i18n';
import { trapFocus } from './dialog-utils';
import { createIcon, type IconName } from './icon';

const PREVIEW_HINT_KEYS: Record<string, string> = {
  appearance: 'settings_modal.preview_hint.appearance',
  presets: 'settings_modal.preview_hint.presets',
  layout: 'settings_modal.preview_hint.layout',
  cards_badges: 'settings_modal.preview_hint.cards_badges',
  levels_categories: 'settings_modal.preview_hint.levels_categories',
};

const TABS_WITH_PREVIEW = new Set([
  'appearance',
  'layout',
  'cards_badges',
  'levels_categories',
  'presets',
]);

export interface SettingsTab {
  id: string;
  label: string;
  icon: IconName;
}

export interface SettingsModalOptions {
  onClose: () => void;
  onApply: () => void;
  onDone?: () => Promise<void> | void;
  onCancel?: () => void;
  onTabChange?: (tabId: string) => void;
}

function getDefaultTabs(): SettingsTab[] {
  return [
    { id: 'appearance', label: t('settings_modal.tab.appearance'), icon: 'palette' },
    { id: 'layout', label: t('settings_modal.tab.layout'), icon: 'layout' },
    { id: 'cards_badges', label: t('settings_modal.tab.cards_badges'), icon: 'cards' },
    {
      id: 'levels_categories',
      label: t('settings_modal.tab.levels_categories'),
      icon: 'hierarchy',
    },
    { id: 'presets', label: t('settings_modal.tab.presets'), icon: 'star' },
    { id: 'data_backup', label: t('settings_modal.tab.data_backup'), icon: 'backup' },
  ];
}

export class SettingsModal {
  private overlay: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private activeTab: string;
  private tabs: SettingsTab[];
  private tabButtons: HTMLButtonElement[] = [];
  private options: SettingsModalOptions;
  private previousFocus: HTMLElement | null = null;
  private mounted = false;
  private keyHandler: (e: KeyboardEvent) => void;
  private dialog: HTMLDivElement;
  private removeFocusTrap: (() => void) | null = null;
  private footerLeft: HTMLDivElement = null!;
  private previewStrip: HTMLDivElement = null!;
  private previewArea: HTMLDivElement = null!;
  private previewHint: HTMLSpanElement = null!;
  private previewControls: HTMLDivElement = null!;
  private previewZoomPct: HTMLSpanElement = null!;
  private previewFitBtn: HTMLButtonElement = null!;
  private previewResetBtn: HTMLButtonElement = null!;
  private searchInput: HTMLInputElement;
  private searchNoResults: HTMLDivElement;

  constructor(options: SettingsModalOptions, tabs?: SettingsTab[]) {
    this.options = options;
    this.tabs = tabs ?? getDefaultTabs();
    this.activeTab = this.tabs[0]?.id ?? '';

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-modal-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.cancel();
    });

    // Modal container
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    this.dialog = modal;

    // Header
    const header = document.createElement('div');
    header.className = 'settings-modal-header';

    const title = document.createElement('span');
    title.className = 'settings-modal-title';
    title.id = 'settings-modal-title';
    title.appendChild(createIcon('settings'));
    title.appendChild(document.createTextNode(t('settings_modal.title')));
    modal.setAttribute('aria-labelledby', 'settings-modal-title');

    const search = document.createElement('label');
    search.className = 'settings-modal-search';
    search.appendChild(createIcon('search'));

    this.searchInput = document.createElement('input');
    this.searchInput.className = 'settings-search-input';
    this.searchInput.type = 'search';
    this.searchInput.placeholder = t('settings_modal.search_placeholder');
    this.searchInput.setAttribute('aria-label', t('settings_modal.search_aria'));
    this.searchInput.setAttribute('autocomplete', 'off');
    this.searchInput.addEventListener('input', () => this.refreshSectionVisibility());
    search.appendChild(this.searchInput);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-modal-close';
    closeBtn.setAttribute('aria-label', t('settings_modal.close_aria'));
    closeBtn.appendChild(createIcon('close'));
    closeBtn.addEventListener('click', () => this.cancel());

    header.appendChild(title);
    header.appendChild(search);
    header.appendChild(closeBtn);

    // Body (nav + content)
    const body = document.createElement('div');
    body.className = 'settings-modal-body';

    // Tab navigation
    const nav = document.createElement('nav');
    nav.className = 'settings-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', t('settings_modal.nav_aria'));

    for (const tab of this.tabs) {
      const btn = document.createElement('button');
      btn.className = 'settings-nav-item';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-tab', tab.id);
      btn.setAttribute('aria-selected', tab.id === this.activeTab ? 'true' : 'false');
      btn.setAttribute('aria-controls', 'settings-content');

      if (tab.id === this.activeTab) btn.classList.add('active');

      const iconSpan = createIcon(tab.icon, 'nav-icon');

      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(tab.label));

      btn.addEventListener('click', () => this.setActiveTab(tab.id));
      nav.appendChild(btn);
      this.tabButtons.push(btn);
    }

    // Arrow key nav between tabs
    nav.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = this.tabs.findIndex((t) => t.id === this.activeTab);
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (currentIdx + dir + this.tabs.length) % this.tabs.length;
        this.setActiveTab(this.tabs[nextIdx].id);
        this.tabButtons[nextIdx].focus();
      }
    });

    // Content column wrapper (preview strip + scrollable content)
    const contentColumn = document.createElement('div');
    contentColumn.className = 'settings-content-column';

    // Preview strip
    this.previewStrip = document.createElement('div');
    this.previewStrip.className = 'preview-strip';

    const previewHeader = document.createElement('div');
    previewHeader.className = 'preview-header';

    const previewTitle = document.createElement('span');
    previewTitle.className = 'preview-title';
    previewTitle.textContent = t('settings_modal.preview_title');

    this.previewHint = document.createElement('span');
    this.previewHint.className = 'preview-hint';
    this.previewHint.textContent = t(PREVIEW_HINT_KEYS[this.activeTab] ?? 'settings_modal.preview_hint.presets');

    previewHeader.appendChild(previewTitle);
    previewHeader.appendChild(this.previewHint);

    // Zoom controls
    this.previewControls = document.createElement('div');
    this.previewControls.className = 'preview-controls';

    this.previewFitBtn = document.createElement('button');
    this.previewFitBtn.className = 'preview-zoom-btn';
    this.previewFitBtn.setAttribute('aria-label', t('settings_modal.preview_fit'));
    this.previewFitBtn.setAttribute('data-tooltip', t('settings_modal.preview_fit'));
    this.previewFitBtn.appendChild(createIcon('fit'));
    this.previewControls.appendChild(this.previewFitBtn);

    this.previewResetBtn = document.createElement('button');
    this.previewResetBtn.className = 'preview-zoom-btn';
    this.previewResetBtn.setAttribute('aria-label', t('settings_modal.preview_reset'));
    this.previewResetBtn.setAttribute('data-tooltip', t('settings_modal.preview_reset'));
    this.previewResetBtn.appendChild(createIcon('reset'));
    this.previewControls.appendChild(this.previewResetBtn);

    this.previewZoomPct = document.createElement('span');
    this.previewZoomPct.className = 'preview-zoom-pct';
    this.previewZoomPct.textContent = '100%';
    this.previewControls.appendChild(this.previewZoomPct);

    previewHeader.appendChild(this.previewControls);
    this.previewStrip.appendChild(previewHeader);

    this.previewArea = document.createElement('div');
    this.previewArea.className = 'preview-area';
    this.previewStrip.appendChild(this.previewArea);

    // Hide preview on tabs that don't need it
    if (!TABS_WITH_PREVIEW.has(this.activeTab)) {
      this.previewStrip.classList.add('hidden');
    }

    contentColumn.appendChild(this.previewStrip);

    // Content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'settings-content';
    this.contentArea.id = 'settings-content';
    this.contentArea.setAttribute('role', 'tabpanel');
    this.contentArea.setAttribute('aria-labelledby', `settings-tab-${this.activeTab}`);
    this.contentArea.setAttribute('data-active-tab', this.activeTab);

    contentColumn.appendChild(this.contentArea);

    this.searchNoResults = document.createElement('div');
    this.searchNoResults.className = 'settings-search-no-results';
    this.searchNoResults.textContent = t('settings_modal.search_no_results');
    this.searchNoResults.setAttribute('role', 'status');
    this.searchNoResults.setAttribute('aria-live', 'polite');
    this.searchNoResults.hidden = true;
    contentColumn.appendChild(this.searchNoResults);

    body.appendChild(nav);
    body.appendChild(contentColumn);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'settings-modal-footer';

    const footerLeft = document.createElement('div');
    footerLeft.className = 'settings-footer-left';
    this.footerLeft = footerLeft;

    // Language picker
    const localeLabel = document.createElement('label');
    localeLabel.setAttribute('for', 'locale-select');
    localeLabel.textContent = t('settings.language');

    const localeSelect = document.createElement('select');
    localeSelect.id = 'locale-select';
    localeSelect.setAttribute('aria-label', t('settings.language_aria'));

    const enOpt = document.createElement('option');
    enOpt.value = 'en';
    enOpt.textContent = 'English';

    const esOpt = document.createElement('option');
    esOpt.value = 'es';
    esOpt.textContent = 'Español';

    localeSelect.appendChild(enOpt);
    localeSelect.appendChild(esOpt);
    localeSelect.value = getLocale();

    localeSelect.addEventListener('change', async () => {
      const selected = localeSelect.value;
      if (selected === 'es') {
        const { default: es } = await import('../i18n/es');
        i18nSetLocale('es', es);
      } else {
        const { default: en } = await import('../i18n/en');
        i18nSetLocale('en', en);
      }
      const { showToast } = await import('./toast');
      showToast(t('settings.locale_changed'));
      location.reload();
    });

    const localeGroup = document.createElement('div');
    localeGroup.className = 'form-group';
    localeGroup.appendChild(localeLabel);
    localeGroup.appendChild(localeSelect);
    footerLeft.appendChild(localeGroup);

    const footerRight = document.createElement('div');
    footerRight.className = 'settings-footer-right';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'settings-cancel-btn';
    cancelBtn.textContent = t('settings_modal.cancel');
    cancelBtn.addEventListener('click', () => this.cancel());

    const applyBtn = document.createElement('button');
    applyBtn.className = 'settings-apply-btn';
    applyBtn.textContent = t('settings_modal.apply');
    applyBtn.addEventListener('click', async () => {
      await this.options.onDone?.();
      this.close();
    });

    footerRight.appendChild(cancelBtn);
    footerRight.appendChild(applyBtn);
    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    this.overlay.appendChild(modal);

    // Escape key handler
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.isOpen() && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      }
    };
  }

  open(): void {
    if (!this.mounted) {
      document.body.appendChild(this.overlay);
      this.mounted = true;
    }
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.overlay.classList.add('open');
    document.addEventListener('keydown', this.keyHandler, true);
    this.removeFocusTrap = trapFocus(this.dialog);
    // Focus close button
    const closeBtn = this.overlay.querySelector('.settings-modal-close') as HTMLElement;
    if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
  }

  close(): void {
    this.removeFocusTrap?.();
    this.removeFocusTrap = null;
    this.overlay.classList.remove('open');
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
    this.options.onClose();
  }

  isOpen(): boolean {
    return this.overlay.classList.contains('open');
  }

  getContentArea(): HTMLElement {
    return this.contentArea;
  }

  getActiveTab(): string {
    return this.activeTab;
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.contentArea.setAttribute('data-active-tab', tabId);
    this.contentArea.setAttribute('aria-labelledby', `settings-tab-${tabId}`);

    for (const btn of this.tabButtons) {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    // Update preview strip visibility and hint
    if (!TABS_WITH_PREVIEW.has(tabId)) {
      this.previewStrip.classList.add('hidden');
    } else {
      this.previewStrip.classList.remove('hidden');
      const hintKey = PREVIEW_HINT_KEYS[tabId];
      if (hintKey) {
        this.previewHint.textContent = t(hintKey);
      }
    }

    this.options.onTabChange?.(tabId);
    this.refreshSectionVisibility();
  }

  refreshSectionVisibility(): void {
    const query = this.searchInput.value.trim().toLocaleLowerCase();
    const isSearching = query.length > 0;
    const sections = Array.from(
      this.contentArea.querySelectorAll<HTMLElement>(':scope > [data-section-id]'),
    );

    this.dialog.classList.toggle('settings-searching', isSearching);

    let matchCount = 0;
    for (const section of sections) {
      section.querySelector('.settings-search-group-label')?.remove();

      const groupId = section.dataset.settingsGroup;
      const matches = isSearching
        ? (section.textContent ?? '').toLocaleLowerCase().includes(query)
        : groupId === this.activeTab;
      section.hidden = !matches;

      if (isSearching && matches) {
        const group = this.tabs.find((tab) => tab.id === groupId);
        if (group) {
          const groupLabel = document.createElement('span');
          groupLabel.className = 'settings-search-group-label';
          groupLabel.textContent = group.label;
          section.prepend(groupLabel);
        }
        matchCount += 1;
      }
    }

    this.searchNoResults.hidden = !isSearching || matchCount > 0;
    this.previewStrip.classList.toggle(
      'hidden',
      isSearching || !TABS_WITH_PREVIEW.has(this.activeTab),
    );
  }

  cancel(): void {
    this.options.onCancel?.();
    this.close();
  }

  updateTabBadge(tabId: string, count: number): void {
    const btn = this.tabButtons.find(
      (b) => b.getAttribute('data-tab') === tabId,
    );
    if (!btn) return;
    let badge = btn.querySelector('.settings-tab-badge') as HTMLElement;
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'settings-tab-badge';
        btn.appendChild(badge);
      }
      badge.textContent = String(count);
    } else if (badge) {
      badge.remove();
    }
  }

  getFooterLeft(): HTMLElement {
    return this.footerLeft;
  }

  getPreviewArea(): HTMLElement {
    return this.previewArea;
  }

  getPreviewFitBtn(): HTMLButtonElement {
    return this.previewFitBtn;
  }

  getPreviewResetBtn(): HTMLButtonElement {
    return this.previewResetBtn;
  }

  getPreviewZoomPct(): HTMLElement {
    return this.previewZoomPct;
  }

  setPreviewHint(text: string): void {
    this.previewHint.textContent = text;
  }

  destroy(): void {
    this.removeFocusTrap?.();
    this.removeFocusTrap = null;
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.mounted = false;
  }
}
