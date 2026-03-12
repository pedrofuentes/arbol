import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as d3 from 'd3';
import { ZoomManager } from '../../src/renderer/zoom-manager';

describe('ZoomManager', () => {
  let container: HTMLElement;
  let svgEl: SVGSVGElement;
  let gEl: SVGGElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const svg = d3.select(container).append('svg')
      .attr('width', '800')
      .attr('height', '600');
    const g = svg.append('g');
    svgEl = svg.node()!;
    gEl = g.node()!;
  });

  afterEach(() => {
    container.remove();
  });

  it('creates zoom behavior on the SVG element', () => {
    const zm = new ZoomManager(svgEl, gEl);
    // d3-zoom attaches __zoom datum to the SVG element
    const zoomData = (svgEl as any).__zoom;
    expect(zoomData).toBeDefined();
    expect(zm).toBeInstanceOf(ZoomManager);
  });

  it('resetZoom() sets identity transform (k=1, x=0, y=0)', () => {
    const zm = new ZoomManager(svgEl, gEl);
    zm.resetZoom();
    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
  });

  it('getCurrentTransform() returns current zoom transform', () => {
    const zm = new ZoomManager(svgEl, gEl);
    const t = zm.getCurrentTransform();
    expect(t).toBeDefined();
    expect(typeof t.k).toBe('number');
    expect(typeof t.x).toBe('number');
    expect(typeof t.y).toBe('number');
  });

  it('applyTransform() updates the transform', () => {
    const zm = new ZoomManager(svgEl, gEl);
    const newTransform = d3.zoomIdentity.translate(100, 200).scale(2);
    zm.applyTransform(newTransform);
    const t = zm.getCurrentTransform();
    expect(t.k).toBe(2);
    expect(t.x).toBe(100);
    expect(t.y).toBe(200);
  });

  it('applyTransform() updates the <g> transform attribute', () => {
    const zm = new ZoomManager(svgEl, gEl);
    const newTransform = d3.zoomIdentity.translate(50, 75).scale(1.5);
    zm.applyTransform(newTransform);
    const attr = gEl.getAttribute('transform');
    expect(attr).toContain('translate(50,75)');
    expect(attr).toContain('scale(1.5)');
  });

  it('fitToContent() does not throw when getBBox is unavailable (jsdom)', () => {
    const zm = new ZoomManager(svgEl, gEl);
    // In jsdom, getBBox may not be a real function or may throw.
    // fitToContent should handle this gracefully.
    expect(() => zm.fitToContent()).not.toThrow();
    expect(() => zm.fitToContent(20)).not.toThrow();
  });

  it('resetZoom() after applyTransform restores identity', () => {
    const zm = new ZoomManager(svgEl, gEl);
    zm.applyTransform(d3.zoomIdentity.translate(300, 400).scale(3));
    zm.resetZoom();
    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
  });

  it('getBaseScale() returns 1 initially', () => {
    const zm = new ZoomManager(svgEl, gEl);
    expect(zm.getBaseScale()).toBe(1);
  });

  it('getRelativeZoomPercent() returns 100 when at identity with default base scale', () => {
    const zm = new ZoomManager(svgEl, gEl);
    zm.resetZoom();
    expect(zm.getRelativeZoomPercent()).toBe(100);
  });

  it('getRelativeZoomPercent() calculates correctly relative to base scale', () => {
    const zm = new ZoomManager(svgEl, gEl);
    // Simulate a fitToContent that set base scale to 1.5
    // by applying a transform at 1.5, then checking relative %
    zm.applyTransform(d3.zoomIdentity.scale(1.5));
    // Base scale is still 1, so relative % = 150
    expect(zm.getRelativeZoomPercent()).toBe(150);
  });

  it('getRelativeZoomPercent() returns 100 after fitToContent when getBBox is available', () => {
    const zm = new ZoomManager(svgEl, gEl);
    // Mock getBBox to return a valid bounding box
    const originalGetBBox = gEl.getBBox;
    gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
    // Mock clientWidth/clientHeight
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.fitToContent();

    // After fitToContent, the relative zoom should always be 100%
    expect(zm.getRelativeZoomPercent()).toBe(100);
    expect(zm.getBaseScale()).toBeGreaterThan(0);

    gEl.getBBox = originalGetBBox;
  });

  it('getRelativeZoomPercent() reflects manual zoom relative to base', () => {
    const zm = new ZoomManager(svgEl, gEl);
    // Mock getBBox for fitToContent
    gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.fitToContent();
    const baseScale = zm.getBaseScale();

    // Now zoom in 2x from the base
    const currentTransform = zm.getCurrentTransform();
    zm.applyTransform(d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(baseScale * 2));
    expect(zm.getRelativeZoomPercent()).toBe(200);

    // Zoom out to half of base
    zm.applyTransform(d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(baseScale * 0.5));
    expect(zm.getRelativeZoomPercent()).toBe(50);
  });
});
