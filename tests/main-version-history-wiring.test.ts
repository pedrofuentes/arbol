import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mainSource = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');

describe('main version-history header wiring', () => {
  it('mounts the chart name and version status in the visible header center', () => {
    expect(mainSource).toContain("const headerCenter = document.getElementById('header-center')!");
    expect(mainSource).toContain('headerCenter.appendChild(chartNameContainer)');
    expect(mainSource).not.toContain('offscreenHost.appendChild(chartNameContainer)');
  });

  it('updates the header from edits since the last version', () => {
    expect(mainSource).toContain(
      'chartNameHeader.setEditCount(chartStore.getEditsSinceLastVersion(store.getTree()))',
    );
    expect(mainSource).not.toContain('chartNameHeader.setDirty(');
  });

  it('confirms a saved version with its name in a success toast', () => {
    expect(mainSource).toContain(
      "showToast(t('toast.version_saved', { name: name.trim() }), 'success')",
    );
  });

  it('routes version-viewer restore through the safe editor workflow', () => {
    expect(mainSource).toContain('await chartEditor.restoreVersion(version)');
  });
});
