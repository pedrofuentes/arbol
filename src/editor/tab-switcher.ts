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
      'display:flex;gap:0;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;';

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.textContent = tab.label;
      btn.dataset.tabId = tab.id;
      btn.style.cssText =
        'flex:1;padding:8px 0;border:none;background:none;cursor:pointer;' +
        'font-size:12px;font-weight:600;font-family:var(--font-sans);' +
        'color:var(--text-tertiary);border-bottom:2px solid transparent;' +
        'transition:color var(--transition-fast),border-color var(--transition-fast);';
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
      btn.style.borderBottomColor = isActive ? 'var(--accent)' : 'transparent';
    }
  }

  getContentContainer(tabId: string): HTMLDivElement | undefined {
    return this.contentContainers.get(tabId);
  }

  getActiveTabId(): string {
    return this.activeTabId;
  }
}
