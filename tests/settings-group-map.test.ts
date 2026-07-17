// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf-8');

describe('settings section group mapping', () => {
  it('assigns every existing section ID to one of the six settings groups', () => {
    const mapSource = mainSource.match(
      /const SECTION_TAB_MAP: Record<string, string> = \{([^]*?)\n {2}\};/,
    )?.[1];
    expect(mapSource).toBeDefined();

    const entries = [...mapSource!.matchAll(/(?:'([^']+)'|([\w-]+)):\s*'([^']+)'/g)].map(
      (match) => [match[1] ?? match[2], match[3]],
    );

    expect(Object.fromEntries(entries)).toEqual({
      presets: 'presets',
      categories: 'levels_categories',
      'card-dimensions': 'layout',
      'tree-spacing': 'layout',
      'ic-options': 'layout',
      'advisor-options': 'layout',
      typography: 'appearance',
      'link-style': 'appearance',
      'card-style': 'appearance',
      'headcount-badge': 'cards_badges',
      'level-badge': 'cards_badges',
      'categories-legend': 'levels_categories',
      'level-mapping': 'levels_categories',
      'settings-io': 'data_backup',
      'backup-restore': 'data_backup',
      trash: 'data_backup',
    });
  });

  it('annotates editor sections from the sole section group map for modal search', () => {
    expect(mainSource).toContain('annotateTopLevelSettingsSections(contentArea, SECTION_TAB_MAP)');
    expect(mainSource).toContain('settingsModal.refreshSectionVisibility()');
  });
});
