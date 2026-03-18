import { describe, it, expect } from 'vitest';
import {
  parseHex,
  relativeLuminance,
  contrastingTextColor,
  contrastingTitleColor,
  contrastRatio,
} from '../../src/utils/contrast';

describe('parseHex', () => {
  it('parses 6-digit hex', () => {
    expect(parseHex('#ff0000')).toEqual([255, 0, 0]);
    expect(parseHex('#00ff00')).toEqual([0, 255, 0]);
    expect(parseHex('#0000ff')).toEqual([0, 0, 255]);
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHex('#000000')).toEqual([0, 0, 0]);
  });

  it('parses 3-digit hex', () => {
    expect(parseHex('#f00')).toEqual([255, 0, 0]);
    expect(parseHex('#0f0')).toEqual([0, 255, 0]);
    expect(parseHex('#00f')).toEqual([0, 0, 255]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#000')).toEqual([0, 0, 0]);
  });

  it('is case insensitive', () => {
    expect(parseHex('#FF0000')).toEqual([255, 0, 0]);
    expect(parseHex('#Abc')).toEqual([170, 187, 204]);
  });

  it('throws on invalid input', () => {
    expect(() => parseHex('')).toThrow('Invalid hex color');
    expect(() => parseHex('ff0000')).toThrow('Invalid hex color');
    expect(() => parseHex('#gggggg')).toThrow('Invalid hex color');
    expect(() => parseHex('#12345')).toThrow('Invalid hex color');
    expect(() => parseHex('#1234567')).toThrow('Invalid hex color');
    expect(() => parseHex('rgb(0,0,0)')).toThrow('Invalid hex color');
  });
});

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('computes correct luminance for pure red', () => {
    // sRGB linearize: 1.0 → 1.0; luminance = 0.2126 * 1 + 0 + 0 = 0.2126
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 3);
  });

  it('computes correct luminance for pure green', () => {
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 3);
  });

  it('computes correct luminance for pure blue', () => {
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 3);
  });

  it('handles 3-digit hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000')).toBeCloseTo(0, 5);
  });

  it('mid-grey has intermediate luminance', () => {
    const lum = relativeLuminance('#808080');
    expect(lum).toBeGreaterThan(0.15);
    expect(lum).toBeLessThan(0.25);
  });
});

describe('contrastingTextColor', () => {
  it('returns dark color for white background', () => {
    expect(contrastingTextColor('#ffffff')).toBe('#1e293b');
  });

  it('returns light color for black background', () => {
    expect(contrastingTextColor('#000000')).toBe('#ffffff');
  });

  it('returns dark color for light yellow (#fbbf24)', () => {
    expect(contrastingTextColor('#fbbf24')).toBe('#1e293b');
  });

  it('returns light color for dark blue (#1e3a5f)', () => {
    expect(contrastingTextColor('#1e3a5f')).toBe('#ffffff');
  });

  it('accepts custom dark and light colors', () => {
    expect(contrastingTextColor('#ffffff', '#111111', '#eeeeee')).toBe('#111111');
    expect(contrastingTextColor('#000000', '#111111', '#eeeeee')).toBe('#eeeeee');
  });

  it('handles 3-digit hex backgrounds', () => {
    expect(contrastingTextColor('#fff')).toBe('#1e293b');
    expect(contrastingTextColor('#000')).toBe('#ffffff');
  });
});

describe('contrastingTitleColor', () => {
  it('returns muted dark for light backgrounds', () => {
    expect(contrastingTitleColor('#ffffff')).toBe('#475569');
  });

  it('returns muted light for dark backgrounds', () => {
    expect(contrastingTitleColor('#000000')).toBe('#cbd5e1');
  });

  it('returns muted dark for medium-light backgrounds', () => {
    expect(contrastingTitleColor('#fbbf24')).toBe('#475569');
  });

  it('accepts custom colors', () => {
    expect(contrastingTitleColor('#ffffff', '#333333', '#cccccc')).toBe('#333333');
    expect(contrastingTitleColor('#000000', '#333333', '#cccccc')).toBe('#cccccc');
  });
});

describe('contrastRatio', () => {
  it('returns ~21 for black vs white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('slate-500 on dark background fails WCAG AA (< 4.5)', () => {
    expect(contrastRatio('#64748b', '#0c1222')).toBeLessThan(4.5);
  });

  it('is symmetric: contrastRatio(a, b) === contrastRatio(b, a)', () => {
    expect(contrastRatio('#ff0000', '#0000ff')).toBeCloseTo(
      contrastRatio('#0000ff', '#ff0000'),
      10,
    );
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#000000'),
      10,
    );
  });
});
