export interface TabDefinition {
  id: string;
  label: string;
}

import { t } from '../i18n';

export class TabSwitcher {
  private tabs: TabDefinition[];
  private contentContainers: Map<string, HTMLDivElement> = new Map();
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activeTabId: string;

  constructor(container: HTMLElement, tabs: TabDefinition[]) {
    this.tabs = tabs;
    this.activeTabId = tabs[0]?.id ?? '';

    container.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'tab-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', t('tabs.aria'));
    nav.style.cssText =
      'display:flex;gap:2px;padding:3px;margin-bottom:14px;' +
      'background:var(--bg-base);border-radius:var(--radius-lg);';

    for (const tab of tabs) {
      const tabButtonId = `tab-${tab.id}`;
      const panelId = `panel-${tab.id}`;

      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = tabButtonId;
      btn.textContent = tab.label;
      btn.dataset.tabId = tab.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-controls', panelId);
      btn.setAttribute('tabindex', '-1');
      btn.style.cssText =
        'flex:1;padding:6px 0;border:none;background:transparent;cursor:pointer;' +
        'font-size:12px;font-weight:600;font-family:var(--font-sans);' +
        'color:var(--text-tertiary);border-radius:var(--radius-md);' +
        'transition:all 150ms cubic-bezier(0.22,1,0.36,1);letter-spacing:0.02em;';
      btn.addEventListener('click', () => this.activate(tab.id));
      nav.appendChild(btn);
      this.buttons.set(tab.id, btn);
    }

    // Arrow key navigation (roving tabindex)
    nav.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const tabIds = this.tabs.map((t) => t.id);
      const currentIdx = tabIds.indexOf(this.activeTabId);
      if (currentIdx === -1) return;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (currentIdx + dir + tabIds.length) % tabIds.length;
      this.activate(tabIds[nextIdx]);
      this.buttons.get(tabIds[nextIdx])?.focus();
    });

    container.appendChild(nav);

    for (const tab of tabs) {
      const tabButtonId = `tab-${tab.id}`;
      const panelId = `panel-${tab.id}`;

      const content = document.createElement('div');
      content.className = 'tab-content';
      content.id = panelId;
      content.dataset.tabId = tab.id;
      content.setAttribute('role', 'tabpanel');
      content.setAttribute('aria-labelledby', tabButtonId);
      content.style.display = 'none';
      container.appendChild(content);
      this.contentContainers.set(tab.id, content);
    }

    this.activate(this.activeTabId);
  }

  activate(tabId: string): void {
    this.activeTabId = tabId;

    for (const [id, content] of this.contentContainers) {
      content.style.display = id === tabId ? 'block' : 'none';
    }

    for (const [id, btn] of this.buttons) {
      const isActive = id === tabId;
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
      btn.style.color = isActive ? 'var(--text-primary)' : 'var(--text-tertiary)';
      btn.style.background = isActive ? 'var(--bg-elevated)' : 'transparent';
      btn.style.boxShadow = isActive ? 'var(--shadow-sm)' : 'none';
    }
  }

  getContentContainer(tabId: string): HTMLDivElement | undefined {
    return this.contentContainers.get(tabId);
  }

  getActiveTabId(): string {
    return this.activeTabId;
  }
}
