import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportEditor } from '../../src/editor/import-editor';
import { OrgStore } from '../../src/store/org-store';

const ROOT = { id: 'r', name: 'Root', title: 'CEO' };

const VALID_JSON = JSON.stringify({
  id: 'ceo',
  name: 'Jane Doe',
  title: 'CEO',
  children: [
    { id: 'vp', name: 'John Smith', title: 'VP Eng' },
  ],
});

const VALID_CSV = [
  'id,name,title,parent_id',
  'ceo,Jane Doe,CEO,',
  'vp,John Smith,VP Eng,ceo',
  'mgr,Alice Lee,Manager,vp',
].join('\n');

describe('ImportEditor', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new ImportEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  const getParseBtn = () =>
    container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () =>
    container.querySelector('textarea') as HTMLTextAreaElement;
  const getStatus = () =>
    container.querySelector('[data-field="status"]') as HTMLDivElement;
  const getError = () =>
    container.querySelector('[data-field="error"]') as HTMLDivElement;
  const getApplyBtn = () =>
    container.querySelector('[data-action="apply"]') as HTMLButtonElement;
  const getCancelBtn = () =>
    container.querySelector('[data-action="cancel"]') as HTMLButtonElement;

  it('renders a drop zone and paste textarea', () => {
    expect(getTextarea()).not.toBeNull();
    expect(getTextarea().placeholder).toContain('Paste');
    const hasDropText = container.textContent?.includes('Drop file');
    expect(hasDropText).toBe(true);
  });

  it('renders format help sections (details elements)', () => {
    const details = container.querySelectorAll('details');
    expect(details.length).toBeGreaterThanOrEqual(2);
    const summaries = Array.from(details).map(
      (d) => d.querySelector('summary')!.textContent,
    );
    expect(summaries.some((s) => s?.includes('CSV'))).toBe(true);
    expect(summaries.some((s) => s?.includes('JSON'))).toBe(true);
  });

  it('paste valid JSON and click parse — shows status with node count', () => {
    getTextarea().value = VALID_JSON;
    getParseBtn().click();

    const status = getStatus();
    expect(status.style.display).not.toBe('none');
    expect(status.textContent).toContain('2');
    expect(status.textContent).toContain('JSON');
  });

  it('paste valid CSV and click parse — shows status with node count', () => {
    getTextarea().value = VALID_CSV;
    getParseBtn().click();

    const status = getStatus();
    expect(status.style.display).not.toBe('none');
    expect(status.textContent).toContain('3');
    expect(status.textContent).toContain('CSV');
  });

  it('click Apply commits data to the store', () => {
    getTextarea().value = VALID_JSON;
    getParseBtn().click();
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.id).toBe('ceo');
    expect(tree.name).toBe('Jane Doe');
    expect(tree.children).toHaveLength(1);
    expect(tree.children![0].name).toBe('John Smith');
  });

  it('paste invalid data shows error message', () => {
    getTextarea().value = '!!!not valid at all!!!';
    getParseBtn().click();

    expect(getError().textContent).not.toBe('');
    expect(getStatus().style.display).toBe('none');
  });

  it('empty paste shows error message', () => {
    getTextarea().value = '';
    getParseBtn().click();

    expect(getError().textContent).toContain('Nothing to parse');
  });

  it('cancel clears the status', () => {
    getTextarea().value = VALID_JSON;
    getParseBtn().click();
    expect(getStatus().style.display).not.toBe('none');

    getCancelBtn().click();
    expect(getStatus().style.display).toBe('none');
    expect(getError().textContent).toBe('');
  });

  it('status area is hidden initially', () => {
    expect(getStatus().style.display).toBe('none');
    expect(getStatus().innerHTML).toBe('');
  });

  it('apply clears the paste textarea', () => {
    getTextarea().value = VALID_JSON;
    getParseBtn().click();
    getApplyBtn().click();

    expect(getTextarea().value).toBe('');
  });
});

const NON_STANDARD_CSV = [
  'employee_name,job_title,supervisor',
  'Jane Doe,CEO,',
  'John Smith,VP Engineering,Jane Doe',
  'Alice Lee,Manager,John Smith',
].join('\n');

describe('ImportEditor — Preset selector UI', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new ImportEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('renders a preset dropdown with "Auto-detect" as default option', () => {
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    const options = Array.from(select.options);
    expect(options[0].textContent).toBe('Auto-detect');
    expect(select.value).toBe('');
  });

  it('renders a "Manage" button', () => {
    const buttons = Array.from(container.querySelectorAll('button'));
    const manageBtn = buttons.find((b) => b.textContent === 'Manage');
    expect(manageBtn).toBeDefined();
  });
});

describe('ImportEditor — Mapping flow on auto-detect failure', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new ImportEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  const getParseBtn = () =>
    container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () =>
    container.querySelector('textarea') as HTMLTextAreaElement;
  const getError = () =>
    container.querySelector('[data-field="error"]') as HTMLDivElement;

  it('shows auto-detection failed error and mapping area when non-standard CSV is pasted', () => {
    getTextarea().value = NON_STANDARD_CSV;
    getParseBtn().click();

    // The error message indicates parsing failed
    expect(getError().textContent).toBeTruthy();

    // The mapping area should now be visible and contain select elements for column selection
    const formGroups = container.querySelectorAll('.form-group');
    expect(formGroups.length).toBeGreaterThanOrEqual(3);

    const mappingSelects = container.querySelectorAll('.form-group select');
    expect(mappingSelects.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ImportEditor — Manage area UI', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new ImportEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  const findButton = (text: string) =>
    Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === text,
    ) as HTMLButtonElement | undefined;

  it('clicking "Manage" reveals the manage area with action buttons', () => {
    const manageBtn = findButton('Manage')!;
    expect(manageBtn).toBeDefined();
    manageBtn.click();

    expect(findButton('Create')).toBeDefined();
    expect(findButton('From Sample')).toBeDefined();
    expect(findButton('Import')).toBeDefined();
    expect(findButton('Export All')).toBeDefined();
  });

  it('clicking "Create" shows the preset creator form', () => {
    findButton('Manage')!.click();
    findButton('Create')!.click();

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    expect(findButton('Save')).toBeDefined();
    expect(findButton('Cancel')).toBeDefined();
  });

  it('clicking "Import" shows the import form with a textarea and "Load" button', () => {
    findButton('Manage')!.click();
    findButton('Import')!.click();

    const importTextarea = container.querySelectorAll('textarea');
    // At least 2 textareas: the main paste area + the import preset textarea
    expect(importTextarea.length).toBeGreaterThanOrEqual(2);

    expect(findButton('Load')).toBeDefined();
  });

  it('clicking "Cancel" inside the import form hides the manage slot', () => {
    findButton('Manage')!.click();
    findButton('Import')!.click();

    // The manage slot should be visible (contains textarea + Load)
    expect(findButton('Load')).toBeDefined();

    // Find the Cancel button inside the import form (not the main cancel)
    const cancelButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent === 'Cancel',
    );
    // Click the last Cancel (the import form one)
    cancelButtons[cancelButtons.length - 1].click();

    // Load button should be gone since the manage slot is cleared
    expect(findButton('Load')).toBeUndefined();
  });
});

const UPPERCASE_CSV = [
  'id,name,title,parent_id',
  'ceo,JANE DOE,CHIEF EXECUTIVE OFFICER,',
  'vp,JOHN SMITH,VP ENGINEERING,ceo',
].join('\n');

const UPPERCASE_JSON = JSON.stringify({
  id: 'ceo',
  name: 'JANE DOE',
  title: 'CHIEF EXECUTIVE OFFICER',
  children: [
    { id: 'vp', name: 'JOHN SMITH', title: 'VP ENGINEERING' },
  ],
});

describe('ImportEditor — Text Normalization', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    editor = new ImportEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  const getParseBtn = () =>
    container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () =>
    container.querySelector('textarea') as HTMLTextAreaElement;
  const getApplyBtn = () =>
    container.querySelector('[data-action="apply"]') as HTMLButtonElement;
  const getNormSection = () =>
    container.querySelector('[data-section="normalization"]') as HTMLElement;
  const getNameNormSelect = () =>
    container.querySelector('select[data-norm-field="name"]') as HTMLSelectElement;
  const getTitleNormSelect = () =>
    container.querySelector('select[data-norm-field="title"]') as HTMLSelectElement;

  it('shows normalization dropdowns in import preview', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();

    expect(getNormSection()).not.toBeNull();
    expect(getNormSection().textContent).toContain('Text Normalization');
    expect(getNameNormSelect()).not.toBeNull();
    expect(getTitleNormSelect()).not.toBeNull();
  });

  it('normalization dropdowns default to "none" (As imported)', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();

    expect(getNameNormSelect().value).toBe('none');
    expect(getTitleNormSelect().value).toBe('none');
  });

  it('normalization dropdowns have all four options', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();

    const nameOptions = Array.from(getNameNormSelect().options).map(o => o.value);
    expect(nameOptions).toEqual(['none', 'titleCase', 'uppercase', 'lowercase']);

    const titleOptions = Array.from(getTitleNormSelect().options).map(o => o.value);
    expect(titleOptions).toEqual(['none', 'titleCase', 'uppercase', 'lowercase']);
  });

  it('with none/none, Apply leaves data unchanged', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('JANE DOE');
    expect(tree.title).toBe('CHIEF EXECUTIVE OFFICER');
  });

  it('applies titleCase normalization to names only', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();
    getNameNormSelect().value = 'titleCase';
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('Jane Doe');
    expect(tree.title).toBe('CHIEF EXECUTIVE OFFICER');
    expect(tree.children![0].name).toBe('John Smith');
    expect(tree.children![0].title).toBe('VP ENGINEERING');
  });

  it('applies uppercase normalization to titles only', () => {
    getTextarea().value = UPPERCASE_JSON;
    getParseBtn().click();
    getTitleNormSelect().value = 'uppercase';
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('JANE DOE');
    expect(tree.title).toBe('CHIEF EXECUTIVE OFFICER');
  });

  it('applies different normalization to name and title independently', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();
    getNameNormSelect().value = 'titleCase';
    getTitleNormSelect().value = 'lowercase';
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('Jane Doe');
    expect(tree.title).toBe('chief executive officer');
    expect(tree.children![0].name).toBe('John Smith');
    expect(tree.children![0].title).toBe('vp engineering');
  });

  it('normalization works with JSON imports', () => {
    getTextarea().value = UPPERCASE_JSON;
    getParseBtn().click();
    getNameNormSelect().value = 'titleCase';
    getTitleNormSelect().value = 'titleCase';
    getApplyBtn().click();

    const tree = store.getTree();
    expect(tree.name).toBe('Jane Doe');
    expect(tree.title).toBe('Chief Executive Officer');
    expect(tree.children![0].name).toBe('John Smith');
    expect(tree.children![0].title).toBe('Vp Engineering');
  });

  it('normalization dropdowns are cleared after cancel', () => {
    getTextarea().value = UPPERCASE_CSV;
    getParseBtn().click();
    expect(getNormSection()).not.toBeNull();

    const cancelBtn = container.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    cancelBtn.click();

    expect(getNormSection()).toBeNull();
  });
});
