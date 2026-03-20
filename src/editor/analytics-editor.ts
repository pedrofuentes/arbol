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

const SECTION_STYLE = 'margin-bottom:16px;';
const HEADING_STYLE =
  'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-weight:700;';
const STAT_ROW_STYLE =
  'display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px;color:var(--text-secondary);';
const BIG_NUMBER_STYLE =
  'font-size:28px;font-weight:700;color:var(--text-primary);line-height:1.1;';
const ALERT_BTN_STYLE =
  'background:none;border:none;padding:2px 0;font-size:12px;color:var(--accent);cursor:pointer;text-align:left;font-family:inherit;text-decoration:underline;';
const BAR_BG_STYLE =
  'flex:1;height:8px;background:var(--bg-base);border-radius:4px;overflow:hidden;margin-left:8px;';
const BAR_FILL_STYLE =
  'height:100%;background:var(--accent);border-radius:4px;transition:width 150ms ease;';
const SWATCH_STYLE =
  'display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:middle;';

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

    this.buildHeader(focusedName);
    this.buildHeadcountSection(metrics);
    this.buildStructureSection(metrics);
    this.buildSpanSection(metrics);
    this.buildLevelSection(metrics);
    this.buildCategorySection(metrics);
  }

  destroy(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    this.container.innerHTML = '';
  }

  // ─── Section builders ─────────────────────────────────────────────

  private buildHeader(focusedName: string | null): void {
    const heading = document.createElement('h3');
    heading.style.cssText =
      'margin:0 0 12px;font-size:15px;font-weight:700;color:var(--text-primary);';
    heading.textContent = t('analytics.title');
    this.container.appendChild(heading);

    if (focusedName) {
      const note = document.createElement('p');
      note.style.cssText =
        'margin:0 0 12px;font-size:12px;color:var(--text-secondary);font-style:italic;';
      note.textContent = t('analytics.focus_note', { name: focusedName });
      this.container.appendChild(note);
    }
  }

  private buildHeadcountSection(metrics: OrgMetrics): void {
    const section = this.createSection(t('analytics.section.headcount'));

    const big = document.createElement('div');
    big.style.cssText = BIG_NUMBER_STYLE;
    big.textContent = t('analytics.people', { count: String(metrics.totalHeadcount) });
    section.appendChild(big);

    const spacer = document.createElement('div');
    spacer.style.cssText = 'height:8px;';
    section.appendChild(spacer);

    this.addStatRow(section, t('analytics.managers'), String(metrics.managerCount));
    this.addStatRow(section, t('analytics.ics'), String(metrics.icCount));
    this.addStatRow(section, t('analytics.advisors'), String(metrics.advisorCount));

    if (metrics.managerToIcRatio > 0) {
      const inverted = Math.round((1 / metrics.managerToIcRatio) * 10) / 10;
      this.addStatRow(
        section,
        t('analytics.manager_ic_ratio'),
        t('analytics.ratio_format', { value: String(inverted) }),
      );
    }

    this.container.appendChild(section);
  }

  private buildStructureSection(metrics: OrgMetrics): void {
    const section = this.createSection(t('analytics.section.structure'));

    this.addStatRow(
      section,
      t('analytics.org_depth'),
      t('analytics.org_depth_value', { count: String(metrics.orgDepth) }),
    );
    this.addStatRow(
      section,
      t('analytics.avg_depth'),
      t('analytics.avg_depth_value', { value: String(metrics.avgDepth) }),
    );

    // Layer headcount bars
    const barLabel = document.createElement('div');
    barLabel.style.cssText =
      'font-size:11px;color:var(--text-tertiary);margin-top:8px;margin-bottom:4px;font-weight:600;';
    barLabel.textContent = t('analytics.layer_headcount');
    section.appendChild(barLabel);

    const maxCount = Math.max(...metrics.layerCounts, 1);
    for (let i = 0; i < metrics.layerCounts.length; i++) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;padding:2px 0;font-size:12px;';

      const label = document.createElement('span');
      label.style.cssText = 'width:28px;color:var(--text-tertiary);font-size:11px;';
      label.textContent = t('analytics.layer_n', { n: String(i) });
      row.appendChild(label);

      const barBg = document.createElement('div');
      barBg.style.cssText = BAR_BG_STYLE;
      const barFill = document.createElement('div');
      barFill.style.cssText = BAR_FILL_STYLE;
      barFill.style.width = `${(metrics.layerCounts[i] / maxCount) * 100}%`;
      barBg.appendChild(barFill);
      row.appendChild(barBg);

      const count = document.createElement('span');
      count.style.cssText = 'width:28px;text-align:right;color:var(--text-secondary);font-size:11px;margin-left:6px;';
      count.textContent = String(metrics.layerCounts[i]);
      row.appendChild(count);

      section.appendChild(row);
    }

    this.container.appendChild(section);
  }

  private buildSpanSection(metrics: OrgMetrics): void {
    const section = this.createSection(t('analytics.section.span'));

    const avg = metrics.spanOfControl.avg;
    const color = this.spanColor(avg);

    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px;';

    this.addGridStat(statsGrid, t('analytics.span_avg'), String(avg), color);
    this.addGridStat(statsGrid, t('analytics.span_min'), String(metrics.spanOfControl.min));
    this.addGridStat(statsGrid, t('analytics.span_max'), String(metrics.spanOfControl.max));
    this.addGridStat(statsGrid, t('analytics.span_median'), String(metrics.spanOfControl.median));
    section.appendChild(statsGrid);

    // Alerts
    const wideThreshold = 10;
    const narrowThreshold = 3;

    if (
      metrics.wideSpanManagers.length === 0 &&
      metrics.narrowSpanManagers.length === 0 &&
      metrics.singleChildManagers.length === 0
    ) {
      const noAlerts = document.createElement('div');
      noAlerts.style.cssText = 'font-size:12px;color:var(--text-tertiary);font-style:italic;';
      noAlerts.textContent = t('analytics.no_alerts');
      section.appendChild(noAlerts);
    } else {
      if (metrics.wideSpanManagers.length > 0) {
        this.addAlertGroup(
          section,
          t('analytics.wide_span_title', { threshold: String(wideThreshold) }),
          t('analytics.wide_span_desc', {
            count: String(metrics.wideSpanManagers.length),
            threshold: String(wideThreshold),
          }),
          metrics.wideSpanManagers,
        );
      }
      if (metrics.narrowSpanManagers.length > 0) {
        this.addAlertGroup(
          section,
          t('analytics.narrow_span_title', { threshold: String(narrowThreshold) }),
          t('analytics.narrow_span_desc', {
            count: String(metrics.narrowSpanManagers.length),
            threshold: String(narrowThreshold),
          }),
          metrics.narrowSpanManagers,
        );
      }
      if (metrics.singleChildManagers.length > 0) {
        this.addAlertGroup(
          section,
          t('analytics.single_child_title'),
          t('analytics.single_child_desc', {
            count: String(metrics.singleChildManagers.length),
          }),
          metrics.singleChildManagers,
        );
      }
    }

    this.container.appendChild(section);
  }

  private buildLevelSection(metrics: OrgMetrics): void {
    const section = this.createSection(t('analytics.section.levels'));

    if (metrics.levelDistribution.size === 0 && metrics.nodesWithoutLevel > 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--text-tertiary);font-style:italic;';
      empty.textContent = t('analytics.no_levels');
      section.appendChild(empty);
    } else {
      const sorted = [...metrics.levelDistribution.entries()].sort((a, b) => b[1] - a[1]);
      for (const [level, count] of sorted) {
        this.addStatRow(section, level, String(count));
      }
      if (metrics.nodesWithoutLevel > 0) {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:12px;color:var(--text-tertiary);margin-top:4px;';
        note.textContent = t('analytics.nodes_without_level', {
          count: String(metrics.nodesWithoutLevel),
        });
        section.appendChild(note);
      }
    }

    this.container.appendChild(section);
  }

  private buildCategorySection(metrics: OrgMetrics): void {
    const section = this.createSection(t('analytics.section.categories'));
    const categories = this.options.categoryStore?.getAll() ?? [];

    if (metrics.categoryDistribution.size === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--text-tertiary);font-style:italic;';
      empty.textContent = t('analytics.no_categories');
      section.appendChild(empty);
    } else {
      const sorted = [...metrics.categoryDistribution.entries()].sort((a, b) => b[1] - a[1]);
      for (const [catId, count] of sorted) {
        const cat = categories.find(c => c.id === catId);
        const row = document.createElement('div');
        row.style.cssText = STAT_ROW_STYLE;

        const labelWrap = document.createElement('span');
        if (cat) {
          const swatch = document.createElement('span');
          swatch.style.cssText = SWATCH_STYLE;
          swatch.style.backgroundColor = cat.color;
          labelWrap.appendChild(swatch);
        }
        const labelText = document.createTextNode(cat?.label ?? catId);
        labelWrap.appendChild(labelText);
        row.appendChild(labelWrap);

        const value = document.createElement('span');
        value.style.cssText = 'font-weight:600;color:var(--text-primary);';
        value.textContent = String(count);
        row.appendChild(value);

        section.appendChild(row);
      }
    }

    if (metrics.uncategorizedCount > 0) {
      this.addStatRow(section, t('analytics.uncategorized'), String(metrics.uncategorizedCount));
    }

    this.container.appendChild(section);
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.style.cssText = SECTION_STYLE;

    const heading = document.createElement('h4');
    heading.style.cssText = HEADING_STYLE;
    heading.textContent = title;
    section.appendChild(heading);

    return section;
  }

  private addStatRow(parent: HTMLElement, label: string, value: string): void {
    const row = document.createElement('div');
    row.style.cssText = STAT_ROW_STYLE;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.style.cssText = 'font-weight:600;color:var(--text-primary);';
    valueEl.textContent = value;
    row.appendChild(valueEl);

    parent.appendChild(row);
  }

  private addGridStat(
    grid: HTMLElement,
    label: string,
    value: string,
    color?: string,
  ): void {
    const cell = document.createElement('div');
    cell.style.cssText = 'padding:4px 0;';

    const valEl = document.createElement('div');
    valEl.style.cssText = `font-size:18px;font-weight:700;color:${color ?? 'var(--text-primary)'};`;
    valEl.textContent = value;
    cell.appendChild(valEl);

    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
    labelEl.textContent = label;
    cell.appendChild(labelEl);

    grid.appendChild(cell);
  }

  private spanColor(avg: number): string {
    if (avg >= 5 && avg <= 8) return 'var(--color-green, #22c55e)';
    if ((avg >= 3 && avg < 5) || (avg > 8 && avg <= 10)) return 'var(--color-yellow, #eab308)';
    return 'var(--color-red, #ef4444)';
  }

  private addAlertGroup(
    parent: HTMLElement,
    title: string,
    description: string,
    alerts: ManagerAlert[],
  ): void {
    const group = document.createElement('div');
    group.style.cssText = 'margin-top:8px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);';
    heading.textContent = title;
    group.appendChild(heading);

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-bottom:4px;';
    desc.textContent = description;
    group.appendChild(desc);

    for (const alert of alerts) {
      const btn = document.createElement('button');
      btn.style.cssText = ALERT_BTN_STYLE;
      btn.dataset.nodeId = alert.id;
      btn.textContent = `${alert.name} — ${t('analytics.span_direct_reports', {
        count: String(alert.directReports),
      })}`;
      btn.addEventListener('click', () => {
        this.options.onNodeSelect?.(alert.id);
      });
      group.appendChild(btn);
      group.appendChild(document.createElement('br'));
    }

    parent.appendChild(group);
  }
}
