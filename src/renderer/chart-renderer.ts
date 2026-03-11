import * as d3 from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree, stripM1Children } from '../utils/tree';

export interface RendererOptions {
  container: HTMLElement;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  icNodeWidth?: number;
  icGap?: number;
  icTopGap?: number;
}

export type NodeClickHandler = (nodeId: string) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private options: Required<RendererOptions>;
  private collapsed: Set<string> = new Set();
  private onNodeClick: NodeClickHandler | null = null;
  private onCollapseToggle: ((nodeId: string) => void) | null = null;

  constructor(options: RendererOptions) {
    this.options = {
      icNodeWidth: Math.round(options.nodeWidth * 0.77),
      icGap: 2,
      icTopGap: 4,
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
    const { layoutTree, icMap } = stripM1Children(visibleTree, this.collapsed);
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } =
      this.options;

    const hierarchy = d3.hierarchy(layoutTree, (d) => d.children);
    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([
        nodeWidth + horizontalSpacing,
        nodeHeight + verticalSpacing,
      ]);

    const treeData = treeLayout(hierarchy);

    this.g.selectAll('*').remove();

    // Render links (only for manager nodes, not ICs)
    const linksGroup = this.g.append('g').attr('class', 'links');
    linksGroup
      .selectAll('path')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sx = d.source.x;
        const sy = d.source.y + nodeHeight;
        const tx = d.target.x;
        const ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5);

    // Render IC stacks below M1 nodes (rendered first so they're behind)
    const icGroup = this.g.append('g').attr('class', 'ic-stacks');
    for (const treeNode of treeData.descendants()) {
      const ics = icMap.get(treeNode.data.id);
      if (!ics || ics.length === 0) continue;
      this.renderICStack(icGroup, treeNode.x, treeNode.y, ics);
    }

    // Render manager nodes (on top of IC containers)
    const nodesGroup = this.g.append('g').attr('class', 'nodes');
    const self = this;
    const nodes = nodesGroup
      .selectAll('g')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', (d) => d.data.id)
      .attr(
        'transform',
        (d) => `translate(${d.x - nodeWidth / 2},${d.y})`,
      );

    this.renderNodeCards(nodes, nodeWidth, nodeHeight);

    // Collapse/expand indicator for nodes with children or ICs
    nodes
      .filter((d) => {
        return (
          (d.data.children && d.data.children.length > 0) ||
          icMap.has(d.data.id) ||
          this.collapsed.has(d.data.id)
        );
      })
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

  private renderNodeCards(
    nodes: d3.Selection<SVGGElement, d3.HierarchyPointNode<OrgNode>, SVGGElement, unknown>,
    width: number,
    height: number,
  ): void {
    const self = this;

    nodes
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', '#ffffff')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 1)
      .on('click', function (_event, d) {
        if (self.onNodeClick) {
          self.onNodeClick(d.data.id);
        }
      });

    nodes
      .append('text')
      .attr('class', 'node-name')
      .attr('x', width / 2)
      .attr('y', 4)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Calibri, sans-serif')
      .attr('font-size', '8px')
      .text((d) => d.data.name);

    nodes
      .append('text')
      .attr('class', 'node-title')
      .attr('x', width / 2)
      .attr('y', 13)
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Calibri, sans-serif')
      .attr('font-size', '7px')
      .attr('fill', '#64748b')
      .text((d) => d.data.title);
  }

  private renderICStack(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    m1X: number,
    m1Y: number,
    ics: OrgNode[],
  ): void {
    const { nodeHeight, icNodeWidth, icGap, icTopGap } = this.options;
    const self = this;
    const startY = m1Y + nodeHeight;
    const padding = 6;
    const totalHeight = ics.length * nodeHeight + (ics.length - 1) * icGap + padding * 2;
    const totalWidth = icNodeWidth + padding * 2;

    // Grey background container
    parent.append('rect')
      .attr('class', 'ic-container')
      .attr('x', m1X - totalWidth / 2)
      .attr('y', startY)
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .attr('fill', '#e5e7eb')
      .attr('rx', 0)
      .attr('ry', 0);

    ics.forEach((ic, i) => {
      const x = m1X - icNodeWidth / 2;
      const y = startY + padding + i * (nodeHeight + icGap);

      const g = parent.append('g')
        .attr('class', 'node ic-node')
        .attr('data-id', ic.id)
        .attr('transform', `translate(${x},${y})`);

      g.append('rect')
        .attr('width', icNodeWidth)
        .attr('height', nodeHeight)
        .attr('fill', '#ffffff')
        .attr('stroke', '#22c55e')
        .attr('stroke-width', 1)
        .on('click', function () {
          if (self.onNodeClick) {
            self.onNodeClick(ic.id);
          }
        });

      g.append('text')
        .attr('class', 'node-name')
        .attr('x', icNodeWidth / 2)
        .attr('y', 4)
        .attr('dominant-baseline', 'hanging')
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .attr('font-family', 'Calibri, sans-serif')
        .attr('font-size', '8px')
        .text(ic.name);

      g.append('text')
        .attr('class', 'node-title')
        .attr('x', icNodeWidth / 2)
        .attr('y', 13)
        .attr('dominant-baseline', 'hanging')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Calibri, sans-serif')
        .attr('font-size', '7px')
        .attr('fill', '#64748b')
        .text(ic.title);
    });
  }

  private centerContent(): void {
    const svgNode = this.svg.node()!;
    const gNode = this.g.node()!;

    // getBBox() is not available in jsdom/test environments
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
