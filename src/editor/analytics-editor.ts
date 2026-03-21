import type { OrgNode, ColorCategory } from '../types';
import type { OrgStore } from '../store/org-store';
import type { LevelStore } from '../store/level-store';
import type { CategoryStore } from '../store/category-store';
import { computeMetrics, type OrgMetrics, type ManagerAlert } from '../utils/analytics';
import { t } from '../i18n';
import { SunburstChart } from '../analytics/sunburst-chart';
import { SpanChart } from '../analytics/span-chart';
import { TreemapChart } from '../analytics/treemap-chart';

export interface AnalyticsEditorOptions {
  container: HTMLElement;
  orgStore: OrgStore;
  levelStore?: LevelStore;
  categoryStore?: CategoryStore;
  getFocusedTree?: () => OrgNode;
  getFocusedName?: () => string | null;
  onNodeSelect?: (nodeId: string) => void;
}

type VizTabId = 'overview' | 'sunburst' | 'span-chart' | 'treemap';

export class AnalyticsEditor {
  private container: HTMLElement;
  private options: AnalyticsEditorOptions;
  private unsubscribes: (() => void)[] = [];
  private groupLevels = true;

  private activeVizTab: VizTabId = 'overview';
  private sunburstChart: SunburstChart | null = null;
  private spanChart: SpanChart | null = null;
  private treemapChart: TreemapChart | null = null;
  private vizTabButtons: Map<VizTabId, HTMLButtonElement> = new Map();
  private vizTabPanels: Map<VizTabId, HTMLDivElement> = new Map();

  constructor(options: AnalyticsEditorOptions) {
    this.container = options.container;
    this.options = options;

    this.unsubscribes.push(options.orgStore.onChange(() => this.refresh()));
    if (options.levelStore) {
      this.unsubscribes.push(options.levelStore.onChange(() => this.refresh()));
    }
    if (options.categoryStore) {
      this.unsubscribes.push(options.categoryStore.onChange(() => this.refresh()));
    }

    this.refresh();
  }

  refresh(): void {
    this.container.innerHTML = '';
    this.vizTabButtons.clear();
    this.vizTabPanels.clear();

    const tree = this.options.getFocusedTree
      ? this.options.getFocusedTree()
      : this.options.orgStore.getTree();

    const focusedName = this.options.getFocusedName?.() ?? null;

    const metrics = computeMetrics(tree, {
      resolveLevel: this.options.levelStore
        ? (raw: string) => this.options.levelStore!.resolve(raw)
        : undefined,
      categories: this.options.categoryStore?.getAll(),
    });

    if (focusedName) {
      this.buildFocusBanner(focusedName);
    }
    this.buildKPIStrip(metrics);
    this.buildVizTabs(tree, metrics);
    this.buildDisclaimer();
  }

  destroy(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    this.sunburstChart?.destroy();
    this.spanChart?.destroy();
    this.treemapChart?.destroy();
    this.sunburstChart = null;
    this.spanChart = null;
    this.treemapChart = null;
    this.vizTabButtons.clear();
    this.vizTabPanels.clear();
    this.container.innerHTML = '';
  }

  // ─── Visualization Sub-tabs ─────────────────────────────────────────

  private buildVizTabs(tree: OrgNode, metrics: OrgMetrics): void {
    const categories = this.options.categoryStore?.getAll() ?? [];

    // Tab bar
    const nav = document.createElement('nav');
    nav.className = 'analytics-viz-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', t('analytics.tab.aria'));

    const tabs: { id: VizTabId; label: string }[] = [
      { id: 'overview', label: t('analytics.tab.overview') },
      { id: 'sunburst', label: t('analytics.tab.sunburst') },
      { id: 'span-chart', label: t('analytics.tab.span_chart') },
      { id: 'treemap', label: t('analytics.tab.treemap') },
    ];

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = 'analytics-viz-tab-btn';
      btn.id = `analytics-tab-${tab.id}`;
      btn.textContent = tab.label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-controls', `analytics-panel-${tab.id}`);
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('click', () => this.activateVizTab(tab.id, tree, categories));
      nav.appendChild(btn);
      this.vizTabButtons.set(tab.id, btn);
    }

    // Arrow key navigation (roving tabindex)
    nav.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const tabIds = tabs.map(t => t.id);
      const currentIdx = tabIds.indexOf(this.activeVizTab);
      if (currentIdx === -1) return;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (currentIdx + dir + tabIds.length) % tabIds.length;
      this.activateVizTab(tabIds[nextIdx], tree, categories);
      this.vizTabButtons.get(tabIds[nextIdx])?.focus();
    });

    this.container.appendChild(nav);

    // Panels
    for (const tab of tabs) {
      const panel = document.createElement('div');
      panel.className = 'analytics-viz-panel';
      panel.id = `analytics-panel-${tab.id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `analytics-tab-${tab.id}`);
      panel.style.display = 'none';
      this.container.appendChild(panel);
      this.vizTabPanels.set(tab.id, panel);
    }

    // Fill overview panel with existing detail grid
    const overviewPanel = this.vizTabPanels.get('overview');
    if (overviewPanel) {
      this.buildDetailGrid(metrics, overviewPanel);
    }

    // Activate the current tab
    this.activateVizTab(this.activeVizTab, tree, categories);
  }

  private activateVizTab(tabId: VizTabId, tree: OrgNode, categories: ColorCategory[]): void {
    this.activeVizTab = tabId;

    // Toggle panel visibility
    for (const [id, panel] of this.vizTabPanels) {
      panel.style.display = id === tabId ? 'block' : 'none';
    }

    // Toggle button states
    for (const [id, btn] of this.vizTabButtons) {
      const isActive = id === tabId;
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
      if (isActive) {
        btn.classList.add('analytics-viz-tab-btn-active');
      } else {
        btn.classList.remove('analytics-viz-tab-btn-active');
      }
    }

    // Lazy-initialize chart on the active panel
    const panel = this.vizTabPanels.get(tabId);
    if (!panel) return;

    if (tabId === 'sunburst') {
      if (!this.sunburstChart) {
        this.sunburstChart = new SunburstChart(panel);
      }
      this.sunburstChart.render(tree, categories);
    } else if (tabId === 'span-chart') {
      if (!this.spanChart) {
        const idealRange = this.loadIdealRange();
        this.spanChart = new SpanChart(panel, {
          onNodeSelect: this.options.onNodeSelect,
          idealMin: idealRange.min,
          idealMax: idealRange.max,
          onIdealRangeChange: (min, max) => this.saveIdealRange(min, max),
        });
      }
      this.spanChart.render(tree, categories);
    } else if (tabId === 'treemap') {
      if (!this.treemapChart) {
        this.treemapChart = new TreemapChart(panel);
      }
      this.treemapChart.render(tree, categories);
    }
  }

  // ─── KPI Strip ──────────────────────────────────────────────────────

  private buildFocusBanner(name: string): void {
    const banner = document.createElement('div');
    banner.className = 'analytics-focus-banner';
    banner.textContent = t('analytics.focus_note', { name });
    this.container.appendChild(banner);
  }

  private buildKPIStrip(metrics: OrgMetrics): void {
    const strip = document.createElement('div');
    strip.className = 'analytics-kpi-strip';

    const totalAlerts =
      metrics.wideSpanManagers.length +
      metrics.narrowSpanManagers.length +
      metrics.singleChildManagers.length;

    const ratio =
      metrics.managerToIcRatio > 0
        ? Math.round((1 / metrics.managerToIcRatio) * 10) / 10
        : 0;

    const cards: {
      accent: string;
      label: string;
      value: string;
      unit?: string;
      subtitle?: string;
      tooltip?: string;
    }[] = [
      {
        accent: 'teal',
        label: t('analytics.section.headcount'),
        value: String(metrics.totalHeadcount),
        tooltip: t('analytics.tooltip.headcount'),
        subtitle: `${metrics.managerCount} ${t('analytics.managers')} · ${metrics.icCount} ${t('analytics.ics')} · ${metrics.advisorCount} ${t('analytics.advisors')}`,
      },
      {
        accent: 'blue',
        label: t('analytics.org_depth'),
        tooltip: t('analytics.tooltip.org_depth'),
        value: String(metrics.orgDepth),
        unit: t('analytics.org_depth_value', { count: String(metrics.orgDepth) }).replace(String(metrics.orgDepth), '').trim(),
        subtitle: `${t('analytics.avg_depth')}: ${t('analytics.avg_depth_value', { value: String(metrics.avgDepth) })}`,
      },
      {
        accent: 'green',
        label: t('analytics.manager_ic_ratio'),
        tooltip: t('analytics.tooltip.ratio'),
        value: ratio > 0 ? t('analytics.ratio_format', { value: String(ratio) }) : '—',
      },
      {
        accent: 'amber',
        label: t('analytics.section.span'),
        tooltip: t('analytics.tooltip.span'),
        value: String(metrics.spanOfControl.avg),
        subtitle: `${t('analytics.span_min')}: ${metrics.spanOfControl.min} · ${t('analytics.span_max')}: ${metrics.spanOfControl.max}`,
      },
      {
        accent: 'rose',
        label: t('analytics.alerts_count', { count: String(totalAlerts) }),
        tooltip: t('analytics.tooltip.alerts'),
        value: String(totalAlerts),
      },
    ];

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'analytics-kpi-card';
      el.setAttribute('data-accent', card.accent);
      el.style.animationDelay = `${i * 50}ms`;

      const label = document.createElement('div');
      label.className = 'analytics-kpi-label';
      label.textContent = card.label;
      if (card.tooltip) {
        const info = document.createElement('span');
        info.className = 'analytics-kpi-info';
        info.textContent = 'ℹ️';
        info.setAttribute('title', card.tooltip);
        info.setAttribute('role', 'img');
        info.setAttribute('aria-label', card.tooltip);
        label.appendChild(info);
      }
      el.appendChild(label);

      const valueRow = document.createElement('div');
      const valueEl = document.createElement('span');
      valueEl.className = 'analytics-kpi-value';
      valueEl.textContent = card.value;
      valueRow.appendChild(valueEl);

      if (card.unit) {
        const unitEl = document.createElement('span');
        unitEl.className = 'analytics-kpi-unit';
        unitEl.textContent = card.unit;
        valueRow.appendChild(unitEl);
      }
      el.appendChild(valueRow);

      if (card.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'analytics-kpi-subtitle';
        sub.textContent = card.subtitle;
        el.appendChild(sub);
      }

      strip.appendChild(el);
    });

    this.container.appendChild(strip);
  }

  // ─── Detail Grid ────────────────────────────────────────────────────

  private buildDetailGrid(metrics: OrgMetrics, target?: HTMLElement): void {
    const container = target ?? this.container;
    const grid = document.createElement('div');
    grid.className = 'analytics-detail-grid';

    this.buildSpanSection(grid, metrics, 0);
    this.buildLayerSection(grid, metrics, 1);
    this.buildLevelSection(grid, metrics, 2);
    this.buildCategorySection(grid, metrics, 3);

    container.appendChild(grid);
  }

  private buildSpanSection(grid: HTMLElement, metrics: OrgMetrics, index: number): void {
    const section = this.createDetailSection(t('analytics.section.span'), index);

    // Stat row
    const stats = document.createElement('div');
    stats.className = 'analytics-span-stats';

    const statItems = [
      { label: t('analytics.span_avg'), value: metrics.spanOfControl.avg },
      { label: t('analytics.span_min'), value: metrics.spanOfControl.min },
      { label: t('analytics.span_max'), value: metrics.spanOfControl.max },
      { label: t('analytics.span_median'), value: metrics.spanOfControl.median },
    ];

    for (const item of statItems) {
      const stat = document.createElement('div');
      stat.className = 'analytics-span-stat';

      const labelEl = document.createElement('div');
      labelEl.className = 'analytics-span-stat-label';
      labelEl.textContent = item.label;
      stat.appendChild(labelEl);

      const valueEl = document.createElement('div');
      valueEl.className = 'analytics-span-stat-value';
      valueEl.setAttribute('data-health', this.spanHealth(item.value));
      valueEl.textContent = String(item.value);
      stat.appendChild(valueEl);

      stats.appendChild(stat);
    }
    section.appendChild(stats);

    // Alerts
    const allAlerts: { alert: ManagerAlert; severity: string }[] = [
      ...metrics.wideSpanManagers.map(a => ({ alert: a, severity: 'high' })),
      ...metrics.narrowSpanManagers.map(a => ({ alert: a, severity: 'medium' })),
      ...metrics.singleChildManagers.map(a => ({ alert: a, severity: 'medium' })),
    ];

    if (allAlerts.length === 0) {
      const noAlerts = document.createElement('div');
      noAlerts.className = 'analytics-kpi-subtitle';
      noAlerts.textContent = t('analytics.no_alerts');
      section.appendChild(noAlerts);
    } else {
      const list = document.createElement('div');
      list.className = 'analytics-alert-list';

      for (const { alert, severity } of allAlerts) {
        const item = document.createElement('div');
        item.className = 'analytics-alert-item';

        const dot = document.createElement('span');
        dot.className = 'analytics-alert-dot';
        dot.setAttribute('data-severity', severity);
        item.appendChild(dot);

        const btn = document.createElement('button');
        btn.className = 'analytics-alert-name';
        btn.textContent = alert.name;
        btn.addEventListener('click', () => {
          this.options.onNodeSelect?.(alert.id);
        });
        item.appendChild(btn);

        const detail = document.createElement('span');
        detail.className = 'analytics-alert-detail';
        detail.textContent = t('analytics.span_direct_reports', {
          count: String(alert.directReports),
        });
        item.appendChild(detail);

        list.appendChild(item);
      }
      section.appendChild(list);
    }

    grid.appendChild(section);
  }

  private buildLayerSection(grid: HTMLElement, metrics: OrgMetrics, index: number): void {
    const section = this.createDetailSection(t('analytics.layer_headcount'), index);

    const maxCount = Math.max(...metrics.layerCounts, 1);
    for (let i = 0; i < metrics.layerCounts.length; i++) {
      const row = document.createElement('div');
      row.className = 'analytics-bar-row';

      const label = document.createElement('span');
      label.className = 'analytics-bar-label';
      label.textContent = t('analytics.layer_n', { n: String(i) });
      row.appendChild(label);

      const track = document.createElement('div');
      track.className = 'analytics-bar-track';

      const fill = document.createElement('div');
      fill.className = 'analytics-bar-fill';
      fill.style.width = `${(metrics.layerCounts[i] / maxCount) * 100}%`;

      const count = document.createElement('span');
      count.className = 'analytics-bar-count';
      count.textContent = String(metrics.layerCounts[i]);
      fill.appendChild(count);

      track.appendChild(fill);
      row.appendChild(track);
      section.appendChild(row);
    }

    grid.appendChild(section);
  }

  private buildLevelSection(grid: HTMLElement, metrics: OrgMetrics, index: number): void {
    const section = this.createDetailSection(t('analytics.section.levels'), index);

    if (metrics.levelDistribution.size === 0 && metrics.nodesWithoutLevel > 0) {
      const empty = document.createElement('div');
      empty.className = 'analytics-kpi-subtitle';
      empty.textContent = t('analytics.no_levels');
      section.appendChild(empty);
    } else {
      const sorted = [...metrics.levelDistribution.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      const maxCount = Math.max(...sorted.map(([, c]) => c), 1);

      const levelStore = this.options.levelStore;
      const hasMappings = levelStore && levelStore.getMappings().length > 0;

      // Toggle button (only shown when mappings exist)
      if (hasMappings) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'analytics-alert-name';
        toggleBtn.style.cssText = 'font-size:10px;margin-bottom:8px;display:block;';
        toggleBtn.textContent = this.groupLevels ? t('analytics.show_individual') : t('analytics.group_by_band');
        toggleBtn.addEventListener('click', () => {
          this.groupLevels = !this.groupLevels;
          this.refresh();
        });
        section.appendChild(toggleBtn);
      }

      if (hasMappings && this.groupLevels) {
        const bands = new Map<string, { levels: string[]; total: number }>();
        const unmapped: [string, number][] = [];

        for (const [rawLevel, count] of sorted) {
          const mapping = levelStore!.getMapping(rawLevel);
          if (mapping) {
            const band = bands.get(mapping.displayTitle) ?? { levels: [], total: 0 };
            band.levels.push(rawLevel);
            band.total += count;
            bands.set(mapping.displayTitle, band);
          } else {
            unmapped.push([rawLevel, count]);
          }
        }

        const sortedBands = [...bands.entries()].sort((a, b) => b[1].total - a[1].total);
        const bandMax = Math.max(...sortedBands.map(([, b]) => b.total), ...unmapped.map(([, c]) => c), 1);

        for (const [title, band] of sortedBands) {
          const row = document.createElement('div');
          row.className = 'analytics-dist-row';

          const label = document.createElement('span');
          label.className = 'analytics-dist-label';
          label.style.fontWeight = '600';
          label.textContent = `${title} (${band.levels.join(', ')})`;
          row.appendChild(label);

          const countEl = document.createElement('span');
          countEl.className = 'analytics-dist-count';
          countEl.textContent = String(band.total);
          row.appendChild(countEl);

          const bar = document.createElement('div');
          bar.className = 'analytics-dist-bar';
          const fill = document.createElement('div');
          fill.className = 'analytics-dist-bar-fill';
          fill.style.width = `${(band.total / bandMax) * 100}%`;
          fill.style.background = 'var(--accent)';
          bar.appendChild(fill);
          row.appendChild(bar);

          section.appendChild(row);
        }

        for (const [rawLevel, count] of unmapped) {
          this.appendDistRow(section, rawLevel, count, bandMax, 'var(--text-tertiary)');
        }
      } else {
        for (const [level, count] of sorted) {
          this.appendDistRow(section, level, count, maxCount, 'var(--accent)');
        }
      }

      if (metrics.nodesWithoutLevel > 0) {
        const note = document.createElement('div');
        note.className = 'analytics-kpi-subtitle';
        note.textContent = t('analytics.nodes_without_level', {
          count: String(metrics.nodesWithoutLevel),
        });
        section.appendChild(note);
      }
    }

    grid.appendChild(section);
  }

  private appendDistRow(section: HTMLElement, label: string, count: number, maxCount: number, color: string): void {
    const row = document.createElement('div');
    row.className = 'analytics-dist-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'analytics-dist-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const countEl = document.createElement('span');
    countEl.className = 'analytics-dist-count';
    countEl.textContent = String(count);
    row.appendChild(countEl);

    const bar = document.createElement('div');
    bar.className = 'analytics-dist-bar';
    const fill = document.createElement('div');
    fill.className = 'analytics-dist-bar-fill';
    fill.style.width = `${(count / maxCount) * 100}%`;
    fill.style.background = color;
    bar.appendChild(fill);
    row.appendChild(bar);

    section.appendChild(row);
  }

  private buildCategorySection(grid: HTMLElement, metrics: OrgMetrics, index: number): void {
    const section = this.createDetailSection(t('analytics.section.categories'), index);
    const categories = this.options.categoryStore?.getAll() ?? [];

    if (metrics.categoryDistribution.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'analytics-kpi-subtitle';
      empty.textContent = t('analytics.no_categories');
      section.appendChild(empty);
    } else {
      const sorted = [...metrics.categoryDistribution.entries()].sort((a, b) => b[1] - a[1]);
      const maxCount = Math.max(...sorted.map(([, c]) => c), 1);

      for (const [catId, count] of sorted) {
        const cat = categories.find(c => c.id === catId);
        const row = document.createElement('div');
        row.className = 'analytics-dist-row';

        if (cat) {
          const swatch = document.createElement('span');
          swatch.className = 'analytics-dist-swatch';
          swatch.style.backgroundColor = cat.color;
          row.appendChild(swatch);
        }

        const label = document.createElement('span');
        label.className = 'analytics-dist-label';
        label.textContent = cat?.label ?? catId;
        row.appendChild(label);

        const countEl = document.createElement('span');
        countEl.className = 'analytics-dist-count';
        countEl.textContent = String(count);
        row.appendChild(countEl);

        const bar = document.createElement('div');
        bar.className = 'analytics-dist-bar';
        const fill = document.createElement('div');
        fill.className = 'analytics-dist-bar-fill';
        fill.style.width = `${(count / maxCount) * 100}%`;
        fill.style.background = cat?.color ?? 'var(--accent)';
        bar.appendChild(fill);
        row.appendChild(bar);

        section.appendChild(row);
      }
    }

    if (metrics.uncategorizedCount > 0) {
      const row = document.createElement('div');
      row.className = 'analytics-dist-row';
      const label = document.createElement('span');
      label.className = 'analytics-dist-label';
      label.textContent = t('analytics.uncategorized');
      row.appendChild(label);
      const countEl = document.createElement('span');
      countEl.className = 'analytics-dist-count';
      countEl.textContent = String(metrics.uncategorizedCount);
      row.appendChild(countEl);
      section.appendChild(row);
    }

    grid.appendChild(section);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private buildDisclaimer(): void {
    const disclaimer = document.createElement('p');
    disclaimer.className = 'analytics-disclaimer';
    disclaimer.textContent = t('analytics.disclaimer');
    this.container.appendChild(disclaimer);
  }

  private createDetailSection(title: string, index: number): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'analytics-detail-section';
    section.style.animationDelay = `${(index + 5) * 50}ms`;

    const heading = document.createElement('div');
    heading.className = 'analytics-detail-heading';
    heading.textContent = title;
    section.appendChild(heading);

    return section;
  }

  private spanHealth(value: number): string {
    if (value >= 5 && value <= 8) return 'healthy';
    if ((value >= 3 && value < 5) || (value > 8 && value <= 10)) return 'caution';
    return 'danger';
  }

  private loadIdealRange(): { min: number; max: number } {
    try {
      const raw = localStorage.getItem('arbol-span-ideal-range');
      if (raw) {
        const parsed = JSON.parse(raw) as { min: number; max: number };
        if (typeof parsed.min === 'number' && typeof parsed.max === 'number' && parsed.min < parsed.max) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return { min: 4, max: 8 };
  }

  private saveIdealRange(min: number, max: number): void {
    try {
      localStorage.setItem('arbol-span-ideal-range', JSON.stringify({ min, max }));
    } catch {
      // Ignore storage errors
    }
  }
}
