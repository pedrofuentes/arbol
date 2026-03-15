import { ChartRenderer, type RendererOptions } from './chart-renderer';
import type { OrgNode } from '../types';

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

export interface PreviewOptions {
  /** Partial renderer options to merge with defaults. */
  rendererOptions?: Partial<RendererOptions>;
  /** Custom tree to render (defaults to PREVIEW_TREE). */
  tree?: OrgNode;
}

/**
 * Renders a preview SVG using the full ChartRenderer in preview mode.
 * Uses the same rendering code as the main chart — zero divergence.
 */
export function renderPreview(options?: PreviewOptions): SVGSVGElement {
  const tree = options?.tree ?? PREVIEW_TREE;
  const partial = options?.rendererOptions ?? {};

  // Temporary off-screen container for ChartRenderer
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;';
  document.body.appendChild(container);

  // Strip container and preview from partial — we control those ourselves
  const { container: _, preview: __, ...rendererOverrides } = partial as
    Partial<RendererOptions> & Record<string, unknown>;

  const renderer = new ChartRenderer({
    container,
    nodeWidth: 160,
    nodeHeight: 34,
    horizontalSpacing: 50,
    ...rendererOverrides,
    preview: true,
  });

  renderer.render(tree);

  const svg = renderer.getSvgElement();

  // Auto-fit viewBox from layout bounding box
  const layout = renderer.getLastLayout();
  if (layout) {
    const padding = 8;
    const { minX, minY, width, height } = layout.boundingBox;
    svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`);
  }

  svg.style.maxHeight = '100%';

  // Detach SVG from the temporary container and clean up
  svg.remove();
  document.body.removeChild(container);

  return svg;
}
