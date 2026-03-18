import { t } from '../i18n';

const PREVIEW_HINT_KEYS: Record<string, string> = {
  presets: 'settings_modal.preview_hint.presets',
  layout: 'settings_modal.preview_hint.layout',
  typography: 'settings_modal.preview_hint.typography',
  cards: 'settings_modal.preview_hint.cards',
  connectors: 'settings_modal.preview_hint.connectors',
  ic: 'settings_modal.preview_hint.ic',
  advisors: 'settings_modal.preview_hint.advisors',
  badges: 'settings_modal.preview_hint.badges',
  categories: 'settings_modal.preview_hint.categories',
};

const TABS_WITHOUT_PREVIEW = new Set(['backup']);

export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
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
    { id: 'presets', label: t('settings_modal.tab.presets'), icon: '🎨' },
    { id: 'layout', label: t('settings_modal.tab.layout'), icon: '📐' },
    { id: 'typography', label: t('settings_modal.tab.typography'), icon: '🔤' },
    { id: 'cards', label: t('settings_modal.tab.cards'), icon: '🃏' },
    { id: 'connectors', label: t('settings_modal.tab.connectors'), icon: '🔗' },
    { id: 'ic', label: t('settings_modal.tab.ic'), icon: '👤' },
    { id: 'advisors', label: t('settings_modal.tab.advisors'), icon: '📎' },
    { id: 'badges', label: t('settings_modal.tab.badges'), icon: '🔢' },
    { id: 'categories', label: t('settings_modal.tab.categories'), icon: '🏷️' },
    { id: 'backup', label: t('settings_modal.tab.backup'), icon: '💾' },
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
  private footerLeft: HTMLDivElement = null!;
  private previewStrip: HTMLDivElement = null!;
  private previewArea: HTMLDivElement = null!;
  private previewHint: HTMLSpanElement = null!;
  private previewControls: HTMLDivElement = null!;
  private previewZoomPct: HTMLSpanElement = null!;
  private previewFitBtn: HTMLButtonElement = null!;
  private previewResetBtn: HTMLButtonElement = null!;

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

    // Header
    const header = document.createElement('div');
    header.className = 'settings-modal-header';

    const title = document.createElement('span');
    title.className = 'settings-modal-title';
    title.id = 'settings-modal-title';
    title.textContent = t('settings_modal.title');
    modal.setAttribute('aria-labelledby', 'settings-modal-title');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-modal-close';
    closeBtn.setAttribute('aria-label', t('settings_modal.close_aria'));
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.cancel());

    header.appendChild(title);
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

      const iconSpan = document.createElement('span');
      iconSpan.className = 'nav-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = tab.icon;

      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(` ${tab.label}`));

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
    this.previewFitBtn.textContent = '⊞';
    this.previewControls.appendChild(this.previewFitBtn);

    this.previewResetBtn = document.createElement('button');
    this.previewResetBtn.className = 'preview-zoom-btn';
    this.previewResetBtn.setAttribute('aria-label', t('settings_modal.preview_reset'));
    this.previewResetBtn.setAttribute('data-tooltip', t('settings_modal.preview_reset'));
    this.previewResetBtn.textContent = '↺';
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
    if (TABS_WITHOUT_PREVIEW.has(this.activeTab)) {
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

    body.appendChild(nav);
    body.appendChild(contentColumn);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'settings-modal-footer';

    const footerLeft = document.createElement('div');
    footerLeft.className = 'settings-footer-left';
    this.footerLeft = footerLeft;

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
    // Focus close button
    const closeBtn = this.overlay.querySelector('.settings-modal-close') as HTMLElement;
    if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
  }

  close(): void {
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
    if (TABS_WITHOUT_PREVIEW.has(tabId)) {
      this.previewStrip.classList.add('hidden');
    } else {
      this.previewStrip.classList.remove('hidden');
      const hintKey = PREVIEW_HINT_KEYS[tabId];
      if (hintKey) {
        this.previewHint.textContent = t(hintKey);
      }
    }

    this.options.onTabChange?.(tabId);
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
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.mounted = false;
  }
}
