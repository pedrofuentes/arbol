import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  LayoutResult,
  LayoutNode,
  LayoutLink,
  LayoutICContainer,
} from '../../src/renderer/layout-engine';
import type { ColorCategory } from '../../src/types';

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
  resolveStyles,
  PX_TO_INCHES,
  PX_TO_PT,
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
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

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
        return (
          Array.isArray(textBlocks) &&
          textBlocks.some((t: any) => typeof t.text === 'string' && t.text.includes('Boss'))
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
        return (
          Array.isArray(textBlocks) &&
          textBlocks.some((t: any) => typeof t.text === 'string' && t.text.includes('Dev'))
        );
      });
      expect(hasIcText).toBe(true);
    });

    it('creates shapes for Advisor nodes', async () => {
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
        return (
          Array.isArray(textBlocks) &&
          textBlocks.some((t: any) => typeof t.text === 'string' && t.text.includes('Advisor'))
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

    it('uses timestamped default file name when not specified', async () => {
      const layout = makeLayout();
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: expect.stringMatching(/^\d{12}-org-chart\.pptx$/) }),
      );
    });

    it('uses configurable slide dimensions', async () => {
      const layout = makeLayout();
      // Just ensure it doesn't throw with custom dimensions
      await exportToPptx(layout, { slideWidth: 10, slideHeight: 5.625 });
      expect(mockWriteFile).toHaveBeenCalledOnce();
    });
  });

  // --- dotted-line export ---
  describe('dotted-line export', () => {
    it('adds dashType to line shapes for dotted links', async () => {
      const link: LayoutLink = {
        path: 'M0,22 L0,50 L100,50 L100,80',
        layer: 'tree',
        dottedLine: true,
      };
      const layout = makeLayout({
        nodes: [makeNode(), makeNode({ id: 'n2', x: 100, y: 80, type: 'manager' })],
        links: [link],
      });
      await exportToPptx(layout);
      const shapeCalls = mockAddShape.mock.calls;
      const lineWithDash = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.line && opts.line.dashType === 'dash';
      });
      expect(lineWithDash).toBeDefined();
    });

    it('does not add dashType to line shapes for regular links', async () => {
      const link: LayoutLink = {
        path: 'M0,22 L0,50 L100,50 L100,80',
        layer: 'tree',
      };
      const layout = makeLayout({
        nodes: [makeNode(), makeNode({ id: 'n2', x: 100, y: 80, type: 'manager' })],
        links: [link],
      });
      await exportToPptx(layout);
      const shapeCalls = mockAddShape.mock.calls;
      const lineWithDash = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.line && opts.line.dashType;
      });
      expect(lineWithDash).toBeUndefined();
    });
  });

  // --- per-node category colors ---
  describe('per-node category colors', () => {
    const categories: ColorCategory[] = [
      { id: 'eng', label: 'Engineering', color: '#3B82F6' },
      { id: 'sales', label: 'Sales', color: '#EF4444' },
    ];

    it('uses category color for nodes with matching categoryId', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ id: 'n1', categoryId: 'eng' })],
      });
      await exportToPptx(layout, { categories });

      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === '3B82F6' && opts.line;
      });
      expect(cardRect).toBeDefined();
    });

    it('uses default fill for nodes without categoryId', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ id: 'n1' })],
      });
      await exportToPptx(layout, { categories });

      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === 'FFFFFF' && opts.line;
      });
      expect(cardRect).toBeDefined();
    });

    it('uses default fill when categoryId does not match any category', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ id: 'n1', categoryId: 'unknown' })],
      });
      await exportToPptx(layout, { categories });

      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === 'FFFFFF' && opts.line;
      });
      expect(cardRect).toBeDefined();
    });
  });

  // --- legend ---
  describe('legend', () => {
    const categories: ColorCategory[] = [
      { id: 'eng', label: 'Engineering', color: '#3B82F6' },
      { id: 'sales', label: 'Sales', color: '#EF4444' },
    ];

    it('adds legend shapes when categories are provided', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ categoryId: 'eng' })],
      });
      await exportToPptx(layout, { categories });

      // Legend background rect (white fill with E2E8F0 border)
      const shapeCalls = mockAddShape.mock.calls;
      const legendBg = shapeCalls.find((call: any) => {
        const opts = call[1];
        return (
          opts &&
          opts.fill &&
          opts.fill.color === 'FFFFFF' &&
          opts.line &&
          opts.line.color === 'E2E8F0'
        );
      });
      expect(legendBg).toBeDefined();

      // Legend swatch rects
      const swatchCalls = shapeCalls.filter((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.line && opts.line.color === 'CBD5E1';
      });
      expect(swatchCalls.length).toBe(categories.length);

      // Legend label texts
      const textCalls = mockAddText.mock.calls;
      const legendLabels = textCalls.filter((call: any) => {
        return typeof call[0] === 'string';
      });
      expect(legendLabels.length).toBe(categories.length);
    });

    it('does not add legend when no categories', async () => {
      const layout = makeLayout({
        nodes: [makeNode()],
      });
      await exportToPptx(layout);

      // No legend background (white fill with E2E8F0 line) should exist
      const shapeCalls = mockAddShape.mock.calls;
      const legendBg = shapeCalls.find((call: any) => {
        const opts = call[1];
        return (
          opts &&
          opts.fill &&
          opts.fill.color === 'FFFFFF' &&
          opts.line &&
          opts.line.color === 'E2E8F0'
        );
      });
      expect(legendBg).toBeUndefined();

      // No string-based text calls (legend labels)
      const textCalls = mockAddText.mock.calls;
      const legendLabels = textCalls.filter((call: any) => typeof call[0] === 'string');
      expect(legendLabels.length).toBe(0);
    });

    it('renders correct number of legend entries', async () => {
      const threeCategories: ColorCategory[] = [
        { id: 'a', label: 'Alpha', color: '#111111' },
        { id: 'b', label: 'Beta', color: '#222222' },
        { id: 'c', label: 'Gamma', color: '#333333' },
      ];
      const layout = makeLayout({
        nodes: [makeNode({ categoryId: 'a' })],
      });
      await exportToPptx(layout, { categories: threeCategories });

      // 3 swatch rects (CBD5E1 border)
      const shapeCalls = mockAddShape.mock.calls;
      const swatchCalls = shapeCalls.filter((call: any) => {
        const opts = call[1];
        return opts && opts.line && opts.line.color === 'CBD5E1';
      });
      expect(swatchCalls.length).toBe(3);

      // 3 label texts (string args)
      const textCalls = mockAddText.mock.calls;
      const legendLabels = textCalls.filter((call: any) => typeof call[0] === 'string');
      expect(legendLabels.length).toBe(3);
      expect(legendLabels.map((c: any) => c[0])).toEqual(['Alpha', 'Beta', 'Gamma']);
    });
  });

  // --- headcount badge ---
  describe('headcount badge', () => {
    it('renders badge shape and text when showHeadcount is true', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager', descendantCount: 12 })],
      });
      await exportToPptx(layout, { showHeadcount: true });

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeDefined();
      expect(roundRect![1].fill.color).toBe('9CA3AF');

      const textCalls = mockAddText.mock.calls;
      const badgeText = textCalls.find((call: any) => call[0] === '12');
      expect(badgeText).toBeDefined();
      expect(badgeText![1].bold).toBe(true);
      expect(badgeText![1].color).toBe('1E293B');
    });

    it('does not render badge when showHeadcount is false', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager', descendantCount: 12 })],
      });
      await exportToPptx(layout);

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeUndefined();
    });

    it('does not render badge for IC nodes', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'ic', descendantCount: 5 })],
      });
      await exportToPptx(layout, { showHeadcount: true });

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeUndefined();
    });

    it('does not render badge when descendantCount is 0', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager', descendantCount: 0 })],
      });
      await exportToPptx(layout, { showHeadcount: true });

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeUndefined();
    });

    it('does not render badge when descendantCount is undefined', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager' })],
      });
      await exportToPptx(layout, { showHeadcount: true });

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeUndefined();
    });

    it('uses custom badge colors', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ type: 'manager', descendantCount: 5 })],
      });
      await exportToPptx(layout, {
        showHeadcount: true,
        headcountBadgeColor: '#FF0000',
        headcountBadgeTextColor: '#00FF00',
      });

      const shapeCalls = mockAddShape.mock.calls;
      const roundRect = shapeCalls.find((call: any) => call[0] === 'roundRect');
      expect(roundRect).toBeDefined();
      expect(roundRect![1].fill.color).toBe('FF0000');

      const textCalls = mockAddText.mock.calls;
      const badgeText = textCalls.find((call: any) => call[0] === '5');
      expect(badgeText).toBeDefined();
      expect(badgeText![1].color).toBe('00FF00');
    });
  });

  // --- resolveStyles ---
  describe('resolveStyles', () => {
    it('converts px font sizes to pt using PX_TO_PT', () => {
      const styles = resolveStyles({ nameFontSize: 8, titleFontSize: 7 });
      expect(styles.nameFontPt).toBe(Math.max(3, Math.round(8 * PX_TO_PT)));
      expect(styles.titleFontPt).toBe(Math.max(3, Math.round(7 * PX_TO_PT)));
    });

    it('uses default font sizes when not provided', () => {
      const styles = resolveStyles();
      expect(styles.nameFontPt).toBe(Math.max(3, Math.round(11 * PX_TO_PT)));
      expect(styles.titleFontPt).toBe(Math.max(3, Math.round(9 * PX_TO_PT)));
    });

    it('strips # from color values', () => {
      const styles = resolveStyles({ cardFill: '#ff0000', cardStroke: '#00ff00' });
      expect(styles.cardFill).toBe('ff0000');
      expect(styles.cardStroke).toBe('00ff00');
    });

    it('uses default colors when not provided', () => {
      const styles = resolveStyles();
      expect(styles.cardFill).toBe('FFFFFF');
      expect(styles.cardStroke).toBe('22C55E');
      expect(styles.icContainerFill).toBe('E5E7EB');
      expect(styles.linkColor).toBe('94A3B8');
    });

    it('converts line widths from px to pt', () => {
      const styles = resolveStyles({ linkWidth: 2, cardStrokeWidth: 1.5 });
      expect(styles.linkWidth).toBeCloseTo(2 * PX_TO_PT);
      expect(styles.cardStrokeWidth).toBeCloseTo(1.5 * PX_TO_PT);
    });

    it('enforces minimum font size of 3pt', () => {
      const styles = resolveStyles({ nameFontSize: 1, titleFontSize: 1 });
      expect(styles.nameFontPt).toBe(3);
      expect(styles.titleFontPt).toBe(3);
    });
  });

  // --- dynamic slide sizing ---
  describe('dynamic slide sizing', () => {
    it('sizes slide to match chart at 1:1 scale', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ x: 0, y: 0, width: 110, height: 22 })],
      });
      await exportToPptx(layout);
      expect(mockWriteFile).toHaveBeenCalledOnce();
    });

    it('uses scale=1 for normal-sized charts (no fit-to-slide scaling)', async () => {
      const node = makeNode({ x: 200, y: 100, width: 110, height: 22 });
      const layout = makeLayout({ nodes: [node] });
      await exportToPptx(layout);

      // At scale=1, node width in inches = 110 * PX_TO_INCHES
      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.w;
      });
      expect(cardRect).toBeDefined();
      const opts = cardRect![1] as any;
      expect(opts.w).toBeCloseTo(110 * PX_TO_INCHES);
      expect(opts.h).toBeCloseTo(22 * PX_TO_INCHES);
    });

    it('scales down when chart exceeds max slide dimension (56")', async () => {
      const wideNode = makeNode({ x: 0, y: 0, width: 6000, height: 22 });
      const layout = makeLayout({ nodes: [wideNode] });
      await exportToPptx(layout);

      // Chart width = 6000px = 62.5 inches > 56" max → should scale down
      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.w;
      });
      expect(cardRect).toBeDefined();
      const opts = cardRect![1] as any;
      expect(opts.w).toBeLessThan(6000 * PX_TO_INCHES);
    });

    it('uses fit-to-slide when slideWidth/slideHeight explicitly provided', async () => {
      const layout = makeLayout({
        nodes: [makeNode({ x: 0, y: 0, width: 110, height: 22 })],
      });
      await exportToPptx(layout, { slideWidth: 13.33, slideHeight: 7.5 });

      // With explicit slide dimensions, the small chart should be scaled up
      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.w;
      });
      expect(cardRect).toBeDefined();
      const opts = cardRect![1] as any;
      expect(opts.w).toBeGreaterThan(110 * PX_TO_INCHES);
    });
  });

  // --- style options passthrough ---
  describe('style options passthrough', () => {
    it('uses provided font sizes for node text', async () => {
      const layout = makeLayout({ nodes: [makeNode()] });
      await exportToPptx(layout, { nameFontSize: 12, titleFontSize: 10 });

      const textCalls = mockAddText.mock.calls;
      const nodeText = textCalls.find((call: any) => Array.isArray(call[0]));
      expect(nodeText).toBeDefined();
      const blocks = nodeText![0] as any[];
      expect(blocks[0].options.fontSize).toBe(Math.round(12 * PX_TO_PT));
      expect(blocks[1].options.fontSize).toBe(Math.round(10 * PX_TO_PT));
    });

    it('uses provided card colors', async () => {
      const layout = makeLayout({ nodes: [makeNode()] });
      await exportToPptx(layout, { cardFill: '#ff0000', cardStroke: '#00ff00' });

      const shapeCalls = mockAddShape.mock.calls;
      const cardRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === 'ff0000';
      });
      expect(cardRect).toBeDefined();
      expect((cardRect![1] as any).line.color).toBe('00ff00');
    });

    it('uses provided IC container fill', async () => {
      const container: LayoutICContainer = { x: 0, y: 30, width: 100, height: 60 };
      const layout = makeLayout({ nodes: [makeNode()], icContainers: [container] });
      await exportToPptx(layout, { icContainerFill: '#aabbcc' });

      const shapeCalls = mockAddShape.mock.calls;
      const containerRect = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.fill && opts.fill.color === 'aabbcc';
      });
      expect(containerRect).toBeDefined();
    });

    it('uses provided link color and width', async () => {
      const link: LayoutLink = { path: 'M0,22 L0,50', layer: 'tree' };
      const layout = makeLayout({
        nodes: [makeNode(), makeNode({ id: 'n2', x: 0, y: 50 })],
        links: [link],
      });
      await exportToPptx(layout, { linkColor: '#ff00ff', linkWidth: 3 });

      const shapeCalls = mockAddShape.mock.calls;
      const lineShape = shapeCalls.find((call: any) => {
        const opts = call[1];
        return opts && opts.line && opts.line.color === 'ff00ff';
      });
      expect(lineShape).toBeDefined();
      expect((lineShape![1] as any).line.width).toBeCloseTo(3 * PX_TO_PT);
    });
  });
});
