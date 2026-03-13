import type pptxgen from 'pptxgenjs';
import type {
  LayoutResult,
  LayoutNode,
  LayoutLink,
  LayoutICContainer,
} from '../renderer/layout-engine';
import type { ColorCategory } from '../types';

export const PX_TO_INCHES = 1 / 96;
export const PX_TO_PT = 72 / 96;

const DEFAULT_SLIDE_WIDTH = 13.33;
const DEFAULT_SLIDE_HEIGHT = 7.5;
const DEFAULT_PADDING = 0.5;
const MAX_SLIDE_DIMENSION = 56;

function generateFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${timestamp}-org-chart.pptx`;
}

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
  categories?: ColorCategory[];
  nameFontSize?: number;
  titleFontSize?: number;
  cardFill?: string;
  cardStroke?: string;
  cardStrokeWidth?: number;
  icContainerFill?: string;
  linkColor?: string;
  linkWidth?: number;
  showHeadcount?: boolean;
  headcountBadgeColor?: string;
  headcountBadgeTextColor?: string;
  headcountBadgeFontSize?: number;
  headcountBadgeRadius?: number;
  headcountBadgePadding?: number;
  headcountBadgeHeight?: number;
}

export interface Point {
  x: number;
  y: number;
}

interface ResolvedStyles {
  nameFontPt: number;
  titleFontPt: number;
  cardFill: string;
  cardStroke: string;
  cardStrokeWidth: number;
  icContainerFill: string;
  linkColor: string;
  linkWidth: number;
  showHeadcount: boolean;
  headcountBadgeColor: string;
  headcountBadgeTextColor: string;
  headcountBadgeFontSize: number;
  headcountBadgeHeight: number;
  headcountBadgePadding: number;
  headcountBadgeRadius: number;
}

function stripHash(color: string): string {
  return color.replace(/^#/, '');
}

export function resolveStyles(options?: PptxExportOptions): ResolvedStyles {
  return {
    nameFontPt: Math.max(3, Math.round((options?.nameFontSize ?? 11) * PX_TO_PT)),
    titleFontPt: Math.max(3, Math.round((options?.titleFontSize ?? 9) * PX_TO_PT)),
    cardFill: stripHash(options?.cardFill ?? '#FFFFFF'),
    cardStroke: stripHash(options?.cardStroke ?? '#22C55E'),
    cardStrokeWidth: (options?.cardStrokeWidth ?? 1) * PX_TO_PT,
    icContainerFill: stripHash(options?.icContainerFill ?? '#E5E7EB'),
    linkColor: stripHash(options?.linkColor ?? '#94A3B8'),
    linkWidth: (options?.linkWidth ?? 1.5) * PX_TO_PT,
    showHeadcount: options?.showHeadcount ?? false,
    headcountBadgeColor: stripHash(options?.headcountBadgeColor ?? '#9CA3AF'),
    headcountBadgeTextColor: stripHash(options?.headcountBadgeTextColor ?? '#1E293B'),
    headcountBadgeFontSize: Math.max(3, Math.round((options?.headcountBadgeFontSize ?? 11) * PX_TO_PT)),
    headcountBadgeHeight: options?.headcountBadgeHeight ?? 22,
    headcountBadgePadding: options?.headcountBadgePadding ?? 8,
    headcountBadgeRadius: options?.headcountBadgeRadius ?? 4,
  };
}

/** Parse an SVG path "M x,y L x,y ..." into an array of points. */
export function parseSvgPath(d: string): Point[] {
  if (!d || d.trim().length === 0) return [];

  const points: Point[] = [];
  const commands = d.match(/[ML][^ML]*/g);
  if (!commands) return [];

  for (const cmd of commands) {
    const nums = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
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
  styles: ResolvedStyles,
  categories?: ColorCategory[],
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
  const nameFontSize = Math.max(3, Math.round(styles.nameFontPt * scale));
  const titleFontSize = Math.max(3, Math.round(styles.titleFontPt * scale));

  let fillColor = styles.cardFill;
  if (node.categoryId && categories) {
    const cat = categories.find((c) => c.id === node.categoryId);
    if (cat) {
      fillColor = stripHash(cat.color);
    }
  }

  slide.addShape('rect', {
    x: topLeft.x,
    y: topLeft.y,
    w,
    h,
    fill: { color: fillColor },
    line: { color: styles.cardStroke, width: styles.cardStrokeWidth },
  });

  slide.addText(
    [
      { text: node.name, options: { bold: true, breakLine: true, fontSize: nameFontSize } },
      { text: node.title, options: { fontSize: titleFontSize, color: '64748B' } },
    ],
    {
      x: topLeft.x,
      y: topLeft.y,
      w,
      h,
      align: 'center',
      valign: 'middle',
      fontFace: DEFAULT_FONT_FAMILY,
      color: '1E293B',
      margin: 0,
    },
  );

  // Headcount badge
  if (
    styles.showHeadcount &&
    node.descendantCount != null &&
    node.descendantCount > 0 &&
    node.type === 'manager'
  ) {
    const badgeText = String(node.descendantCount);
    const badgeFontSize = Math.max(3, Math.round(styles.headcountBadgeFontSize * scale));
    const badgeH = node.height * 0.5 * scale * PX_TO_INCHES;
    const charWidth = styles.headcountBadgeFontSize * 0.7;
    const estimatedTextWidth = badgeText.length * charWidth;
    const minBadgeWidth = styles.headcountBadgeHeight;
    const badgePxWidth = Math.max(minBadgeWidth, estimatedTextWidth + styles.headcountBadgePadding * 2);
    const badgeW = badgePxWidth * scale * PX_TO_INCHES;

    const badgeX = topLeft.x + w - badgeW / 2;
    const badgeY = topLeft.y + h / 2 - badgeH / 2;

    slide.addShape('roundRect', {
      x: badgeX,
      y: badgeY,
      w: badgeW,
      h: badgeH,
      fill: { color: styles.headcountBadgeColor },
      rectRadius: styles.headcountBadgeRadius * scale * PX_TO_INCHES,
    });

    slide.addText(badgeText, {
      x: badgeX,
      y: badgeY,
      w: badgeW,
      h: badgeH,
      align: 'center',
      valign: 'middle',
      fontFace: DEFAULT_FONT_FAMILY,
      fontSize: badgeFontSize,
      bold: true,
      color: styles.headcountBadgeTextColor,
      wrap: false,
    });
  }
}

function addICContainer(
  slide: pptxgen.Slide,
  container: LayoutICContainer,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
  styles: ResolvedStyles,
): void {
  const topLeft = convertCoordinates(container.x, container.y, offsetX, offsetY, scale, padding);
  const w = container.width * scale * PX_TO_INCHES;
  const h = container.height * scale * PX_TO_INCHES;

  slide.addShape('rect', {
    x: topLeft.x,
    y: topLeft.y,
    w,
    h,
    fill: { color: styles.icContainerFill },
  });
}

function addLinkLines(
  slide: pptxgen.Slide,
  link: LayoutLink,
  offsetX: number,
  offsetY: number,
  scale: number,
  padding: number,
  styles: ResolvedStyles,
): void {
  const points = parseSvgPath(link.path);
  if (points.length < 2) return;

  for (let i = 0; i < points.length - 1; i++) {
    const start = convertCoordinates(points[i].x, points[i].y, offsetX, offsetY, scale, padding);
    const end = convertCoordinates(
      points[i + 1].x,
      points[i + 1].y,
      offsetX,
      offsetY,
      scale,
      padding,
    );

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(Math.abs(end.x - start.x), MIN_LINE_DIM);
    const h = Math.max(Math.abs(end.y - start.y), MIN_LINE_DIM);

    const flipH = end.x < start.x;
    const flipV = end.y < start.y;

    slide.addShape('line', {
      x,
      y,
      w,
      h,
      flipH,
      flipV,
      line: {
        color: styles.linkColor,
        width: styles.linkWidth,
        ...(link.dottedLine && { dashType: 'dash' as const }),
      },
    });
  }
}

export async function exportToPptx(
  layout: LayoutResult,
  options?: PptxExportOptions,
): Promise<void> {
  const padding = options?.padding ?? DEFAULT_PADDING;
  const fileName = options?.fileName ?? generateFileName();
  const styles = resolveStyles(options);

  const hasExplicitSlideSize = options?.slideWidth != null || options?.slideHeight != null;
  let slideWidth: number;
  let slideHeight: number;
  let scale: number;

  if (hasExplicitSlideSize) {
    slideWidth = options?.slideWidth ?? DEFAULT_SLIDE_WIDTH;
    slideHeight = options?.slideHeight ?? DEFAULT_SLIDE_HEIGHT;
    scale =
      layout.nodes.length > 0
        ? computeScale(layout.boundingBox, slideWidth, slideHeight, padding)
        : 1;
  } else if (layout.nodes.length === 0) {
    slideWidth = DEFAULT_SLIDE_WIDTH;
    slideHeight = DEFAULT_SLIDE_HEIGHT;
    scale = 1;
  } else {
    const chartW = layout.boundingBox.width * PX_TO_INCHES + padding * 2;
    const chartH = layout.boundingBox.height * PX_TO_INCHES + padding * 2;

    if (chartW > MAX_SLIDE_DIMENSION || chartH > MAX_SLIDE_DIMENSION) {
      slideWidth = Math.min(chartW, MAX_SLIDE_DIMENSION);
      slideHeight = Math.min(chartH, MAX_SLIDE_DIMENSION);
      scale = computeScale(layout.boundingBox, slideWidth, slideHeight, padding);
    } else {
      slideWidth = chartW;
      slideHeight = chartH;
      scale = 1;
    }
  }

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pres = new PptxGenJS();

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

  // Layer 1: IC containers (behind everything)
  for (const container of layout.icContainers) {
    addICContainer(slide, container, offsetX, offsetY, scale, padding, styles);
  }

  // Layer 2: Links
  for (const link of layout.links) {
    addLinkLines(slide, link, offsetX, offsetY, scale, padding, styles);
  }

  // Layer 3: Nodes (all types)
  const categories = options?.categories;
  for (const node of layout.nodes) {
    addNodeShape(slide, node, offsetX, offsetY, scale, padding, styles, categories);
  }

  // Layer 4: Legend
  if (categories && categories.length > 0) {
    addLegend(slide, categories, slideWidth, slideHeight, padding);
  }

  await pres.writeFile({ fileName });
}

function addLegend(
  slide: pptxgen.Slide,
  categories: ColorCategory[],
  slideWidth: number,
  slideHeight: number,
  padding: number,
): void {
  const legendX = padding;
  const swatchSize = 0.15;
  const rowHeight = 0.22;
  const textGap = 0.08;
  const legendPadding = 0.08;
  const fontSize = 7;
  const textWidth = 1.2;

  const totalHeight = legendPadding * 2 + categories.length * rowHeight;
  const totalWidth = legendPadding * 2 + swatchSize + textGap + textWidth;
  const legendY = slideHeight - padding - totalHeight;

  // Legend background
  slide.addShape('rect', {
    x: legendX,
    y: legendY,
    w: totalWidth,
    h: totalHeight,
    fill: { color: 'FFFFFF' },
    line: { color: 'E2E8F0', width: 0.5 },
  });

  categories.forEach((cat, i) => {
    const rowY = legendY + legendPadding + i * rowHeight;
    const rowX = legendX + legendPadding;

    // Color swatch
    slide.addShape('rect', {
      x: rowX,
      y: rowY + (rowHeight - swatchSize) / 2 - legendPadding / 2,
      w: swatchSize,
      h: swatchSize,
      fill: { color: cat.color.replace(/^#/, '') },
      line: { color: 'CBD5E1', width: 0.25 },
    });

    // Label text
    slide.addText(cat.label, {
      x: rowX + swatchSize + textGap,
      y: rowY - legendPadding / 2,
      w: textWidth,
      h: rowHeight,
      fontSize,
      fontFace: DEFAULT_FONT_FAMILY,
      color: '64748B',
      valign: 'middle',
    });
  });
}
