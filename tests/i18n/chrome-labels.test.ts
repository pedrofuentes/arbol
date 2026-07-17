import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en';
import es from '../../src/i18n/es';

const CHROME_PICTOGRAPH = /[\p{Extended_Pictographic}↩↪↺⊞✕×▶▾▪▫▢▣☰]/gu;

const DOCUMENTATION_EXAMPLES = new Set([
  'help.getting_started.sidebar',
  'help.sidebar_tabs.settings_label',
  'help.sidebar_tabs.import_label',
  'help.sidebar_tabs.export_label',
  'help.importing.how_strong',
  'help.settings.modal',
]);

const DATA_NOTATION = new Set(['export.scale_1x', 'export.scale_2x', 'export.scale_3x']);

describe.each([
  ['English', en],
  ['Spanish', es],
])('%s chrome translations', (_name, locale) => {
  it('keeps pictographs out of controls, tabs, titles, and placeholders', () => {
    const violations = Object.entries(locale)
      .filter(([key]) => !DOCUMENTATION_EXAMPLES.has(key) && !DATA_NOTATION.has(key))
      .flatMap(([key, value]) => {
        const matches = value.match(CHROME_PICTOGRAPH) ?? [];
        return matches.map((glyph) => `${key}: ${glyph}`);
      });

    expect(violations).toEqual([]);
  });

  it('keeps retained help examples explicit and documented', () => {
    for (const key of DOCUMENTATION_EXAMPLES) {
      expect(locale[key], key).toBeDefined();
    }
  });
});
