import { ChartRenderer, type RendererOptions } from './chart-renderer';
import type { OrgNode } from '../types';

/**
 * Fixed sample tree for the settings preview:
 * Root → 1 advisor, 2 managers (each with 1 IC).
 */
export const PREVIEW_TREE: OrgNode = {
  id: 'prev-root',
  name: 'Root',
  title: 'CEO',
  level: 'L1',
  children: [
    { id: 'prev-advisor', name: 'Advisor', title: 'Chief of Staff', level: 'L2' },
    {
      id: 'prev-mgr1',
      name: 'Manager A',
      title: 'VP Engineering',
      level: 'L3',
      children: [{ id: 'prev-ic1', name: 'Individual Contributor A', title: 'Staff Engineer', level: 'L5' }],
    },
    {
      id: 'prev-mgr2',
      name: 'Manager B',
      title: 'VP Sales',
      level: 'L3',
      dottedLine: true,
      children: [{ id: 'prev-ic2', name: 'Individual Contributor B', title: 'Account Executive', level: 'L5' }],
    },
  ],
};

export interface PreviewOptions {
  /** Partial renderer options to merge with defaults. */
  rendererOptions?: Partial<RendererOptions>;
  /** Custom tree to render (defaults to PREVIEW_TREE). */
  tree?: OrgNode;
}

function stripPreviewKeys(partial: Partial<RendererOptions>): Partial<RendererOptions> {
  const { container: _, preview: __, ...rest } = partial as
    Partial<RendererOptions> & Record<string, unknown>;
  return rest as Partial<RendererOptions>;
}

/**
 * Renders a one-shot preview SVG using ChartRenderer in preview mode.
 * For live-updating previews, use PreviewRenderer instead.
 */
export function renderPreview(options?: PreviewOptions): SVGSVGElement {
  const tree = options?.tree ?? PREVIEW_TREE;
  const partial = options?.rendererOptions ?? {};

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;';
  document.body.appendChild(container);

  const renderer = new ChartRenderer({
    container,
    nodeWidth: 160,
    nodeHeight: 34,
    horizontalSpacing: 50,
    ...stripPreviewKeys(partial),
    preview: true,
  });

  renderer.render(tree);
  const svg = renderer.getSvgElement();
  svg.style.maxHeight = '100%';

  svg.remove();
  document.body.removeChild(container);

  return svg;
}

/**
 * Persistent preview renderer that wraps a ChartRenderer in preview mode.
 * Supports live updates via updateOptions() + render().
 */
export class PreviewRenderer {
  private renderer: ChartRenderer;
  private tree: OrgNode;

  constructor(container: HTMLElement, options?: Partial<RendererOptions>, tree?: OrgNode) {
    this.tree = tree ?? PREVIEW_TREE;
    this.renderer = new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
      ...stripPreviewKeys(options ?? {}),
      preview: true,
    });
  }

  render(): void {
    this.renderer.render(this.tree);
  }

  updateOptions(opts: Partial<RendererOptions>): void {
    this.renderer.updateOptions(stripPreviewKeys(opts));
  }

  getZoomManager(): import('./zoom-manager').ZoomManager | null {
    return this.renderer.getZoomManager();
  }

  destroy(): void {
    this.renderer.destroy();
  }
}
