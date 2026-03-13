import * as d3 from 'd3';
import { OrgNode, ColorCategory, DiffEntry, DiffStatus } from '../types';
import { computeLayout, LayoutResult, LayoutNode } from './layout-engine';
import { ZoomManager } from './zoom-manager';

interface CardDatum {
  data: {
    id: string;
    name: string;
    title: string;
    categoryId?: string;
  };
}

export interface RendererOptions {
  container: HTMLElement;
  // Card dimensions
  nodeWidth: number;
  nodeHeight: number;
  // Tree layout spacing
  horizontalSpacing: number;
  branchSpacing?: number;
  topVerticalSpacing?: number;
  bottomVerticalSpacing?: number;
  // IC (Individual Contributor) options
  icNodeWidth?: number;
  icGap?: number;
  icContainerPadding?: number;
  // Advisor options
  palTopGap?: number;
  palBottomGap?: number;
  palRowGap?: number;
  palCenterGap?: number;
  // Typography
  nameFontSize?: number;
  titleFontSize?: number;
  legendFontSize?: number;
  fontFamily?: string;
  textPaddingTop?: number;
  textGap?: number;
  nameColor?: string;
  titleColor?: string;
  // Link style
  linkColor?: string;
  linkWidth?: number;
  dottedLineDash?: string;
  // Card style
  cardFill?: string;
  cardStroke?: string;
  cardStrokeWidth?: number;
  cardBorderRadius?: number;
  icContainerFill?: string;
  icContainerBorderRadius?: number;
  // Text alignment
  textAlign?: 'left' | 'center' | 'right';
  textPaddingHorizontal?: number;
  // Headcount badge
  showHeadcount?: boolean;
  headcountBadgeColor?: string;
  headcountBadgeTextColor?: string;
  headcountBadgeFontSize?: number;
  headcountBadgeRadius?: number;
  headcountBadgePadding?: number;
  headcountBadgeHeight?: number;
  categories?: ColorCategory[];
  legendRows?: number;
}

export type ResolvedOptions = Required<RendererOptions>;

export type NodeClickHandler = (nodeId: string, event: MouseEvent) => void;
export type NodeRightClickHandler = (nodeId: string, event: MouseEvent) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private opts: ResolvedOptions;
  private onNodeClick: NodeClickHandler | null = null;
  private onNodeRightClick: NodeRightClickHandler | null = null;
  private lastLayout: LayoutResult | null = null;
  private zoomManager: ZoomManager;
  private hasRendered = false;
  private highlightedNodes: Set<string> | null = null;
  private diffMap: Map<string, DiffEntry> | null = null;

  constructor(options: RendererOptions) {
    this.opts = {
      icNodeWidth: Math.round(options.nodeWidth * 0.88),
      icGap: 6,
      icContainerPadding: 10,
      branchSpacing: 20,
      topVerticalSpacing: 10,
      bottomVerticalSpacing: 20,
      palTopGap: 12,
      palBottomGap: 12,
      palRowGap: 6,
      palCenterGap: 70,
      nameFontSize: 11,
      titleFontSize: 9,
      legendFontSize: 12,
      fontFamily: 'Calibri',
      textPaddingTop: 6,
      textGap: 2,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      linkColor: '#94a3b8',
      linkWidth: 1.5,
      dottedLineDash: '6,4',
      cardFill: '#ffffff',
      cardStroke: '#22c55e',
      cardStrokeWidth: 1,
      cardBorderRadius: 0,
      icContainerFill: '#e5e7eb',
      icContainerBorderRadius: 0,
      textAlign: 'center' as const,
      textPaddingHorizontal: 8,
      showHeadcount: false,
      headcountBadgeColor: '#9ca3af',
      headcountBadgeTextColor: '#1e293b',
      headcountBadgeFontSize: 11,
      headcountBadgeRadius: 4,
      headcountBadgePadding: 8,
      headcountBadgeHeight: 22,
      categories: [] as ColorCategory[],
      legendRows: 0,
      ...options,
    };
    this.svg = d3
      .select(options.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');
    this.g = this.svg.append('g').attr('class', 'chart-group');
    this.zoomManager = new ZoomManager(this.svg.node()!, this.g.node()!);
  }

  setNodeClickHandler(handler: NodeClickHandler): void {
    this.onNodeClick = handler;
  }

  setNodeRightClickHandler(handler: NodeRightClickHandler): void {
    this.onNodeRightClick = handler;
  }

  setHighlightedNodes(nodeIds: Set<string> | null): void {
    this.highlightedNodes = nodeIds;
    this.applyHighlighting();
  }

  setDiffMap(diffMap: Map<string, DiffEntry> | null): void {
    this.diffMap = diffMap;
  }

  getDiffMap(): Map<string, DiffEntry> | null {
    return this.diffMap;
  }

  render(root: OrgNode): void {
    const layout = computeLayout(root, this.opts);
    this.lastLayout = layout;

    this.g.selectAll('*').remove();

    const { nodeHeight, linkColor, linkWidth, dottedLineDash, icContainerFill } = this.opts;

    // Layer 1: Tree links (elbow paths + vertical connectors through Advisor area)
    const linksGroup = this.g.append('g').attr('class', 'links');
    for (const link of layout.links.filter((l) => l.layer === 'tree')) {
      const pathEl = linksGroup
        .append('path')
        .attr('class', 'link')
        .attr('d', link.path)
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth);
      if (link.dottedLine) {
        pathEl.attr('stroke-dasharray', dottedLineDash);
      }
    }

    // Layer 2: IC stacks (behind manager nodes)
    const icGroup = this.g.append('g').attr('class', 'ic-stacks');
    for (const container of layout.icContainers) {
      icGroup
        .append('rect')
        .attr('class', 'ic-container')
        .attr('x', container.x)
        .attr('y', container.y)
        .attr('width', container.width)
        .attr('height', container.height)
        .attr('rx', this.opts.icContainerBorderRadius)
        .attr('ry', this.opts.icContainerBorderRadius)
        .attr('fill', icContainerFill);
    }

    for (const node of layout.nodes.filter((n) => n.type === 'ic')) {
      const g = icGroup
        .append('g')
        .attr('class', 'node ic-node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = {
        data: { id: node.id, name: node.name, title: node.title, categoryId: node.categoryId },
      };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(
        sel as d3.Selection<SVGGElement, CardDatum, null, undefined>,
        node.width,
        nodeHeight,
        () => node.id,
      );
    }

    // Layer 3: Advisor stacks (on top of tree links)
    const palGroup = this.g.append('g').attr('class', 'pal-stacks');
    for (const link of layout.links.filter((l) => l.layer === 'pal')) {
      palGroup
        .append('path')
        .attr('class', 'link')
        .attr('d', link.path)
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth);
    }

    for (const node of layout.nodes.filter((n) => n.type === 'pal')) {
      const g = palGroup
        .append('g')
        .attr('class', 'node pal-node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = {
        data: { id: node.id, name: node.name, title: node.title, categoryId: node.categoryId },
      };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(
        sel as d3.Selection<SVGGElement, CardDatum, null, undefined>,
        node.width,
        nodeHeight,
        () => node.id,
      );
    }

    // Layer 4: Manager nodes (topmost)
    const nodesGroup = this.g.append('g').attr('class', 'nodes');
    const managerNodes = layout.nodes.filter((n) => n.type === 'manager');

    for (const node of managerNodes) {
      const g = nodesGroup
        .append('g')
        .attr('class', 'node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = {
        data: { id: node.id, name: node.name, title: node.title, categoryId: node.categoryId },
      };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(
        sel as d3.Selection<SVGGElement, CardDatum, null, undefined>,
        node.width,
        nodeHeight,
        (d) => d.data.id,
      );

      if (this.opts.showHeadcount && node.descendantCount && node.descendantCount > 0) {
        this.renderHeadcountBadge(g, node);
      }
    }

    // Diff badges: render on all node types when diffMap is active
    if (this.diffMap) {
      this.renderDiffBadges();
    }

    if (this.hasRendered) {
      this.zoomManager.applyTransform(this.zoomManager.getCurrentTransform());
    } else {
      this.zoomManager.centerAtRealSize();
      this.hasRendered = true;
    }

    this.applyHighlighting();
    if (this.diffMap) {
      this.applyDiffDimming();
    }
    this.renderLegend(layout);
    if (this.diffMap) {
      this.renderDiffLegend(layout);
    }
  }

  getLastLayout(): LayoutResult | null {
    return this.lastLayout;
  }

  getZoomManager(): ZoomManager {
    return this.zoomManager;
  }

  // --- Rendering helpers ---

  private applyHighlighting(): void {
    if (!this.highlightedNodes) {
      this.g.selectAll('.node, .ic-node, .pal-node').style('opacity', null);
      this.g.selectAll('.links').style('opacity', null);
      return;
    }

    const highlighted = this.highlightedNodes;

    this.g.selectAll('.node, .ic-node, .pal-node').each(function () {
      const el = d3.select(this);
      const nodeId = el.attr('data-id');
      if (nodeId && highlighted.has(nodeId)) {
        el.style('opacity', '1');
      } else {
        el.style('opacity', '0.2');
      }
    });

    this.g.selectAll('.links').style('opacity', '0.3');
  }

  private renderCardContent(
    selection: d3.Selection<SVGGElement, CardDatum, null, undefined>,
    width: number,
    height: number,
    getId: (d: CardDatum) => string,
  ): void {
    const {
      textPaddingTop,
      nameFontSize,
      titleFontSize,
      textGap,
      cardFill,
      cardStroke,
      cardStrokeWidth,
      cardBorderRadius,
      nameColor,
      titleColor,
      textAlign,
      textPaddingHorizontal,
      fontFamily,
    } = this.opts;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const titleY = textPaddingTop + nameFontSize + textGap;

    const svgAnchor = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle';
    const textX =
      textAlign === 'left'
        ? textPaddingHorizontal
        : textAlign === 'right'
          ? width - textPaddingHorizontal
          : width / 2;
    const fontStack = `${fontFamily}, sans-serif`;

    selection
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', cardBorderRadius)
      .attr('ry', cardBorderRadius)
      .attr('fill', (d: CardDatum) => {
        const catId = d.data?.categoryId;
        if (catId && self.opts.categories.length > 0) {
          const cat = self.opts.categories.find((c: ColorCategory) => c.id === catId);
          if (cat) return cat.color;
        }
        return cardFill;
      })
      .attr('stroke', cardStroke)
      .attr('stroke-width', cardStrokeWidth)
      .on('click', function (_event, d) {
        if (self.onNodeClick) self.onNodeClick(getId(d), _event as MouseEvent);
      })
      .on('contextmenu', function (event, d) {
        if (self.onNodeRightClick) {
          event.preventDefault();
          self.onNodeRightClick(getId(d), event as MouseEvent);
        }
      });

    // Text elements pass pointer events through to the rect beneath
    selection
      .append('text')
      .attr('class', 'node-name')
      .attr('x', textX)
      .attr('y', textPaddingTop)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', svgAnchor)
      .attr('font-weight', 'bold')
      .attr('font-family', fontStack)
      .attr('font-size', `${nameFontSize}px`)
      .attr('fill', (d: CardDatum) => {
        const catId = d.data?.categoryId;
        if (catId && self.opts.categories.length > 0) {
          const cat = self.opts.categories.find((c: ColorCategory) => c.id === catId);
          if (cat?.nameColor) return cat.nameColor;
        }
        return nameColor;
      })
      .attr('pointer-events', 'none')
      .text((d: CardDatum) => d.data.name);

    selection
      .append('text')
      .attr('class', 'node-title')
      .attr('x', textX)
      .attr('y', titleY)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', svgAnchor)
      .attr('font-family', fontStack)
      .attr('font-size', `${titleFontSize}px`)
      .attr('fill', (d: CardDatum) => {
        const catId = d.data?.categoryId;
        if (catId && self.opts.categories.length > 0) {
          const cat = self.opts.categories.find((c: ColorCategory) => c.id === catId);
          if (cat?.titleColor) return cat.titleColor;
        }
        return titleColor;
      })
      .attr('pointer-events', 'none')
      .text((d: CardDatum) => d.data.title);
  }

  private renderHeadcountBadge(
    parentGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: LayoutNode,
  ): void {
    const {
      headcountBadgeColor,
      headcountBadgeTextColor,
      headcountBadgeFontSize,
      headcountBadgeRadius,
      headcountBadgePadding,
      headcountBadgeHeight,
      nodeHeight,
    } = this.opts;

    const text = String(node.descendantCount);
    const charWidth = headcountBadgeFontSize * 0.7;
    const estimatedTextWidth = text.length * charWidth;
    const minBadgeWidth = headcountBadgeHeight;
    const badgeWidth = Math.max(minBadgeWidth, estimatedTextWidth + headcountBadgePadding * 2);

    // Position: right edge of card, vertically centered on the card border
    const badgeX = node.width - badgeWidth / 2;
    const badgeY = nodeHeight / 2 - headcountBadgeHeight / 2;

    const badgeGroup = parentGroup.append('g').attr('class', 'headcount-badge');

    badgeGroup
      .append('rect')
      .attr('x', badgeX)
      .attr('y', badgeY)
      .attr('width', badgeWidth)
      .attr('height', headcountBadgeHeight)
      .attr('rx', headcountBadgeRadius)
      .attr('ry', headcountBadgeRadius)
      .attr('fill', headcountBadgeColor)
      .attr('pointer-events', 'none');

    badgeGroup
      .append('text')
      .attr('x', badgeX + badgeWidth / 2)
      .attr('y', badgeY + headcountBadgeHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', `${this.opts.fontFamily}, sans-serif`)
      .attr('font-size', `${headcountBadgeFontSize}px`)
      .attr('font-weight', 'bold')
      .attr('fill', headcountBadgeTextColor)
      .attr('pointer-events', 'none')
      .text(text);
  }

  private static readonly DIFF_COLORS: Record<DiffStatus, string> = {
    added: '#22c55e',
    removed: '#ef4444',
    moved: '#a78bfa',
    modified: '#f59e0b',
    unchanged: '#64748b',
  };

  private static readonly DIFF_LABELS: Record<DiffStatus, string> = {
    added: 'Added',
    removed: 'Removed',
    moved: 'Moved',
    modified: 'Modified',
    unchanged: 'Unchanged',
  };

  private renderDiffBadges(): void {
    if (!this.diffMap) return;
    const diffMap = this.diffMap;
    const fontFamily = this.opts.fontFamily;

    this.g.selectAll<SVGGElement, unknown>('.node, .ic-node, .pal-node').each(function () {
      const el = d3.select(this);
      const nodeId = el.attr('data-id');
      if (!nodeId) return;

      const entry = diffMap.get(nodeId);
      if (!entry || entry.status === 'unchanged') return;

      const color = ChartRenderer.DIFF_COLORS[entry.status];
      const label = ChartRenderer.DIFF_LABELS[entry.status];

      // Get card width from the first rect child
      const rectEl = el.select('rect');
      const cardWidth = rectEl.empty() ? 120 : parseFloat(rectEl.attr('width'));

      const badgeFontSize = 8;
      const charWidth = badgeFontSize * 0.65;
      const textWidth = label.length * charWidth;
      const badgePadding = 6;
      const badgeHeight = 14;
      const badgeWidth = textWidth + badgePadding * 2;
      const badgeRadius = 4;

      const badgeX = cardWidth - badgeWidth + 6;
      const badgeY = -7;

      const badgeGroup = el.append('g').attr('class', 'diff-badge');

      badgeGroup
        .append('rect')
        .attr('x', badgeX)
        .attr('y', badgeY)
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', badgeRadius)
        .attr('ry', badgeRadius)
        .attr('fill', color)
        .attr('pointer-events', 'none');

      badgeGroup
        .append('text')
        .attr('x', badgeX + badgeWidth / 2)
        .attr('y', badgeY + badgeHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', `${fontFamily}, sans-serif`)
        .attr('font-size', `${badgeFontSize}px`)
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('letter-spacing', '0.04em')
        .attr('text-transform', 'uppercase')
        .attr('pointer-events', 'none')
        .text(label);

      // Removed nodes: reduce opacity and add strikethrough
      if (entry.status === 'removed') {
        el.style('opacity', '0.55');
        el.selectAll('.node-name, .node-title')
          .attr('text-decoration', 'line-through')
          .attr('text-decoration-color', ChartRenderer.DIFF_COLORS.removed);
      }
    });
  }

  private applyDiffDimming(): void {
    if (!this.diffMap) return;
    const diffMap = this.diffMap;

    // Use color overrides instead of group opacity to avoid background
    // bleed-through (IC containers, dark backgrounds produce inconsistent dimming).
    const dimFill = 'var(--diff-dim-fill, #d1d5db)';
    const dimStroke = 'var(--diff-dim-stroke, #d1d5db)';
    const dimText = 'var(--diff-dim-text, #9ca3af)';

    this.g.selectAll<SVGGElement, unknown>('.node, .ic-node, .pal-node').each(function () {
      const el = d3.select(this);
      const nodeId = el.attr('data-id');
      if (!nodeId) return;

      const entry = diffMap.get(nodeId);
      if (!entry || entry.status === 'unchanged') {
        el.select('rect').attr('fill', dimFill).attr('stroke', dimStroke);
        el.selectAll('.node-name, .node-title').attr('fill', dimText);
        el.selectAll('.headcount-badge').style('opacity', '0.3');
      } else if (entry.status === 'removed') {
        el.style('opacity', '0.55');
      }
    });

    // Mute IC containers in diff mode
    this.g.selectAll('.ic-container').attr('fill', dimFill);

    // Dim links globally in diff mode
    this.g.selectAll('.links, .pal-stacks .link').style('opacity', '0.4');
  }

  private renderDiffLegend(layout: LayoutResult): void {
    if (!this.diffMap) return;

    // Count occurrences per status
    const counts: Record<DiffStatus, number> = {
      added: 0, removed: 0, moved: 0, modified: 0, unchanged: 0,
    };
    for (const entry of this.diffMap.values()) {
      counts[entry.status]++;
    }

    const items: { status: DiffStatus; label: string; color: string; count: number }[] = [];
    const statusOrder: DiffStatus[] = ['added', 'removed', 'moved', 'modified'];
    for (const status of statusOrder) {
      if (counts[status] > 0) {
        items.push({
          status,
          label: `${ChartRenderer.DIFF_LABELS[status]} (${counts[status]})`,
          color: ChartRenderer.DIFF_COLORS[status],
          count: counts[status],
        });
      }
    }
    if (items.length === 0) return;

    const { boundingBox } = layout;
    const legendFs = this.opts.legendFontSize ?? 12;
    const legendPadding = legendFs;
    const swatchSize = legendFs;
    const textGap = Math.round(legendFs * 0.5);
    const rowHeight = Math.round(legendFs * 1.6);
    const swatchRx = Math.round(Math.max(1, legendFs * 0.15));
    const bgRx = Math.round(Math.max(2, legendFs * 0.35));
    const columnGap = Math.round(legendFs * 1.5);

    // Position below existing legend if categories exist, otherwise below chart
    const existingLegend = this.g.select<SVGGElement>('.legend');
    let legendY: number;
    if (!existingLegend.empty()) {
      const existingBg = existingLegend.select('.legend-bg');
      if (!existingBg.empty()) {
        legendY = parseFloat(existingBg.attr('y')) + parseFloat(existingBg.attr('height')) + Math.round(legendFs * 1.2);
      } else {
        legendY = boundingBox.minY + boundingBox.height + Math.round(legendFs * 2.2);
      }
    } else {
      legendY = boundingBox.minY + boundingBox.height + Math.round(legendFs * 2.2);
    }

    const legendX = boundingBox.minX;
    const diffLegendGroup = this.g.append('g').attr('class', 'diff-legend');
    const bgRect = diffLegendGroup.append('rect').attr('class', 'diff-legend-bg');

    // Lay items out in a single row
    const maxTextWidths: number[] = [];

    items.forEach((item, i) => {
      const rowG = diffLegendGroup
        .append('g')
        .attr('class', 'diff-legend-item')
        .attr('data-col', i);

      rowG
        .append('rect')
        .attr('width', swatchSize)
        .attr('height', swatchSize)
        .attr('fill', item.color)
        .attr('rx', swatchRx);

      const text = rowG
        .append('text')
        .attr('x', swatchSize + textGap)
        .attr('y', swatchSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${legendFs}px`)
        .attr('font-family', `${this.opts.fontFamily}, sans-serif`)
        .attr('fill', 'var(--text-secondary, #64748b)')
        .text(item.label);

      const textNode = text.node();
      const bbox = textNode && typeof textNode.getBBox === 'function' ? textNode.getBBox() : null;
      maxTextWidths.push(bbox ? bbox.width : item.label.length * legendFs * 0.6);
    });

    // Compute column offsets
    const colOffsets: number[] = [0];
    for (let c = 1; c < items.length; c++) {
      colOffsets[c] = colOffsets[c - 1] + swatchSize + textGap + maxTextWidths[c - 1] + columnGap;
    }

    // Position items
    diffLegendGroup.selectAll<SVGGElement, unknown>('.diff-legend-item').each(function () {
      const el = d3.select(this);
      const col = parseInt(el.attr('data-col'), 10);
      const x = legendX + legendPadding + colOffsets[col];
      const y = legendY + legendPadding;
      el.attr('transform', `translate(${x}, ${y})`);
    });

    // Size background
    const lastCol = items.length - 1;
    const bgWidth = legendPadding * 2 + colOffsets[lastCol] + swatchSize + textGap + maxTextWidths[lastCol];
    const bgHeight = legendPadding * 2 + rowHeight - (rowHeight - swatchSize);

    bgRect
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', bgWidth)
      .attr('height', bgHeight)
      .attr('fill', 'var(--bg-surface, #ffffff)')
      .attr('stroke', 'var(--border-default, #e2e8f0)')
      .attr('stroke-width', 0.5)
      .attr('rx', bgRx);
  }

  private renderLegend(layout: LayoutResult): void {
    const categories = this.opts.categories;
    if (!categories || categories.length === 0) return;

    const { boundingBox } = layout;

    // Scale all legend dimensions from legendFontSize so the legend
    // matches the active layout preset (Compact → Presentation).
    const legendFs = this.opts.legendFontSize ?? 12;
    const legendPadding = legendFs;
    const swatchSize = legendFs;
    const textGap = Math.round(legendFs * 0.5);
    const rowHeight = Math.round(legendFs * 1.6);
    const fontSize = legendFs;
    const swatchRx = Math.round(Math.max(1, legendFs * 0.15));
    const bgRx = Math.round(Math.max(2, legendFs * 0.35));
    const legendGap = Math.round(legendFs * 2.2);
    const columnGap = Math.round(legendFs * 1.5);

    const count = categories.length;
    const legendRows = this.opts.legendRows ?? 0;
    const rows = legendRows > 0 ? Math.min(legendRows, count) : count;
    const cols = Math.ceil(count / rows);

    const legendX = boundingBox.minX;
    const legendY = boundingBox.minY + boundingBox.height + legendGap;

    const legendGroup = this.g.append('g').attr('class', 'legend');

    // Background rectangle (drawn after we know dimensions)
    const bgRect = legendGroup.append('rect').attr('class', 'legend-bg');

    const maxTextWidths: number[] = new Array(cols).fill(0);

    categories.forEach((cat, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;

      // Use temporary x; final x computed after measuring all text
      const rowG = legendGroup
        .append('g')
        .attr('class', `legend-item`)
        .attr('data-row', row)
        .attr('data-col', col);

      rowG
        .append('rect')
        .attr('width', swatchSize)
        .attr('height', swatchSize)
        .attr('fill', cat.color)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 0.5)
        .attr('rx', swatchRx);

      const text = rowG
        .append('text')
        .attr('x', swatchSize + textGap)
        .attr('y', swatchSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${fontSize}px`)
        .attr('font-family', `${this.opts.fontFamily}, sans-serif`)
        .attr('fill', 'var(--text-secondary, #64748b)')
        .text(cat.label);

      const textNode = text.node();
      const bbox = textNode && typeof textNode.getBBox === 'function' ? textNode.getBBox() : null;
      if (bbox) {
        maxTextWidths[col] = Math.max(maxTextWidths[col], bbox.width);
      }
    });

    // Compute column x offsets based on measured text widths
    const colOffsets: number[] = [0];
    for (let c = 1; c < cols; c++) {
      colOffsets[c] =
        colOffsets[c - 1] + swatchSize + textGap + maxTextWidths[c - 1] + columnGap;
    }

    // Position all items now that we know column widths
    legendGroup.selectAll<SVGGElement, unknown>('.legend-item').each(function () {
      const el = d3.select(this);
      const row = parseInt(el.attr('data-row'), 10);
      const col = parseInt(el.attr('data-col'), 10);
      const x = legendX + legendPadding + colOffsets[col];
      const y = legendY + legendPadding + row * rowHeight;
      el.attr('transform', `translate(${x}, ${y})`);
    });

    // Size the background
    const lastCol = cols - 1;
    const bgWidth =
      legendPadding * 2 +
      colOffsets[lastCol] +
      swatchSize +
      textGap +
      maxTextWidths[lastCol];
    const bgHeight = legendPadding * 2 + rows * rowHeight - (rowHeight - swatchSize);

    bgRect
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', bgWidth)
      .attr('height', bgHeight)
      .attr('fill', 'var(--bg-surface, #ffffff)')
      .attr('stroke', 'var(--border-default, #e2e8f0)')
      .attr('stroke-width', 0.5)
      .attr('rx', bgRx);
  }

  setSelectedNode(nodeId: string | null): void {
    this.g.selectAll('.node').classed('selected', false);
    if (nodeId) {
      this.g
        .selectAll<SVGGElement, unknown>('.node')
        .filter(function () {
          return this.getAttribute('data-id') === nodeId;
        })
        .classed('selected', true);
    }
  }

  setMultiSelectedNodes(nodeIds: Set<string> | null): void {
    this.g.selectAll('.node, .ic-node, .pal-node').classed('multi-selected', false);
    if (nodeIds && nodeIds.size > 0) {
      this.g
        .selectAll<SVGGElement, unknown>('.node, .ic-node, .pal-node')
        .filter(function () {
          const id = this.getAttribute('data-id');
          return id !== null && nodeIds.has(id);
        })
        .classed('multi-selected', true);
    }
  }

  getSvg(): SVGSVGElement {
    return this.svg.node()!;
  }

  updateOptions(partial: Partial<RendererOptions>): void {
    Object.assign(this.opts, partial);
  }

  getOptions(): ResolvedOptions {
    return { ...this.opts };
  }

  getChartGroup(): SVGGElement {
    return this.g.node()!;
  }

  getNodeScreenRect(nodeId: string): DOMRect | null {
    const node = this.g.select<SVGGElement>(
      `.node[data-id="${nodeId}"], .ic-node[data-id="${nodeId}"], .pal-node[data-id="${nodeId}"]`,
    );
    if (node.empty()) return null;
    return node.node()!.getBoundingClientRect();
  }

  destroy(): void {
    this.svg.remove();
  }
}
