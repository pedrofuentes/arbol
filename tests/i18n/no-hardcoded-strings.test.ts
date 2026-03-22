import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Regression test: ensures specific source files have no hardcoded English
 * strings that should use t() / tp() i18n calls.
 *
 * Each entry maps a source file to patterns that must NOT appear as raw
 * string literals (i.e., outside of t()/tp() calls).
 */
const FILES_AND_FORBIDDEN_PATTERNS: Array<{
  file: string;
  patterns: RegExp[];
}> = [
  {
    file: 'src/editor/import-editor.ts',
    patterns: [
      /'Mapping preset'/,
      /'\+ New'/,
      /'📂 Import'/,
      /'💾 Export All'/,
      /'Import Presets'/,
      /'Or load file'/,
      /'Please paste JSON or load a file first\.'/,
      /'Invalid JSON'/,
      /'No presets to export'/,
      /'Upload org chart file'/,
      /'Supports \.json/,
      /'Paste JSON or CSV data'/,
      /Drop file or /,
      /preset\$\{count === 1/,
      /version\$\{versionCount === 1/,
      /` people from \$\{result\.format\}`/,
    ],
  },
  {
    file: 'src/editor/utilities-editor.ts',
    patterns: [
      /label: 'As is \(no change\)'/,
      /label: 'Title Case'/,
      /label: 'UPPERCASE'/,
      /label: 'lowercase'/,
      /'Normalize the text casing/,
      /createNormDropdown\('Name Format'\)/,
      /createNormDropdown\('Title Format'\)/,
    ],
  },
  {
    file: 'src/ui/help-dialog.ts',
    patterns: [
      /title: 'Clear All Data'/,
      /confirmLabel: 'Delete everything'/,
      /'This will permanently delete all your org charts/,
    ],
  },
  {
    file: 'src/ui/column-mapper.ts',
    patterns: [
      /'Please select a column for Name, Title, and Reports To\.'/,
    ],
  },
  {
    file: 'src/ui/preset-creator.ts',
    patterns: [
      /'ID column is required when parent reference type is "By ID"\.'/,
    ],
  },
];

describe('No hardcoded English strings (i18n compliance)', () => {
  for (const { file, patterns } of FILES_AND_FORBIDDEN_PATTERNS) {
    describe(file, () => {
      const filePath = resolve(__dirname, '../../', file);
      const content = readFileSync(filePath, 'utf-8');

      for (const pattern of patterns) {
        it(`should not contain ${pattern.source.slice(0, 50)}…`, () => {
          expect(content).not.toMatch(pattern);
        });
      }
    });
  }
});
