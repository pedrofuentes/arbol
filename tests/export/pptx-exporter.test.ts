import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LayoutResult, LayoutNode, LayoutLink, LayoutICContainer } from '../../src/renderer/layout-engine';

// Mock pptxgenjs before importing exporter
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockAddText = vi.fn().mockReturnThis();
const mockAddShape = vi.fn().mockReturnThis();
const mockAddSlide = vi.fn();

vi.mock('pptxgenjs', () => {
  return {
    default: class MockPptxGenJS {
      defineLayout = vi.fn();
      layout = '';
      slides: any[] = [];
      addSlide = () => {
        const slide = {
          addText: mockAddText,
          addShape: mockAddShape,
        };
        mockAddSlide(slide);
        this.slides.push(slide);
        return slide;
      };
      writeFile = mockWriteFile;
    },
  };
});

import {
  exportToPptx,
  parseSvgPath,
  convertCoordinates,
  PX_TO_INCHES,
} from '../../src/export/pptx-exporter';

function makeNode(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id: 'n1',
    name: 'Alice',
    title: 'Manager',
    x: 0,
    y: 0,
    width: 110,
    height: 22,
    type: 'manager',
    ...overrides,
  };
}

function makeLayout(overrides: Partial<LayoutResult> = {}): LayoutResult {
  const nodes = overrides.nodes ?? [makeNode()];
  // Derive bounding box from nodes if not provided
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }

  return {
    nodes,
    links: overrides.links ?? [],
    icContainers: overrides.icContainers ?? [],
    boundingBox: overrides.boundingBox ?? { minX, minY, width: maxX - minX, height: maxY - minY },
  };
}

describe('pptx-exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Unit: parseSvgPath ---
  describe('parseSvgPath', () => {
    it('parses M...L path into points', () => {
      const points = parseSvgPath('M10,20 L30,40 L50,60');
      expect(points).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ]);
    });

    it('returns empty array for empty path', () => {
      expect(parseSvgPath('')).toEqual([]);
    });

    it('handles single M command', () => {
      const points = parseSvgPath('M100,200');
      expect(points).toEqual([{ x: 100, y: 200 }]);
    });

    it('handles negative coordinates', () => {
      const points = parseSvgPath('M-55,0 L-55,22');
      expect(points).toEqual([
        { x: -55, y: 0 },
        { x: -55, y: 22 },
      ]);
    });
  });

  // --- Unit: convertCoordinates ---
  describe('convertCoordinates', () => {
    it('converts pixel coordinates to inches with offset and scale', () => {
      const result = convertCoordinates(96, 96, 0, 0, 1, 0.5);
      // (96 - 0) * 1 * PX_TO_INCHES + 0.5 = 1 + 0.5 = 1.5
      expect(result.x).toBeCloseTo(1.5);
      expect(result.y).toBeCloseTo(1.5);
    });

    it('handles negative source coordinates', () => {
      const result = convertCoordinates(-96, 0, -96, 0, 1, 0);
      // (-96 - (-96)) * 1 * PX_TO_INCHES + 0 = 0
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it('applies scale factor', () => {
      const result = convertCoordinates(192, 0, 0, 0, 0.5, 0);
      // (192 - 0) * 0.5 * (1/96) = 1
      expect(result.x).toBeCloseTo(1);
    });
  });

  // --- Integration: exportToPptx ---
  describe('exportToPptx', () => {
    it('creates a presentation and writes file', async () => {
      const layout = makeLayout();
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledOnce();
    });

    it('adds at least one slide', async () => {
      const layout = makeLayout();
      await exportToPptx(layout);
      expect(mockAddSlide).toHaveBeenCalled();
    });

    it('creates shapes for manager nodes', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager', name: 'Boss', title: 'CEO' })],
      });
      await exportToPptx(layout);
      // Manager node should produce addText (card) and addShape (border rect)
      expect(mockAddText).toHaveBeenCalled();
      const textCalls = mockAddText.mock.calls;
      const hasManagerText = textCalls.some((call: any) => {
        const textBlocks = call[0];
        return Array.isArray(textBlocks) && textBlocks.some(
          (t: any) => typeof t.text === 'string' && t.text.includes('Boss'),
        );
      });
      expect(hasManagerText).toBe(true);
    });

    it('creates shapes for IC nodes', async () => {
      const layout = makeLayout({
        nodes: [
          makeNode({ type: 'manager' }),
          makeNode({ id: 'ic1', type: 'ic', name: 'Dev', title: 'Engineer', y: 30 }),
        ],
      });
      await exportToPptx(layout);
      const textCalls = mockAddText.mock.calls;
      const hasIcText = textCalls.some((call: any) => {
        const textBlocks = call[0];
        return Array.isArray(textBlocks) && textBlocks.some(
          (t: any) => typeof t.text === 'string' && t.text.includes('Dev'),
        );
      });
      expect(hasIcText).toBe(true);
    });

    it('creates shapes for PAL nodes', async () => {
      const layout = makeLayout({
        nodes: [
          makeNode({ type: 'manager' }),
          makeNode({ id: 'p1', type: 'pal', name: 'Advisor', title: 'Strategist', x: 200, y: 30 }),
        ],
      });
      await exportToPptx(layout);
      const textCalls = mockAddText.mock.calls;
      const hasPalText = textCalls.some((call: any) => {
        const textBlocks = call[0];
        return Array.isArray(textBlocks) && textBlocks.some(
          (t: any) => typeof t.text === 'string' && t.text.includes('Advisor'),
        );
      });
      expect(hasPalText).toBe(true);
    });

    it('creates shapes for IC containers', async () => {
      const container: LayoutICContainer = { x: -50, y: 30, width: 100, height: 60 };
      const layout = makeLayout({
        nodes: [makeNode()],
        icContainers: [container],
      });
      await exportToPptx(layout);
      // IC containers are drawn as addShape calls with grey fill
      const shapeCalls = mockAddShape.mock.calls;
      const hasGreyRect = shapeCalls.some((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === 'E5E7EB';
      });
      expect(hasGreyRect).toBe(true);
    });

    it('creates line shapes for links', async () => {
      const link: LayoutLink = { path: 'M0,22 L0,50 L100,50 L100,80', layer: 'tree' };
      const layout = makeLayout({
        nodes: [makeNode(), makeNode({ id: 'n2', x: 100, y: 80, type: 'manager' })],
        links: [link],
      });
      await exportToPptx(layout);
      // Links are drawn as addShape lines
      const shapeCalls = mockAddShape.mock.calls;
      const hasLine = shapeCalls.some((call: any) => {
        const opts = call[1];
        return opts && opts.line && opts.line.color;
      });
      expect(hasLine).toBe(true);
    });

    it('handles empty layout (no nodes, no links)', async () => {
      const layout: LayoutResult = {
        nodes: [],
        links: [],
        icContainers: [],
        boundingBox: { minX: 0, minY: 0, width: 0, height: 0 },
      };
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledOnce();
      // No text or shapes beyond the slide
      expect(mockAddText).not.toHaveBeenCalled();
    });

    it('handles single node, no links', async () => {
      const layout = makeLayout({
        nodes: [makeNode()],
        links: [],
      });
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledOnce();
      expect(mockAddText).toHaveBeenCalled();
    });

    it('uses configurable file name', async () => {
      const layout = makeLayout();
      await exportToPptx(layout, { fileName: 'my-chart.pptx' });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'my-chart.pptx' }),
      );
    });

    it('uses default file name when not specified', async () => {
      const layout = makeLayout();
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'org-chart.pptx' }),
      );
    });

    it('uses configurable slide dimensions', async () => {
      const layout = makeLayout();
      // Just ensure it doesn't throw with custom dimensions
      await exportToPptx(layout, { slideWidth: 10, slideHeight: 5.625 });
      expect(mockWriteFile).toHaveBeenCalledOnce();
    });
  });
});
