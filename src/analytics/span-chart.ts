import { select, scaleBand, scaleLinear, axisBottom, axisLeft, max } from 'd3';
import { t } from '../i18n';
import type { OrgNode, ColorCategory } from '../types';

export interface SpanChartOptions {
  onNodeSelect?: (nodeId: string) => void;
  idealMin?: number;
  idealMax?: number;
  onIdealRangeChange?: (min: number, max: number) => void;
}

interface ManagerInfo {
  id: string;
  name: string;
  title: string;
  span: number;
  categoryId?: string;
}

interface DataPoint {
  span: number;
  count: number;
}

interface HealthZone {
  start: number;
  end: number;
  color: string;
}

function getZoneColor(span: number, idealMin: number, idealMax: number): string {
  if (span >= idealMin && span <= idealMax) return '#10b981';
  if (span === idealMin - 1 || (span >= idealMax + 1 && span <= idealMax + 2)) return '#f59e0b';
  return '#ef4444';
}

function collectManagers(node: OrgNode): ManagerInfo[] {
  const result: ManagerInfo[] = [];
  const walk = (n: OrgNode): void => {
    if (n.children && n.children.length > 0) {
      result.push({
        id: n.id,
        name: n.name,
        title: n.title,
        span: n.children.length,
        categoryId: n.categoryId,
      });
      for (const child of n.children) {
        walk(child);
      }
    }
  };
  walk(node);
  return result;
}

function buildDistribution(managers: ManagerInfo[]): Map<number, number> {
  const dist = new Map<number, number>();
  for (const m of managers) {
    dist.set(m.span, (dist.get(m.span) ?? 0) + 1);
  }
  return dist;
}

function computeStats(managers: ManagerInfo[]): {
  total: number; avg: number; median: number; min: number; max: number;
} {
  const spans = managers.map(m => m.span).sort((a, b) => a - b);
  const total = spans.length;
  const sum = spans.reduce((acc, s) => acc + s, 0);
  const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
  const mid = Math.floor(total / 2);
  const median = total > 0
    ? total % 2 === 0
      ? Math.round(((spans[mid - 1] + spans[mid]) / 2) * 10) / 10
      : spans[mid]
    : 0;
  return {
    total,
    avg,
    median,
    min: spans[0] ?? 0,
    max: spans[spans.length - 1] ?? 0,
  };
}

function buildHealthZones(maxSpan: number, idealMin: number, idealMax: number): HealthZone[] {
  const zones: HealthZone[] = [];
  const alertLow = idealMin - 2;
  const watchLow = idealMin - 1;
  const watchHighStart = idealMax + 1;
  const watchHighEnd = idealMax + 2;

  // Alert low (1 to idealMin-2)
  if (alertLow >= 1 && maxSpan >= 1) {
    zones.push({ start: 1, end: Math.min(alertLow, maxSpan), color: '#ef4444' });
  }
  // Watch low (idealMin-1)
  if (watchLow >= 1 && maxSpan >= watchLow) {
    zones.push({ start: watchLow, end: Math.min(watchLow, maxSpan), color: '#f59e0b' });
  }
  // Healthy (idealMin to idealMax)
  if (maxSpan >= idealMin) {
    zones.push({ start: idealMin, end: Math.min(idealMax, maxSpan), color: '#10b981' });
  }
  // Watch high (idealMax+1 to idealMax+2)
  if (maxSpan >= watchHighStart) {
    zones.push({ start: watchHighStart, end: Math.min(watchHighEnd, maxSpan), color: '#f59e0b' });
  }
  // Alert high (idealMax+3+)
  if (maxSpan > watchHighEnd) {
    zones.push({ start: watchHighEnd + 1, end: maxSpan, color: '#ef4444' });
  }
  return zones;
}

export class SpanChart {
  private container: HTMLElement;
  private options: SpanChartOptions;
  private root: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private managerListEl: HTMLDivElement | null = null;
  private categories: ColorCategory[] = [];
  private managersBySpan: Map<number, ManagerInfo[]> = new Map();
  private idealMin: number;
  private idealMax: number;
  private lastTree: OrgNode | null = null;

  constructor(container: HTMLElement, options?: SpanChartOptions) {
    this.container = container;
    this.options = options ?? {};
    this.idealMin = options?.idealMin ?? 4;
    this.idealMax = options?.idealMax ?? 8;
  }

  render(tree: OrgNode, categories: ColorCategory[]): void {
    this.destroy();
    this.categories = categories;
    this.lastTree = tree;

    const managers = collectManagers(tree);
    if (managers.length === 0) {
      this.renderNoData();
      return;
    }

    this.managersBySpan = new Map();
    for (const m of managers) {
      const list = this.managersBySpan.get(m.span) ?? [];
      list.push(m);
      this.managersBySpan.set(m.span, list);
    }

    const distribution = buildDistribution(managers);
    const stats = computeStats(managers);

    this.root = document.createElement('div');
    this.root.className = 'span-chart';
    this.container.appendChild(this.root);

    this.tooltip = this.createTooltip();

    this.renderKpiStrip(stats);
    this.renderIdealRangeControls();
    this.renderSvgChart(distribution);
    this.renderZoneLegend();

    this.managerListEl = document.createElement('div');
    this.managerListEl.className = 'span-chart-manager-list';
    this.managerListEl.style.maxHeight = '180px';
    this.managerListEl.style.overflowY = 'auto';
    this.managerListEl.style.display = 'none';
    this.root.appendChild(this.managerListEl);
  }

  destroy(): void {
    if (this.tooltip?.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.tooltip = null;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.root = null;
    this.managerListEl = null;
    this.categories = [];
    this.managersBySpan = new Map();
    this.lastTree = null;
  }

  private createTooltip(): HTMLDivElement {
    const tip = document.createElement('div');
    tip.className = 'span-chart-tooltip';
    tip.style.position = 'fixed';
    tip.style.display = 'none';
    tip.style.pointerEvents = 'none';
    tip.style.zIndex = '9999';
    tip.style.backgroundColor = 'var(--bg-elevated)';
    tip.style.color = 'var(--text-primary)';
    tip.style.border = '1px solid var(--border-primary)';
    tip.style.borderRadius = 'var(--radius-md)';
    tip.style.padding = '8px 12px';
    tip.style.boxShadow = 'var(--shadow-md)';
    tip.style.fontSize = '13px';
    tip.style.maxWidth = '280px';
    document.body.appendChild(tip);
    return tip;
  }

  private renderNoData(): void {
    this.root = document.createElement('div');
    this.root.className = 'span-chart';
    const msg = document.createElement('p');
    msg.className = 'span-chart-no-data';
    msg.style.textAlign = 'center';
    msg.style.color = 'var(--text-tertiary)';
    msg.style.padding = '48px 0';
    msg.textContent = t('analytics.viz.no_data');
    this.root.appendChild(msg);
    this.container.appendChild(this.root);
  }

  private renderKpiStrip(stats: ReturnType<typeof computeStats>): void {
    if (!this.root) return;

    const strip = document.createElement('div');
    strip.className = 'span-kpi-strip';
    strip.style.display = 'flex';
    strip.style.gap = '12px';
    strip.style.marginBottom = '16px';

    const cards = [
      { label: t('analytics.viz.span.total_managers'), value: String(stats.total), color: '#3b82f6' },
      { label: t('analytics.viz.span.avg_span'), value: String(stats.avg), color: '#10b981' },
      { label: t('analytics.viz.span.median_span'), value: String(stats.median), color: '#8b5cf6' },
      { label: t('analytics.viz.span.min_max'), value: `${stats.min}\u2013${stats.max}`, color: '#f59e0b' },
    ];

    for (const card of cards) {
      const el = document.createElement('div');
      el.className = 'span-kpi-card';
      el.style.flex = '1';
      el.style.padding = '12px';
      el.style.backgroundColor = 'var(--bg-elevated)';
      el.style.borderRadius = 'var(--radius-md)';
      el.style.textAlign = 'center';
      el.style.border = '1px solid var(--border-primary)';

      const valueEl = document.createElement('div');
      valueEl.className = 'span-kpi-value';
      valueEl.style.fontSize = '24px';
      valueEl.style.fontWeight = '700';
      valueEl.style.color = card.color;
      valueEl.textContent = card.value;

      const labelEl = document.createElement('div');
      labelEl.className = 'span-kpi-label';
      labelEl.style.fontSize = '12px';
      labelEl.style.color = 'var(--text-secondary)';
      labelEl.style.marginTop = '4px';
      labelEl.textContent = card.label;

      el.appendChild(valueEl);
      el.appendChild(labelEl);
      strip.appendChild(el);
    }

    this.root.appendChild(strip);
  }

  private renderIdealRangeControls(): void {
    if (!this.root) return;

    const row = document.createElement('div');
    row.className = 'span-chart-ideal-range';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.marginBottom = '12px';
    row.style.fontSize = '13px';
    row.style.color = 'var(--text-secondary)';

    const label = document.createElement('span');
    label.textContent = t('analytics.viz.span.ideal_range_label');
    row.appendChild(label);

    const minInput = this.createRangeInput(this.idealMin, 1, 20);
    minInput.addEventListener('change', () => {
      const val = parseInt(minInput.value, 10);
      if (!isNaN(val) && val >= 1 && val < this.idealMax) {
        this.idealMin = val;
        this.options.onIdealRangeChange?.(this.idealMin, this.idealMax);
        this.reRender();
      } else {
        minInput.value = String(this.idealMin);
      }
    });
    row.appendChild(minInput);

    const toLabel = document.createElement('span');
    toLabel.textContent = t('analytics.viz.span.ideal_range_to');
    row.appendChild(toLabel);

    const maxInput = this.createRangeInput(this.idealMax, 2, 30);
    maxInput.addEventListener('change', () => {
      const val = parseInt(maxInput.value, 10);
      if (!isNaN(val) && val > this.idealMin && val <= 30) {
        this.idealMax = val;
        this.options.onIdealRangeChange?.(this.idealMin, this.idealMax);
        this.reRender();
      } else {
        maxInput.value = String(this.idealMax);
      }
    });
    row.appendChild(maxInput);

    this.root.appendChild(row);
  }

  private createRangeInput(value: number, min: number, max: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.className = 'span-chart-range-input';
    input.style.width = '52px';
    input.style.padding = '4px 6px';
    input.style.border = '1px solid var(--border-primary)';
    input.style.borderRadius = 'var(--radius-sm)';
    input.style.background = 'var(--bg-elevated)';
    input.style.color = 'var(--text-primary)';
    input.style.fontSize = '13px';
    input.style.fontFamily = 'var(--font-sans)';
    input.style.textAlign = 'center';
    return input;
  }

  private reRender(): void {
    if (!this.lastTree) return;
    this.render(this.lastTree, this.categories);
  }

  private renderSvgChart(distribution: Map<number, number>): void {
    if (!this.root) return;

    const margin = { top: 28, right: 24, bottom: 40, left: 48 };
    const totalWidth = Math.min(this.container.clientWidth || 700, 700);
    const nonSvgHeight = 140; // KPI strip + ideal range + zone legend + manager list header + margins
    const availableHeight = (this.container.clientHeight || 340) - nonSvgHeight;
    const totalHeight = Math.max(160, Math.min(400, availableHeight));
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const maxSpan = Math.max(...Array.from(distribution.keys()), 1);
    const allSpans = Array.from({ length: maxSpan }, (_, i) => i + 1);
    const maxCount = max(Array.from(distribution.values())) ?? 1;

    const x = scaleBand<number>()
      .domain(allSpans)
      .range([0, width])
      .padding(0.3);

    const yScale = scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([height, 0]);

    const svg = select(this.root)
      .append('svg')
      .attr('class', 'span-chart-svg')
      .attr('width', totalWidth)
      .attr('height', totalHeight);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Health zone backgrounds
    const zones = buildHealthZones(maxSpan, this.idealMin, this.idealMax);
    const bandwidth = x.bandwidth();
    const step = x.step();
    const innerPad = step * x.paddingInner() / 2;

    for (const zone of zones) {
      const xStart = Math.max(0, (x(zone.start) ?? 0) - innerPad);
      const xEnd = Math.min(width, (x(zone.end) ?? 0) + bandwidth + innerPad);
      g.append('rect')
        .attr('x', xStart)
        .attr('y', 0)
        .attr('width', xEnd - xStart)
        .attr('height', height)
        .attr('fill', zone.color)
        .attr('opacity', 0.08);
    }

    // Horizontal grid lines
    const yTicks = yScale.ticks(5);
    for (const tick of yTicks) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', 'var(--border-primary)')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.5);
    }

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(axisBottom(x).tickFormat(d => String(d)));

    // X axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 35)
      .attr('fill', 'var(--text-secondary)')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text(t('analytics.viz.span.direct_reports_axis'));

    // Y axis
    g.append('g')
      .call(axisLeft(yScale).ticks(5).tickFormat(d => String(d)));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -36)
      .attr('fill', 'var(--text-secondary)')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text(t('analytics.viz.span.manager_count_axis'));

    // Data points with non-zero counts
    const dataPoints: DataPoint[] = allSpans
      .map(s => ({ span: s, count: distribution.get(s) ?? 0 }))
      .filter(d => d.count > 0);

    // Lollipop stems (animated from baseline)
    g.selectAll<SVGLineElement, DataPoint>('.span-chart-stem')
      .data(dataPoints)
      .enter()
      .append('line')
      .attr('class', 'span-chart-stem')
      .attr('x1', d => (x(d.span) ?? 0) + bandwidth / 2)
      .attr('x2', d => (x(d.span) ?? 0) + bandwidth / 2)
      .attr('y1', height)
      .attr('y2', height)
      .attr('stroke', d => getZoneColor(d.span, this.idealMin, this.idealMax))
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.6)
      .transition()
      .duration(800)
      .delay((_d, i) => i * 60)
      .attr('y2', d => yScale(d.count));

    // Lollipop heads (animated from baseline)
    const heads = g.selectAll<SVGCircleElement, DataPoint>('.span-chart-head')
      .data(dataPoints)
      .enter()
      .append('circle')
      .attr('class', 'span-chart-head')
      .attr('cx', d => (x(d.span) ?? 0) + bandwidth / 2)
      .attr('cy', height)
      .attr('r', 0)
      .attr('fill', d => getZoneColor(d.span, this.idealMin, this.idealMax))
      .attr('stroke', 'var(--bg-elevated)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: DataPoint) => {
        this.showTooltip(event, d.span);
      })
      .on('mousemove', (event: MouseEvent) => {
        this.moveTooltip(event);
      })
      .on('mouseleave', () => {
        this.hideTooltip();
      })
      .on('click', (_event: MouseEvent, d: DataPoint) => {
        this.showManagerList(d.span);
      });

    heads.transition()
      .duration(800)
      .delay((_d, i) => i * 60)
      .attr('cy', d => yScale(d.count))
      .attr('r', 8);

    // Count labels above circles (animated)
    g.selectAll<SVGTextElement, DataPoint>('.span-chart-label')
      .data(dataPoints)
      .enter()
      .append('text')
      .attr('class', 'span-chart-label')
      .attr('x', d => (x(d.span) ?? 0) + bandwidth / 2)
      .attr('y', height)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text-primary)')
      .text(d => String(d.count))
      .transition()
      .duration(800)
      .delay((_d, i) => i * 60)
      .attr('y', d => yScale(d.count) - 14);
  }

  private renderZoneLegend(): void {
    if (!this.root) return;

    const legend = document.createElement('div');
    legend.className = 'span-chart-zone-legend';
    legend.style.display = 'flex';
    legend.style.gap = '16px';
    legend.style.marginTop = '12px';
    legend.style.fontSize = '13px';
    legend.style.color = 'var(--text-secondary)';

    const items = [
      { label: t('analytics.viz.span.health_alert'), color: '#ef4444' },
      { label: t('analytics.viz.span.health_watch'), color: '#f59e0b' },
      { label: t('analytics.viz.span.health_healthy'), color: '#10b981' },
    ];

    for (const item of items) {
      const el = document.createElement('div');
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '6px';

      const swatch = document.createElement('span');
      swatch.style.display = 'inline-block';
      swatch.style.width = '12px';
      swatch.style.height = '12px';
      swatch.style.borderRadius = '3px';
      swatch.style.backgroundColor = item.color;

      const label = document.createElement('span');
      label.textContent = item.label;

      el.appendChild(swatch);
      el.appendChild(label);
      legend.appendChild(el);
    }

    this.root.appendChild(legend);
  }

  private showTooltip(event: MouseEvent, span: number): void {
    if (!this.tooltip) return;
    const managers = this.managersBySpan.get(span) ?? [];

    while (this.tooltip.firstChild) {
      this.tooltip.removeChild(this.tooltip.firstChild);
    }

    const header = document.createElement('div');
    header.style.fontWeight = '600';
    header.style.marginBottom = '4px';
    header.textContent = t('analytics.viz.span.managers_with_span', {
      count: managers.length,
      span,
    });
    this.tooltip.appendChild(header);

    const shown = managers.slice(0, 8);
    for (const m of shown) {
      const row = document.createElement('div');
      row.style.fontSize = '12px';
      row.style.color = 'var(--text-secondary)';
      row.textContent = `${m.name} \u2014 ${m.title}`;
      this.tooltip.appendChild(row);
    }

    if (managers.length > 8) {
      const more = document.createElement('div');
      more.style.fontSize = '11px';
      more.style.color = 'var(--text-tertiary)';
      more.style.marginTop = '4px';
      more.textContent = `+${managers.length - 8} more`;
      this.tooltip.appendChild(more);
    }

    this.tooltip.style.display = 'block';
    this.moveTooltip(event);
  }

  private moveTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;
    this.tooltip.style.left = `${event.clientX + 12}px`;
    this.tooltip.style.top = `${event.clientY - 8}px`;
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.display = 'none';
  }

  private showManagerList(span: number): void {
    if (!this.managerListEl) return;
    const managers = this.managersBySpan.get(span) ?? [];

    while (this.managerListEl.firstChild) {
      this.managerListEl.removeChild(this.managerListEl.firstChild);
    }

    for (const m of managers) {
      const item = document.createElement('div');
      item.className = 'span-chart-manager-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '8px';
      item.style.padding = '6px 8px';
      item.style.cursor = this.options.onNodeSelect ? 'pointer' : 'default';
      item.style.borderBottom = '1px solid var(--border-primary)';

      const badge = document.createElement('span');
      badge.className = 'span-chart-badge';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.minWidth = '28px';
      badge.style.height = '22px';
      badge.style.borderRadius = '11px';
      badge.style.fontSize = '12px';
      badge.style.fontWeight = '600';
      badge.style.color = '#fff';
      badge.style.backgroundColor = getZoneColor(m.span, this.idealMin, this.idealMax);
      badge.textContent = String(m.span);

      const nameEl = document.createElement('span');
      nameEl.style.fontWeight = '500';
      nameEl.style.color = 'var(--text-primary)';
      nameEl.textContent = m.name;

      const titleEl = document.createElement('span');
      titleEl.style.fontSize = '12px';
      titleEl.style.color = 'var(--text-secondary)';
      titleEl.textContent = m.title;

      item.appendChild(badge);
      item.appendChild(nameEl);
      item.appendChild(titleEl);

      if (this.options.onNodeSelect) {
        const nodeId = m.id;
        item.addEventListener('click', () => {
          this.options.onNodeSelect?.(nodeId);
        });
      }

      this.managerListEl.appendChild(item);
    }

    this.managerListEl.style.display = 'block';
  }
}
