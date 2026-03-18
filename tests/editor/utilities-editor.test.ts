import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UtilitiesEditor } from '../../src/editor/utilities-editor';
import { OrgStore } from '../../src/store/org-store';

const ROOT = {
  id: 'ceo',
  name: 'JANE DOE',
  title: 'chief executive officer',
  children: [{ id: 'vp', name: 'john smith', title: 'VP ENGINEERING' }],
};

describe('UtilitiesEditor', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: UtilitiesEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new UtilitiesEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  const getNameSelect = () =>
    container.querySelector('select[data-norm-field="name-format"]') as HTMLSelectElement;
  const getTitleSelect = () =>
    container.querySelector('select[data-norm-field="title-format"]') as HTMLSelectElement;
  const getApplyBtn = () =>
    container.querySelector('[data-action="applyNorm"]') as HTMLButtonElement;
  const getStatus = () => container.querySelector('[data-field="normStatus"]') as HTMLDivElement;

  it('renders text normalization section with heading and description', () => {
    expect(container.textContent).toContain('Text Normalization');
    expect(container.textContent).toContain('Normalize the text casing');
  });

  it('renders name and title normalization dropdowns', () => {
    expect(getNameSelect()).not.toBeNull();
    expect(getTitleSelect()).not.toBeNull();
  });

  it('dropdowns have all four options', () => {
    const nameOptions = Array.from(getNameSelect().options).map((o) => o.value);
    expect(nameOptions).toEqual(['none', 'titleCase', 'uppercase', 'lowercase']);

    const titleOptions = Array.from(getTitleSelect().options).map((o) => o.value);
    expect(titleOptions).toEqual(['none', 'titleCase', 'uppercase', 'lowercase']);
  });

  it('dropdowns default to "none"', () => {
    expect(getNameSelect().value).toBe('none');
    expect(getTitleSelect().value).toBe('none');
  });

  it('apply button is disabled when both dropdowns are "none"', () => {
    expect(getApplyBtn().disabled).toBe(true);
  });

  it('apply button is enabled when name normalization is selected', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));

    expect(getApplyBtn().disabled).toBe(false);
  });

  it('apply button is enabled when title normalization is selected', () => {
    getTitleSelect().value = 'uppercase';
    getTitleSelect().dispatchEvent(new Event('change'));

    expect(getApplyBtn().disabled).toBe(false);
  });

  it('apply button re-disables when reset to none/none', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    expect(getApplyBtn().disabled).toBe(false);

    getNameSelect().value = 'none';
    getNameSelect().dispatchEvent(new Event('change'));
    expect(getApplyBtn().disabled).toBe(true);
  });

  it('applies titleCase normalization to names in the org chart', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('Jane Doe');
    expect(tree.children![0].name).toBe('John Smith');
    // Titles unchanged
    expect(tree.title).toBe('chief executive officer');
    expect(tree.children![0].title).toBe('VP ENGINEERING');
  });

  it('applies uppercase normalization to titles in the org chart', () => {
    getTitleSelect().value = 'uppercase';
    getTitleSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.title).toBe('CHIEF EXECUTIVE OFFICER');
    expect(tree.children![0].title).toBe('VP ENGINEERING');
    // Names unchanged
    expect(tree.name).toBe('JANE DOE');
  });

  it('applies different normalization to name and title independently', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    getTitleSelect().value = 'lowercase';
    getTitleSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('Jane Doe');
    expect(tree.title).toBe('chief executive officer');
    expect(tree.children![0].name).toBe('John Smith');
    expect(tree.children![0].title).toBe('vp engineering');
  });

  it('shows success message after applying', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();

    expect(getStatus().textContent).toContain('normalized successfully');
  });

  it('normalization is undoable', () => {
    const originalName = store.getTree().name;
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();

    expect(store.getTree().name).toBe('Jane Doe');
    store.undo();
    expect(store.getTree().name).toBe(originalName);
  });

  it('clears status message when dropdown changes', () => {
    getNameSelect().value = 'titleCase';
    getNameSelect().dispatchEvent(new Event('change'));
    getApplyBtn().click();
    expect(getStatus().textContent).not.toBe('');

    getTitleSelect().value = 'uppercase';
    getTitleSelect().dispatchEvent(new Event('change'));
    expect(getStatus().textContent).toBe('');
  });

  it('renders an Apply button with correct label', () => {
    expect(getApplyBtn().textContent).toBe('Apply to Org Chart');
  });

  it('destroy clears the container', () => {
    editor.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('label and select in normalization dropdowns are programmatically associated', () => {
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(select.id).toBeTruthy();
      const label = container.querySelector('label[for="' + select.id + '"]');
      expect(label).not.toBeNull();
    }
  });

});
