// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

const css = readSource('src/style.css');

describe('z-index design tokens', () => {
  it('uses a semantic token for every CSS z-index declaration', () => {
    const declarations = [...css.matchAll(/\bz-index\s*:\s*([^;}\n]+)/g)].map((match) =>
      match[1].trim(),
    );
    const hardcoded = declarations.filter((value) => !value.startsWith('var(--z-'));

    expect(declarations.length).toBeGreaterThan(0);
    expect(hardcoded).toEqual([]);
  });

  it('documents an ordered hierarchy with nested dialogs above full-screen modals', () => {
    const root = css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? '';
    const value = (name: string): number => {
      const match = root.match(new RegExp(`--z-${name}:\\s*(\\d+)`));
      expect(match, `--z-${name}`).not.toBeNull();
      return Number(match?.[1]);
    };

    expect(css).toContain('Z-index hierarchy');
    expect(value('canvas-overlay')).toBeLessThan(value('drawer-backdrop'));
    expect(value('drawer-backdrop')).toBeLessThan(value('drawer'));
    expect(value('drawer')).toBeLessThan(value('panel'));
    expect(value('panel')).toBeLessThan(value('modal'));
    expect(value('modal')).toBeLessThan(value('dialog'));
    expect(value('dialog')).toBeLessThan(value('menu'));
    expect(value('menu')).toBeLessThan(value('menu-submenu'));
    expect(value('menu-submenu')).toBeLessThan(value('blocking'));
    expect(value('blocking')).toBeLessThan(value('toast'));
    expect(value('toast')).toBeLessThan(value('skip-link'));
  });

  it('uses semantic z-index tokens in all TypeScript styles', () => {
    const typescriptSources = globSync('src/**/*.ts', { cwd: repoRoot }).map(readSource);
    const hardcoded = typescriptSources.flatMap((source) => [
      ...(source.match(/\bstyle\.zIndex\s*=\s*['"]\d+['"]/g) ?? []),
      ...(source.match(/\bzIndex\s*:\s*(?:['"]\d+['"]|\d+\b)/g) ?? []),
      ...(source.match(/\bz-index\s*:\s*\d+\b/g) ?? []),
    ]);

    expect(hardcoded).toEqual([]);
  });
});

describe('shared dialog surface styles', () => {
  it('defines class-based overlay, panel, and banner chrome', () => {
    expect(css).toMatch(/\.dialog-overlay\s*\{/);
    expect(css).toMatch(/\.dialog-panel\s*\{/);
    expect(css).toMatch(/\.panel-chrome/);
    expect(css).toMatch(/\.ui-banner\s*\{/);
    expect(css).toContain('z-index: var(--z-dialog)');
    expect(css).toContain('z-index: var(--z-canvas-overlay)');
  });

  it('does not inject runtime style elements for consolidated surfaces', () => {
    const surfaces = [
      'src/ui/help-dialog.ts',
      'src/ui/add-popover.ts',
      'src/ui/context-menu.ts',
      'src/ui/focus-banner.ts',
      'src/ui/offline-banner.ts',
      'src/ui/comparison-banner.ts',
    ];

    for (const surface of surfaces) {
      expect(readSource(surface), surface).not.toMatch(/createElement\(['"]style['"]\)/);
    }
  });
});

describe('fatal error design tokens', () => {
  const fatalErrorCss =
    css.match(/\/\* Fatal error boundary[^]*?(?=\/\* High contrast mode)/)?.[0] ?? '';

  it('uses the real danger token while preserving initialization fallbacks', () => {
    expect(fatalErrorCss).toContain('color: var(--danger, #c0392b)');
    expect(fatalErrorCss).not.toContain('--color-danger');
    expect(fatalErrorCss).toMatch(/hex fallbacks are intentional[^.]*initialization fails/i);
    expect(fatalErrorCss).toContain('var(--text-primary, #1a1a1a)');
    expect(fatalErrorCss).toContain('var(--bg-surface, #ffffff)');
    expect(fatalErrorCss).toContain('var(--border-color, #d0d0d0)');
  });

  it('tokenizes fatal error spacing and radius', () => {
    expect(fatalErrorCss).toContain('margin: var(--space-8) auto');
    expect(fatalErrorCss).toContain('padding: var(--space-6)');
    expect(fatalErrorCss).toContain('border-radius: var(--radius-lg)');
    expect(fatalErrorCss).toContain('margin: 0 0 var(--space-4)');
    expect(fatalErrorCss).toContain('margin: var(--space-2) 0');
    expect(fatalErrorCss).not.toMatch(/(?:margin|padding|border-radius)\s*:[^;]*\drem/);
  });
});
