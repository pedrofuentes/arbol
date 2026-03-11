import * as d3 from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree } from '../utils/tree';

export interface RendererOptions {
  container: HTMLElement;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

export type NodeClickHandler = (nodeId: string) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private options: RendererOptions;
  private collapsed: Set<string> = new Set();
  private onNodeClick: NodeClickHandler | null = null;
  private onCollapseToggle: ((nodeId: string) => void) | null = null;

  constructor(options: RendererOptions) {
    this.options = options;
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
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } =
      this.options;

    const hierarchy = d3.hierarchy(visibleTree, (d) => d.children);
    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([
        nodeWidth + horizontalSpacing,
        nodeHeight + verticalSpacing,
      ]);

    const treeData = treeLayout(hierarchy);

    this.g.selectAll('*').remove();

    // Render links
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

    // Render nodes
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

    nodes
      .append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)
      .on('click', function (_event, d) {
        if (self.onNodeClick) {
          self.onNodeClick(d.data.id);
        }
      });

    nodes
      .append('text')
      .attr('class', 'node-name')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight / 2 - 6)
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-size', '13px')
      .text((d) => d.data.name);

    nodes
      .append('text')
      .attr('class', 'node-title')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#64748b')
      .text((d) => d.data.title);

    // Collapse/expand indicator for nodes with children
    nodes
      .filter((d) => {
        const original = d.data;
        return (
          (original.children && original.children.length > 0) ||
          this.collapsed.has(original.id)
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
