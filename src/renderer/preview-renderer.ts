import { computeLayout, LayoutNode, LayoutLink, LayoutICContainer, LayoutResult } from './layout-engine';
import type { ResolvedOptions } from './chart-renderer';
import type { OrgNode, ColorCategory } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Fixed sample tree for the settings preview:
 * Root → 1 advisor, 2 managers (each with 1 IC).
 */
export const PREVIEW_TREE: OrgNode = {
  id: 'prev-root',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    { id: 'prev-advisor', name: 'Quinn Rivera', title: 'Chief of Staff' },
    {
      id: 'prev-mgr1',
      name: 'Alex Kim',
      title: 'VP Engineering',
      children: [{ id: 'prev-ic1', name: 'Jordan Lee', title: 'Staff Engineer' }],
    },
    {
      id: 'prev-mgr2',
      name: 'Maria Lopez',
      title: 'VP Sales',
      children: [{ id: 'prev-ic2', name: 'Sam Patel', title: 'Account Executive' }],
    },
  ],
};

/** Default values matching ChartRenderer constructor defaults. */
const BASE_DEFAULTS: Omit<ResolvedOptions, 'container'> = {
  nodeWidth: 160,
  nodeHeight: 34,
  horizontalSpacing: 50,
  branchSpacing: 20,
  topVerticalSpacing: 10,
  bottomVerticalSpacing: 20,
  icNodeWidth: 141,
  icGap: 6,
  icContainerPadding: 10,
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
};

export interface PreviewOptions {
  /** Partial renderer options to merge with defaults. */
  rendererOptions?: Partial<ResolvedOptions>;
  /** Custom tree to render (defaults to PREVIEW_TREE). */
  tree?: OrgNode;
}

/**
 * Renders a lightweight SVG preview of an org chart using the layout engine.
 * No D3, no zoom, no interactivity — pure SVG DOM.
 */
export function renderPreview(options?: PreviewOptions): SVGSVGElement {
  const tree = options?.tree ?? PREVIEW_TREE;
  const partial = options?.rendererOptions ?? {};

  const resolved = {
    ...BASE_DEFAULTS,
    ...partial,
    // Recompute icNodeWidth if nodeWidth changed but icNodeWidth wasn't explicitly set
    icNodeWidth: partial.icNodeWidth ?? Math.round((partial.nodeWidth ?? BASE_DEFAULTS.nodeWidth) * 0.88),
    container: null as unknown as HTMLElement,
  } as ResolvedOptions;

  const layout = computeLayout(tree, resolved);
  const { boundingBox } = layout;

  const padding = 8;
  const vbX = boundingBox.minX - padding;
  const vbY = boundingBox.minY - padding;
  const vbW = boundingBox.width + padding * 2;
  const vbH = boundingBox.height + padding * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('class', 'preview-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.maxHeight = '100%';

  const categoryMap = new Map<string, ColorCategory>(
    (resolved.categories ?? []).map((c) => [c.id, c]),
  );

  renderLinks(svg, layout.links, resolved);
  renderICContainers(svg, layout.icContainers, resolved);
  renderNodes(svg, layout.nodes, resolved, categoryMap);

  return svg;
}

function renderLinks(svg: SVGSVGElement, links: LayoutLink[], opts: ResolvedOptions): void {
  for (const link of links) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', link.path);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', opts.linkColor);
    path.setAttribute('stroke-width', String(opts.linkWidth));
    if (link.dottedLine) {
      path.setAttribute('stroke-dasharray', opts.dottedLineDash);
    }
    svg.appendChild(path);
  }
}

function renderICContainers(
  svg: SVGSVGElement,
  containers: LayoutICContainer[],
  opts: ResolvedOptions,
): void {
  for (const c of containers) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(c.x));
    rect.setAttribute('y', String(c.y));
    rect.setAttribute('width', String(c.width));
    rect.setAttribute('height', String(c.height));
    rect.setAttribute('rx', String(opts.icContainerBorderRadius));
    rect.setAttribute('ry', String(opts.icContainerBorderRadius));
    rect.setAttribute('fill', opts.icContainerFill);
    svg.appendChild(rect);
  }
}

function renderNodes(
  svg: SVGSVGElement,
  nodes: LayoutNode[],
  opts: ResolvedOptions,
  categoryMap: Map<string, ColorCategory>,
): void {
  const {
    nodeHeight,
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
  } = opts;

  const svgAnchor =
    textAlign === 'left' || textAlign === 'start'
      ? 'start'
      : textAlign === 'right' || textAlign === 'end'
        ? 'end'
        : 'middle';

  for (const node of nodes) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${node.x - node.width / 2},${node.y})`);

    const w = node.width;
    const h = node.type === 'ic' ? nodeHeight : nodeHeight;

    // Resolve category colors
    const cat = node.categoryId ? categoryMap.get(node.categoryId) : undefined;
    const fill = cat?.color ?? cardFill;
    const nColor = cat?.nameColor ?? nameColor;
    const tColor = cat?.titleColor ?? titleColor;

    // Card rectangle
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', String(cardBorderRadius));
    rect.setAttribute('ry', String(cardBorderRadius));
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', cardStroke);
    rect.setAttribute('stroke-width', String(cardStrokeWidth));
    g.appendChild(rect);

    // Text X position based on alignment
    const textX =
      textAlign === 'left' || textAlign === 'start'
        ? textPaddingHorizontal
        : textAlign === 'right' || textAlign === 'end'
          ? w - textPaddingHorizontal
          : w / 2;

    const fontStack = `${fontFamily}, sans-serif`;

    // Name text
    const nameText = document.createElementNS(SVG_NS, 'text');
    nameText.setAttribute('x', String(textX));
    nameText.setAttribute('y', String(textPaddingTop));
    nameText.setAttribute('dominant-baseline', 'hanging');
    nameText.setAttribute('text-anchor', svgAnchor);
    nameText.setAttribute('font-weight', 'bold');
    nameText.setAttribute('font-family', fontStack);
    nameText.setAttribute('font-size', `${nameFontSize}px`);
    nameText.setAttribute('fill', nColor);
    nameText.textContent = node.name;
    g.appendChild(nameText);

    // Title text
    const titleText = document.createElementNS(SVG_NS, 'text');
    titleText.setAttribute('x', String(textX));
    titleText.setAttribute('y', String(textPaddingTop + nameFontSize + textGap));
    titleText.setAttribute('dominant-baseline', 'hanging');
    titleText.setAttribute('text-anchor', svgAnchor);
    titleText.setAttribute('font-family', fontStack);
    titleText.setAttribute('font-size', `${titleFontSize}px`);
    titleText.setAttribute('fill', tColor);
    titleText.textContent = node.title;
    g.appendChild(titleText);

    svg.appendChild(g);
  }
}
