import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('fitToContent() centers vertically in viewport', () => {
    const zm = new ZoomManager(svgEl, gEl);
    gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.fitToContent();

    const t = zm.getCurrentTransform();
    // scale = min((800-80)/400, (600-80)/300, 1.5) = min(1.8, 1.733, 1.5) = 1.5
    expect(t.k).toBe(1.5);
    // tx = 800/2 - (0 + 400/2) * 1.5 = 400 - 300 = 100
    expect(t.x).toBe(100);
    // ty = 600/2 - (0 + 300/2) * 1.5 = 300 - 225 = 75
    expect(t.y).toBe(75);
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
  });

  it('centerAtRealSize() sets scale to 1 and centers horizontally and vertically', () => {
    const zm = new ZoomManager(svgEl, gEl);
    gEl.getBBox = () => ({ x: -200, y: 0, width: 400, height: 300 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.centerAtRealSize();

    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    // Horizontal: tx = 800/2 - ((-200) + 400/2) = 400 - 0 = 400
    expect(t.x).toBe(400);
    // Vertical: ty = 600/2 - (0 + 300/2) = 300 - 150 = 150
    expect(t.y).toBe(150);
    expect(zm.getRelativeZoomPercent()).toBe(100);
  });

  it('centerAtRealSize() centers tall content vertically', () => {
    const zm = new ZoomManager(svgEl, gEl);
    gEl.getBBox = () => ({ x: 0, y: -100, width: 200, height: 800 }) as DOMRect;
    Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });

    zm.centerAtRealSize();

    const t = zm.getCurrentTransform();
    expect(t.k).toBe(1);
    // Horizontal: tx = 800/2 - (0 + 200/2) = 400 - 100 = 300
    expect(t.x).toBe(300);
    // Vertical: ty = 600/2 - (-100 + 800/2) = 300 - 300 = 0
    expect(t.y).toBe(0);
  });

  describe('destroy()', () => {
    it('removes D3 zoom event handlers from the SVG', () => {
      const zm = new ZoomManager(svgEl, gEl);
      // Before destroy, zoom handler is attached
      expect((svgEl as any).__zoom).toBeDefined();
      zm.destroy();
      // After destroy, zoom event listeners are removed
      const sel = d3.select(svgEl);
      expect(sel.on('zoom')).toBeUndefined();
      expect(sel.on('wheel.zoom')).toBeUndefined();
    });

    it('clears zoom listeners set', () => {
      const zm = new ZoomManager(svgEl, gEl);
      const spy = vi.fn();
      zm.onZoom(spy);
      zm.destroy();
      // After destroy, applying a transform should not trigger the listener
      zm.applyTransform(d3.zoomIdentity.translate(100, 200).scale(2));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('programmaticOnly mode', () => {
    it('creates a valid ZoomManager instance', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      expect(zm).toBeInstanceOf(ZoomManager);
      expect((svgEl as any).__zoom).toBeDefined();
    });

    it('removes user interaction event listeners from SVG', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      const sel = d3.select(svgEl);
      expect(sel.on('mousedown.zoom')).toBeUndefined();
      expect(sel.on('wheel.zoom')).toBeUndefined();
      expect(sel.on('dblclick.zoom')).toBeUndefined();
      expect(sel.on('touchstart.zoom')).toBeUndefined();
      expect(sel.on('touchmove.zoom')).toBeUndefined();
      expect(sel.on('touchend.zoom')).toBeUndefined();
      zm.destroy();
    });

    it('allows programmatic applyTransform()', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      const t = d3.zoomIdentity.translate(100, 200).scale(2);
      zm.applyTransform(t);
      const current = zm.getCurrentTransform();
      expect(current.k).toBe(2);
      expect(current.x).toBe(100);
      expect(current.y).toBe(200);
      zm.destroy();
    });

    it('allows programmatic resetZoom()', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      zm.applyTransform(d3.zoomIdentity.translate(50, 50).scale(3));
      zm.resetZoom();
      const t = zm.getCurrentTransform();
      expect(t.k).toBe(1);
      expect(t.x).toBe(0);
      expect(t.y).toBe(0);
      zm.destroy();
    });

    it('allows programmatic fitToContent()', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      gEl.getBBox = () => ({ x: 0, y: 0, width: 400, height: 300 }) as DOMRect;
      Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });
      zm.fitToContent(8);
      const t = zm.getCurrentTransform();
      expect(t.k).toBeGreaterThan(0);
      expect(t.k).toBeLessThanOrEqual(1.5);
      zm.destroy();
    });

    it('allows programmatic centerAtRealSize()', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      gEl.getBBox = () => ({ x: -200, y: 0, width: 400, height: 300 }) as DOMRect;
      Object.defineProperty(svgEl, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(svgEl, 'clientHeight', { value: 600, configurable: true });
      zm.centerAtRealSize();
      const t = zm.getCurrentTransform();
      expect(t.k).toBe(1);
      expect(t.x).toBe(400);
      expect(t.y).toBe(150);
      zm.destroy();
    });

    it('getRelativeZoomPercent() works correctly', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      expect(zm.getRelativeZoomPercent()).toBe(100);
      zm.applyTransform(d3.zoomIdentity.scale(2));
      expect(zm.getRelativeZoomPercent()).toBe(200);
      zm.destroy();
    });

    it('onZoom() fires on programmatic transform changes', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      const spy = vi.fn();
      zm.onZoom(spy);
      zm.applyTransform(d3.zoomIdentity.translate(10, 20).scale(1.5));
      expect(spy).toHaveBeenCalled();
      zm.destroy();
    });

    it('onZoom() unsubscribe works', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      const spy = vi.fn();
      const unsub = zm.onZoom(spy);
      unsub();
      zm.applyTransform(d3.zoomIdentity.translate(10, 20).scale(1.5));
      expect(spy).not.toHaveBeenCalled();
      zm.destroy();
    });

    it('destroy() cleans up in programmaticOnly mode', () => {
      const zm = new ZoomManager(svgEl, gEl, { programmaticOnly: true });
      const spy = vi.fn();
      zm.onZoom(spy);
      zm.destroy();
      zm.applyTransform(d3.zoomIdentity.translate(10, 20));
      expect(spy).not.toHaveBeenCalled();
    });

    it('normal mode retains user interaction listeners', () => {
      const _zm = new ZoomManager(svgEl, gEl);
      const sel = d3.select(svgEl);
      // Normal mode should have wheel.zoom listener
      expect(sel.on('wheel.zoom')).not.toBeNull();
      _zm.destroy();
    });
  });
});
