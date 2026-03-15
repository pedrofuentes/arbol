import { describe, it, expect, beforeAll } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { renderPreview, PREVIEW_TREE } from '../../src/renderer/preview-renderer';

beforeAll(() => { setLocale('en', en); });

describe('PreviewRenderer', () => {
  describe('renderPreview', () => {
    it('returns an SVGSVGElement', () => {
      const svg = renderPreview();
      expect(svg).toBeInstanceOf(SVGSVGElement);
    });

    it('has width and height 100%', () => {
      const svg = renderPreview();
      expect(svg.getAttribute('width')).toBe('100%');
      expect(svg.getAttribute('height')).toBe('100%');
    });

    it('has class preview-svg', () => {
      const svg = renderPreview();
      expect(svg.getAttribute('class')).toBe('preview-svg');
    });

    it('is aria-hidden', () => {
      const svg = renderPreview();
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders manager nodes', () => {
      const svg = renderPreview();
      // Root + 2 managers = 3 manager groups
      const rects = svg.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThanOrEqual(3);
    });

    it('renders link paths', () => {
      const svg = renderPreview();
      const paths = svg.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('renders text elements for names and titles', () => {
      const svg = renderPreview();
      const texts = svg.querySelectorAll('text');
      // Each node has name + title = 2 texts, at least 5 nodes
      expect(texts.length).toBeGreaterThanOrEqual(10);
    });

    it('renders IC containers', () => {
      const svg = renderPreview();
      // 2 managers each with 1 IC → 2 IC containers
      // IC containers are rects without stroke (fill only)
      const allRects = Array.from(svg.querySelectorAll('rect'));
      const icContainers = allRects.filter(
        (r) => !r.getAttribute('stroke') || r.getAttribute('stroke') === 'none',
      );
      // At least the IC container backgrounds
      expect(icContainers.length).toBeGreaterThanOrEqual(2);
    });

    it('contains expected names from PREVIEW_TREE', () => {
      const svg = renderPreview();
      const textContent = svg.textContent ?? '';
      expect(textContent).toContain('Root');
      expect(textContent).toContain('Manager A');
      expect(textContent).toContain('Manager B');
      expect(textContent).toContain('Advisor');
      expect(textContent).toContain('Individual Contributor A');
      expect(textContent).toContain('Individual Contributor B');
    });

    it('contains expected titles from PREVIEW_TREE', () => {
      const svg = renderPreview();
      const textContent = svg.textContent ?? '';
      expect(textContent).toContain('CEO');
      expect(textContent).toContain('VP Engineering');
      expect(textContent).toContain('VP Sales');
      expect(textContent).toContain('Chief of Staff');
    });
  });

  describe('options responsiveness', () => {
    it('uses custom cardFill color', () => {
      const svg = renderPreview({ rendererOptions: { cardFill: '#ff0000' } });
      const rects = Array.from(svg.querySelectorAll('rect'));
      const cardRects = rects.filter((r) => r.getAttribute('fill') === '#ff0000');
      expect(cardRects.length).toBeGreaterThan(0);
    });

    it('uses custom cardStroke color', () => {
      const svg = renderPreview({ rendererOptions: { cardStroke: '#0000ff' } });
      const rects = Array.from(svg.querySelectorAll('rect'));
      const strokedRects = rects.filter((r) => r.getAttribute('stroke') === '#0000ff');
      expect(strokedRects.length).toBeGreaterThan(0);
    });

    it('uses custom linkColor', () => {
      const svg = renderPreview({ rendererOptions: { linkColor: '#abcdef' } });
      const paths = Array.from(svg.querySelectorAll('path'));
      const colored = paths.filter((p) => p.getAttribute('stroke') === '#abcdef');
      expect(colored.length).toBeGreaterThan(0);
    });

    it('uses custom nameColor', () => {
      const svg = renderPreview({ rendererOptions: { nameColor: '#112233' } });
      const texts = Array.from(svg.querySelectorAll('text'));
      const named = texts.filter((t) => t.getAttribute('fill') === '#112233');
      expect(named.length).toBeGreaterThan(0);
    });

    it('uses custom fontFamily', () => {
      const svg = renderPreview({ rendererOptions: { fontFamily: 'Georgia' } });
      const texts = Array.from(svg.querySelectorAll('text'));
      const withFont = texts.filter(
        (t) => t.getAttribute('font-family')?.includes('Georgia'),
      );
      expect(withFont.length).toBeGreaterThan(0);
    });

    it('uses custom cardBorderRadius', () => {
      const svg = renderPreview({ rendererOptions: { cardBorderRadius: 8 } });
      const rects = Array.from(svg.querySelectorAll('rect'));
      const rounded = rects.filter((r) => r.getAttribute('rx') === '8');
      expect(rounded.length).toBeGreaterThan(0);
    });

    it('uses custom nodeWidth and nodeHeight', () => {
      const svg = renderPreview({
        rendererOptions: { nodeWidth: 200, nodeHeight: 50 },
      });
      const rects = Array.from(svg.querySelectorAll('rect'));
      const wideCards = rects.filter((r) => r.getAttribute('width') === '200');
      expect(wideCards.length).toBeGreaterThan(0);
    });
  });

  describe('custom tree', () => {
    it('renders a custom tree', () => {
      const customTree = {
        id: 'root',
        name: 'Custom Root',
        title: 'Boss',
        children: [
          { id: 'c1', name: 'Child One', title: 'Worker' },
        ],
      };
      const svg = renderPreview({ tree: customTree });
      const textContent = svg.textContent ?? '';
      expect(textContent).toContain('Custom Root');
      expect(textContent).toContain('Child One');
    });
  });

  describe('PREVIEW_TREE structure', () => {
    it('has root with 3 children', () => {
      expect(PREVIEW_TREE.children).toHaveLength(3);
    });

    it('root is CEO', () => {
      expect(PREVIEW_TREE.name).toBe('Root');
      expect(PREVIEW_TREE.title).toBe('CEO');
    });

    it('has 1 advisor (leaf child) and 2 managers (children with children)', () => {
      const children = PREVIEW_TREE.children!;
      const leaves = children.filter((c) => !c.children || c.children.length === 0);
      const managers = children.filter((c) => c.children && c.children.length > 0);
      expect(leaves).toHaveLength(1);
      expect(managers).toHaveLength(2);
    });

    it('VP Sales has dottedLine flag', () => {
      const vpSales = PREVIEW_TREE.children!.find((c) => c.title === 'VP Sales');
      expect(vpSales?.dottedLine).toBe(true);
    });

    it('each manager has 1 IC', () => {
      const managers = PREVIEW_TREE.children!.filter(
        (c) => c.children && c.children.length > 0,
      );
      for (const mgr of managers) {
        expect(mgr.children).toHaveLength(1);
      }
    });
  });
});
