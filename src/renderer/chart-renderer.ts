import * as d3 from 'd3';
import { OrgNode } from '../types';
import { computeLayout, LayoutResult } from './layout-engine';
import { ZoomManager } from './zoom-manager';

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
  // PAL options
  palTopGap?: number;
  palBottomGap?: number;
  palRowGap?: number;
  palCenterGap?: number;
  // Typography
  nameFontSize?: number;
  titleFontSize?: number;
  textPaddingTop?: number;
  textGap?: number;
  // Link style
  linkColor?: string;
  linkWidth?: number;
  // Card style
  cardFill?: string;
  cardStroke?: string;
  cardStrokeWidth?: number;
  icContainerFill?: string;
}

export interface ResolvedOptions extends Required<RendererOptions> {}

export type NodeClickHandler = (nodeId: string) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private opts: ResolvedOptions;
  private collapsed: Set<string> = new Set();
  private onNodeClick: NodeClickHandler | null = null;
  private onCollapseToggle: ((nodeId: string) => void) | null = null;
  private lastLayout: LayoutResult | null = null;
  private zoomManager: ZoomManager;
  private hasRendered = false;
  private highlightedNodes: Set<string> | null = null;
  private dragEnabled: boolean = true;
  private onNodeMove: ((nodeId: string, newParentId: string) => void) | null = null;

  constructor(options: RendererOptions) {
    this.opts = {
      icNodeWidth: Math.round(options.nodeWidth * 0.77),
      icGap: 4,
      icContainerPadding: 6,
      branchSpacing: 10,
      topVerticalSpacing: 5,
      bottomVerticalSpacing: 12,
      palTopGap: 7,
      palBottomGap: 7,
      palRowGap: 4,
      palCenterGap: 50,
      nameFontSize: 8,
      titleFontSize: 7,
      textPaddingTop: 4,
      textGap: 1,
      linkColor: '#94a3b8',
      linkWidth: 1.5,
      cardFill: '#ffffff',
      cardStroke: '#22c55e',
      cardStrokeWidth: 1,
      icContainerFill: '#e5e7eb',
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

  setCollapseToggleHandler(handler: (nodeId: string) => void): void {
    this.onCollapseToggle = handler;
  }

  setHighlightedNodes(nodeIds: Set<string> | null): void {
    this.highlightedNodes = nodeIds;
    this.applyHighlighting();
  }

  setNodeMoveHandler(handler: (nodeId: string, newParentId: string) => void): void {
    this.onNodeMove = handler;
  }

  setDragEnabled(enabled: boolean): void {
    this.dragEnabled = enabled;
  }

  render(root: OrgNode): void {
    const layout = computeLayout(root, this.opts, this.collapsed);
    this.lastLayout = layout;

    this.g.selectAll('*').remove();

    const{ nodeHeight, linkColor, linkWidth, icContainerFill } = this.opts;

    // Layer 1: Tree links (elbow paths + vertical connectors through PAL area)
    const linksGroup = this.g.append('g').attr('class', 'links');
    for (const link of layout.links.filter((l) => l.layer === 'tree')) {
      linksGroup.append('path')
        .attr('class', 'link')
        .attr('d', link.path)
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth);
    }

    // Layer 2: IC stacks (behind manager nodes)
    const icGroup = this.g.append('g').attr('class', 'ic-stacks');
    for (const container of layout.icContainers) {
      icGroup.append('rect')
        .attr('class', 'ic-container')
        .attr('x', container.x)
        .attr('y', container.y)
        .attr('width', container.width)
        .attr('height', container.height)
        .attr('fill', icContainerFill);
    }

    for (const node of layout.nodes.filter((n) => n.type === 'ic')) {
      const g = icGroup.append('g')
        .attr('class', 'node ic-node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = { data: { id: node.id, name: node.name, title: node.title } };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(sel as any, node.width, nodeHeight, () => node.id);
    }

    // Layer 3: PAL stacks (on top of tree links)
    const palGroup = this.g.append('g').attr('class', 'pal-stacks');
    for (const link of layout.links.filter((l) => l.layer === 'pal')) {
      palGroup.append('path')
        .attr('class', 'link')
        .attr('d', link.path)
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth);
    }

    for (const node of layout.nodes.filter((n) => n.type === 'pal')) {
      const g = palGroup.append('g')
        .attr('class', 'node pal-node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = { data: { id: node.id, name: node.name, title: node.title } };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(sel as any, node.width, nodeHeight, () => node.id);
    }

    // Layer 4: Manager nodes (topmost)
    const nodesGroup = this.g.append('g').attr('class', 'nodes');
    const managerNodes = layout.nodes.filter((n) => n.type === 'manager');

    for (const node of managerNodes) {
      const g = nodesGroup.append('g')
        .attr('class', 'node')
        .attr('data-id', node.id)
        .attr('transform', `translate(${node.x - node.width / 2},${node.y})`);

      const datum = { data: { id: node.id, name: node.name, title: node.title } };
      const sel = d3.select(g.node()!).datum(datum);
      this.renderCardContent(sel as any, node.width, nodeHeight, (d: any) => d.data.id);

      if (node.collapsible) {
        d3.select(g.node()!).append('text')
          .attr('class', 'collapse-indicator')
          .attr('x', node.width / 2)
          .attr('y', nodeHeight + 14)
          .attr('text-anchor', 'middle')
          .attr('cursor', 'pointer')
          .text(this.collapsed.has(node.id) ? '▸' : '▾')
          .text(this.collapsed.has(node.id) ? '▸' : '▾')
          .on('click', () => {
            this.toggleCollapse(node.id);
            if (this.onCollapseToggle) {
              this.onCollapseToggle(node.id);
            }
          });
      }

      if (this.dragEnabled) {
        const self = this;
        const dragBehavior = d3.drag<SVGGElement, unknown>()
          .on('start', function (event) {
            event.sourceEvent.stopPropagation();
            const parent = this.parentNode;
            if (parent) parent.appendChild(this);
            d3.select(this).raise().classed('dragging', true);
            d3.select(this).style('cursor', 'grabbing');
          })
          .on('drag', function (event) {
            const current = d3.select(this);
            const transform = current.attr('transform');
            const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
            if (match) {
              const x = parseFloat(match[1]) + event.dx;
              const y = parseFloat(match[2]) + event.dy;
              current.attr('transform', `translate(${x},${y})`);
            }
          })
          .on('end', function (_event) {
            d3.select(this).classed('dragging', false);
            d3.select(this).style('cursor', null);

            if (!self.onNodeMove || !self.lastLayout) return;

            const draggedId = d3.select(this).attr('data-id');
            if (!draggedId) return;

            const transform = d3.select(this).attr('transform');
            const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
            if (!match) return;

            const dropX = parseFloat(match[1]);
            const dropY = parseFloat(match[2]);

            let closestId: string | null = null;
            let closestDist = Infinity;

            for (const layoutNode of self.lastLayout.nodes) {
              if (layoutNode.id === draggedId || layoutNode.type !== 'manager') continue;
              const nx = layoutNode.x - layoutNode.width / 2;
              const ny = layoutNode.y;
              const dist = Math.sqrt(Math.pow(dropX - nx, 2) + Math.pow(dropY - ny, 2));
              if (dist < closestDist) {
                closestDist = dist;
                closestId = layoutNode.id;
              }
            }

            const threshold = self.opts.nodeWidth * 1.5;
            if (closestId && closestDist < threshold) {
              try {
                self.onNodeMove(draggedId, closestId);
              } catch (_e) {
                // Move failed (e.g., circular reference) — re-render will snap back
              }
            }
          });

        d3.select(g.node()!).call(dragBehavior as any);
      }
    }

    if (this.hasRendered) {
      this.zoomManager.applyTransform(this.zoomManager.getCurrentTransform());
    } else {
      this.zoomManager.fitToContent();
      this.hasRendered = true;
    }

    this.applyHighlighting();
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
    selection: d3.Selection<SVGGElement, any, any, any>,
    width: number,
    height: number,
    getId: (d: any) => string,
  ): void {
    const { textPaddingTop, nameFontSize, titleFontSize, textGap,
            cardFill, cardStroke, cardStrokeWidth } = this.opts;
    const self = this;
    const titleY = textPaddingTop + nameFontSize + textGap;

    selection.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', cardFill)
      .attr('stroke', cardStroke)
      .attr('stroke-width', cardStrokeWidth)
      .on('click', function (_event, d) {
        if (self.onNodeClick) self.onNodeClick(getId(d));
      });

    selection.append('text')
      .attr('class', 'node-name')
      .attr('x', width / 2)
      .attr('y', textPaddingTop)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Calibri, sans-serif')
      .attr('font-size', `${nameFontSize}px`)
      .text((d: any) => d.data?.name ?? d.name);

    selection.append('text')
      .attr('class', 'node-title')
      .attr('x', width / 2)
      .attr('y', titleY)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Calibri, sans-serif')
      .attr('font-size', `${titleFontSize}px`)
      .attr('fill', '#64748b')
      .text((d: any) => d.data?.title ?? d.title);
  }

  toggleCollapse(id: string): void {
    if (this.collapsed.has(id)) {
      this.collapsed.delete(id);
    } else {
      this.collapsed.add(id);
    }
  }

  isCollapsed(id: string): boolean {
    return this.collapsed.has(id);
  }

  getCollapsed(): Set<string> {
    return new Set(this.collapsed);
  }

  setSelectedNode(nodeId: string | null): void {
    this.g.selectAll('.node').classed('selected', false);
    if (nodeId) {
      this.g.selectAll<SVGGElement, unknown>('.node')
        .filter(function () { return this.getAttribute('data-id') === nodeId; })
        .classed('selected', true);
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

  destroy(): void {
    this.svg.remove();
  }
}
