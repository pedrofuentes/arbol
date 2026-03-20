import {
  hierarchy,
  partition,
  arc,
  select,
  interpolate,
} from 'd3';
import type { HierarchyRectangularNode } from 'd3';
import type { OrgNode, ColorCategory } from '../types';
import { t } from '../i18n';

interface ArcAngles {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const TRANSITION_MS = 650;
const DEFAULT_COLOR = '#6b7280';
const MAX_VISIBLE_DEPTH = 3;

function countDescendants(node: OrgNode): number {
  if (!node.children || node.children.length === 0) return 0;
  let count = node.children.length;
  for (const child of node.children) count += countDescendants(child);
  return count;
}

function arcVisible(a: ArcAngles): boolean {
  return a.y1 <= MAX_VISIBLE_DEPTH && a.y0 >= 1 && a.x1 > a.x0;
}

function getAncestorChain(
  node: HierarchyRectangularNode<OrgNode>,
): HierarchyRectangularNode<OrgNode>[] {
  const chain: HierarchyRectangularNode<OrgNode>[] = [];
  let current: HierarchyRectangularNode<OrgNode> | null = node;
  while (current) {
    chain.unshift(current);
    current = current.parent;
  }
  return chain;
}

export class SunburstChart {
  private container: HTMLElement;
  private tooltip: HTMLDivElement | null = null;
  private rootDiv: HTMLDivElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(tree: OrgNode, categories: ColorCategory[]): void {
    this.destroy();

    if (!tree.children || tree.children.length === 0) {
      const wrapper = document.createElement('div');
      wrapper.className = 'sunburst-chart';
      const msg = document.createElement('div');
      msg.className = 'sunburst-no-data';
      msg.textContent = t('analytics.viz.no_data');
      wrapper.appendChild(msg);
      this.container.appendChild(wrapper);
      this.rootDiv = wrapper;
      return;
    }

    const categoryMap = new Map<string, ColorCategory>();
    for (const cat of categories) categoryMap.set(cat.id, cat);

    // Build hierarchy and apply partition layout
    const hierRoot = hierarchy<OrgNode>(tree)
      .sum((d) => (!d.children || d.children.length === 0 ? 1 : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const root = partition<OrgNode>().size([
      2 * Math.PI,
      hierRoot.height + 1,
    ])(hierRoot);

    // Sizing
    const width = Math.min(this.container.clientWidth || 500, 500);
    const radius = width / 6;

    // ── DOM structure ───────────────────────────────────────────────

    const rootDiv = document.createElement('div');
    rootDiv.className = 'sunburst-chart';
    this.rootDiv = rootDiv;

    // Breadcrumb bar
    const breadcrumbDiv = document.createElement('div');
    breadcrumbDiv.className = 'sunburst-breadcrumb';
    breadcrumbDiv.setAttribute(
      'style',
      [
        'display: flex',
        'flex-wrap: wrap',
        'align-items: center',
        'gap: 4px',
        'padding: 8px 0',
        'font-size: 12px',
        'color: var(--text-secondary)',
      ].join('; '),
    );
    rootDiv.appendChild(breadcrumbDiv);

    // SVG wrapper (relative container for center label overlay)
    const svgWrapper = document.createElement('div');
    svgWrapper.style.position = 'relative';
    svgWrapper.style.width = `${width}px`;
    svgWrapper.style.margin = '0 auto';
    rootDiv.appendChild(svgWrapper);

    const svg = select(svgWrapper)
      .append('svg')
      .attr(
        'viewBox',
        `${-width / 2} ${-width / 2} ${width} ${width}`,
      )
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    // Center label overlay
    const centerLabel = document.createElement('div');
    centerLabel.className = 'sunburst-center-label';
    centerLabel.setAttribute(
      'style',
      [
        'position: absolute',
        'top: 50%',
        'left: 50%',
        'transform: translate(-50%, -50%)',
        'text-align: center',
        'pointer-events: none',
        `max-width: ${radius * 1.8}px`,
      ].join('; '),
    );
    svgWrapper.appendChild(centerLabel);

    // Tooltip (fixed-position, appended to body)
    const tooltip = document.createElement('div');
    tooltip.className = 'sunburst-tooltip';
    tooltip.setAttribute(
      'style',
      [
        'position: fixed',
        'display: none',
        'pointer-events: none',
        'padding: 8px 12px',
        'font-size: 12px',
        'line-height: 1.4',
        'z-index: 9999',
        'max-width: 260px',
        'background: var(--bg-elevated)',
        'color: var(--text-primary)',
        'border: 1px solid var(--border-primary)',
        'border-radius: var(--radius-md)',
        'box-shadow: var(--shadow-md)',
      ].join('; '),
    );
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;

    // ── Arc generator ───────────────────────────────────────────────

    const arcGen = arc<ArcAngles>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) =>
        Math.max(d.y0 * radius, d.y1 * radius - 1),
      );

    // ── Angle state ─────────────────────────────────────────────────

    const currentAngles = new Map<string, ArcAngles>();
    const targetAngles = new Map<string, ArcAngles>();
    let focus = root;

    root.each((d) => {
      currentAngles.set(d.data.id, {
        x0: d.x0,
        x1: d.x1,
        y0: d.y0,
        y1: d.y1,
      });
    });

    // ── Color resolver ──────────────────────────────────────────────

    function getNodeColor(
      node: HierarchyRectangularNode<OrgNode>,
    ): string {
      let colorSource = node;
      if (node.depth > 1) {
        let ancestor: HierarchyRectangularNode<OrgNode> = node;
        while (ancestor.depth > 1 && ancestor.parent) {
          ancestor = ancestor.parent;
        }
        colorSource = ancestor;
      }
      const catId = colorSource.data.categoryId;
      if (catId) {
        const cat = categoryMap.get(catId);
        if (cat) return cat.color;
      }
      return DEFAULT_COLOR;
    }

    // ── Draw arcs ───────────────────────────────────────────────────

    const g = svg.append('g');
    const descendants = root.descendants().slice(1);

    const paths = g
      .selectAll<SVGPathElement, never>('path')
      .data(descendants, (d) => d.data.id)
      .join((enter) => enter.append('path'))
      .attr('fill', (d) => getNodeColor(d))
      .attr('fill-opacity', (d) => {
        const a = currentAngles.get(d.data.id)!;
        return arcVisible(a) ? (d.children ? 0.7 : 0.5) : 0;
      })
      .attr('pointer-events', (d) => {
        const a = currentAngles.get(d.data.id)!;
        return arcVisible(a) ? 'auto' : 'none';
      })
      .attr('d', (d) => arcGen(currentAngles.get(d.data.id)!) ?? '')
      .style('cursor', 'pointer');

    // Invisible center circle for "go back" click target
    const centerCircle = g
      .append('circle')
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer');

    // ── UI update helpers ───────────────────────────────────────────

    function updateCenterLabel(
      node: HierarchyRectangularNode<OrgNode>,
    ): void {
      centerLabel.textContent = '';

      const nameEl = document.createElement('div');
      nameEl.setAttribute(
        'style',
        'font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary)',
      );
      nameEl.textContent = node.data.name;
      centerLabel.appendChild(nameEl);

      if (node.data.title) {
        const titleEl = document.createElement('div');
        titleEl.setAttribute(
          'style',
          'font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary)',
        );
        titleEl.textContent = node.data.title;
        centerLabel.appendChild(titleEl);
      }

      const descCount = countDescendants(node.data);
      const countEl = document.createElement('div');
      countEl.setAttribute(
        'style',
        'font-size: 11px; margin-top: 2px; color: var(--text-tertiary)',
      );
      if (descCount === 0) {
        countEl.textContent = t('analytics.viz.individual_contributor');
      } else {
        countEl.textContent = `${descCount} ${t('analytics.viz.people_in_org')}`;
      }
      centerLabel.appendChild(countEl);

      const hintEl = document.createElement('div');
      hintEl.setAttribute(
        'style',
        'font-size: 10px; margin-top: 4px; color: var(--text-tertiary)',
      );
      hintEl.textContent =
        node === root
          ? t('analytics.viz.click_to_zoom')
          : t('analytics.viz.click_center_back');
      centerLabel.appendChild(hintEl);
    }

    function updateBreadcrumb(
      node: HierarchyRectangularNode<OrgNode>,
    ): void {
      breadcrumbDiv.textContent = '';
      const chain = getAncestorChain(node);

      chain.forEach((ancestor, idx) => {
        if (idx > 0) {
          const sep = document.createElement('span');
          sep.setAttribute('style', 'color: var(--text-tertiary)');
          sep.textContent = '›';
          breadcrumbDiv.appendChild(sep);
        }

        const item = document.createElement('span');
        item.textContent = ancestor.data.name;

        if (idx < chain.length - 1) {
          item.setAttribute(
            'style',
            'cursor: pointer; text-decoration: underline; color: var(--text-secondary)',
          );
          item.addEventListener('click', () => zoomTo(ancestor));
        } else {
          item.setAttribute(
            'style',
            'font-weight: 600; color: var(--text-primary)',
          );
        }

        breadcrumbDiv.appendChild(item);
      });
    }

    // ── Zoom ────────────────────────────────────────────────────────

    function zoomTo(
      target: HierarchyRectangularNode<OrgNode>,
    ): void {
      if (!target.children) return;
      focus = target;

      root.each((d) => {
        const span = target.x1 - target.x0;
        targetAngles.set(d.data.id, {
          x0:
            Math.max(0, Math.min(1, (d.x0 - target.x0) / span)) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - target.x0) / span)) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - target.depth),
          y1: Math.max(0, d.y1 - target.depth),
        });
      });

      paths
        .transition()
        .duration(TRANSITION_MS)
        .tween('data', (d) => {
          const curr = { ...currentAngles.get(d.data.id)! };
          const tgt = targetAngles.get(d.data.id)!;
          const interp = interpolate(curr, tgt);
          return (tweenT: number) => {
            currentAngles.set(d.data.id, { ...interp(tweenT) });
          };
        })
        .attr('fill-opacity', (d) => {
          const tgt = targetAngles.get(d.data.id)!;
          return arcVisible(tgt) ? (d.children ? 0.7 : 0.5) : 0;
        })
        .attr('pointer-events', (d) => {
          const tgt = targetAngles.get(d.data.id)!;
          return arcVisible(tgt) ? 'auto' : 'none';
        })
        .attrTween('d', (d) => {
          return () => arcGen(currentAngles.get(d.data.id)!) ?? '';
        });

      updateCenterLabel(target);
      updateBreadcrumb(target);
    }

    // ── Event handlers ──────────────────────────────────────────────

    paths.on('click', (_event, d) => {
      if (d.children) zoomTo(d);
    });

    centerCircle.on('click', () => {
      if (focus !== root && focus.parent) {
        zoomTo(focus.parent);
      }
    });

    paths
      .on('mouseover', (event: MouseEvent, d) => {
        tooltip.textContent = '';
        tooltip.style.display = 'block';

        const node = d.data;

        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = '600';
        nameEl.textContent = node.name;
        tooltip.appendChild(nameEl);

        if (node.title) {
          const titleEl = document.createElement('div');
          titleEl.setAttribute(
            'style',
            'color: var(--text-secondary); font-size: 11px',
          );
          titleEl.textContent = node.title;
          tooltip.appendChild(titleEl);
        }

        const cat = node.categoryId
          ? categoryMap.get(node.categoryId)
          : undefined;
        const deptEl = document.createElement('div');
        deptEl.setAttribute(
          'style',
          'color: var(--text-secondary); font-size: 11px; margin-top: 4px',
        );
        deptEl.textContent = `${t('analytics.viz.department')}: ${cat ? cat.label : t('analytics.viz.uncategorized')}`;
        tooltip.appendChild(deptEl);

        if (node.level) {
          const levelEl = document.createElement('div');
          levelEl.setAttribute(
            'style',
            'color: var(--text-secondary); font-size: 11px',
          );
          levelEl.textContent = `${t('analytics.viz.level')}: ${node.level}`;
          tooltip.appendChild(levelEl);
        }

        const directReports = node.children ? node.children.length : 0;
        const drEl = document.createElement('div');
        drEl.setAttribute(
          'style',
          'color: var(--text-secondary); font-size: 11px',
        );
        drEl.textContent = `${t('analytics.viz.direct_reports')}: ${directReports}`;
        tooltip.appendChild(drEl);

        const totalOrg = countDescendants(node);
        const orgEl = document.createElement('div');
        orgEl.setAttribute(
          'style',
          'color: var(--text-secondary); font-size: 11px',
        );
        orgEl.textContent = `${t('analytics.viz.total_org_size')}: ${totalOrg}`;
        tooltip.appendChild(orgEl);

        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
      })
      .on('mouseout', () => {
        tooltip.style.display = 'none';
      });

    // ── Initial state & mount ───────────────────────────────────────

    updateCenterLabel(root);
    updateBreadcrumb(root);
    this.container.appendChild(rootDiv);
  }

  destroy(): void {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.tooltip = null;
    this.container.textContent = '';
    this.rootDiv = null;
  }
}
