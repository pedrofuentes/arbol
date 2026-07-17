// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/style.css', import.meta.url)), 'utf-8');
const footerBuilder = readFileSync(
  fileURLToPath(new URL('../src/init/footer-builder.ts', import.meta.url)),
  'utf-8',
);

function mediaBlock(maxWidth: number): string {
  const marker = new RegExp(`@media\\s*\\(max-width:\\s*${maxWidth}px\\)\\s*\\{`, 'g');
  const match = marker.exec(css);
  if (!match) return '';

  let depth = 1;
  let cursor = match.index + match[0].length;
  while (cursor < css.length && depth > 0) {
    if (css[cursor] === '{') depth += 1;
    if (css[cursor] === '}') depth -= 1;
    cursor += 1;
  }
  return css.slice(match.index, cursor);
}

describe('phone shell composition', () => {
  const phoneCss = mediaBlock(480);

  it('lets the app rows grow with wrapped header and touch-friendly footer content', () => {
    expect(phoneCss).toMatch(
      /#app\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/s,
    );
    expect(phoneCss).toMatch(/#header\s*\{[^}]*display:\s*grid/s);
    expect(phoneCss).toMatch(/\.header-right\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(phoneCss).toMatch(/#footer\s*\{[^}]*min-width:\s*0/s);
  });

  it('docks search below the header at the full chart width', () => {
    expect(phoneCss).toMatch(/#chart-area\s*\{[^}]*padding-block-start:/s);
    expect(phoneCss).toMatch(
      /\.search-float\s*\{[^}]*inset-inline-start:[^;}]*!important[^}]*inset-inline-end:[^;}]*!important/s,
    );
    expect(phoneCss).toMatch(/\.search-float\s*\{[^}]*transform:\s*none\s*!important/s);
    expect(phoneCss).toMatch(/\.search-input(?:,\s*\.search-input:focus)?\s*\{[^}]*width:\s*100%/s);
  });

  it('keeps the category legend within both inline viewport edges', () => {
    expect(phoneCss).toMatch(
      /\[data-testid='category-legend'\]\s*\{[^}]*inset-inline-start:[^;}]*!important[^}]*inset-inline-end:[^;}]*!important/s,
    );
    expect(phoneCss).toMatch(
      /\[data-testid='category-legend'\]\s*\{[^}]*max-width:\s*calc\(100%/s,
    );
  });

  it('reduces the footer to named essentials without overlapping status links', () => {
    for (const className of [
      'footer-version-separator',
      'footer-save-indicator',
      'footer-right',
      'footer-zoom-separator',
      'footer-zoom-indicator',
    ]) {
      expect(footerBuilder).toContain(className);
    }
    expect(phoneCss).toMatch(/\.footer-status,\s*\.footer-center\s*\{[^}]*display:\s*none/s);
    expect(phoneCss).toMatch(/\.footer-right\s*\{[^}]*margin-inline-start:\s*auto/s);
  });
});
