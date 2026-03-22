import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelMappingPanel } from '../../../src/editor/settings/level-mapping-panel';
import { LevelStore } from '../../../src/store/level-store';

describe('LevelMappingPanel', () => {
  let container: HTMLElement;
  let levelStore: LevelStore;
  let rerenderCallback: () => void;
  let rebuildCallback: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    levelStore = new LevelStore();
    rerenderCallback = vi.fn();
    rebuildCallback = vi.fn();
  });

  function createPanel(): LevelMappingPanel {
    return new LevelMappingPanel({
      container,
      levelStore,
      rerenderCallback,
      rebuildCallback,
    });
  }

  describe('display mode section', () => {
    it('renders display mode radio buttons', () => {
      createPanel();
      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"][name="display-mode"]');
      expect(radios.length).toBe(2);
      const values = Array.from(radios).map(r => r.value);
      expect(values).toEqual(['original', 'mapped']);
    });

    it('default display mode is original', () => {
      createPanel();
      const checked = container.querySelector<HTMLInputElement>('input[type="radio"][name="display-mode"]:checked');
      expect(checked).not.toBeNull();
      expect(checked!.value).toBe('original');
    });

    it('changing display mode calls setDisplayMode', () => {
      createPanel();
      const spy = vi.spyOn(levelStore, 'setDisplayMode');
      const mappedRadio = container.querySelector<HTMLInputElement>('input[type="radio"][value="mapped"]');
      expect(mappedRadio).not.toBeNull();
      mappedRadio!.dispatchEvent(new Event('change'));
      expect(spy).toHaveBeenCalledWith('mapped');
    });

    it('reflects current store display mode', () => {
      levelStore.setDisplayMode('mapped');
      createPanel();
      const checked = container.querySelector<HTMLInputElement>('input[type="radio"][name="display-mode"]:checked');
      expect(checked!.value).toBe('mapped');
    });
  });

  describe('mappings table', () => {
    it('renders empty state when no mappings', () => {
      createPanel();
      expect(container.textContent).toContain('No level mappings defined. Add one below.');
    });

    it('renders mappings table when mappings exist', () => {
      levelStore.addMapping('L10', 'IC');
      levelStore.addMapping('L11', 'Senior');
      createPanel();
      const rows = container.querySelectorAll('[data-testid="mapping-row"]');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('L10');
      expect(rows[0].textContent).toContain('IC');
      expect(rows[1].textContent).toContain('L11');
      expect(rows[1].textContent).toContain('Senior');
    });

    it('delete button removes mapping', () => {
      levelStore.addMapping('L10', 'IC');
      createPanel();
      const spy = vi.spyOn(levelStore, 'removeMapping');
      const deleteBtn = container.querySelector<HTMLButtonElement>('[data-testid="delete-mapping"]');
      expect(deleteBtn).not.toBeNull();
      deleteBtn!.click();
      expect(spy).toHaveBeenCalledWith('L10');
    });

    it('shows manager title in mapping rows', () => {
      levelStore.addMapping('L20', 'Principal Engineer', 'Director');
      createPanel();
      const rows = container.querySelectorAll('[data-testid="mapping-row"]');
      expect(rows.length).toBe(1);
      const mgrTitle = rows[0].querySelector('[data-testid="manager-title"]');
      expect(mgrTitle?.textContent).toBe('Director');
    });

    it('shows fallback dash when no manager title', () => {
      levelStore.addMapping('L20', 'Principal Engineer');
      createPanel();
      const mgrTitle = container.querySelector('[data-testid="manager-title"]');
      expect(mgrTitle?.textContent).toBe('—');
    });

    it('shows column headers when mappings exist', () => {
      levelStore.addMapping('L20', 'IC');
      createPanel();
      const headerText = container.textContent;
      expect(headerText).toContain('Manager Title');
    });
  });

  describe('add form', () => {
    it('add form creates new mapping', () => {
      createPanel();
      const spy = vi.spyOn(levelStore, 'addMapping');
      const rawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      const titleInput = container.querySelector<HTMLInputElement>('[data-testid="display-title-input"]');
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');

      expect(rawInput).not.toBeNull();
      expect(titleInput).not.toBeNull();
      expect(addBtn).not.toBeNull();

      rawInput!.value = 'L12';
      titleInput!.value = 'Director';
      addBtn!.click();

      expect(spy).toHaveBeenCalledWith('L12', 'Director', undefined);
    });

    it('add form includes manager title input', () => {
      createPanel();
      const mgrInput = container.querySelector('[data-testid="manager-title-input"]') as HTMLInputElement;
      expect(mgrInput).toBeTruthy();
      expect(mgrInput.placeholder).toContain('Director');
    });

    it('adds mapping with manager title', () => {
      createPanel();
      const rawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      const titleInput = container.querySelector<HTMLInputElement>('[data-testid="display-title-input"]');
      const mgrInput = container.querySelector<HTMLInputElement>('[data-testid="manager-title-input"]');
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');

      rawInput!.value = 'L20';
      titleInput!.value = 'Principal Engineer';
      mgrInput!.value = 'Director';
      addBtn!.click();

      const mapping = levelStore.getMapping('L20');
      expect(mapping?.managerDisplayTitle).toBe('Director');
      expect(rerenderCallback).toHaveBeenCalled();
    });

    it('adds mapping without manager title when left empty', () => {
      createPanel();
      const rawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      const titleInput = container.querySelector<HTMLInputElement>('[data-testid="display-title-input"]');
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');

      rawInput!.value = 'L20';
      titleInput!.value = 'Senior Engineer';
      addBtn!.click();

      const mapping = levelStore.getMapping('L20');
      expect(mapping?.managerDisplayTitle).toBeUndefined();
    });

    it('add form validates empty inputs', () => {
      createPanel();
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');
      addBtn!.click();
      const error = container.querySelector('[data-testid="mapping-error"]');
      expect(error).not.toBeNull();
      expect(error!.textContent!.length).toBeGreaterThan(0);
    });

    it('add form shows duplicate error', () => {
      levelStore.addMapping('L10', 'IC');
      createPanel();
      const rawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      const titleInput = container.querySelector<HTMLInputElement>('[data-testid="display-title-input"]');
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');

      rawInput!.value = 'L10';
      titleInput!.value = 'Another';
      addBtn!.click();

      const error = container.querySelector('[data-testid="mapping-error"]');
      expect(error).not.toBeNull();
      expect(error!.textContent).toContain('A mapping for this level already exists.');
    });

    it('clears inputs after successful add', () => {
      createPanel();
      const rawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      const titleInput = container.querySelector<HTMLInputElement>('[data-testid="display-title-input"]');
      const addBtn = container.querySelector<HTMLButtonElement>('[data-testid="add-mapping-btn"]');

      rawInput!.value = 'L12';
      titleInput!.value = 'Director';
      addBtn!.click();

      // After rebuild, inputs should be empty
      const newRawInput = container.querySelector<HTMLInputElement>('[data-testid="raw-level-input"]');
      expect(newRawInput!.value).toBe('');
    });
  });

  describe('CSV import/export', () => {
    it('export CSV triggers download', () => {
      levelStore.addMapping('L10', 'IC');
      createPanel();
      const spy = vi.spyOn(levelStore, 'exportToCsv');
      const exportBtn = container.querySelector<HTMLButtonElement>('[data-testid="export-csv-btn"]');
      expect(exportBtn).not.toBeNull();

      // Mock URL/Blob for download
      const createObjectURL = vi.fn(() => 'blob:mock');
      const revokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = createObjectURL;
      globalThis.URL.revokeObjectURL = revokeObjectURL;

      exportBtn!.click();
      expect(spy).toHaveBeenCalled();
    });

    it('import CSV button exists and has file input', () => {
      createPanel();
      const importBtn = container.querySelector<HTMLButtonElement>('[data-testid="import-csv-btn"]');
      expect(importBtn).not.toBeNull();
      const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
      expect(fileInput).not.toBeNull();
      expect(fileInput!.accept).toBe('.csv');
    });
  });

  describe('rebuild on store change', () => {
    it('rebuilds on store change', () => {
      createPanel();
      expect(container.querySelectorAll('[data-testid="mapping-row"]').length).toBe(0);

      levelStore.addMapping('L10', 'IC');
      // Store emits change, panel should rebuild
      const rows = container.querySelectorAll('[data-testid="mapping-row"]');
      expect(rows.length).toBe(1);
    });
  });

  describe('inline editing', () => {
    it('clicking IC title replaces span with input', () => {
      levelStore.addMapping('L20', 'Principal Engineer');
      createPanel();
      const icTitle = container.querySelector('[data-testid="ic-title"]') as HTMLElement;
      icTitle.click();
      const input = container.querySelector('[data-testid="ic-title-input"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('Principal Engineer');
    });

    it('clicking manager title replaces span with input', () => {
      levelStore.addMapping('L20', 'IC', 'Director');
      createPanel();
      const mgrTitle = container.querySelector('[data-testid="manager-title"]') as HTMLElement;
      mgrTitle.click();
      const input = container.querySelector('[data-testid="manager-title-input-edit"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('Director');
    });

    it('clicking fallback dash in manager title opens empty input', () => {
      levelStore.addMapping('L20', 'IC');
      createPanel();
      const mgrTitle = container.querySelector('[data-testid="manager-title"]') as HTMLElement;
      mgrTitle.click();
      const input = container.querySelector('[data-testid="manager-title-input-edit"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('');
    });

    it('pressing Enter saves IC title edit', () => {
      levelStore.addMapping('L20', 'Principal Engineer');
      createPanel();
      const icTitle = container.querySelector('[data-testid="ic-title"]') as HTMLElement;
      icTitle.click();
      const input = container.querySelector('[data-testid="ic-title-input"]') as HTMLInputElement;
      input.value = 'Staff Engineer';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(levelStore.getMapping('L20')!.displayTitle).toBe('Staff Engineer');
      expect(rerenderCallback).toHaveBeenCalled();
    });

    it('pressing Enter saves manager title edit', () => {
      levelStore.addMapping('L20', 'IC', 'Director');
      createPanel();
      const mgrTitle = container.querySelector('[data-testid="manager-title"]') as HTMLElement;
      mgrTitle.click();
      const input = container.querySelector('[data-testid="manager-title-input-edit"]') as HTMLInputElement;
      input.value = 'VP';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(levelStore.getMapping('L20')!.managerDisplayTitle).toBe('VP');
    });

    it('pressing Escape cancels edit and restores span', () => {
      levelStore.addMapping('L20', 'Principal Engineer');
      createPanel();
      const icTitle = container.querySelector('[data-testid="ic-title"]') as HTMLElement;
      icTitle.click();
      const input = container.querySelector('[data-testid="ic-title-input"]') as HTMLInputElement;
      input.value = 'CHANGED';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(levelStore.getMapping('L20')!.displayTitle).toBe('Principal Engineer');
      const span = container.querySelector('[data-testid="ic-title"]') as HTMLElement;
      expect(span).toBeTruthy();
      expect(span.textContent).toBe('Principal Engineer');
    });

    it('clearing manager title removes it', () => {
      levelStore.addMapping('L20', 'IC', 'Director');
      createPanel();
      const mgrTitle = container.querySelector('[data-testid="manager-title"]') as HTMLElement;
      mgrTitle.click();
      const input = container.querySelector('[data-testid="manager-title-input-edit"]') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(levelStore.getMapping('L20')!.managerDisplayTitle).toBeUndefined();
    });

    it('does not save IC title if empty', () => {
      levelStore.addMapping('L20', 'Principal Engineer');
      createPanel();
      const icTitle = container.querySelector('[data-testid="ic-title"]') as HTMLElement;
      icTitle.click();
      const input = container.querySelector('[data-testid="ic-title-input"]') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(levelStore.getMapping('L20')!.displayTitle).toBe('Principal Engineer');
    });
  });

  describe('destroy', () => {
    it('destroy cleans up', () => {
      const panel = createPanel();
      expect(container.children.length).toBeGreaterThan(0);
      panel.destroy();
      expect(container.innerHTML).toBe('');

      // After destroy, store changes should not rebuild
      const childCountAfterDestroy = container.children.length;
      levelStore.addMapping('L10', 'IC');
      expect(container.children.length).toBe(childCountAfterDestroy);
    });
  });
});
