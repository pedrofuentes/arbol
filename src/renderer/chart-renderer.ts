import * as d3 from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree, stripM1Children } from '../utils/tree';

export interface RendererOptions {
  container: HTMLElement;
  // Card dimensions
  nodeWidth: number;
  nodeHeight: number;
  // Tree layout spacing
  horizontalSpacing: number;
  verticalSpacing: number;
  // IC (Individual Contributor) options
  icNodeWidth?: number;
  icGap?: number;
  icContainerPadding?: number;
  // PAL options
  palTopGap?: number;
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

interface ResolvedOptions extends Required<RendererOptions> {}

export type NodeClickHandler = (nodeId: string) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private opts: ResolvedOptions;
  private collapsed: Set<string> = new Set();
  private onNodeClick: NodeClickHandler | null = null;
  private onCollapseToggle: ((nodeId: string) => void) | null = null;

  constructor(options: RendererOptions) {
    this.opts = {
      icNodeWidth: Math.round(options.nodeWidth * 0.77),
      icGap: 4,
      icContainerPadding: 6,
      palTopGap: 10,
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
  }

  setNodeClickHandler(handler: NodeClickHandler): void {
    this.onNodeClick = handler;
  }

  setCollapseToggleHandler(handler: (nodeId: string) => void): void {
    this.onCollapseToggle = handler;
  }

  render(root: OrgNode): void {
    const visibleTree = filterVisibleTree(root, this.collapsed);
    const { layoutTree, icMap, palMap } = stripM1Children(visibleTree, this.collapsed);
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, palCenterGap } = this.opts;

    const hierarchy = d3.hierarchy(layoutTree, (d) => d.children);
    const palTotalWidth = nodeWidth * 2 + palCenterGap;

    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([
        nodeWidth + horizontalSpacing,
        nodeHeight + verticalSpacing,
      ])
      .separation((a, b) => {
        const aHasPals = palMap.has(a.data.id);
        const bHasPals = palMap.has(b.data.id);
        const base = a.parent === b.parent ? 1 : 2;
        if (aHasPals || bHasPals) {
          return Math.max(base, palTotalWidth / (nodeWidth + horizontalSpacing) + 0.3);
        }
        return base;
      });

    const treeData = treeLayout(hierarchy);

    // Shift subtrees down to make room for PAL stacks
    const getPalStackHeight = (nodeId: string): number => {
      const pals = palMap.get(nodeId);
      if (!pals || pals.length === 0) return 0;
      const { palTopGap, palRowGap } = this.opts;
      const rows = Math.ceil(pals.length / 2);
      return palTopGap + palRowGap + rows * nodeHeight + (rows - 1) * palRowGap;
    };

    const shiftSubtree = (node: d3.HierarchyPointNode<OrgNode>, extraY: number): void => {
      node.y += extraY;
      for (const child of node.children ?? []) {
        shiftSubtree(child, extraY);
      }
    };

    for (const node of treeData.descendants()) {
      const palHeight = getPalStackHeight(node.data.id);
      if (palHeight > 0 && node.children) {
        for (const child of node.children) {
          shiftSubtree(child, palHeight);
        }
      }
    }

    this.g.selectAll('*').remove();

    // Layer 1: Tree links
    const linksGroup = this.g.append('g').attr('class', 'links');
    this.renderTreeLinks(linksGroup, treeData, getPalStackHeight);

    // Layer 2: IC stacks (behind manager nodes)
    const icGroup = this.g.append('g').attr('class', 'ic-stacks');
    for (const treeNode of treeData.descendants()) {
      const ics = icMap.get(treeNode.data.id);
      if (ics && ics.length > 0) {
        this.renderICStack(icGroup, treeNode.x, treeNode.y, ics);
      }
    }

    // Layer 3: PAL stacks (on top of tree links)
    const palGroup = this.g.append('g').attr('class', 'pal-stacks');
    for (const treeNode of treeData.descendants()) {
      const pals = palMap.get(treeNode.data.id);
      if (pals && pals.length > 0) {
        this.renderPALStack(palGroup, treeNode.x, treeNode.y, pals);
      }
    }

    // Layer 4: Manager nodes (topmost)
    const nodesGroup = this.g.append('g').attr('class', 'nodes');
    const nodes = nodesGroup
      .selectAll('g')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', (d) => d.data.id)
      .attr('transform', (d) => `translate(${d.x - nodeWidth / 2},${d.y})`);

    this.renderCardContent(nodes, nodeWidth, nodeHeight, (d) => d.data.id);

    // Collapse/expand indicators
    nodes
      .filter((d) =>
        (d.data.children && d.data.children.length > 0) ||
        icMap.has(d.data.id) ||
        this.collapsed.has(d.data.id)
      )
      .append('text')
      .attr('class', 'collapse-indicator')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight + 14)
      .attr('text-anchor', 'middle')
      .attr('cursor', 'pointer')
      .text((d) => (this.collapsed.has(d.data.id) ? '▸' : '▾'))
      .on('click', (_event, d) => {
        this.toggleCollapse(d.data.id);
        if (this.onCollapseToggle) {
          this.onCollapseToggle(d.data.id);
        }
      });

    this.centerContent();
  }

  // --- Rendering helpers ---

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

  private renderLink(
    parent: d3.Selection<SVGGElement, unknown, null | SVGGElement, unknown>,
    d: string,
  ): void {
    parent.append('path')
      .attr('class', 'link')
      .attr('d', d)
      .attr('fill', 'none')
      .attr('stroke', this.opts.linkColor)
      .attr('stroke-width', this.opts.linkWidth);
  }

  private renderTreeLinks(
    linksGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    treeData: d3.HierarchyPointNode<OrgNode>,
    getPalStackHeight: (id: string) => number,
  ): void {
    const { nodeHeight } = this.opts;

    // Elbow links from below PAL area to children
    linksGroup
      .selectAll('path.tree-link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sx = d.source.x;
        const palOffset = getPalStackHeight(d.source.data.id);
        const sy = d.source.y + nodeHeight + palOffset;
        const tx = d.target.x;
        const ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', this.opts.linkColor)
      .attr('stroke-width', this.opts.linkWidth);

    // Vertical connector through PAL area
    for (const node of treeData.descendants()) {
      const palOffset = getPalStackHeight(node.data.id);
      if (palOffset > 0 && node.children && node.children.length > 0) {
        this.renderLink(
          linksGroup,
          `M${node.x},${node.y + nodeHeight} L${node.x},${node.y + nodeHeight + palOffset}`,
        );
      }
    }
  }

  private renderICStack(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    m1X: number,
    m1Y: number,
    ics: OrgNode[],
  ): void {
    const { nodeHeight, icNodeWidth, icGap, icContainerPadding, icContainerFill } = this.opts;
    const startY = m1Y + nodeHeight;
    const totalHeight = ics.length * nodeHeight + (ics.length - 1) * icGap + icContainerPadding * 2;
    const totalWidth = icNodeWidth + icContainerPadding * 2;

    parent.append('rect')
      .attr('class', 'ic-container')
      .attr('x', m1X - totalWidth / 2)
      .attr('y', startY)
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .attr('fill', icContainerFill);

    ics.forEach((ic, i) => {
      const x = m1X - icNodeWidth / 2;
      const y = startY + icContainerPadding + i * (nodeHeight + icGap);

      const g = parent.append('g')
        .attr('class', 'node ic-node')
        .attr('data-id', ic.id)
        .attr('transform', `translate(${x},${y})`);

      const icData = { data: ic };
      const sel = d3.select(g.node()!).datum(icData);
      this.renderCardContent(sel as any, icNodeWidth, nodeHeight, () => ic.id);
    });
  }

  private renderPALStack(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    mgrX: number,
    mgrY: number,
    pals: OrgNode[],
  ): void {
    const { nodeWidth, nodeHeight, palTopGap, palRowGap, palCenterGap } = this.opts;
    const startY = mgrY + nodeHeight + palTopGap;
    const hasTwoCols = pals.length > 1;

    pals.forEach((pal, i) => {
      const row = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const x = hasTwoCols
        ? (isLeft ? mgrX - palCenterGap / 2 - nodeWidth : mgrX + palCenterGap / 2)
        : mgrX - nodeWidth / 2;
      const y = startY + palRowGap + row * (nodeHeight + palRowGap);

      // Elbow link: down from manager, then horizontal to PAL side-center
      const palConnectX = isLeft ? x + nodeWidth : x;
      const palConnectY = y + nodeHeight / 2;
      this.renderLink(parent, `M${mgrX},${mgrY + nodeHeight} L${mgrX},${palConnectY} L${palConnectX},${palConnectY}`);

      const g = parent.append('g')
        .attr('class', 'node pal-node')
        .attr('data-id', pal.id)
        .attr('transform', `translate(${x},${y})`);

      const palData = { data: pal };
      const sel = d3.select(g.node()!).datum(palData);
      this.renderCardContent(sel as any, nodeWidth, nodeHeight, () => pal.id);
    });
  }

  private centerContent(): void {
    const svgNode = this.svg.node()!;
    const gNode = this.g.node()!;
    if (typeof gNode.getBBox !== 'function') return;

    const bbox = gNode.getBBox();
    const svgWidth = svgNode.clientWidth || svgNode.getBoundingClientRect().width;
    const svgHeight = svgNode.clientHeight || svgNode.getBoundingClientRect().height;
    if (bbox.width === 0 || bbox.height === 0) return;

    const padding = 40;
    const scale = Math.min(
      (svgWidth - padding * 2) / bbox.width,
      (svgHeight - padding * 2) / bbox.height,
      1.5,
    );
    const tx = svgWidth / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = padding - bbox.y * scale;
    this.g.attr('transform', `translate(${tx},${ty}) scale(${scale})`);
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
      this.g.select(`.node[data-id="${nodeId}"]`).classed('selected', true);
    }
  }

  getSvg(): SVGSVGElement {
    return this.svg.node()!;
  }

  getChartGroup(): SVGGElement {
    return this.g.node()!;
  }

  destroy(): void {
    this.svg.remove();
  }
}
