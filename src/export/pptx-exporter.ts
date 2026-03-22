import type pptxgen from 'pptxgenjs';
import type {
  LayoutResult,
  LayoutNode,
  LayoutLink,
  LayoutICContainer,
} from '../renderer/layout-engine';
import type { ColorCategory } from '../types';
import { timestampedFilename } from '../utils/filename';
import { t } from '../i18n';
import { DEFAULT_RENDERER_OPTIONS } from '../constants/defaults';

export const PX_TO_INCHES = 1 / 96;
export const PX_TO_PT = 72 / 96;

const DEFAULT_SLIDE_WIDTH = 13.33;
const DEFAULT_SLIDE_HEIGHT = 7.5;
const DEFAULT_PADDING = 0.5;
const MAX_SLIDE_DIMENSION = 56;

function generateFileName(): string {
  return timestampedFilename(t('export.default_filename') + '.pptx');
}

const DEFAULT_CARD_STROKE = stripHash(DEFAULT_RENDERER_OPTIONS.cardStroke);
const DEFAULT_CARD_FILL = stripHash(DEFAULT_RENDERER_OPTIONS.cardFill);
const DEFAULT_IC_CONTAINER_FILL = stripHash(DEFAULT_RENDERER_OPTIONS.icContainerFill);
const DEFAULT_LINK_COLOR = stripHash(DEFAULT_RENDERER_OPTIONS.linkColor);
const DEFAULT_FONT_FAMILY = DEFAULT_RENDERER_OPTIONS.fontFamily;

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
  nameColor?: string;
  titleColor?: string;
  showHeadcount?: boolean;
  headcountBadgeColor?: string;
  headcountBadgeTextColor?: string;
  headcountBadgeFontSize?: number;
  headcountBadgeRadius?: number;
  headcountBadgePadding?: number;
  headcountBadgeHeight?: number;
  showLevel?: boolean;
  levelBadgeColor?: string;
  levelBadgeTextColor?: string;
  levelBadgeFontSize?: number;
  levelBadgeSize?: number;
  /** Optional function to resolve job title based on level mapping. */
  resolveTitle?: (originalTitle: string, rawLevel?: string, isManager?: boolean, pinnedTitle?: boolean) => string;
  legendRows?: number;
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  cardBorderRadius?: number;
  fontFamily?: string;
  additionalLayouts?: { layout: LayoutResult; title?: string }[];
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
  nameColor: string;
  titleColor: string;
  showHeadcount: boolean;
  headcountBadgeColor: string;
  headcountBadgeTextColor: string;
  headcountBadgeFontSize: number;
  headcountBadgeHeight: number;
  headcountBadgePadding: number;
  headcountBadgeRadius: number;
  showLevel: boolean;
  levelBadgeColor: string;
  levelBadgeTextColor: string;
  levelBadgeFontSize: number;
  levelBadgeSize: number;
  textAlign: 'left' | 'center' | 'right';
  cardBorderRadius: number;
  fontFamily: string;
}

function stripHash(color: string): string {
  return color.replace(/^#/, '').toUpperCase();
}

export function resolveStyles(options?: PptxExportOptions): ResolvedStyles {
  const d = DEFAULT_RENDERER_OPTIONS;
  return {
    nameFontPt: Math.max(3, Math.round((options?.nameFontSize ?? d.nameFontSize) * PX_TO_PT)),
    titleFontPt: Math.max(3, Math.round((options?.titleFontSize ?? d.titleFontSize) * PX_TO_PT)),
    cardFill: stripHash(options?.cardFill ?? d.cardFill),
    cardStroke: stripHash(options?.cardStroke ?? d.cardStroke),
    cardStrokeWidth: (options?.cardStrokeWidth ?? d.cardStrokeWidth) * PX_TO_PT,
    icContainerFill: stripHash(options?.icContainerFill ?? d.icContainerFill),
    linkColor: stripHash(options?.linkColor ?? d.linkColor),
    linkWidth: (options?.linkWidth ?? d.linkWidth) * PX_TO_PT,
    nameColor: stripHash(options?.nameColor ?? d.nameColor),
    titleColor: stripHash(options?.titleColor ?? d.titleColor),
    showHeadcount: options?.showHeadcount ?? d.showHeadcount,
    headcountBadgeColor: stripHash(options?.headcountBadgeColor ?? d.headcountBadgeColor),
    headcountBadgeTextColor: stripHash(options?.headcountBadgeTextColor ?? d.headcountBadgeTextColor),
    headcountBadgeFontSize: Math.max(3, Math.round((options?.headcountBadgeFontSize ?? d.headcountBadgeFontSize) * PX_TO_PT)),
    headcountBadgeHeight: options?.headcountBadgeHeight ?? d.headcountBadgeHeight,
    headcountBadgePadding: options?.headcountBadgePadding ?? d.headcountBadgePadding,
    headcountBadgeRadius: options?.headcountBadgeRadius ?? d.headcountBadgeRadius,
    showLevel: options?.showLevel ?? d.showLevel,
    levelBadgeColor: stripHash(options?.levelBadgeColor ?? d.levelBadgeColor),
    levelBadgeTextColor: stripHash(options?.levelBadgeTextColor ?? d.levelBadgeTextColor),
    levelBadgeFontSize: Math.max(3, Math.round((options?.levelBadgeFontSize ?? d.levelBadgeFontSize) * PX_TO_PT)),
    levelBadgeSize: options?.levelBadgeSize ?? d.levelBadgeSize,
    textAlign:options?.textAlign === 'start' ? 'left' : options?.textAlign === 'end' ? 'right' : options?.textAlign ?? d.textAlign as 'left' | 'center' | 'right',
    cardBorderRadius: options?.cardBorderRadius ?? d.cardBorderRadius,
    fontFamily: options?.fontFamily ?? d.fontFamily,
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
  resolveTitle?: (originalTitle: string, rawLevel?: string, isManager?: boolean, pinnedTitle?: boolean) => string,
  isManager?: boolean,
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
  let nodeNameColor = styles.nameColor;
  let nodeTitleColor = styles.titleColor;
  if (node.categoryId && categories) {
    const cat = categories.find((c) => c.id === node.categoryId);
    if (cat) {
      fillColor = stripHash(cat.color);
      if (cat.nameColor) nodeNameColor = stripHash(cat.nameColor);
      if (cat.titleColor) nodeTitleColor = stripHash(cat.titleColor);
    }
  }

  const shapeType = styles.cardBorderRadius > 0 ? 'roundRect' : 'rect';
  const shapeOpts: Record<string, unknown> = {
    x: topLeft.x,
    y: topLeft.y,
    w,
    h,
    fill: { color: fillColor },
    line: { color: styles.cardStroke, width: styles.cardStrokeWidth },
  };
  if (styles.cardBorderRadius > 0) {
    shapeOpts.rectRadius = Math.min(styles.cardBorderRadius * PX_TO_INCHES / (h / 2), 1);
  }
  slide.addShape(shapeType as 'rect', shapeOpts);

  slide.addText(
    [
      { text: node.name, options: { bold: true, breakLine: true, fontSize: nameFontSize } },
      { text: resolveTitle ? resolveTitle(node.title, node.level, isManager, node.pinnedTitle) : node.title, options: { fontSize: titleFontSize, color: nodeTitleColor } },
    ],
    {
      x: topLeft.x,
      y: topLeft.y,
      w,
      h,
      align: styles.textAlign,
      valign: 'middle',
      fontFace: styles.fontFamily,
      color: nodeNameColor,
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
      fontFace: styles.fontFamily,
      fontSize: badgeFontSize,
      bold: true,
      color: styles.headcountBadgeTextColor,
      wrap: false,
    });
  }

  // Level badge
  if (styles.showLevel && node.level) {
    const levelText = node.level;
    if (levelText) {
      const badgeFontSize = Math.max(3, Math.round(styles.levelBadgeFontSize * scale));
      const badgeSide = styles.levelBadgeSize * scale * PX_TO_INCHES;

      // Position: inside bottom-left corner of the card
      const badgeX = topLeft.x;
      const badgeY = topLeft.y + h - badgeSide;

      slide.addShape('rect', {
        x: badgeX,
        y: badgeY,
        w: badgeSide,
        h: badgeSide,
        fill: { color: styles.levelBadgeColor },
      });

      slide.addText(levelText, {
        x: badgeX,
        y: badgeY,
        w: badgeSide,
        h: badgeSide,
        align: 'center',
        valign: 'middle',
        fontFace: styles.fontFamily,
        fontSize: badgeFontSize,
        bold: true,
        color: styles.levelBadgeTextColor,
        wrap: false,
      });
    }
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
    addNodeShape(slide, node, offsetX, offsetY, scale, padding, styles, categories, options?.resolveTitle, node.type === 'manager');
  }

  // Layer 4: Legend
  if (categories && categories.length > 0) {
    addLegend(slide, categories, slideWidth, slideHeight, padding, options?.legendRows, styles.fontFamily);
  }

  // Additional slides for selected versions
  if (options?.additionalLayouts) {
    for (const { layout: vLayout, title: vTitle } of options.additionalLayouts) {
      if (vLayout.nodes.length === 0) continue;

      const vChartW = vLayout.boundingBox.width * PX_TO_INCHES + padding * 2;
      const vChartH = vLayout.boundingBox.height * PX_TO_INCHES + padding * 2;
      const vSlideW = Math.min(vChartW, MAX_SLIDE_DIMENSION) || slideWidth;
      const vSlideH = Math.min(vChartH, MAX_SLIDE_DIMENSION) || slideHeight;
      const vScale =
        vLayout.nodes.length > 0
          ? computeScale(vLayout.boundingBox, vSlideW, vSlideH, padding)
          : 1;

      const vSlide = pres.addSlide();
      const vOffsetX = vLayout.boundingBox.minX;
      const vOffsetY = vLayout.boundingBox.minY;

      if (vTitle) {
        vSlide.addText(vTitle, {
          x: padding,
          y: 0.1,
          w: vSlideW - padding * 2,
          h: 0.3,
          fontSize: 10,
          color: '64748b',
          fontFace: styles.fontFamily,
          align: 'left',
        });
      }

      for (const container of vLayout.icContainers) {
        addICContainer(vSlide, container, vOffsetX, vOffsetY, vScale, padding, styles);
      }
      for (const link of vLayout.links) {
        addLinkLines(vSlide, link, vOffsetX, vOffsetY, vScale, padding, styles);
      }
      for (const node of vLayout.nodes) {
        addNodeShape(vSlide, node, vOffsetX, vOffsetY, vScale, padding, styles, categories, options?.resolveTitle, node.type === 'manager');
      }
      if (categories && categories.length > 0) {
        addLegend(vSlide, categories, vSlideW, vSlideH, padding, options?.legendRows, styles.fontFamily);
      }
    }
  }

  await pres.writeFile({ fileName });
}

function addLegend(
  slide: pptxgen.Slide,
  categories: ColorCategory[],
  slideWidth: number,
  slideHeight: number,
  padding: number,
  legendRows?: number,
  fontFamily?: string,
): void {
  const legendX = padding;
  const swatchSize = 0.15;
  const rowHeight = 0.22;
  const textGap = 0.08;
  const legendPadding = 0.08;
  const fontSize = 7;
  const textWidth = 0.9;
  const columnGap = 0.06;

  const count = categories.length;
  const rows = legendRows && legendRows > 0 ? Math.min(legendRows, count) : count;
  const cols = Math.ceil(count / rows);

  const colWidth = swatchSize + textGap + textWidth;
  const totalWidth = legendPadding * 2 + cols * colWidth + (cols - 1) * columnGap;
  const totalHeight = legendPadding * 2 + rows * rowHeight;
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
    // Row-major: fill left-to-right, then next row
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowY = legendY + legendPadding + row * rowHeight;
    const rowX = legendX + legendPadding + col * (colWidth + columnGap);

    // Color swatch — vertically centered in row
    slide.addShape('rect', {
      x: rowX,
      y: rowY + (rowHeight - swatchSize) / 2,
      w: swatchSize,
      h: swatchSize,
      fill: { color: cat.color.replace(/^#/, '') },
      line: { color: 'CBD5E1', width: 0.25 },
    });

    // Label text — valign:middle centers within rowHeight
    slide.addText(cat.label, {
      x: rowX + swatchSize + textGap,
      y: rowY,
      w: textWidth,
      h: rowHeight,
      fontSize,
      fontFace: fontFamily ?? 'Calibri',
      color: '64748B',
      valign: 'middle',
    });
  });
}
