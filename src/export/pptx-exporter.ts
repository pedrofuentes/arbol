import pptxgen from 'pptxgenjs';
import type {
  LayoutResult,
  LayoutNode,
  LayoutLink,
  LayoutICContainer,
} from '../renderer/layout-engine';

export const PX_TO_INCHES = 1 / 96;

const DEFAULT_SLIDE_WIDTH = 13.33;
const DEFAULT_SLIDE_HEIGHT = 7.5;
const DEFAULT_PADDING = 0.5;
const DEFAULT_FILE_NAME = 'org-chart.pptx';

const DEFAULT_CARD_STROKE = '22C55E';
const DEFAULT_CARD_FILL = 'FFFFFF';
const DEFAULT_IC_CONTAINER_FILL = 'E5E7EB';
const DEFAULT_LINK_COLOR = '94A3B8';
const DEFAULT_FONT_FAMILY = 'Calibri';

const MIN_LINE_DIM = 0.001;

export interface PptxExportOptions {
  fileName?: string;
  slideWidth?: number;
  slideHeight?: number;
  padding?: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Parse an SVG path "M x,y L x,y ..." into an array of points. */
export function parseSvgPath(d: string): Point[] {
  if (!d || d.trim().length === 0) return [];

  const points: Point[] = [];
  const commands = d.match(/[ML][^ML]*/g);
  if (!commands) return [];

  for (const cmd of commands) {
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (nums.length >= 2 && isFinite(nums[0]) && isFinite(nums[1])) {
      points.push({ x: nums[0], y: nums[1] });
    }
  }
  return points;
}

/** Convert pixel coordinates to PowerPoint inches. */
export function convertCoordinates(
  px: number,
  py: number,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
): Point {
  return {
    x: (px - offsetX) * scale * PX_TO_INCHES + padding,
    y: (py - offsetY) * scale * PX_TO_INCHES + padding,
  };
}

function computeScale(
  boundingBox: LayoutResult['boundingBox'],
  slideWidth: number,
  slideHeight: number,
  padding: number,
): number {
  const availW = slideWidth - padding * 2;
  const availH = slideHeight - padding * 2;

  const pxWidth = boundingBox.width * PX_TO_INCHES;
  const pxHeight = boundingBox.height * PX_TO_INCHES;

  if (pxWidth <= 0 || pxHeight <= 0) return 1;

  return Math.min(availW / pxWidth, availH / pxHeight);
}

function addNodeShape(
  slide: pptxgen.Slide,
  node: LayoutNode,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
): void {
  const topLeft = convertCoordinates(
    node.x - node.width / 2,
    node.y,
    offsetX,
    offsetY,
    scale,
    padding,
  );
  const w = node.width * scale * PX_TO_INCHES;
  const h = node.height * scale * PX_TO_INCHES;
  const fontSize = Math.max(4, Math.round(7 * scale));

  // Card rectangle with border
  slide.addShape('rect' as any, {
    x: topLeft.x,
    y: topLeft.y,
    w,
    h,
    fill: { color: DEFAULT_CARD_FILL },
    line: { color: DEFAULT_CARD_STROKE, width: 1 },
  });

  // Text content: name (bold) + title
  slide.addText(
    [
      { text: node.name, options: { bold: true, breakLine: true } },
      { text: node.title },
    ],
    {
      x: topLeft.x,
      y: topLeft.y,
      w,
      h,
      align: 'center',
      valign: 'middle',
      fontFace: DEFAULT_FONT_FAMILY,
      fontSize,
      color: '1E293B',
      margin: 0,
    },
  );
}

function addICContainer(
  slide: pptxgen.Slide,
  container: LayoutICContainer,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
): void {
  const topLeft = convertCoordinates(container.x, container.y, offsetX, offsetY, scale, padding);
  const w = container.width * scale * PX_TO_INCHES;
  const h = container.height * scale * PX_TO_INCHES;

  slide.addShape('rect' as any, {
    x: topLeft.x,
    y: topLeft.y,
    w,
    h,
    fill: { color: DEFAULT_IC_CONTAINER_FILL },
  });
}

function addLinkLines(
  slide: pptxgen.Slide,
  link: LayoutLink,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
): void {
  const points = parseSvgPath(link.path);
  if (points.length < 2) return;

  for (let i = 0; i < points.length - 1; i++) {
    const start = convertCoordinates(points[i].x, points[i].y, offsetX, offsetY, scale, padding);
    const end = convertCoordinates(points[i + 1].x, points[i + 1].y, offsetX, offsetY, scale, padding);

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(Math.abs(end.x - start.x), MIN_LINE_DIM);
    const h = Math.max(Math.abs(end.y - start.y), MIN_LINE_DIM);

    // Flip line direction if needed
    const flipH = end.x < start.x;
    const flipV = end.y < start.y;

    slide.addShape('line' as any, {
      x,
      y,
      w,
      h,
      flipH,
      flipV,
      line: { color: DEFAULT_LINK_COLOR, width: 1 },
    });
  }
}

export async function exportToPptx(
  layout: LayoutResult,
  options?: PptxExportOptions,
): Promise<void> {
  const slideWidth = options?.slideWidth ?? DEFAULT_SLIDE_WIDTH;
  const slideHeight = options?.slideHeight ?? DEFAULT_SLIDE_HEIGHT;
  const padding = options?.padding ?? DEFAULT_PADDING;
  const fileName = options?.fileName ?? DEFAULT_FILE_NAME;

  const pres = new pptxgen();

  pres.defineLayout({ name: 'CUSTOM', width: slideWidth, height: slideHeight });
  pres.layout = 'CUSTOM';

  const slide = pres.addSlide();

  if (layout.nodes.length === 0) {
    await pres.writeFile({ fileName });
    return;
  }

  const { boundingBox } = layout;
  const offsetX = boundingBox.minX;
  const offsetY = boundingBox.minY;
  const scale = computeScale(boundingBox, slideWidth, slideHeight, padding);

  // Layer 1: IC containers (behind everything)
  for (const container of layout.icContainers) {
    addICContainer(slide, container, offsetX, offsetY, scale, padding);
  }

  // Layer 2: Links
  for (const link of layout.links) {
    addLinkLines(slide, link, offsetX, offsetY, scale, padding);
  }

  // Layer 3: Nodes (all types)
  for (const node of layout.nodes) {
    addNodeShape(slide, node, offsetX, offsetY, scale, padding);
  }

  await pres.writeFile({ fileName });
}
