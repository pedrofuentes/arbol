import { describe, expect, it, vi } from 'vitest';
import { SettingsEditor } from '../../src/editor/settings-editor';
import { DEFAULT_RENDERER_OPTIONS } from '../../src/constants/defaults';
import type { ChartRenderer } from '../../src/renderer/chart-renderer';
import { LevelStore } from '../../src/store/level-store';
import { SettingsModal } from '../../src/ui/settings-modal';
import { annotateTopLevelSettingsSections } from '../../src/ui/settings-section-groups';

describe('settings modal with real editor sections', () => {
  it('treats nested level-mapping markup as one searchable section', () => {
    const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn() });
    const renderer = {
      getOptions: vi.fn(() => ({ ...DEFAULT_RENDERER_OPTIONS })),
      updateOptions: vi.fn(),
    } as unknown as ChartRenderer;
    const editor = new SettingsEditor(
      modal.getContentArea(),
      renderer,
      vi.fn(),
      undefined,
      undefined,
      undefined,
      undefined,
      new LevelStore(),
    );

    const levelSections = modal
      .getContentArea()
      .querySelectorAll<HTMLElement>('[data-section-id="level-mapping"]');
    expect(levelSections).toHaveLength(2);

    annotateTopLevelSettingsSections(modal.getContentArea(), {
      'level-mapping': 'levels_categories',
    });
    modal.refreshSectionVisibility();
    modal.open();

    const search = document.querySelector<HTMLInputElement>('.settings-search-input')!;
    search.value = 'title display';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(levelSections[0].dataset.settingsGroup).toBe('levels_categories');
    expect(levelSections[1].dataset.settingsGroup).toBeUndefined();
    expect(document.querySelectorAll('.settings-search-group-label')).toHaveLength(1);

    search.value = 'csv';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelectorAll('.settings-search-group-label')).toHaveLength(1);

    editor.destroy();
    modal.destroy();
  });
});
