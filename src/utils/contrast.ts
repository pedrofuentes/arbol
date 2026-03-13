/**
 * WCAG 2.1 relative luminance and contrast helpers.
 *
 * Used to auto-pick readable text colors against arbitrary background colors.
 */

const HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX6_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/**
 * Parse a hex color string (#RGB or #RRGGBB) into [r, g, b] in 0-255.
 * Throws on invalid input.
 */
export function parseHex(hex: string): [number, number, number] {
  let m = HEX6_RE.exec(hex);
  if (m) {
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }
  m = HEX3_RE.exec(hex);
  if (m) {
    return [parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), parseInt(m[3] + m[3], 16)];
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

/**
 * WCAG 2.1 relative luminance of a hex color.
 * Returns a value between 0 (black) and 1 (white).
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

const DEFAULT_DARK = '#1e293b';
const DEFAULT_LIGHT = '#ffffff';

/**
 * Pick a contrasting text color for a given background.
 *
 * Uses the WCAG luminance threshold of 0.179 — backgrounds brighter than
 * this get dark text, darker backgrounds get light text.
 */
export function contrastingTextColor(
  bgHex: string,
  darkColor: string = DEFAULT_DARK,
  lightColor: string = DEFAULT_LIGHT,
): string {
  return relativeLuminance(bgHex) > 0.179 ? darkColor : lightColor;
}

const DEFAULT_TITLE_DARK = '#64748b';
const DEFAULT_TITLE_LIGHT = '#cbd5e1';

/**
 * Pick a contrasting *title* color — slightly muted compared to the name
 * color, but still readable against the background.
 */
export function contrastingTitleColor(
  bgHex: string,
  darkColor: string = DEFAULT_TITLE_DARK,
  lightColor: string = DEFAULT_TITLE_LIGHT,
): string {
  return relativeLuminance(bgHex) > 0.179 ? darkColor : lightColor;
}
