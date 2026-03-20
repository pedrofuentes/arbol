import { hierarchy, treemap, treemapSquarify } from 'd3';
import type { HierarchyRectangularNode } from 'd3';
import { t } from '../i18n';
import type { OrgNode, ColorCategory } from '../types';

type ColorMode = 'department' | 'depth';

const DEPTH_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
const MAX_WIDTH = 700;
const SVG_HEIGHT = 300;

function getCategoryColor(categoryId: string | undefined, categories: ColorCategory[]): string {
  if (!categoryId) return '#6b7280';
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.color : '#6b7280';
}

function getCategoryLabel(categoryId: string | undefined, categories: ColorCategory[]): string {
  if (!categoryId) return t('analytics.viz.uncategorized');
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.label : t('analytics.viz.uncategorized');
}

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export class TreemapChart {
  private container: HTMLElement;
  private tooltip: HTMLDivElement | null = null;
  private rootNode: HierarchyRectangularNode<OrgNode> | null = null;
  private categories: ColorCategory[] = [];
  private colorMode: ColorMode = 'department';
  private focusPath: HierarchyRectangularNode<OrgNode>[] = [];
  private width = MAX_WIDTH;
  private height = SVG_HEIGHT;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(tree: OrgNode, categories: ColorCategory[]): void {
    this.categories = categories;
    this.colorMode = 'department';
    this.container.textContent = '';
    this.removeTooltip();

    if (!tree.children || tree.children.length === 0) {
      this.renderNoData();
      return;
    }

    this.width = Math.min(this.container.clientWidth || MAX_WIDTH, MAX_WIDTH);

    const root = hierarchy(tree)
      .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<OrgNode>()
      .tile(treemapSquarify)
      .size([this.width, this.height])
      .padding(2)
      .paddingTop(22)
      .round(true)(root);

    this.rootNode = root as HierarchyRectangularNode<OrgNode>;
    this.focusPath = [this.rootNode];

    const wrapper = document.createElement('div');
    wrapper.className = 'treemap-chart';
    this.container.appendChild(wrapper);

    const breadcrumbDiv = document.createElement('div');
    breadcrumbDiv.className = 'treemap-breadcrumb';
    breadcrumbDiv.style.marginBottom = '8px';
    breadcrumbDiv.style.fontSize = '13px';
    wrapper.appendChild(breadcrumbDiv);

    wrapper.appendChild(this.buildControls());

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(this.width));
    svg.setAttribute('height', String(this.height));
    svg.style.borderRadius = '8px';
    svg.style.overflow = 'hidden';
    svg.style.display = 'block';
    wrapper.appendChild(svg);

    const legendDiv = document.createElement('div');
    legendDiv.className = 'treemap-legend';
    wrapper.appendChild(legendDiv);

    this.createTooltip();
    this.renderTreemap(this.rootNode);
  }

  destroy(): void {
    this.removeTooltip();
    this.container.textContent = '';
    this.rootNode = null;
    this.focusPath = [];
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'treemap-tooltip';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.display = 'none';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '10000';
    this.tooltip.style.padding = '8px 12px';
    this.tooltip.style.borderRadius = 'var(--radius-md)';
    this.tooltip.style.backgroundColor = 'var(--bg-elevated)';
    this.tooltip.style.color = 'var(--text-primary)';
    this.tooltip.style.boxShadow = 'var(--shadow-md)';
    this.tooltip.style.border = '1px solid var(--border-primary)';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.lineHeight = '1.4';
    this.tooltip.style.maxWidth = '250px';
    document.body.appendChild(this.tooltip);
  }

  private removeTooltip(): void {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.tooltip = null;
  }

  private renderNoData(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'treemap-chart';
    const msg = document.createElement('div');
    msg.style.textAlign = 'center';
    msg.style.padding = '40px';
    msg.style.color = 'var(--text-tertiary)';
    msg.textContent = t('analytics.viz.no_data');
    wrapper.appendChild(msg);
    this.container.appendChild(wrapper);
  }

  private buildControls(): HTMLDivElement {
    const controls = document.createElement('div');
    controls.className = 'treemap-controls';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';
    controls.style.marginBottom = '8px';

    const label = document.createElement('span');
    label.style.color = 'var(--text-secondary)';
    label.style.fontSize = '13px';
    label.textContent = t('analytics.viz.treemap.color_by');
    controls.appendChild(label);

    const deptBtn = document.createElement('button');
    deptBtn.className = 'treemap-control-btn treemap-control-btn-active';
    deptBtn.textContent = t('analytics.viz.treemap.color_department');
    deptBtn.type = 'button';

    const depthBtn = document.createElement('button');
    depthBtn.className = 'treemap-control-btn';
    depthBtn.textContent = t('analytics.viz.treemap.color_depth');
    depthBtn.type = 'button';

    deptBtn.addEventListener('click', () => {
      if (this.colorMode === 'department') return;
      this.colorMode = 'department';
      deptBtn.className = 'treemap-control-btn treemap-control-btn-active';
      depthBtn.className = 'treemap-control-btn';
      const focus = this.focusPath[this.focusPath.length - 1];
      if (focus) this.renderTreemap(focus);
    });

    depthBtn.addEventListener('click', () => {
      if (this.colorMode === 'depth') return;
      this.colorMode = 'depth';
      depthBtn.className = 'treemap-control-btn treemap-control-btn-active';
      deptBtn.className = 'treemap-control-btn';
      const focus = this.focusPath[this.focusPath.length - 1];
      if (focus) this.renderTreemap(focus);
    });

    controls.appendChild(deptBtn);
    controls.appendChild(depthBtn);
    return controls;
  }

  private renderTreemap(focusNode: HierarchyRectangularNode<OrgNode>): void {
    const wrapper = this.container.querySelector('.treemap-chart');
    if (!wrapper) return;

    const svg = wrapper.querySelector('svg');
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const fx0 = focusNode.x0;
    const fy0 = focusNode.y0;
    const kx = this.width / (focusNode.x1 - fx0);
    const ky = this.height / (focusNode.y1 - fy0);

    for (const d of focusNode.descendants()) {
      const x = (d.x0 - fx0) * kx;
      const y = (d.y0 - fy0) * ky;
      const w = (d.x1 - d.x0) * kx;
      const h = (d.y1 - d.y0) * ky;

      if (w < 1 || h < 1) continue;

      const isLeaf = !d.children || d.children.length === 0;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = isLeaf ? 'default' : 'pointer';

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('fill', this.getTileColor(d, isLeaf));
      rect.setAttribute('stroke', 'var(--bg-base)');
      rect.setAttribute('stroke-width', '1');
      g.appendChild(rect);

      if (isLeaf && w > 50 && h > 28) {
        this.addLabel(g, d.data.name, x + 4, y + h / 2 + 4, w - 8, '11', 'normal');
      } else if (!isLeaf && h > 22) {
        this.addLabel(g, d.data.name, x + 4, y + 15, w - 8, '11', '600');

        if (w > 50) {
          const count = d.descendants().length - 1;
          const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          badge.setAttribute('x', String(x + w - 4));
          badge.setAttribute('y', String(y + 15));
          badge.setAttribute('text-anchor', 'end');
          badge.setAttribute('fill', 'var(--text-tertiary)');
          badge.setAttribute('font-size', '10');
          badge.setAttribute('pointer-events', 'none');
          badge.textContent = String(count);
          g.appendChild(badge);
        }
      }

      if (!isLeaf && d !== focusNode) {
        g.addEventListener('click', () => this.drillDown(d));
      }

      g.addEventListener('mouseover', (e: Event) => this.showTooltip(d, e as MouseEvent));
      g.addEventListener('mousemove', (e: Event) => this.moveTooltip(e as MouseEvent));
      g.addEventListener('mouseout', () => this.hideTooltip());

      svg.appendChild(g);
    }

    this.updateBreadcrumb();
    this.updateLegend();
  }

  private addLabel(
    g: SVGGElement,
    name: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: string,
    fontWeight: string
  ): void {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('fill', 'var(--text-primary)');
    text.setAttribute('font-size', fontSize);
    text.setAttribute('font-weight', fontWeight);
    text.setAttribute('pointer-events', 'none');

    const charWidth = 6.5;
    const maxChars = Math.max(1, Math.floor(maxWidth / charWidth));
    text.textContent = name.length > maxChars
      ? name.substring(0, maxChars - 1) + '\u2026'
      : name;
    g.appendChild(text);
  }

  private getTileColor(node: HierarchyRectangularNode<OrgNode>, isLeaf: boolean): string {
    if (this.colorMode === 'depth') {
      return DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
    }

    const ancestor = this.getDepth1Ancestor(node);
    const categoryId = ancestor ? ancestor.data.categoryId : node.data.categoryId;
    const baseColor = getCategoryColor(categoryId, this.categories);
    return hexToRgba(baseColor, isLeaf ? 0.4 : 0.15);
  }

  private getDepth1Ancestor(
    node: HierarchyRectangularNode<OrgNode>
  ): HierarchyRectangularNode<OrgNode> | null {
    let current: HierarchyRectangularNode<OrgNode> = node;
    while (current.parent && current.depth > 1) {
      current = current.parent;
    }
    return current.depth === 1 ? current : null;
  }

  private drillDown(node: HierarchyRectangularNode<OrgNode>): void {
    const path: HierarchyRectangularNode<OrgNode>[] = [];
    let current: HierarchyRectangularNode<OrgNode> | null = node;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    this.focusPath = path;
    this.renderTreemap(node);
  }

  private updateBreadcrumb(): void {
    const el = this.container.querySelector('.treemap-breadcrumb');
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);

    this.focusPath.forEach((node, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.textContent = ' \u203A ';
        sep.style.color = 'var(--text-tertiary)';
        el.appendChild(sep);
      }

      const isLast = i === this.focusPath.length - 1;
      const crumb = document.createElement('span');
      crumb.textContent = node.data.name;

      if (isLast) {
        crumb.style.color = 'var(--text-primary)';
        crumb.style.fontWeight = '600';
      } else {
        crumb.style.color = 'var(--text-secondary)';
        crumb.style.cursor = 'pointer';
        crumb.style.textDecoration = 'underline';
        crumb.addEventListener('click', () => this.drillDown(node));
      }

      el.appendChild(crumb);
    });
  }

  private updateLegend(): void {
    const el = this.container.querySelector('.treemap-legend') as HTMLElement | null;
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);

    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.gap = '8px';
    el.style.marginTop = '8px';

    if (this.colorMode === 'department') {
      for (const cat of this.categories) {
        el.appendChild(this.buildLegendItem(cat.color, cat.label));
      }
      el.appendChild(this.buildLegendItem('#6b7280', t('analytics.viz.uncategorized')));
    } else {
      const depthLabels = [
        t('analytics.viz.treemap.depth_root'),
        t('analytics.viz.treemap.depth_vp'),
        t('analytics.viz.treemap.depth_director'),
        t('analytics.viz.treemap.depth_manager'),
        t('analytics.viz.treemap.depth_lead'),
        t('analytics.viz.treemap.depth_ic'),
      ];
      DEPTH_COLORS.forEach((color, i) => {
        el.appendChild(this.buildLegendItem(color, depthLabels[i]));
      });
    }
  }

  private buildLegendItem(color: string, label: string): HTMLDivElement {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '4px';
    item.style.fontSize = '12px';

    const swatch = document.createElement('span');
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    swatch.style.borderRadius = '2px';
    swatch.style.backgroundColor = color;
    swatch.style.flexShrink = '0';
    item.appendChild(swatch);

    const text = document.createElement('span');
    text.style.color = 'var(--text-secondary)';
    text.textContent = label;
    item.appendChild(text);

    return item;
  }

  private showTooltip(node: HierarchyRectangularNode<OrgNode>, e: MouseEvent): void {
    if (!this.tooltip) return;
    const data = node.data;
    const directReports = data.children ? data.children.length : 0;
    const teamSize = node.descendants().length - 1;

    this.tooltip.textContent = '';

    const nameEl = document.createElement('div');
    nameEl.style.fontWeight = '600';
    nameEl.style.marginBottom = '2px';
    nameEl.textContent = data.name;
    this.tooltip.appendChild(nameEl);

    const titleEl = document.createElement('div');
    titleEl.style.color = 'var(--text-secondary)';
    titleEl.style.marginBottom = '4px';
    titleEl.textContent = data.title;
    this.tooltip.appendChild(titleEl);

    const rows: Array<{ label: string; value: string }> = [
      { label: t('analytics.viz.department'), value: getCategoryLabel(data.categoryId, this.categories) },
      { label: t('analytics.viz.level'), value: data.level || '\u2014' },
      { label: t('analytics.viz.direct_reports'), value: String(directReports) },
      { label: t('analytics.viz.team_size'), value: String(teamSize) },
    ];

    for (const row of rows) {
      const div = document.createElement('div');
      div.style.fontSize = '11px';

      const labelSpan = document.createElement('span');
      labelSpan.style.color = 'var(--text-tertiary)';
      labelSpan.textContent = row.label + ': ';
      div.appendChild(labelSpan);

      const valueSpan = document.createElement('span');
      valueSpan.textContent = row.value;
      div.appendChild(valueSpan);

      this.tooltip.appendChild(div);
    }

    this.tooltip.style.display = 'block';
    this.moveTooltip(e);
  }

  private moveTooltip(e: MouseEvent): void {
    if (!this.tooltip) return;
    this.tooltip.style.left = (e.clientX + 12) + 'px';
    this.tooltip.style.top = (e.clientY + 12) + 'px';
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.display = 'none';
  }
}
