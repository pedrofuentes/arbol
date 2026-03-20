import type { OrgNode, ColorCategory } from '../types';
import type { OrgStore } from '../store/org-store';
import type { LevelStore } from '../store/level-store';
import type { CategoryStore } from '../store/category-store';
import { computeMetrics, type OrgMetrics, type ManagerAlert } from '../utils/analytics';
import { t } from '../i18n';

export interface AnalyticsEditorOptions {
  container: HTMLElement;
  orgStore: OrgStore;
  levelStore?: LevelStore;
  categoryStore?: CategoryStore;
  getFocusedTree?: () => OrgNode;
  getFocusedName?: () => string | null;
  onNodeSelect?: (nodeId: string) => void;
}

export class AnalyticsEditor {
  private container: HTMLElement;
  private options: AnalyticsEditorOptions;
  private unsubscribes: (() => void)[] = [];

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
    this.buildDetailGrid(metrics);
    this.buildDisclaimer();
  }

  destroy(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    this.container.innerHTML = '';
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
    }[] = [
      {
        accent: 'teal',
        label: t('analytics.section.headcount'),
        value: String(metrics.totalHeadcount),
        subtitle: `${metrics.managerCount} ${t('analytics.managers')} · ${metrics.icCount} ${t('analytics.ics')} · ${metrics.advisorCount} ${t('analytics.advisors')}`,
      },
      {
        accent: 'blue',
        label: t('analytics.org_depth'),
        value: String(metrics.orgDepth),
        unit: t('analytics.org_depth_value', { count: String(metrics.orgDepth) }).replace(String(metrics.orgDepth), '').trim(),
        subtitle: `${t('analytics.avg_depth')}: ${t('analytics.avg_depth_value', { value: String(metrics.avgDepth) })}`,
      },
      {
        accent: 'green',
        label: t('analytics.manager_ic_ratio'),
        value: ratio > 0 ? t('analytics.ratio_format', { value: String(ratio) }) : '—',
      },
      {
        accent: 'amber',
        label: t('analytics.section.span'),
        value: String(metrics.spanOfControl.avg),
        subtitle: `${t('analytics.span_min')}: ${metrics.spanOfControl.min} · ${t('analytics.span_max')}: ${metrics.spanOfControl.max}`,
      },
      {
        accent: 'rose',
        label: t('analytics.alerts_count', { count: String(totalAlerts) }),
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

  private buildDetailGrid(metrics: OrgMetrics): void {
    const grid = document.createElement('div');
    grid.className = 'analytics-detail-grid';

    this.buildSpanSection(grid, metrics, 0);
    this.buildLayerSection(grid, metrics, 1);
    this.buildLevelSection(grid, metrics, 2);
    this.buildCategorySection(grid, metrics, 3);

    this.container.appendChild(grid);
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
      const sorted = [...metrics.levelDistribution.entries()].sort((a, b) => b[1] - a[1]);
      const maxCount = Math.max(...sorted.map(([, c]) => c), 1);

      for (const [level, count] of sorted) {
        const row = document.createElement('div');
        row.className = 'analytics-dist-row';

        const label = document.createElement('span');
        label.className = 'analytics-dist-label';
        label.textContent = level;
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
        fill.style.background = 'var(--accent)';
        bar.appendChild(fill);
        row.appendChild(bar);

        section.appendChild(row);
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
}
