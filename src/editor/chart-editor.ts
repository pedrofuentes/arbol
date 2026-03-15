import type { ChartRecord, VersionRecord, OrgNode, ColorCategory } from '../types';
import type { ChartStore } from '../store/chart-store';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showInputDialog } from '../ui/input-dialog';
import { showExportDialog } from '../ui/export-dialog';
import { buildChartBundle, downloadChartBundle } from '../export/chart-exporter';
import { flattenTree } from '../utils/tree';
import { t } from '../i18n';

export interface ChartEditorOptions {
  container: HTMLElement;
  chartStore: ChartStore;
  onChartSwitch: (chart: ChartRecord) => void;
  onVersionRestore: (tree: OrgNode) => void;
  onVersionView: (version: VersionRecord) => void;
  onVersionCompare: (version: VersionRecord) => void;
  getCurrentTree: () => OrgNode;
  getCurrentCategories: () => ColorCategory[];
  onBeforeSwitch: () => Promise<boolean>;
}

const INLINE_BTN_EXTRA = 'font-size:10px;padding:3px 8px;';

const ERROR_TIMEOUT_MS = 3000;

export class ChartEditor {
  private container: HTMLElement;
  private chartStore: ChartStore;
  private onChartSwitch: ChartEditorOptions['onChartSwitch'];
  private onVersionRestore: ChartEditorOptions['onVersionRestore'];
  private onVersionView: ChartEditorOptions['onVersionView'];
  private onVersionCompare: ChartEditorOptions['onVersionCompare'];
  private getCurrentTree: ChartEditorOptions['getCurrentTree'];
  private getCurrentCategories: ChartEditorOptions['getCurrentCategories'];
  private onBeforeSwitch: ChartEditorOptions['onBeforeSwitch'];

  private chartListEl!: HTMLDivElement;
  private versionListEl!: HTMLDivElement;
  private chartSearchInput!: HTMLInputElement;
  private chartErrorEl!: HTMLDivElement;
  private versionErrorEl!: HTMLDivElement;
  private chartSearchTerm = '';

  private unsubscribe: (() => void) | null = null;
  private errorTimers: ReturnType<typeof setTimeout>[] = [];
  private refreshInProgress = false;
  private refreshQueued = false;

  constructor(options: ChartEditorOptions) {
    this.container = options.container;
    this.chartStore = options.chartStore;
    this.onChartSwitch = options.onChartSwitch;
    this.onVersionRestore = options.onVersionRestore;
    this.onVersionView = options.onVersionView;
    this.onVersionCompare = options.onVersionCompare;
    this.getCurrentTree = options.getCurrentTree;
    this.getCurrentCategories = options.getCurrentCategories;
    this.onBeforeSwitch = options.onBeforeSwitch;

    this.build();
    this.unsubscribe = this.chartStore.onChange(() => this.refresh());
  }

  async refresh(): Promise<void> {
    if (this.refreshInProgress) {
      this.refreshQueued = true;
      return;
    }
    this.refreshInProgress = true;
    try {
      await Promise.all([this.renderChartList(), this.renderVersionList()]);
    } finally {
      this.refreshInProgress = false;
      if (this.refreshQueued) {
        this.refreshQueued = false;
        await this.refresh();
      }
    }
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

    // Charts header with + button
    const chartHeader = document.createElement('div');
    chartHeader.className = 'chart-nav-header';

    const chartTitle = document.createElement('span');
    chartTitle.className = 'chart-nav-title';
    chartTitle.textContent = t('chart_editor.charts_heading');
    chartHeader.appendChild(chartTitle);

    const addChartBtn = document.createElement('button');
    addChartBtn.className = 'btn btn-icon btn-ghost';
    addChartBtn.style.cssText = 'width:24px;height:24px;font-size:16px;';
    addChartBtn.title = t('chart_editor.new_chart_tooltip');
    addChartBtn.textContent = '+';
    addChartBtn.addEventListener('click', () => this.handleCreateChart());
    chartHeader.appendChild(addChartBtn);

    this.container.appendChild(chartHeader);

    // Search input
    this.chartSearchInput = document.createElement('input');
    this.chartSearchInput.type = 'text';
    this.chartSearchInput.className = 'chart-search';
    this.chartSearchInput.placeholder = t('chart_editor.search_placeholder');
    this.chartSearchInput.addEventListener('input', () => {
      this.chartSearchTerm = this.chartSearchInput.value.trim().toLowerCase();
      this.renderChartList();
    });
    this.container.appendChild(this.chartSearchInput);

    this.chartErrorEl = this.createErrorArea();
    this.container.appendChild(this.chartErrorEl);
    this.chartListEl = document.createElement('div');
    this.chartListEl.dataset.field = 'chart-list';
    this.chartListEl.setAttribute('role', 'list');
    this.container.appendChild(this.chartListEl);

    // Versions section header with + Save button
    const versionHeader = document.createElement('div');
    versionHeader.className = 'version-section-header';

    const versionTitle = document.createElement('span');
    versionTitle.className = 'version-section-title';
    versionTitle.textContent = t('chart_editor.versions_heading');
    versionHeader.appendChild(versionTitle);

    const saveVersionBtn = document.createElement('button');
    saveVersionBtn.className = 'btn btn-ghost';
    saveVersionBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
    saveVersionBtn.title = t('chart_editor.save_version_tooltip');
    saveVersionBtn.textContent = t('chart_editor.save_version');
    saveVersionBtn.addEventListener('click', () => this.handleSaveVersion());
    versionHeader.appendChild(saveVersionBtn);

    this.container.appendChild(versionHeader);

    this.versionErrorEl = this.createErrorArea();
    this.container.appendChild(this.versionErrorEl);
    this.versionListEl = document.createElement('div');
    this.versionListEl.dataset.field = 'version-list';
    this.versionListEl.setAttribute('role', 'list');
    this.container.appendChild(this.versionListEl);

    this.refresh();
  }

  // ── Heading & Error helpers ────────────────────────────

  private createErrorArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText =
      'font-size:12px;color:var(--danger);min-height:0;margin-bottom:4px;font-family:var(--font-sans);';
    return el;
  }

  private showError(target: HTMLDivElement, message: string): void {
    target.textContent = message;
    const timer = setTimeout(() => {
      target.textContent = '';
    }, ERROR_TIMEOUT_MS);
    this.errorTimers.push(timer);
  }

  // (Chart and version input rows removed — replaced by compact headers with dialog prompts)

  // ── Render chart list ──────────────────────────────────

  private async renderChartList(): Promise<void> {
    this.chartListEl.innerHTML = '';

    const charts = await this.chartStore.getCharts();
    const activeId = this.chartStore.getActiveChartId();

    const filtered = this.chartSearchTerm
      ? charts.filter((c) => c.name.toLowerCase().includes(this.chartSearchTerm))
      : charts;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm text-tertiary';
      empty.style.cssText = 'padding:8px 0;font-family:var(--font-sans);';
      empty.textContent = t('chart_editor.no_charts');
      this.chartListEl.appendChild(empty);
      return;
    }

    // Pre-fetch version counts
    const versionCounts = new Map<string, number>();
    for (const chart of filtered) {
      const versions = await this.chartStore.getVersions(chart.id);
      versionCounts.set(chart.id, versions.length);
    }

    for (const chart of filtered) {
      const isActive = chart.id === activeId;
      this.chartListEl.appendChild(
        this.createChartItem(chart, isActive, versionCounts.get(chart.id) ?? 0),
      );
    }
  }

  private createChartItem(chart: ChartRecord, isActive: boolean, versionCount: number): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'chart-item' + (isActive ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.dataset.chartId = chart.id;
    item.addEventListener('click', (e) => {
      if (!isActive && !(e.target as HTMLElement).closest('button')) {
        this.handleSwitchChart(chart.id);
      }
    });

    if (!isActive) {
      item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleSwitchChart(chart.id);
        }
      });
    }

    // Icon
    const iconEl = document.createElement('div');
    iconEl.className = 'chart-item-icon';
    iconEl.textContent = '🌳';
    item.appendChild(iconEl);

    // Info container
    const infoEl = document.createElement('div');
    infoEl.className = 'chart-item-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'chart-item-name';
    nameEl.textContent = chart.name;

    if (isActive && this.chartStore.isDirty(this.getCurrentTree())) {
      const dirty = document.createElement('span');
      dirty.className = 'chart-dirty';
      dirty.textContent = ' ' + t('chart_editor.active_dot');
      nameEl.appendChild(dirty);
    }
    infoEl.appendChild(nameEl);

    const metaEl = document.createElement('div');
    metaEl.className = 'chart-item-meta';
    const peopleCount = flattenTree(chart.workingTree).length;
    const vSuffix = versionCount === 1
      ? t('chart_editor.version_suffix')
      : t('chart_editor.versions_suffix');
    metaEl.textContent = `${peopleCount} ${t('chart_editor.people_suffix')} · ${versionCount} ${vSuffix}`;
    infoEl.appendChild(metaEl);

    item.appendChild(infoEl);

    // Action buttons (hidden by default, shown on hover via CSS)
    const actions = document.createElement('div');
    actions.className = 'chart-item-actions';

    const renameBtn = this.createInlineButton(t('chart_editor.rename'));
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleRenameChart(chart, item);
    });
    actions.appendChild(renameBtn);

    const duplicateBtn = this.createInlineButton(t('chart_editor.duplicate'));
    duplicateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDuplicateChart(chart);
    });
    actions.appendChild(duplicateBtn);

    const exportBtn = this.createInlineButton(t('chart_editor.export'));
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleExportChart(chart);
    });
    actions.appendChild(exportBtn);

    const deleteBtn = this.createInlineButton(t('chart_editor.delete'), true);
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

    // Working tree entry (always shown)
    const workingItem = document.createElement('div');
    workingItem.className = 'version-item';
    workingItem.setAttribute('role', 'listitem');

    const workingIcon = document.createElement('span');
    workingIcon.className = 'version-item-icon';
    workingIcon.textContent = '✏️';
    workingItem.appendChild(workingIcon);

    const workingInfo = document.createElement('div');
    workingInfo.className = 'version-item-info';

    const workingName = document.createElement('div');
    workingName.className = 'version-item-name';
    workingName.textContent = t('chart_editor.working_tree');
    workingInfo.appendChild(workingName);

    const workingDate = document.createElement('div');
    workingDate.className = 'version-item-date';
    const isDirty = this.chartStore.isDirty(this.getCurrentTree());
    workingDate.textContent = isDirty
      ? t('chart_editor.working_tree_dirty')
      : t('chart_editor.working_tree_saved');
    workingInfo.appendChild(workingDate);

    workingItem.appendChild(workingInfo);
    this.versionListEl.appendChild(workingItem);

    // Saved versions
    const versions = await this.chartStore.getVersions();

    for (const version of versions) {
      this.versionListEl.appendChild(this.createVersionItem(version));
    }
  }

  private createVersionItem(version: VersionRecord): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'version-item';
    item.setAttribute('role', 'listitem');
    item.dataset.versionId = version.id;

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'version-item-icon';
    iconEl.textContent = '📋';
    item.appendChild(iconEl);

    // Info
    const infoEl = document.createElement('div');
    infoEl.className = 'version-item-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'version-item-name';
    nameEl.textContent = version.name;
    infoEl.appendChild(nameEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'version-item-date';
    dateEl.textContent = t('chart_editor.saved_prefix') + new Date(version.createdAt).toLocaleString();
    infoEl.appendChild(dateEl);

    item.appendChild(infoEl);

    // Action buttons (hover-reveal)
    const actions = document.createElement('div');
    actions.className = 'version-item-actions';

    const viewBtn = this.createInlineButton(t('chart_editor.view'));
    viewBtn.addEventListener('click', () => this.onVersionView(version));
    actions.appendChild(viewBtn);

    const compareBtn = this.createInlineButton(t('chart_editor.compare'));
    compareBtn.addEventListener('click', () => this.onVersionCompare(version));
    actions.appendChild(compareBtn);

    const restoreBtn = this.createInlineButton(t('chart_editor.restore'));
    restoreBtn.addEventListener('click', () => this.handleRestoreVersion(version.id));
    actions.appendChild(restoreBtn);

    const deleteBtn = this.createInlineButton(t('chart_editor.delete'), true);
    deleteBtn.addEventListener('click', () => this.handleDeleteVersion(version));
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  }

  // ── Inline button helper ───────────────────────────────

  private createInlineButton(label: string, danger = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = danger ? 'btn btn-danger' : 'btn btn-secondary';
    btn.textContent = label;
    btn.style.cssText = INLINE_BTN_EXTRA;
    return btn;
  }

  // ── Handlers: Charts ───────────────────────────────────

  private async handleCreateChart(): Promise<void> {
    const name = await showInputDialog({
      title: t('chart_editor.new_chart_dialog_title'),
      label: t('chart_editor.new_chart_dialog_label'),
      placeholder: t('chart_editor.new_chart_placeholder'),
    });
    if (!name) return;

    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    try {
      const chart = await this.chartStore.createChart(name);
      this.onChartSwitch(chart);
      this.chartErrorEl.textContent = '';
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  private async handleSwitchChart(chartId: string): Promise<void> {
    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    const item = this.container.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement | null;
    item?.classList.add('chart-item-loading');

    try {
      const chart = await this.chartStore.switchChart(chartId);
      this.onChartSwitch(chart);
      await this.refresh();
    } catch (err) {
      item?.classList.remove('chart-item-loading');
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  private async handleDuplicateChart(chart: ChartRecord): Promise<void> {
    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    try {
      const copy = await this.chartStore.duplicateChart(chart.id);
      this.onChartSwitch(copy);
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
  }

  private async handleExportChart(chart: ChartRecord): Promise<void> {
    try {
      const versions = await this.chartStore.getVersions(chart.id);
      showExportDialog({
        chartName: chart.name,
        versions,
        onExport: (selectedVersionIds) => {
          const selectedVersions = versions.filter((v) => selectedVersionIds.includes(v.id));
          const bundle = buildChartBundle(chart, selectedVersions);
          downloadChartBundle(bundle, chart.name);
        },
        onCancel: () => {},
      });
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
    input.value = chart.name;
    input.style.cssText =
      'font-size:var(--text-sm);width:100%;margin-top:4px;padding:5px var(--space-3);' +
      'font-family:var(--font-sans);border:1px solid var(--accent);' +
      'border-radius:var(--radius-md);background:var(--bg-base);color:var(--text-primary);' +
      'box-shadow:0 0 0 2px var(--accent-muted);outline:none;';

    const commitRename = async (): Promise<void> => {
      const newName = input.value.trim();
      if (!newName) {
        this.showError(this.chartErrorEl, t('chart_header.name_empty_error'));
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
      title: t('dialog.delete_chart.title'),
      message: t('dialog.delete_chart.message', { name: chart.name }),
      confirmLabel: t('dialog.delete_chart.confirm'),
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
    const name = await showInputDialog({
      title: t('dialog.save_version.title'),
      label: t('dialog.save_version.label'),
      placeholder: t('dialog.save_version.placeholder'),
    });
    if (!name) return;

    try {
      const tree = this.getCurrentTree();
      const categories = this.getCurrentCategories();
      await this.chartStore.saveVersion(name, tree);
      await this.chartStore.saveWorkingTree(tree, categories);
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
      title: t('dialog.delete_version.title'),
      message: t('dialog.delete_version.message', { name: version.name }),
      confirmLabel: t('dialog.delete_version.confirm'),
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
