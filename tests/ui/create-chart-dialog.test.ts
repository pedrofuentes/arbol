import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showCreateChartDialog, CreateChartDialogOptions } from '../../src/ui/create-chart-dialog';

function defaultOptions(): CreateChartDialogOptions {
  return {
    categoryPresets: ['Engineering', 'Design'],
    levelMappingPresets: ['Standard Levels'],
    charts: [
      { id: 'c1', name: 'Org Alpha' },
      { id: 'c2', name: 'Org Beta' },
    ],
  };
}

describe('showCreateChartDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((el) => {
      el.closest('div')?.remove();
    });
  });

  it('renders dialog with name input and two source selects', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const nameInput = dialog!.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.tagName).toBe('INPUT');
    const catSelect = dialog!.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    expect(catSelect).not.toBeNull();
    expect(catSelect.tagName).toBe('SELECT');
    const levelSelect = dialog!.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    expect(levelSelect).not.toBeNull();
    expect(levelSelect.tagName).toBe('SELECT');
  });

  it('populates category select with none, presets, and charts', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    const optionValues = Array.from(catSelect.options).map((o) => o.value);
    expect(optionValues).toContain('none:');
    expect(optionValues).toContain('preset:Engineering');
    expect(optionValues).toContain('preset:Design');
    expect(optionValues).toContain('chart:c1');
    expect(optionValues).toContain('chart:c2');
  });

  it('populates level select with none, presets, and charts', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const levelSelect = dialog.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    const optionValues = Array.from(levelSelect.options).map((o) => o.value);
    expect(optionValues).toContain('none:');
    expect(optionValues).toContain('preset:Standard Levels');
    expect(optionValues).toContain('chart:c1');
  });

  it('returns null on cancel', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    expect(await promise).toBeNull();
  });

  it('returns result with default none sources on create', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'My Chart';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.name).toBe('My Chart');
    expect(result!.categorySource.type).toBe('none');
    expect(result!.levelMappingSource.type).toBe('none');
  });

  it('returns preset source when selected', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Test';
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    catSelect.value = 'preset:Engineering';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result!.categorySource).toEqual({ type: 'preset', name: 'Engineering' });
  });

  it('returns chart source when selected', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Test';
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    catSelect.value = 'chart:c1';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result!.categorySource).toEqual({ type: 'chart', id: 'c1', name: 'Org Alpha' });
  });

  it('shows error when name is empty', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const errorEl = dialog.querySelector('[role="alert"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toBeTruthy();
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
  });

  it('submits on Enter key in name input', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Enter Chart';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const result = await promise;
    expect(result!.name).toBe('Enter Chart');
  });

  it('cancels on Escape key in name input', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await promise).toBeNull();
  });

  it('cancels on overlay backdrop click', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const overlay = dialog.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(await promise).toBeNull();
  });

  it('removes overlay from DOM after close', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('labels and controls are programmatically associated', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const labels = dialog.querySelectorAll('label');
    for (const label of labels) {
      expect(label.htmlFor).toBeTruthy();
      const ctrl = dialog.querySelector(`#${label.htmlFor}`);
      expect(ctrl).not.toBeNull();
    }
  });

  it('handles empty presets and charts gracefully', () => {
    showCreateChartDialog({
      categoryPresets: [],
      levelMappingPresets: [],
      charts: [],
    });
    const dialog = document.querySelector('[role="dialog"]')!;
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    expect(catSelect.options.length).toBe(1);
    const levelSelect = dialog.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    expect(levelSelect.options.length).toBe(1);
  });
});
