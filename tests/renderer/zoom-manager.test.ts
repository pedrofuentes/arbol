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
    const svg = d3.select(container).append('svg').attr('width', '800').attr('height', '600');
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

  it('getBaseScale() returns 1 always', () => {
    const zm = new ZoomManager(svgEl, gEl);
    expect(zm.getBaseScale()).toBe(1);
  });

  it('getRelativeZoomPercent() returns 100 when at identity (absolute zoom)', () => {
    const zm = new ZoomManager(svgEl, gEl);
    zm.resetZoom();
    expect(zm.getRelativeZoomPercent()).toBe(100);
  });

  it('getRelativeZoomPercent() returns absolute zoom percentage', () => {
    const zm = new ZoomManager(svgEl, gEl);
    zm.applyTransform(d3.zoomIdentity.scale(1.5));
    expect(zm.getRelativeZoomPercent()).toBe(150);

    zm.applyTransform(d3.zoomIdentity.scale(0.5));
    expect(zm.getRelativeZoomPercent()).toBe(50);
  });

  it('getRelativeZoomPercent() returns scale percentage after fitToContent', () => {
    const zm = new ZoomManager(svgEl, gEl);
    const originalGetBBox = gEl.getBBox;
    gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.fitToContent();

    // Absolute zoom should reflect the actual scale, not 100%
    const pct = zm.getRelativeZoomPercent();
    expect(pct).toBeGreaterThan(0);
    expect(zm.getBaseScale()).toBe(1);

    gEl.getBBox = originalGetBBox;
  });

  it('getRelativeZoomPercent() reflects manual zoom as absolute percentage', () => {
    const zm = new ZoomManager(svgEl, gEl);

    zm.applyTransform(d3.zoomIdentity.translate(100, 50).scale(2));
    expect(zm.getRelativeZoomPercent()).toBe(200);

    zm.applyTransform(d3.zoomIdentity.translate(100, 50).scale(0.5));
    expect(zm.getRelativeZoomPercent()).toBe(50);
  });

  it('centerAtRealSize() does not throw when getBBox is unavailable', () => {
    const zm = new ZoomManager(svgEl, gEl);
    expect(() => zm.centerAtRealSize()).not.toThrow();
    expect(() => zm.centerAtRealSize(20)).not.toThrow();
  });

  it('centerAtRealSize() sets scale to 1 and centers horizontally', () => {
    const zm = new ZoomManager(svgEl, gEl);
    gEl.getBBox = () => ({ x: -200, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.centerAtRealSize();

    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    // Chart center is at x=-200 + 400/2 = 0, viewport center is 400
    // tx = 800/2 - ((-200) + 400/2) = 400 - 0 = 400
    expect(t.x).toBe(400);
    // ty = padding(40) - bbox.y(0) = 40
    expect(t.y).toBe(40);
    expect(zm.getRelativeZoomPercent()).toBe(100);
  });

  it('centerAtRealSize() respects custom padding', () => {
    const zm = new ZoomManager(svgEl, gEl);
    gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.centerAtRealSize(20);

    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    expect(t.y).toBe(20);
  });
});
