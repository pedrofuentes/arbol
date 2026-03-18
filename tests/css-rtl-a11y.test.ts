import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { relativeLuminance } from '../src/utils/contrast';
const cssPath = resolve(__dirname, '..', 'src', 'style.css');
let css: string;
beforeAll(() => { css = readFileSync(cssPath, 'utf-8'); });
describe('CSS logical properties (RTL)', () => {
  it('no margin-left', () => { expect(css.match(/[^-]margin-left\s*:/g)).toBeNull(); });
  it('no margin-right', () => { expect(css.match(/[^-]margin-right\s*:/g)).toBeNull(); });
  it('no padding-left', () => { expect(css.match(/[^-]padding-left\s*:/g)).toBeNull(); });
  it('no text-align: left', () => { expect(css.match(/text-align\s*:\s*left/g)).toBeNull(); });
  it('no text-align: right', () => { expect(css.match(/text-align\s*:\s*right/g)).toBeNull(); });
  it('no border-left', () => { expect(css.match(/[^-]border-left\s*:/g)).toBeNull(); });
  it('no border-right', () => { expect(css.match(/[^-]border-right\s*:/g)).toBeNull(); });
  it('has logical properties', () => {
    expect(css).toContain('inset-inline-start:');
    expect(css).toContain('inset-inline-end:');
    expect(css).toContain('margin-inline-start:');
    expect(css).toContain('margin-inline-end:');
    expect(css).toContain('border-inline-start:');
    expect(css).toContain('border-inline-end:');
  });
  it('preserves centering', () => { expect(css).toMatch(/left:\s*50%/); });
});
describe('Touch targets (44px min on mobile)', () => {
  it('has 44px targets in mobile query', () => {
    const re = /@media\s*\(max-width:\s*768px\)\s*\{/g;
    let match; const blocks: string[] = [];
    while ((match = re.exec(css)) !== null) {
      let d = 1, p = match.index + match[0].length;
      while (p < css.length && d > 0) { if (css[p]==='{') d++; if (css[p]==='}') d--; p++; }
      blocks.push(css.slice(match.index, p));
    }
    const all = blocks.join('\n');
    for (const s of ['zoom-btn-icon','sidebar-toggle','pp-close','settings-modal-close','import-wizard-close','preview-zoom-btn']) {
      expect(all, s).toContain(s);
    }
    expect(all).toContain('min-width: 44px');
    expect(all).toContain('min-height: 44px');
  });
});
describe('Dark theme contrast (WCAG AA)', () => {
  function getTertiary() {
    const rm = css.match(/:root\s*\{([^}]+)\}/);
    return rm![1].match(/--text-tertiary:\s*(#[0-9a-fA-F]{3,8})/)![1];
  }
  function cr(fg: string, bg: string) {
    const fL = relativeLuminance(fg), bL = relativeLuminance(bg);
    return (Math.max(fL,bL)+0.05)/(Math.min(fL,bL)+0.05);
  }
  it('4.5:1 vs #0c1222', () => { expect(cr(getTertiary(), '#0c1222')).toBeGreaterThanOrEqual(4.5); });
  it('4.5:1 vs #111827', () => { expect(cr(getTertiary(), '#111827')).toBeGreaterThanOrEqual(4.5); });
  it('not #64748b', () => { expect(getTertiary().toLowerCase()).not.toBe('#64748b'); });
});
