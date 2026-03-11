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
});
