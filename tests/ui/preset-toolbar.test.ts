import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/ui/input-dialog', () => ({
  showInputDialog: vi.fn(),
}));

import { PresetToolbar } from '../../src/ui/preset-toolbar';
import { showInputDialog } from '../../src/ui/input-dialog';
import { t } from '../../src/i18n';

describe('PresetToolbar', () => {
  let container: HTMLElement;
  let onSave: ReturnType<typeof vi.fn>;
  let onLoad: ReturnType<typeof vi.fn>;
  let onCopyFromChart: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onSave = vi.fn();
    onLoad = vi.fn();
    onCopyFromChart = vi.fn();
    onDelete = vi.fn();
    vi.mocked(showInputDialog).mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function createToolbar(overrides: Record<string, unknown> = {}) {
    return new PresetToolbar({
      container,
      presetNames: () => ['Preset A', 'Preset B'],
      chartEntries: () => [
        { id: 'c1', name: 'Chart One' },
        { id: 'c2', name: 'Chart Two' },
      ],
      onSave,
      onLoad,
      onCopyFromChart,
      onDelete,
      typeLabel: 'categories',
      ...overrides,
    });
  }

  it('renders toolbar with save button, load select, and copy select', () => {
    createToolbar();

    const row = container.querySelector('[data-testid="preset-toolbar"]');
    expect(row).not.toBeNull();

    const saveBtn = container.querySelector('[data-testid="preset-save-btn"]');
    expect(saveBtn).not.toBeNull();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]');
    expect(loadSelect).not.toBeNull();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]');
    expect(copySelect).not.toBeNull();
  });

  it('save button has correct text', () => {
    createToolbar();

    const saveBtn = container.querySelector('[data-testid="preset-save-btn"]') as HTMLButtonElement;
    expect(saveBtn.textContent).toBe(t('preset.save'));
  });

  it('load select has default option with translated text', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    const defaultOption = loadSelect.options[0];
    expect(defaultOption.value).toBe('');
    expect(defaultOption.textContent).toBe(t('preset.load'));
  });

  it('copy select has default option with translated text', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    const defaultOption = copySelect.options[0];
    expect(defaultOption.value).toBe('');
    expect(defaultOption.textContent).toBe(t('preset.copy_from_chart'));
  });

  it('load select shows preset names from presetNames()', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    // default + 2 presets
    expect(loadSelect.options).toHaveLength(3);
    expect(loadSelect.options[1].value).toBe('Preset A');
    expect(loadSelect.options[1].textContent).toBe('Preset A');
    expect(loadSelect.options[2].value).toBe('Preset B');
    expect(loadSelect.options[2].textContent).toBe('Preset B');
  });

  it('load select shows "No saved presets" when presetNames() returns empty', () => {
    createToolbar({ presetNames: () => [] });

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    expect(loadSelect.options).toHaveLength(2); // default + disabled empty
    const emptyOpt = loadSelect.options[1];
    expect(emptyOpt.textContent).toBe(t('preset.no_presets'));
    expect(emptyOpt.disabled).toBe(true);
    expect(emptyOpt.value).toBe('');
  });

  it('copy select shows chart names from chartEntries()', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    // default + 2 charts
    expect(copySelect.options).toHaveLength(3);
    expect(copySelect.options[1].value).toBe('c1');
    expect(copySelect.options[1].textContent).toBe('Chart One');
    expect(copySelect.options[2].value).toBe('c2');
    expect(copySelect.options[2].textContent).toBe('Chart Two');
  });

  it('copy select shows "No other charts" when chartEntries() returns empty', () => {
    createToolbar({ chartEntries: () => [] });

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    expect(copySelect.options).toHaveLength(2); // default + disabled empty
    const emptyOpt = copySelect.options[1];
    expect(emptyOpt.textContent).toBe(t('preset.no_other_charts'));
    expect(emptyOpt.disabled).toBe(true);
    expect(emptyOpt.value).toBe('');
  });

  it('selecting a preset from load select calls onLoad with the preset name', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    loadSelect.value = 'Preset A';
    loadSelect.dispatchEvent(new Event('change'));

    expect(onLoad).toHaveBeenCalledWith('Preset A');
  });

  it('selecting a chart from copy select calls onCopyFromChart with the chart id', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    copySelect.value = 'c1';
    copySelect.dispatchEvent(new Event('change'));

    expect(onCopyFromChart).toHaveBeenCalledWith('c1');
  });

  it('load select resets to default after selection', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    loadSelect.value = 'Preset B';
    loadSelect.dispatchEvent(new Event('change'));

    expect(loadSelect.value).toBe('');
  });

  it('copy select resets to default after selection', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    copySelect.value = 'c2';
    copySelect.dispatchEvent(new Event('change'));

    expect(copySelect.value).toBe('');
  });

  it('save button calls showInputDialog and onSave when user provides a name', async () => {
    vi.mocked(showInputDialog).mockResolvedValue('My Preset');
    createToolbar();

    const saveBtn = container.querySelector('[data-testid="preset-save-btn"]') as HTMLButtonElement;
    saveBtn.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith('My Preset'));

    expect(showInputDialog).toHaveBeenCalledWith({
      title: t('preset.save_name_title'),
      label: t('preset.save_name_label'),
      placeholder: t('preset.save_name_placeholder'),
    });
  });

  it('save button does nothing when user cancels the input dialog', async () => {
    vi.mocked(showInputDialog).mockResolvedValue(null);
    createToolbar();

    const saveBtn = container.querySelector('[data-testid="preset-save-btn"]') as HTMLButtonElement;
    saveBtn.click();
    await vi.waitFor(() => expect(showInputDialog).toHaveBeenCalled());

    expect(onSave).not.toHaveBeenCalled();
  });

  it('load select refreshes options from presetNames() on focus', () => {
    let presets = ['Initial'];
    createToolbar({ presetNames: () => presets });

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    expect(loadSelect.options).toHaveLength(2); // default + Initial

    presets = ['Initial', 'New Preset'];
    loadSelect.dispatchEvent(new Event('focus'));

    expect(loadSelect.options).toHaveLength(3); // default + 2 presets
    expect(loadSelect.options[2].textContent).toBe('New Preset');
  });

  it('copy select refreshes options from chartEntries() on focus', () => {
    let charts = [{ id: 'c1', name: 'Chart One' }];
    createToolbar({ chartEntries: () => charts });

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    expect(copySelect.options).toHaveLength(2); // default + Chart One

    charts = [{ id: 'c1', name: 'Chart One' }, { id: 'c3', name: 'Chart Three' }];
    copySelect.dispatchEvent(new Event('focus'));

    expect(copySelect.options).toHaveLength(3);
    expect(copySelect.options[2].textContent).toBe('Chart Three');
  });

  it('destroy() clears the container', () => {
    const toolbar = createToolbar();
    expect(container.children.length).toBeGreaterThan(0);

    toolbar.destroy();
    expect(container.children.length).toBe(0);
  });

  it('does not call onLoad when selecting the default empty option', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    loadSelect.value = '';
    loadSelect.dispatchEvent(new Event('change'));

    expect(onLoad).not.toHaveBeenCalled();
  });

  it('does not call onCopyFromChart when selecting the default empty option', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    copySelect.value = '';
    copySelect.dispatchEvent(new Event('change'));

    expect(onCopyFromChart).not.toHaveBeenCalled();
  });

  it('toolbar row uses flex-row class', () => {
    createToolbar();

    const row = container.querySelector('[data-testid="preset-toolbar"]') as HTMLElement;
    expect(row.className).toBe('flex-row');
  });

  it('load select has aria-label', () => {
    createToolbar();

    const loadSelect = container.querySelector('[data-testid="preset-load-select"]') as HTMLSelectElement;
    expect(loadSelect.getAttribute('aria-label')).toBe(t('preset.load'));
  });

  it('copy select has aria-label', () => {
    createToolbar();

    const copySelect = container.querySelector('[data-testid="preset-copy-select"]') as HTMLSelectElement;
    expect(copySelect.getAttribute('aria-label')).toBe(t('preset.copy_from_chart'));
  });
});
