import { select, zoom, zoomIdentity, zoomTransform } from 'd3';
import type { ZoomBehavior, Selection, D3ZoomEvent, ZoomTransform } from 'd3';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const DEFAULT_FIT_PADDING = 40;
const MAX_FIT_SCALE = 1.5;

export class ZoomManager {
  private svg: SVGSVGElement;
  private g: SVGGElement;
  private zoom: ZoomBehavior<SVGSVGElement, unknown>;
  private svgSelection: Selection<SVGSVGElement, unknown, null, undefined>;
  private zoomListeners: Set<() => void> = new Set();

  constructor(svg: SVGSVGElement, g: SVGGElement) {
    this.svg = svg;
    this.g = g;
    this.svgSelection = select(svg);

    this.zoom = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .extent(() => {
        const w = this.svg.clientWidth || this.svg.getBoundingClientRect().width || 1;
        const h = this.svg.clientHeight || this.svg.getBoundingClientRect().height || 1;
        return [
          [0, 0],
          [w, h],
        ] as [[number, number], [number, number]];
      })
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        select(this.g).attr('transform', event.transform.toString());
        for (const listener of this.zoomListeners) listener();
      });

    this.svgSelection.call(this.zoom);
  }

  onZoom(listener: () => void): () => void {
    this.zoomListeners.add(listener);
    return () => {
      this.zoomListeners.delete(listener);
    };
  }

  fitToContent(padding: number = DEFAULT_FIT_PADDING): void {
    const gNode = this.g;
    if (typeof gNode.getBBox !== 'function') return;

    let bbox: DOMRect;
    try {
      bbox = gNode.getBBox();
    } catch {
      return;
    }

    if (bbox.width === 0 || bbox.height === 0) return;

    const svgWidth = this.svg.clientWidth || this.svg.getBoundingClientRect().width;
    const svgHeight = this.svg.clientHeight || this.svg.getBoundingClientRect().height;
    if (svgWidth === 0 || svgHeight === 0) return;

    const scale = Math.min(
      (svgWidth - padding * 2) / bbox.width,
      (svgHeight - padding * 2) / bbox.height,
      MAX_FIT_SCALE,
    );
    const tx = svgWidth / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = padding - bbox.y * scale;

    const transform = zoomIdentity.translate(tx, ty).scale(scale);
    this.svgSelection.call(this.zoom.transform, transform);
  }

  centerAtRealSize(padding: number = DEFAULT_FIT_PADDING): void {
    const gNode = this.g;
    if (typeof gNode.getBBox !== 'function') return;

    let bbox: DOMRect;
    try {
      bbox = gNode.getBBox();
    } catch {
      return;
    }

    if (bbox.width === 0 || bbox.height === 0) return;

    const svgWidth = this.svg.clientWidth || this.svg.getBoundingClientRect().width;
    if (svgWidth === 0) return;

    const tx = svgWidth / 2 - (bbox.x + bbox.width / 2);
    const ty = padding - bbox.y;

    const transform = zoomIdentity.translate(tx, ty);
    this.svgSelection.call(this.zoom.transform, transform);
  }

  resetZoom(): void {
    this.svgSelection.call(this.zoom.transform, zoomIdentity);
  }

  zoomIn(): void {
    this.zoom.scaleBy(select(this.svg).transition().duration(200), 1.25);
  }

  zoomOut(): void {
    this.zoom.scaleBy(select(this.svg).transition().duration(200), 0.8);
  }

  getCurrentTransform(): ZoomTransform {
    return zoomTransform(this.svg);
  }

  applyTransform(transform: ZoomTransform): void {
    this.svgSelection.call(this.zoom.transform, transform);
  }

  getBaseScale(): number {
    return 1;
  }

  getRelativeZoomPercent(): number {
    const currentScale = this.getCurrentTransform().k;
    return Math.round(currentScale * 100);
  }
}
