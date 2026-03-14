import { t } from '../i18n';

export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}

export interface SettingsModalOptions {
  onClose: () => void;
  onApply: () => void;
}

const DEFAULT_TABS: SettingsTab[] = [
  { id: 'presets', label: 'Theme & Presets', icon: '🎨' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'typography', label: 'Typography', icon: '🔤' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'connectors', label: 'Connectors', icon: '🔗' },
  { id: 'ic', label: 'IC Options', icon: '👤' },
  { id: 'advisors', label: 'Advisors', icon: '📎' },
  { id: 'badges', label: 'Badges', icon: '🔢' },
  { id: 'categories', label: 'Categories', icon: '🏷️' },
  { id: 'backup', label: 'Backup', icon: '💾' },
];

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

  constructor(options: SettingsModalOptions, tabs?: SettingsTab[]) {
    this.options = options;
    this.tabs = tabs ?? DEFAULT_TABS;
    this.activeTab = this.tabs[0]?.id ?? '';

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-modal-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
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
    closeBtn.addEventListener('click', () => this.close());

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

    // Content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'settings-content';
    this.contentArea.id = 'settings-content';
    this.contentArea.setAttribute('role', 'tabpanel');
    this.contentArea.setAttribute('aria-labelledby', `settings-tab-${this.activeTab}`);
    this.contentArea.setAttribute('data-active-tab', this.activeTab);

    body.appendChild(nav);
    body.appendChild(this.contentArea);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'settings-modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'settings-cancel-btn';
    cancelBtn.textContent = t('settings_modal.cancel');
    cancelBtn.addEventListener('click', () => this.close());

    const applyBtn = document.createElement('button');
    applyBtn.className = 'settings-apply-btn';
    applyBtn.textContent = t('settings_modal.apply');
    applyBtn.addEventListener('click', () => {
      options.onApply();
      this.close();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    this.overlay.appendChild(modal);

    // Escape key handler
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.isOpen() && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
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
  }

  destroy(): void {
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.mounted = false;
  }
}
