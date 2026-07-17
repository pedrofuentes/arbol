import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en';
import es from '../../src/i18n/es';
import { DISALLOWED_CONTROL_GLYPH_CHARACTERS } from '../helpers/control-glyphs';

const CHROME_PICTOGRAPH = new RegExp(
  `[\\p{Extended_Pictographic}${DISALLOWED_CONTROL_GLYPH_CHARACTERS}]`,
  'gu',
);

const DOCUMENTATION_EXAMPLES = new Set(['help.importing.how_strong']);

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
