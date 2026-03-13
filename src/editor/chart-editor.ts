import type { ChartRecord, VersionRecord, OrgNode, ColorCategory } from '../types';
import type { ChartStore } from '../store/chart-store';
import { showConfirmDialog } from '../ui/confirm-dialog';

export interface ChartEditorOptions {
  container: HTMLElement;
  chartStore: ChartStore;
  onChartSwitch: (chart: ChartRecord) => void;
  onVersionRestore: (tree: OrgNode) => void;
  onVersionView: (version: VersionRecord) => void;
  getCurrentTree: () => OrgNode;
  getCurrentCategories: () => ColorCategory[];
  onBeforeSwitch: () => Promise<boolean>;
}

const HEADING_STYLE =
  'margin:0 0 8px;font-size:11px;text-transform:uppercase;' +
  'color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);font-weight:700;';

const INLINE_BTN_STYLE =
  'font-size:11px;padding:2px 8px;border:1px solid var(--border-default);' +
  'background:transparent;color:var(--text-secondary);border-radius:var(--radius-sm);cursor:pointer;';

const DANGER_BTN_STYLE =
  'font-size:11px;padding:2px 8px;border:1px solid var(--color-danger);' +
  'background:transparent;color:var(--color-danger);border-radius:var(--radius-sm);cursor:pointer;';

const ITEM_STYLE =
  'padding:8px 10px;border-bottom:1px solid var(--border-subtle);';

const ERROR_TIMEOUT_MS = 3000;

export class ChartEditor {
  private container: HTMLElement;
  private chartStore: ChartStore;
  private onChartSwitch: ChartEditorOptions['onChartSwitch'];
  private onVersionRestore: ChartEditorOptions['onVersionRestore'];
  private onVersionView: ChartEditorOptions['onVersionView'];
  private getCurrentTree: ChartEditorOptions['getCurrentTree'];
  private getCurrentCategories: ChartEditorOptions['getCurrentCategories'];
  private onBeforeSwitch: ChartEditorOptions['onBeforeSwitch'];

  private chartListEl!: HTMLDivElement;
  private versionListEl!: HTMLDivElement;
  private chartNameInput!: HTMLInputElement;
  private versionNameInput!: HTMLInputElement;
  private chartErrorEl!: HTMLDivElement;
  private versionErrorEl!: HTMLDivElement;

  private unsubscribe: (() => void) | null = null;
  private errorTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(options: ChartEditorOptions) {
    this.container = options.container;
    this.chartStore = options.chartStore;
    this.onChartSwitch = options.onChartSwitch;
    this.onVersionRestore = options.onVersionRestore;
    this.onVersionView = options.onVersionView;
    this.getCurrentTree = options.getCurrentTree;
    this.getCurrentCategories = options.getCurrentCategories;
    this.onBeforeSwitch = options.onBeforeSwitch;

    this.build();
    this.unsubscribe = this.chartStore.onChange(() => this.refresh());
  }

  async refresh(): Promise<void> {
    await Promise.all([this.renderChartList(), this.renderVersionList()]);
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    for (const t of this.errorTimers) clearTimeout(t);
    this.errorTimers = [];
    this.container.innerHTML = '';
  }

  // ── Build ──────────────────────────────────────────────

  private build(): void {
    this.container.innerHTML = '';

    // Charts section
    this.container.appendChild(this.createHeading('Charts'));
    this.container.appendChild(this.buildChartInputRow());
    this.chartErrorEl = this.createErrorArea();
    this.container.appendChild(this.chartErrorEl);
    this.chartListEl = document.createElement('div');
    this.chartListEl.dataset.field = 'chart-list';
    this.container.appendChild(this.chartListEl);

    // Versions section
    const versionHeading = this.createHeading('Versions');
    versionHeading.style.marginTop = '20px';
    this.container.appendChild(versionHeading);
    this.container.appendChild(this.buildVersionInputRow());
    this.versionErrorEl = this.createErrorArea();
    this.container.appendChild(this.versionErrorEl);
    this.versionListEl = document.createElement('div');
    this.versionListEl.dataset.field = 'version-list';
    this.container.appendChild(this.versionListEl);

    this.refresh();
  }

  // ── Heading & Error helpers ────────────────────────────

  private createHeading(text: string): HTMLHeadingElement {
    const h = document.createElement('h4');
    h.textContent = text;
    h.style.cssText = HEADING_STYLE;
    return h;
  }

  private createErrorArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText =
      'font-size:12px;color:var(--color-danger);min-height:0;margin-bottom:4px;font-family:var(--font-sans);';
    return el;
  }

  private showError(target: HTMLDivElement, message: string): void {
    target.textContent = message;
    const timer = setTimeout(() => {
      target.textContent = '';
    }, ERROR_TIMEOUT_MS);
    this.errorTimers.push(timer);
  }

  // ── Charts input row ──────────────────────────────────

  private buildChartInputRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';

    this.chartNameInput = document.createElement('input');
    this.chartNameInput.type = 'text';
    this.chartNameInput.className = 'input';
    this.chartNameInput.placeholder = 'New chart name';
    this.chartNameInput.style.cssText = 'flex:1;min-width:0;';
    this.chartNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleCreateChart();
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+';
    addBtn.style.cssText = 'padding:4px 10px;flex-shrink:0;';
    addBtn.addEventListener('click', () => this.handleCreateChart());

    row.appendChild(this.chartNameInput);
    row.appendChild(addBtn);
    return row;
  }

  // ── Versions input row ─────────────────────────────────

  private buildVersionInputRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';

    this.versionNameInput = document.createElement('input');
    this.versionNameInput.type = 'text';
    this.versionNameInput.className = 'input';
    this.versionNameInput.placeholder = 'Version name';
    this.versionNameInput.style.cssText = 'flex:1;min-width:0;';
    this.versionNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSaveVersion();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '💾 Save';
    saveBtn.style.cssText = 'flex-shrink:0;';
    saveBtn.addEventListener('click', () => this.handleSaveVersion());

    row.appendChild(this.versionNameInput);
    row.appendChild(saveBtn);
    return row;
  }

  // ── Render chart list ──────────────────────────────────

  private async renderChartList(): Promise<void> {
    this.chartListEl.innerHTML = '';

    const charts = await this.chartStore.getCharts();
    const activeId = this.chartStore.getActiveChartId();

    if (charts.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--text-tertiary);padding:8px 0;font-family:var(--font-sans);';
      empty.textContent = 'No charts yet';
      this.chartListEl.appendChild(empty);
      return;
    }

    for (const chart of charts) {
      const isActive = chart.id === activeId;
      this.chartListEl.appendChild(this.createChartItem(chart, isActive));
    }
  }

  private createChartItem(chart: ChartRecord, isActive: boolean): HTMLDivElement {
    const item = document.createElement('div');
    item.dataset.chartId = chart.id;
    item.style.cssText =
      ITEM_STYLE +
      (isActive ? 'border-left:3px solid var(--accent);' : 'border-left:3px solid transparent;') +
      'cursor:pointer;';
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-elevated)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = '';
    });
    item.addEventListener('click', (e) => {
      if (!isActive && !(e.target as HTMLElement).closest('button')) {
        this.handleSwitchChart(chart.id);
      }
    });

    // Name row
    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

    if (isActive) {
      const dot = document.createElement('span');
      dot.textContent = '●';
      dot.style.cssText = 'color:var(--accent);font-size:10px;flex-shrink:0;';
      nameRow.appendChild(dot);
    }

    const nameEl = document.createElement('span');
    nameEl.style.cssText =
      'font-size:13px;font-weight:' + (isActive ? '600' : '400') + ';' +
      'color:var(--text-primary);font-family:var(--font-sans);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    nameEl.textContent = chart.name;
    nameRow.appendChild(nameEl);

    if (isActive) {
      const badge = document.createElement('span');
      badge.textContent = '(active)';
      badge.style.cssText = 'font-size:10px;color:var(--text-tertiary);flex-shrink:0;';
      nameRow.appendChild(badge);
    }

    item.appendChild(nameRow);

    // Date row
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-top:2px;font-family:var(--font-sans);';
    dateEl.textContent = 'Updated: ' + new Date(chart.updatedAt).toLocaleDateString();
    item.appendChild(dateEl);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:4px;';

    const renameBtn = this.createInlineButton('Rename', INLINE_BTN_STYLE);
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleRenameChart(chart, item);
    });
    actions.appendChild(renameBtn);

    const deleteBtn = this.createInlineButton('Delete', DANGER_BTN_STYLE);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteChart(chart);
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  }

  // ── Render version list ────────────────────────────────

  private async renderVersionList(): Promise<void> {
    this.versionListEl.innerHTML = '';

    const versions = await this.chartStore.getVersions();

    if (versions.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--text-tertiary);padding:8px 0;font-family:var(--font-sans);';
      empty.textContent = 'No versions saved yet';
      this.versionListEl.appendChild(empty);
      return;
    }

    for (const version of versions) {
      this.versionListEl.appendChild(this.createVersionItem(version));
    }
  }

  private createVersionItem(version: VersionRecord): HTMLDivElement {
    const item = document.createElement('div');
    item.dataset.versionId = version.id;
    item.style.cssText = ITEM_STYLE;
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-elevated)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = '';
    });

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:13px;color:var(--text-primary);font-family:var(--font-sans);';
    nameEl.textContent = version.name;
    item.appendChild(nameEl);

    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-top:2px;font-family:var(--font-sans);';
    dateEl.textContent = 'Saved: ' + new Date(version.createdAt).toLocaleString();
    item.appendChild(dateEl);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:4px;';

    const viewBtn = this.createInlineButton('View', INLINE_BTN_STYLE);
    viewBtn.addEventListener('click', () => this.onVersionView(version));
    actions.appendChild(viewBtn);

    const restoreBtn = this.createInlineButton('Restore', INLINE_BTN_STYLE);
    restoreBtn.addEventListener('click', () => this.handleRestoreVersion(version.id));
    actions.appendChild(restoreBtn);

    const deleteBtn = this.createInlineButton('Delete', DANGER_BTN_STYLE);
    deleteBtn.addEventListener('click', () => this.handleDeleteVersion(version));
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  }

  // ── Inline button helper ───────────────────────────────

  private createInlineButton(label: string, style: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = style;
    return btn;
  }

  // ── Handlers: Charts ───────────────────────────────────

  private async handleCreateChart(): Promise<void> {
    const name = this.chartNameInput.value.trim();
    if (!name) {
      this.showError(this.chartErrorEl, 'Please enter a chart name');
      return;
    }

    try {
      await this.chartStore.createChart(name);
      this.chartNameInput.value = '';
      this.chartErrorEl.textContent = '';
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  private async handleSwitchChart(chartId: string): Promise<void> {
    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    try {
      const chart = await this.chartStore.switchChart(chartId);
      this.onChartSwitch(chart);
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  private handleRenameChart(chart: ChartRecord, itemEl: HTMLDivElement): void {
    const nameRow = itemEl.querySelector('div') as HTMLDivElement;
    if (!nameRow) return;

    // Replace name content with inline input
    const existingInput = itemEl.querySelector('input');
    if (existingInput) return; // Already renaming

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.value = chart.name;
    input.style.cssText = 'font-size:13px;width:100%;margin-top:4px;';

    const commitRename = async (): Promise<void> => {
      const newName = input.value.trim();
      if (!newName) {
        this.showError(this.chartErrorEl, 'Chart name cannot be empty');
        await this.refresh();
        return;
      }
      if (newName === chart.name) {
        await this.refresh();
        return;
      }
      try {
        await this.chartStore.renameChart(chart.id, newName);
        await this.refresh();
      } catch (err) {
        this.showError(this.chartErrorEl, (err as Error).message);
        await this.refresh();
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitRename();
      if (e.key === 'Escape') this.refresh();
    });
    input.addEventListener('blur', () => commitRename());

    // Insert input after the name row
    nameRow.insertAdjacentElement('afterend', input);
    input.focus();
    input.select();
  }

  private async handleDeleteChart(chart: ChartRecord): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Delete Chart',
      message: `Are you sure you want to delete "${chart.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.chartStore.deleteChart(chart.id);
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  // ── Handlers: Versions ─────────────────────────────────

  private async handleSaveVersion(): Promise<void> {
    const name = this.versionNameInput.value.trim();
    if (!name) {
      this.showError(this.versionErrorEl, 'Please enter a version name');
      return;
    }

    try {
      const tree = this.getCurrentTree();
      const categories = this.getCurrentCategories();
      await this.chartStore.saveVersion(name, tree);
      await this.chartStore.saveWorkingTree(tree, categories);
      this.versionNameInput.value = '';
      this.versionErrorEl.textContent = '';
      await this.refresh();
    } catch (err) {
      this.showError(this.versionErrorEl, (err as Error).message);
    }
  }

  private async handleRestoreVersion(versionId: string): Promise<void> {
    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    try {
      const tree = await this.chartStore.restoreVersion(versionId);
      this.onVersionRestore(tree);
      await this.refresh();
    } catch (err) {
      this.showError(this.versionErrorEl, (err as Error).message);
    }
  }

  private async handleDeleteVersion(version: VersionRecord): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: 'Delete Version',
      message: `Are you sure you want to delete version "${version.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.chartStore.deleteVersion(version.id);
      await this.refresh();
    } catch (err) {
      this.showError(this.versionErrorEl, (err as Error).message);
    }
  }
}
