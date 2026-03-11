import * as d3 from 'd3';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const DEFAULT_FIT_PADDING = 40;
const MAX_FIT_SCALE = 1.5;

export class ZoomManager {
  private svg: SVGSVGElement;
  private g: SVGGElement;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>;

  constructor(svg: SVGSVGElement, g: SVGGElement) {
    this.svg = svg;
    this.g = g;
    this.svgSelection = d3.select(svg);

    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .extent(() => {
        const w = this.svg.clientWidth || this.svg.getBoundingClientRect().width || 1;
        const h = this.svg.clientHeight || this.svg.getBoundingClientRect().height || 1;
        return [[0, 0], [w, h]];
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        d3.select(this.g).attr('transform', event.transform.toString());
      });

    this.svgSelection.call(this.zoom);
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

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    this.svgSelection.call(this.zoom.transform, transform);
  }

  resetZoom(): void {
    this.svgSelection.call(this.zoom.transform, d3.zoomIdentity);
  }

  getCurrentTransform(): d3.ZoomTransform {
    return d3.zoomTransform(this.svg);
  }

  applyTransform(transform: d3.ZoomTransform): void {
    this.svgSelection.call(this.zoom.transform, transform);
  }
}
