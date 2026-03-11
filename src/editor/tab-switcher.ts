export interface TabDefinition {
  id: string;
  label: string;
}

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
    nav.style.cssText =
      'display:flex;gap:2px;padding:3px;margin-bottom:14px;' +
      'background:var(--bg-base);border-radius:var(--radius-lg);';

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.textContent = tab.label;
      btn.dataset.tabId = tab.id;
      btn.style.cssText =
        'flex:1;padding:6px 0;border:none;background:transparent;cursor:pointer;' +
        'font-size:12px;font-weight:600;font-family:var(--font-sans);' +
        'color:var(--text-tertiary);border-radius:var(--radius-md);' +
        'transition:all 150ms cubic-bezier(0.22,1,0.36,1);letter-spacing:0.02em;';
      btn.addEventListener('click', () => this.activate(tab.id));
      nav.appendChild(btn);
      this.buttons.set(tab.id, btn);
    }

    container.appendChild(nav);

    for (const tab of tabs) {
      const content = document.createElement('div');
      content.className = 'tab-content';
      content.dataset.tabId = tab.id;
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
