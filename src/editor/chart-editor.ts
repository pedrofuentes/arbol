import type {
  ChartRecord,
  VersionRecord,
  OrgNode,
  ColorCategory,
  LevelMapping,
  LevelDisplayMode,
  CategoryPreset,
  LevelMappingPreset,
} from '../types';
import type { ChartStore } from '../store/chart-store';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showInputDialog } from '../ui/input-dialog';
import { showChartExportDialog } from '../ui/chart-export-dialog';
import { buildChartBundle, downloadChartBundle } from '../export/chart-exporter';
import { flattenTree } from '../utils/tree';
import { t, tp, getLocale } from '../i18n';
import { showCreateChartDialog } from '../ui/create-chart-dialog';
import { createButton } from '../utils/dom-builder';
import { createIcon, type IconName } from '../ui/icon';

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
  categoryPresetStore?: {
    getPresets(): CategoryPreset[];
    getPreset(name: string): CategoryPreset | undefined;
  };
  levelPresetStore?: {
    getPresets(): LevelMappingPreset[];
    getPreset(name: string): LevelMappingPreset | undefined;
  };
}

const INLINE_BTN_EXTRA = 'font-size:10px;padding:3px 8px;';
const ACTION_BTN_STYLE =
  'font-size:14px;padding:4px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;line-height:1;';

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
  private categoryPresetStore: ChartEditorOptions['categoryPresetStore'];
  private levelPresetStore: ChartEditorOptions['levelPresetStore'];

  private chartListEl!: HTMLDivElement;
  private versionListEl!: HTMLDivElement;
  private chartSearchInput!: HTMLInputElement;
  private chartErrorEl!: HTMLDivElement;
  private versionErrorEl!: HTMLDivElement;
  private chartSearchTerm = '';
  private viewingVersionId: string | null = null;

  private unsubscribe: (() => void) | null = null;
  private unsubscribeWorkingTreeSaved: (() => void) | null = null;
  private errorTimers: ReturnType<typeof setTimeout>[] = [];
  private refreshInProgress = false;
  private refreshQueued = false;
  private latestPeopleCounts = new Map<string, number>();
  private pendingPeopleCounts = new Map<string, number>();
  private versionCounts = new Map<string, number>();
  private chartNames = new Map<string, string>();

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
    this.categoryPresetStore = options.categoryPresetStore;
    this.levelPresetStore = options.levelPresetStore;

    this.build();
    this.unsubscribe = this.chartStore.onChange(() => this.refresh());
    this.unsubscribeWorkingTreeSaved = this.chartStore.onWorkingTreeSaved(
      ({ chartId, peopleCount }) => this.updateChartMeta(chartId, peopleCount),
    );
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
      this.applyPendingChartMetaUpdates();
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
    if (this.unsubscribeWorkingTreeSaved) {
      this.unsubscribeWorkingTreeSaved();
      this.unsubscribeWorkingTreeSaved = null;
    }
    for (const t of this.errorTimers) clearTimeout(t);
    this.errorTimers = [];
    this.container.innerHTML = '';
  }

  setViewingVersion(versionId: string | null): void {
    this.viewingVersionId = versionId;
    this.renderVersionList();
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

    const addChartBtn = createButton({
      className: 'btn btn-icon btn-ghost',
      title: t('chart_editor.new_chart_tooltip'),
      label: '+',
      onClick: () => this.handleCreateChart(),
    });
    addChartBtn.style.cssText = 'width:24px;height:24px;font-size:16px;';
    chartHeader.appendChild(addChartBtn);

    this.container.appendChild(chartHeader);

    // Search input
    this.chartSearchInput = document.createElement('input');
    this.chartSearchInput.type = 'text';
    this.chartSearchInput.className = 'chart-search';
    this.chartSearchInput.placeholder = t('chart_editor.search_placeholder');
    this.chartSearchInput.setAttribute('aria-label', t('chart_editor.search_aria'));
    this.chartSearchInput.addEventListener('input', () => {
      this.chartSearchTerm = this.chartSearchInput.value.trim().toLowerCase();
      this.renderChartList();
    });
    this.container.appendChild(this.chartSearchInput);

    this.chartErrorEl = this.createErrorArea();
    this.container.appendChild(this.chartErrorEl);
    this.chartListEl = document.createElement('div');
    this.chartListEl.className = 'chart-list';
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

    const saveVersionBtn = createButton({
      className: 'btn btn-ghost',
      title: t('chart_editor.save_version_tooltip'),
      label: t('chart_editor.save_version'),
      onClick: () => this.handleSaveVersion(),
    });
    saveVersionBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
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
    this.chartNames = new Map(charts.map((chart) => [chart.id, chart.name]));

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
    this.versionCounts.clear();
    for (const chart of filtered) {
      const versions = await this.chartStore.getVersions(chart.id);
      this.versionCounts.set(chart.id, versions.length);
    }

    for (const chart of filtered) {
      const isActive = chart.id === activeId;
      this.chartListEl.appendChild(
        this.createChartItem(chart, isActive, this.versionCounts.get(chart.id) ?? 0),
      );
    }
  }

  private createChartItem(
    chart: ChartRecord,
    isActive: boolean,
    versionCount: number,
  ): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'chart-item' + (isActive ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.chartId = chart.id;
    item.addEventListener('click', (e) => {
      if (!isActive && !(e.target as HTMLElement).closest('button')) {
        this.handleSwitchChart(chart.id);
      }
    });

    if (!isActive) {
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
    iconEl.appendChild(createIcon('tree'));
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
    const peopleCount =
      this.latestPeopleCounts.get(chart.id) ?? flattenTree(chart.workingTree).length;
    metaEl.textContent = this.formatChartMeta(peopleCount, versionCount);
    infoEl.appendChild(metaEl);

    item.appendChild(infoEl);

    // Action buttons — only on active chart (non-active items are click-to-switch)
    if (isActive) {
      const actions = document.createElement('div');
      actions.className = 'chart-item-actions';

      const renameBtn = this.createActionButton('edit', t('chart_editor.rename'));
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRenameChart(chart);
      });
      actions.appendChild(renameBtn);

      const duplicateBtn = this.createActionButton('copy', t('chart_editor.duplicate'));
      duplicateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDuplicateChart(chart);
      });
      actions.appendChild(duplicateBtn);

      const exportBtn = this.createActionButton('export', t('chart_editor.export'));
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleExportChart(chart);
      });
      actions.appendChild(exportBtn);

      const deleteBtn = this.createActionButton('remove', t('chart_editor.delete'), true);
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDeleteChart(chart);
      });
      actions.appendChild(deleteBtn);

      item.appendChild(actions);
    }

    return item;
  }

  private formatChartMeta(peopleCount: number, versionCount: number): string {
    const vSuffix =
      versionCount === 1 ? t('chart_editor.version_suffix') : t('chart_editor.versions_suffix');
    return `${peopleCount} ${t('chart_editor.people_suffix')} · ${versionCount} ${vSuffix}`;
  }

  private updateChartMeta(chartId: string, peopleCount: number): void {
    this.latestPeopleCounts.set(chartId, peopleCount);
    if (this.refreshInProgress) {
      this.pendingPeopleCounts.set(chartId, peopleCount);
      return;
    }
    this.applyChartMetaUpdate(chartId, peopleCount);
  }

  private applyPendingChartMetaUpdates(): void {
    const pendingPeopleCounts = Array.from(this.pendingPeopleCounts);
    this.pendingPeopleCounts.clear();
    for (const [chartId, peopleCount] of pendingPeopleCounts) {
      this.applyChartMetaUpdate(chartId, peopleCount);
    }
  }

  private applyChartMetaUpdate(chartId: string, peopleCount: number): void {
    const chartItem = Array.from(
      this.chartListEl.querySelectorAll<HTMLElement>('[data-chart-id]'),
    ).find((item) => item.dataset.chartId === chartId);
    const metaEl = chartItem?.querySelector<HTMLElement>('.chart-item-meta');
    if (!metaEl) {
      if (this.isChartFilteredOut(chartId)) return;
      console.warn(`Chart row not found for working-tree save: ${chartId}`);
      return;
    }

    const versionCount = this.versionCounts.get(chartId);
    if (versionCount === undefined) {
      console.warn(`Version count not found for chart: ${chartId}`);
      return;
    }
    metaEl.textContent = this.formatChartMeta(peopleCount, versionCount);
  }

  private isChartFilteredOut(chartId: string): boolean {
    const chartName = this.chartNames.get(chartId);
    return Boolean(
      this.chartSearchTerm && chartName && !chartName.toLowerCase().includes(this.chartSearchTerm),
    );
  }

  // ── Render version list ────────────────────────────────

  private async renderVersionList(): Promise<void> {
    this.versionListEl.innerHTML = '';

    // Working tree entry (always shown)
    const workingItem = document.createElement('div');
    workingItem.className = 'version-item';
    workingItem.setAttribute('role', 'listitem');
    workingItem.setAttribute('tabindex', '0');

    const workingIcon = document.createElement('span');
    workingIcon.className = 'version-item-icon';
    workingIcon.appendChild(createIcon('edit'));
    workingItem.appendChild(workingIcon);

    const workingInfo = document.createElement('div');
    workingInfo.className = 'version-item-info';

    const workingName = document.createElement('div');
    workingName.className = 'version-item-name';
    workingName.textContent = t('chart_editor.current_chart');
    workingInfo.appendChild(workingName);

    const workingDate = document.createElement('div');
    workingDate.className = 'version-item-date';
    const editCount = this.chartStore.getEditsSinceLastVersion(this.getCurrentTree());
    workingDate.textContent =
      editCount === 0
        ? t('chart_editor.current_chart_saved')
        : tp('chart_editor.edits_since_version', editCount);
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
    const isViewing = this.viewingVersionId === version.id;
    item.className = 'version-item' + (isViewing ? ' viewing' : '');
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.versionId = version.id;

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'version-item-icon';
    iconEl.appendChild(createIcon('copy'));
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
    dateEl.textContent =
      t('chart_editor.saved_prefix') + new Date(version.createdAt).toLocaleString(getLocale());
    infoEl.appendChild(dateEl);

    item.appendChild(infoEl);

    // Action buttons (hover-reveal)
    const actions = document.createElement('div');
    actions.className = 'version-item-actions';

    const viewBtn = this.createActionButton('eye', t('chart_editor.preview'));
    viewBtn.addEventListener('click', () => this.onVersionView(version));
    actions.appendChild(viewBtn);

    const compareBtn = this.createActionButton('compare', t('chart_editor.compare'));
    compareBtn.addEventListener('click', () => this.onVersionCompare(version));
    actions.appendChild(compareBtn);

    const restoreBtn = this.createActionButton('restore', t('chart_editor.restore'));
    restoreBtn.addEventListener('click', () => this.handleRestoreVersion(version));
    actions.appendChild(restoreBtn);

    const deleteBtn = this.createActionButton('remove', t('chart_editor.delete'), true);
    deleteBtn.addEventListener('click', () => this.handleDeleteVersion(version));
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  }

  // ── Inline button helper ───────────────────────────────

  private createInlineButton(label: string, danger = false): HTMLButtonElement {
    const btn = createButton({
      className: danger ? 'btn btn-danger' : 'btn btn-secondary',
      label,
    });
    btn.style.cssText = INLINE_BTN_EXTRA;
    return btn;
  }

  private createActionButton(icon: IconName, label: string, danger = false): HTMLButtonElement {
    const btn = createButton({
      className: danger ? 'btn btn-danger' : 'btn btn-ghost',
      icon,
      ariaLabel: label,
    });
    btn.setAttribute('data-tooltip', label);
    btn.style.cssText = ACTION_BTN_STYLE;
    return btn;
  }

  async renameActiveChart(chart: ChartRecord): Promise<void> {
    await this.handleRenameChart(chart);
  }

  async duplicateActiveChart(chart: ChartRecord): Promise<void> {
    await this.handleDuplicateChart(chart);
  }

  async exportActiveChart(chart: ChartRecord): Promise<void> {
    await this.handleExportChart(chart);
  }

  async deleteActiveChart(chart: ChartRecord): Promise<void> {
    await this.handleDeleteChart(chart);
  }

  viewVersion(version: VersionRecord): void {
    this.onVersionView(version);
  }

  compareVersion(version: VersionRecord): void {
    this.onVersionCompare(version);
  }

  async restoreVersion(version: VersionRecord): Promise<void> {
    await this.handleRestoreVersion(version);
  }

  async deleteVersion(version: VersionRecord): Promise<void> {
    await this.handleDeleteVersion(version);
  }

  // ── Handlers: Charts ───────────────────────────────────

  private async handleCreateChart(): Promise<void> {
    const charts = await this.chartStore.getCharts();
    const activeId = this.chartStore.getActiveChartId();

    const result = await showCreateChartDialog({
      categoryPresets: this.categoryPresetStore?.getPresets().map((p) => p.name) ?? [],
      levelMappingPresets: this.levelPresetStore?.getPresets().map((p) => p.name) ?? [],
      charts: charts.filter((c) => c.id !== activeId).map((c) => ({ id: c.id, name: c.name })),
    });

    if (!result) return;

    const proceed = await this.onBeforeSwitch();
    if (!proceed) return;

    try {
      let categories: ColorCategory[] | undefined;
      if (result.categorySource.type === 'preset') {
        const preset = this.categoryPresetStore?.getPreset(result.categorySource.name!);
        if (preset) categories = preset.categories;
      } else if (result.categorySource.type === 'chart') {
        const sourceChart = charts.find((c) => c.id === result.categorySource.id);
        if (sourceChart) categories = structuredClone(sourceChart.categories);
      }

      let levelMappings: LevelMapping[] | undefined;
      let levelDisplayMode: LevelDisplayMode | undefined;
      if (result.levelMappingSource.type === 'preset') {
        const preset = this.levelPresetStore?.getPreset(result.levelMappingSource.name!);
        if (preset) {
          levelMappings = preset.levelMappings;
          levelDisplayMode = preset.levelDisplayMode;
        }
      } else if (result.levelMappingSource.type === 'chart') {
        const sourceChart = charts.find((c) => c.id === result.levelMappingSource.id);
        if (sourceChart) {
          levelMappings = sourceChart.levelMappings
            ? structuredClone(sourceChart.levelMappings)
            : undefined;
          levelDisplayMode = sourceChart.levelDisplayMode;
        }
      }

      const chart = await this.chartStore.createChart(
        result.name,
        categories,
        levelMappings,
        levelDisplayMode,
      );

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
      showChartExportDialog({
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

  private async handleRenameChart(chart: ChartRecord): Promise<void> {
    const newName = await showInputDialog({
      title: t('chart_editor.rename_chart_dialog_title'),
      label: t('chart_editor.new_chart_dialog_label'),
      placeholder: chart.name,
      initialValue: chart.name,
    });
    if (!newName || newName === chart.name) return;

    try {
      await this.chartStore.renameChart(chart.id, newName);
      await this.refresh();
    } catch (err) {
      this.showError(this.chartErrorEl, (err as Error).message);
    }
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
      const wasActive = chart.id === this.chartStore.getActiveChartId();
      await this.chartStore.deleteChart(chart.id);
      if (wasActive) {
        const newActive = await this.chartStore.getActiveChart();
        if (newActive) {
          this.onChartSwitch(newActive);
        }
      }
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

  private async handleRestoreVersion(version: VersionRecord): Promise<void> {
    const proceed = await showConfirmDialog({
      title: t('dialog.restore_version.title', { name: version.name }),
      message: t('dialog.restore_version.message', { name: version.name }),
      confirmLabel: t('dialog.restore_version.confirm'),
    });
    if (!proceed) return;

    try {
      const tree = await this.chartStore.restoreVersion(version.id, this.getCurrentTree());
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
