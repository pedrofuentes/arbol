// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const css = readFileSync(resolve(repoRoot, 'src/style.css'), 'utf8');

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rule(selector: string): string {
  const match = css.match(new RegExp(`${escapeRegex(selector)}\\s*\\{([^}]*)\\}`));
  expect(match, `missing ${selector} rule`).not.toBeNull();
  return match?.[1] ?? '';
}

function expectDeclaration(block: string, property: string, value: string | RegExp): void {
  const expected = typeof value === 'string' ? escapeRegex(value) : value.source;
  expect(block).toMatch(
    new RegExp(`(?:^|\\n)\\s*${escapeRegex(property)}\\s*:\\s*${expected}\\s*;`),
  );
}

describe('dialog surface visual contracts', () => {
  it('pins the full-viewport dialog overlay backdrop and animation', () => {
    const overlay = rule('.dialog-overlay');

    expectDeclaration(overlay, 'position', 'fixed');
    expectDeclaration(overlay, 'inset', '0');
    expectDeclaration(overlay, 'background', /rgba\(0,\s*0,\s*0,\s*0\.5\)/);
    expectDeclaration(overlay, 'backdrop-filter', /blur\(2px\)/);
    expectDeclaration(overlay, 'animation', /fadeIn\s+150ms\s+ease/);
  });

  it('pins the stronger help overlay backdrop', () => {
    const helpOverlay = rule('.dialog-overlay--help');

    expectDeclaration(helpOverlay, 'background', /rgba\(0,\s*0,\s*0,\s*0\.6\)/);
    expectDeclaration(helpOverlay, 'backdrop-filter', /blur\(3px\)/);
  });

  it('pins shared and help dialog panel dimensions', () => {
    const panel = rule('.dialog-panel');
    const helpPanel = rule('.help-dialog');

    expectDeclaration(panel, 'min-width', /var\(--dialog-panel-min-width,\s*320px\)/);
    expectDeclaration(panel, 'max-width', /var\(--dialog-panel-max-width,\s*420px\)/);
    expectDeclaration(panel, 'padding', /var\(--dialog-panel-padding,\s*24px\)/);
    expectDeclaration(helpPanel, 'width', '520px');
    expectDeclaration(helpPanel, 'max-width', '90vw');
    expectDeclaration(helpPanel, 'max-height', '80vh');
  });

  it('pins fixed, horizontally centered banners and passive hit testing', () => {
    const banner = rule('.ui-banner');
    const passiveBanner = rule('.ui-banner--passive');

    expectDeclaration(banner, 'position', 'fixed');
    expectDeclaration(banner, 'left', '50%');
    expectDeclaration(banner, 'transform', /translateX\(-50%\)/);
    expectDeclaration(passiveBanner, 'pointer-events', 'none');
  });

  it('keeps dialog and popover entry keyframes', () => {
    expect(css).toMatch(/@keyframes\s+fadeIn\s*\{/);
    expect(css).toMatch(/@keyframes\s+popoverFadeIn\s*\{/);
  });
});
