// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const css = readFileSync(fileURLToPath(new URL('../src/style.css', import.meta.url)), 'utf-8');

function getMobileCss(): string {
  const re = /@media\s*\(max-width:\s*768px\)\s*\{/g;
  let match;
  const blocks: string[] = [];
  while ((match = re.exec(css)) !== null) {
    let depth = 1;
    let position = match.index + match[0].length;
    while (position < css.length && depth > 0) {
      if (css[position] === '{') depth++;
      if (css[position] === '}') depth--;
      position++;
    }
    blocks.push(css.slice(match.index, position));
  }
  return blocks.join('\n');
}

describe('CSS logical properties (RTL)', () => {
  it('no margin-left', () => {
    expect(css.match(/[^-]margin-left\s*:/g)).toBeNull();
  });
  it('no margin-right', () => {
    expect(css.match(/[^-]margin-right\s*:/g)).toBeNull();
  });
  it('no padding-left', () => {
    expect(css.match(/[^-]padding-left\s*:/g)).toBeNull();
  });
  it('no text-align: left', () => {
    expect(css.match(/text-align\s*:\s*left/g)).toBeNull();
  });
  it('no text-align: right', () => {
    expect(css.match(/text-align\s*:\s*right/g)).toBeNull();
  });
  it('no border-left', () => {
    expect(css.match(/[^-]border-left\s*:/g)).toBeNull();
  });
  it('no border-right', () => {
    expect(css.match(/[^-]border-right\s*:/g)).toBeNull();
  });
  it('has logical properties', () => {
    expect(css).toContain('inset-inline-start:');
    expect(css).toContain('inset-inline-end:');
    expect(css).toContain('margin-inline-start:');
    expect(css).toContain('margin-inline-end:');
    expect(css).toContain('border-inline-start:');
    expect(css).toContain('border-inline-end:');
  });
  it('preserves centering', () => {
    expect(css).toMatch(/left:\s*50%/);
  });
});
describe('Touch targets (44px min on mobile)', () => {
  it('has 44px targets in mobile query', () => {
    const re = /@media\s*\(max-width:\s*768px\)\s*\{/g;
    let match;
    const blocks: string[] = [];
    while ((match = re.exec(css)) !== null) {
      let d = 1,
        p = match.index + match[0].length;
      while (p < css.length && d > 0) {
        if (css[p] === '{') d++;
        if (css[p] === '}') d--;
        p++;
      }
      blocks.push(css.slice(match.index, p));
    }
    const all = blocks.join('\n');
    for (const s of [
      'zoom-btn-icon',
      'sidebar-toggle',
      'pp-close',
      'settings-modal-close',
      'import-wizard-close',
      'preview-zoom-btn',
    ]) {
      expect(all, s).toContain(s);
    }
    expect(all).toContain('min-width: 44px');
    expect(all).toContain('min-height: 44px');
    expect(all).toMatch(/\.settings-nav-item\s*\{[^}]*min-height:\s*44px/s);
    expect(all).toMatch(/\.settings-search-input\s*\{[^}]*min-height:\s*44px/s);
    expect(all).toMatch(
      /\.settings-cancel-btn,\s*\.settings-apply-btn\s*\{[^}]*min-height:\s*44px/s,
    );
  });

  it('uses a single-column modal with horizontally scrollable group navigation', () => {
    const mobileBlocks = getMobileCss();

    expect(mobileBlocks).toMatch(/\.settings-modal-body\s*\{[^}]*flex-direction:\s*column/s);
    expect(mobileBlocks).toMatch(/\.settings-nav\s*\{[^}]*overflow-x:\s*auto/s);
    expect(mobileBlocks).toMatch(/\.settings-nav\s*\{[^}]*border-inline-end:\s*none/s);
  });
});
describe('Sidebar row action accessibility', () => {
  it('reveals chart and version actions when their rows contain focus', () => {
    expect(css).toMatch(
      /\.chart-item:hover\s+\.chart-item-actions,\s*\.chart-item:focus-within\s+\.chart-item-actions\s*\{\s*display:\s*flex;/,
    );
    expect(css).toMatch(
      /\.version-item:hover\s+\.version-item-actions,\s*\.version-item:focus-within\s+\.version-item-actions\s*\{\s*display:\s*flex;/,
    );
  });
});
describe('Dark theme contrast (WCAG AA)', () => {
  function getTertiary() {
    const rm = css.match(/:root\s*\{([^}]+)\}/);
    return rm![1].match(/--text-tertiary:\s*(#[0-9a-fA-F]{3,8})/)![1];
  }
  function cr(fg: string, bg: string) {
    const fL = relativeLuminance(fg),
      bL = relativeLuminance(bg);
    return (Math.max(fL, bL) + 0.05) / (Math.min(fL, bL) + 0.05);
  }
  it('4.5:1 vs #0c1222', () => {
    expect(cr(getTertiary(), '#0c1222')).toBeGreaterThanOrEqual(4.5);
  });
  it('4.5:1 vs #111827', () => {
    expect(cr(getTertiary(), '#111827')).toBeGreaterThanOrEqual(4.5);
  });
  it('not #64748b', () => {
    expect(getTertiary().toLowerCase()).not.toBe('#64748b');
  });
});
