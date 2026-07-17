// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf-8');

describe('sample-org first-load fit', () => {
  it('requests a one-shot fit before replacing the sample tree', () => {
    expect(mainSource).toMatch(
      /const loadSampleOrg = \(\) => \{\s*fitAfterNextRender = true;\s*store\.fromJSON\(JSON\.stringify\(SAMPLE_ORG\)\);\s*\};/s,
    );
  });

  it('fits only after the scheduled render has produced the sample layout', () => {
    const scheduledRender = mainSource.match(
      /const scheduleRender = \(\) => \{(?<body>[\s\S]*?)\n {2}\};/,
    )?.groups?.body;

    expect(scheduledRender).toBeDefined();
    expect(scheduledRender).toMatch(
      /rerender\(\);\s*if \(fitAfterNextRender\) \{\s*fitAfterNextRender = false;\s*renderer\.getZoomManager\(\)\?\.fitToContent\(\);/s,
    );
  });

  it('uses the fitted loader for both toolbar and first-visit sample actions', () => {
    expect(mainSource).toMatch(
      /buildToolbar\(\{[\s\S]*?onLoadSample:\s*loadSampleOrg,[\s\S]*?\}\);/,
    );
    expect(mainSource).toContain('showFirstVisitHelp(loadSampleOrg);');
  });
});
