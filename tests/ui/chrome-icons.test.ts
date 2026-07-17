import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '../../src/ui/command-palette';
import { dismissContextMenu, showContextMenu } from '../../src/ui/context-menu';

const CHROME_SOURCE_FILES = [
  'src/main.ts',
  'src/editor/analytics-editor.ts',
  'src/editor/chart-editor.ts',
  'src/editor/settings-editor.ts',
  'src/editor/settings/settings-io.ts',
  'src/editor/settings/preset-panel.ts',
  'src/editor/settings/category-panel.ts',
  'src/editor/settings/level-mapping-panel.ts',
  'src/init/context-menu-handler.ts',
  'src/init/shortcuts-handler.ts',
  'src/init/toolbar-builder.ts',
  'src/ui/analytics-drawer.ts',
  'src/ui/category-legend.ts',
  'src/ui/chart-name-header.ts',
  'src/ui/command-palette.ts',
  'src/ui/comparison-banner.ts',
  'src/ui/context-menu.ts',
  'src/ui/import-wizard.ts',
  'src/ui/import-wizard-steps.ts',
  'src/ui/property-panel.ts',
  'src/ui/settings-modal.ts',
  'src/ui/version-viewer.ts',
] as const;

const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/gu;
const DISALLOWED_CONTROL_GLYPHS = /[↩↪↺⊞✕×▶▾▪▫▢▣]/g;

afterEach(() => {
  dismissContextMenu();
  document.body.replaceChildren();
});

describe('chrome SVG icon sweep', () => {
  it.each(CHROME_SOURCE_FILES)('%s has no hardcoded pictograph controls', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');

    expect(source.match(EXTENDED_PICTOGRAPHIC) ?? [], file).toEqual([]);
    expect(source.match(DISALLOWED_CONTROL_GLYPHS) ?? [], file).toEqual([]);
  });

  it('renders semantic command-palette icons as SVG', () => {
    const palette = new CommandPalette({ onDismiss: vi.fn() });
    palette.setItems([
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'analytics',
        group: 'Actions',
        action: vi.fn(),
      },
    ]);

    palette.open();

    expect(document.querySelector('.cp-icon svg')?.getAttribute('data-icon')).toBe('search');
    expect(document.querySelector('.cp-item-icon svg')?.getAttribute('data-icon')).toBe(
      'analytics',
    );
    palette.destroy();
  });

  it('renders semantic context-menu icons as SVG', () => {
    showContextMenu({
      x: 10,
      y: 10,
      items: [{ label: 'Edit', icon: 'edit', action: vi.fn() }],
    });

    expect(document.querySelector('[role="menu"] svg')?.getAttribute('data-icon')).toBe('edit');
  });
});
