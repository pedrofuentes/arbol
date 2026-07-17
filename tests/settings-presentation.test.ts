// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/style.css', import.meta.url)), 'utf-8');
const presetPanelSource = readFileSync(
  fileURLToPath(new URL('../src/editor/settings/preset-panel.ts', import.meta.url)),
  'utf-8',
);

describe('settings modal presentation', () => {
  it('presents style presets as a compact horizontal strip owned by CSS', () => {
    const presetGridRule = css.match(/\.preset-grid\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(presetPanelSource).not.toContain('presetGrid.style.cssText');
    expect(presetGridRule).toContain('display: flex');
    expect(presetGridRule).toContain('overflow-x: auto');
    expect(presetGridRule).toMatch(/gap:\s*var\(--space-/);
  });

  it('uses tokenized flex gaps wherever modal icons sit beside labels or inputs', () => {
    const navRule = css.match(/\.settings-nav-item\s*\{([^}]*)\}/)?.[1] ?? '';
    const titleRule = css.match(/\.settings-modal-title\s*\{([^}]*)\}/)?.[1] ?? '';
    const searchRule = css.match(/\.settings-modal-search\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(navRule).toMatch(/gap:\s*var\(--space-/);
    expect(titleRule).toMatch(/gap:\s*var\(--space-/);
    expect(searchRule).toMatch(/gap:\s*var\(--space-/);
  });

  it('suppresses the search input outline so the wrapper owns its focus indicator', () => {
    const focusRule = css.match(/\.settings-search-input:focus-visible\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(focusRule).toMatch(/outline:\s*none/);
  });
});
