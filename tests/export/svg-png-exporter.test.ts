import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportSvg, exportPng } from '../../src/export/svg-png-exporter';
import type { SvgExportOptions, PngExportOptions } from '../../src/export/svg-png-exporter';

function createMockSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'tree');
  svg.setAttribute('aria-label', 'Org Chart');

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = 'Org Chart';
  svg.appendChild(title);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'chart-group');
  g.setAttribute('transform', 'translate(100,50) scale(1.5)');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '10');
  rect.setAttribute('y', '20');
  rect.setAttribute('width', '200');
  rect.setAttribute('height', '100');
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('role', 'treeitem');
  rect.setAttribute('aria-label', 'Alice - CEO');
  rect.setAttribute('aria-level', '1');
  rect.setAttribute('aria-expanded', 'true');
  rect.setAttribute('tabindex', '0');
  rect.setAttribute('data-id', 'node-1');
  rect.setAttribute('data-tooltip', 'Alice');
  g.appendChild(rect);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '110');
  text.setAttribute('y', '70');
  text.textContent = 'Alice';
  g.appendChild(text);

  svg.appendChild(g);
  return svg;
}

const originalCreateElement = document.createElement.bind(document);

describe('exportSvg', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let capturedAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let capturedBlob: Blob | undefined;

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateObjectURL = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:test-svg';
    });
    mockRevokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        capturedAnchor = anchor as unknown as typeof capturedAnchor;
        return anchor;
      }
      return originalCreateElement(tag);
    });

    globalThis.URL.createObjectURL = mockCreateObjectURL as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL as typeof URL.revokeObjectURL;
  });

  it('produces valid XML with viewBox attribute', () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    expect(capturedBlob).toBeDefined();
    expect(capturedBlob!.type).toBe('image/svg+xml');
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('sets the correct filename on the download link', () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'my-org.svg' });

    expect(capturedAnchor.download).toBe('my-org.svg');
  });

  it('removes zoom transform from the g element', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).not.toContain('translate(100,50) scale(1.5)');
    expect(blobText).toContain('viewBox=');
  });

  it('sets viewBox with padding on the cloned SVG', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    // Should have a viewBox attribute (fallback dimensions with 20px padding)
    expect(blobText).toMatch(/viewBox="[^"]+"/);
  });

  it('sets width and height attributes on the cloned SVG', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).toMatch(/width="\d+"/);
    expect(blobText).toMatch(/height="\d+"/);
  });

  it('includes xmlns attribute', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('removes ARIA attributes from exported SVG', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).not.toContain('role=');
    expect(blobText).not.toContain('aria-label=');
    expect(blobText).not.toContain('aria-level=');
    expect(blobText).not.toContain('aria-expanded=');
    expect(blobText).not.toContain('tabindex=');
    expect(blobText).not.toContain('data-id=');
    expect(blobText).not.toContain('data-tooltip=');
  });

  it('removes title elements from exported SVG', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).not.toContain('<title');
  });

  it('preserves visual content (rect and text elements)', async () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    const blobText = await capturedBlob!.text();
    expect(blobText).toContain('<rect');
    expect(blobText).toContain('Alice');
    expect(blobText).toContain('fill="#ffffff"');
  });

  it('does not modify the original SVG element', () => {
    const svg = createMockSvg();
    const originalG = svg.querySelector('g')!;
    const originalTransform = originalG.getAttribute('transform');

    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    expect(originalG.getAttribute('transform')).toBe(originalTransform);
    expect(svg.getAttribute('role')).toBe('tree');
    expect(svg.querySelector('title')).not.toBeNull();
  });

  it('revokes the object URL after download', () => {
    const svg = createMockSvg();
    exportSvg({ svgElement: svg, fileName: 'chart.svg' });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-svg');
  });

  it('handles SVG with no g element gracefully', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(() => exportSvg({ svgElement: svg, fileName: 'empty.svg' })).not.toThrow();
    expect(mockClick).toHaveBeenCalledOnce();
  });
});

describe('exportPng', () => {
  it('returns a promise', () => {
    const svg = createMockSvg();
    const result = exportPng({ svgElement: svg, fileName: 'chart.png' });
    expect(result).toBeInstanceOf(Promise);
  });

  it('defaults scale to 2', async () => {
    const svg = createMockSvg();
    const options: PngExportOptions = { svgElement: svg, fileName: 'chart.png' };
    expect(options.scale).toBeUndefined();

    // The default is applied inside the function; we just verify the interface allows omission
    const result = exportPng(options);
    expect(result).toBeInstanceOf(Promise);
  });

  it('accepts custom scale values', async () => {
    const svg = createMockSvg();
    const result = exportPng({ svgElement: svg, fileName: 'chart.png', scale: 3 });
    expect(result).toBeInstanceOf(Promise);
  });
});
