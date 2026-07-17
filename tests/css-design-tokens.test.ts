// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

const css = readSource('../src/style.css');

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
    expect(value('menu-submenu')).toBeLessThan(value('toast'));
    expect(value('toast')).toBeLessThan(value('blocking'));
    expect(value('blocking')).toBeLessThan(value('skip-link'));
  });

  it('uses semantic z-index tokens in inline UI styles', () => {
    const inlineStyleSources = [
      '../src/ui/dialog-utils.ts',
      '../src/ui/add-popover.ts',
      '../src/ui/inline-editor.ts',
      '../src/ui/context-menu.ts',
      '../src/ui/comparison-banner.ts',
      '../src/ui/focus-banner.ts',
      '../src/ui/offline-banner.ts',
      '../src/ui/version-viewer.ts',
    ].map(readSource);
    const hardcoded = inlineStyleSources.flatMap((source) => [
      ...(source.match(/z-index\s*:\s*\d+/g) ?? []),
      ...(source.match(/style\.zIndex\s*=\s*['"]\d+/g) ?? []),
      ...(source.match(/createOverlay\(zIndex:\s*number\s*=\s*\d+/g) ?? []),
    ]);

    expect(hardcoded).toEqual([]);
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
