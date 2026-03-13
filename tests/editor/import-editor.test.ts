import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ImportEditor } from '../../src/editor/import-editor';
import { OrgStore } from '../../src/store/org-store';
import type { OrgNode, ChartBundle } from '../../src/types';
import type { ChartStore } from '../../src/store/chart-store';

const ROOT = { id: 'r', name: 'Root', title: 'CEO' };

const VALID_JSON = JSON.stringify({
  id: 'ceo',
  name: 'Jane Doe',
  title: 'CEO',
  children: [{ id: 'vp', name: 'John Smith', title: 'VP Eng' }],
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

  const getParseBtn = () => container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const getStatus = () => container.querySelector('[data-field="status"]') as HTMLDivElement;
  const getError = () => container.querySelector('[data-field="error"]') as HTMLDivElement;
  const getApplyBtn = () => container.querySelector('[data-action="apply"]') as HTMLButtonElement;
  const getCancelBtn = () => container.querySelector('[data-action="cancel"]') as HTMLButtonElement;

  it('renders a drop zone and paste textarea', () => {
    expect(getTextarea()).not.toBeNull();
    expect(getTextarea().placeholder).toContain('Paste');
    const hasDropText = container.textContent?.includes('Drop file');
    expect(hasDropText).toBe(true);
  });

  it('renders format help sections (details elements)', () => {
    const details = container.querySelectorAll('details');
    expect(details.length).toBeGreaterThanOrEqual(2);
    const summaries = Array.from(details).map((d) => d.querySelector('summary')!.textContent);
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

  describe('onImportAsNewChart callback', () => {
    let callbackContainer: HTMLDivElement;
    let callbackStore: OrgStore;
    let callbackEditor: ImportEditor;
    let onImportAsNewChart: Mock<(tree: OrgNode, name: string) => Promise<void>>;

    const getCallbackTextarea = () =>
      callbackContainer.querySelector('textarea') as HTMLTextAreaElement;
    const getCallbackParseBtn = () =>
      callbackContainer.querySelector('button.btn-primary') as HTMLButtonElement;
    const getCallbackApplyBtn = () =>
      callbackContainer.querySelector('[data-action="apply"]') as HTMLButtonElement;

    beforeEach(() => {
      callbackContainer = document.createElement('div');
      document.body.appendChild(callbackContainer);
      callbackStore = new OrgStore(ROOT);
      onImportAsNewChart = vi.fn().mockResolvedValue(undefined);
      callbackEditor = new ImportEditor(callbackContainer, callbackStore, onImportAsNewChart);
    });

    afterEach(() => {
      callbackEditor.destroy();
      document.body.removeChild(callbackContainer);
    });

    it('shows confirm dialog when callback is provided and Apply is clicked', async () => {
      getCallbackTextarea().value = VALID_JSON;
      getCallbackParseBtn().click();
      getCallbackApplyBtn().click();

      await new Promise((r) => setTimeout(r, 0));
      const dialog = document.querySelector('[role="alertdialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog!.textContent).toContain('Import Destination');
      expect(dialog!.textContent).toContain('New chart');
      expect(dialog!.textContent).toContain('Replace current');

      // Clean up dialog
      const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
      cancelBtn?.click();
    });

    it('calls onImportAsNewChart when user chooses "New chart"', async () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('My New Chart');

      getCallbackTextarea().value = VALID_JSON;
      getCallbackParseBtn().click();
      getCallbackApplyBtn().click();

      await new Promise((r) => setTimeout(r, 0));
      const dialog = document.querySelector('[role="alertdialog"]');
      const confirmBtn = dialog!.querySelector('.btn-primary') as HTMLButtonElement;
      confirmBtn.click();

      await new Promise((r) => setTimeout(r, 0));
      expect(promptSpy).toHaveBeenCalledWith('New chart name:');
      expect(onImportAsNewChart).toHaveBeenCalledTimes(1);
      expect(onImportAsNewChart.mock.calls[0][1]).toBe('My New Chart');
      expect(onImportAsNewChart.mock.calls[0][0].id).toBe('ceo');

      promptSpy.mockRestore();
    });

    it('replaces current chart when user chooses "Replace current"', async () => {
      getCallbackTextarea().value = VALID_JSON;
      getCallbackParseBtn().click();
      getCallbackApplyBtn().click();

      await new Promise((r) => setTimeout(r, 0));
      const dialog = document.querySelector('[role="alertdialog"]');
      const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
      cancelBtn.click();

      await new Promise((r) => setTimeout(r, 0));
      expect(onImportAsNewChart).not.toHaveBeenCalled();
      expect(callbackStore.getTree().id).toBe('ceo');
    });

    it('does nothing when user cancels the prompt', async () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      getCallbackTextarea().value = VALID_JSON;
      getCallbackParseBtn().click();
      getCallbackApplyBtn().click();

      await new Promise((r) => setTimeout(r, 0));
      const dialog = document.querySelector('[role="alertdialog"]');
      const confirmBtn = dialog!.querySelector('.btn-primary') as HTMLButtonElement;
      confirmBtn.click();

      await new Promise((r) => setTimeout(r, 0));
      expect(onImportAsNewChart).not.toHaveBeenCalled();
      expect(callbackStore.getTree().id).toBe('r');

      promptSpy.mockRestore();
    });
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

  it('does not render a "Manage" button', () => {
    const buttons = Array.from(container.querySelectorAll('button'));
    const manageBtn = buttons.find((b) => b.textContent === 'Manage');
    expect(manageBtn).toBeUndefined();
  });

  it('shows preset list inline without any toggle', () => {
    const text = container.textContent || '';
    expect(text).toContain('No saved presets.');
  });

  it('renders action buttons: + New, 📂 Import, 💾 Export All', () => {
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent);
    expect(buttons).toContain('+ New');
    expect(buttons).toContain('📂 Import');
    expect(buttons).toContain('💾 Export All');
  });

  it('does not render a "From Sample" button', () => {
    const buttons = Array.from(container.querySelectorAll('button'));
    const fromSampleBtn = buttons.find((b) => b.textContent === 'From Sample');
    expect(fromSampleBtn).toBeUndefined();
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

  const getParseBtn = () => container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const getError = () => container.querySelector('[data-field="error"]') as HTMLDivElement;

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

describe('ImportEditor — Inline preset actions', () => {
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
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text) as
      | HTMLButtonElement
      | undefined;

  it('clicking "+ New" shows the preset creator form', () => {
    findButton('+ New')!.click();

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    expect(findButton('Save')).toBeDefined();
    expect(findButton('Cancel')).toBeDefined();
  });

  it('clicking "📂 Import" shows the import form with a textarea and "Load" button', () => {
    findButton('📂 Import')!.click();

    const importTextarea = container.querySelectorAll('textarea');
    // At least 2 textareas: the main paste area + the import preset textarea
    expect(importTextarea.length).toBeGreaterThanOrEqual(2);

    expect(findButton('Load')).toBeDefined();
  });

  it('clicking "Cancel" inside the import form hides the manage slot', () => {
    findButton('📂 Import')!.click();

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
  children: [{ id: 'vp', name: 'JOHN SMITH', title: 'VP ENGINEERING' }],
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

  const getParseBtn = () => container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const getApplyBtn = () => container.querySelector('[data-action="apply"]') as HTMLButtonElement;
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

    const nameOptions = Array.from(getNameNormSelect().options).map((o) => o.value);
    expect(nameOptions).toEqual(['none', 'titleCase', 'uppercase', 'lowercase']);

    const titleOptions = Array.from(getTitleNormSelect().options).map((o) => o.value);
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

const VALID_BUNDLE: ChartBundle = {
  format: 'arbol-chart',
  version: 1,
  chart: {
    name: 'Test Org',
    workingTree: { id: 'ceo', name: 'Jane Doe', title: 'CEO', children: [{ id: 'vp', name: 'John Smith', title: 'VP Eng' }] },
    categories: [],
  },
  versions: [
    { name: 'v1', createdAt: '2024-01-01T00:00:00Z', tree: { id: 'ceo', name: 'Jane Doe', title: 'CEO' } },
  ],
};

describe('ImportEditor — Chart bundle import', () => {
  let container: HTMLDivElement;
  let store: OrgStore;
  let editor: ImportEditor;
  let mockChartStore: ChartStore;

  const getParseBtn = () => container.querySelector('button.btn-primary') as HTMLButtonElement;
  const getTextarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const getStatus = () => container.querySelector('[data-field="status"]') as HTMLDivElement;
  const getError = () => container.querySelector('[data-field="error"]') as HTMLDivElement;
  const getApplyBtn = () => container.querySelector('[data-action="apply"]') as HTMLButtonElement;
  const getCancelBtn = () => container.querySelector('[data-action="cancel"]') as HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(ROOT);
    mockChartStore = {
      importChartAsNew: vi.fn().mockResolvedValue({
        id: 'new-id', name: 'Test Org', workingTree: VALID_BUNDLE.chart.workingTree, categories: [],
      }),
      importChartReplaceCurrent: vi.fn().mockResolvedValue({
        id: 'cur-id', name: 'Test Org', workingTree: VALID_BUNDLE.chart.workingTree, categories: [],
      }),
    } as unknown as ChartStore;
    editor = new ImportEditor(container, store, undefined, mockChartStore);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('auto-detects arbol-chart bundle format from JSON text', () => {
    getTextarea().value = JSON.stringify(VALID_BUNDLE);
    getParseBtn().click();

    const status = getStatus();
    expect(status.style.display).not.toBe('none');
    expect(status.textContent).toContain('2');
    expect(status.textContent).toContain('JSON');
  });

  it('shows bundle status with chart name and version count', () => {
    getTextarea().value = JSON.stringify(VALID_BUNDLE);
    getParseBtn().click();

    const status = getStatus();
    expect(status.textContent).toContain('Chart bundle "Test Org"');
    expect(status.textContent).toContain('1 version');
  });

  it('shows bundle status for bundle with no versions', () => {
    const noVersions = { ...VALID_BUNDLE, versions: [] };
    getTextarea().value = JSON.stringify(noVersions);
    getParseBtn().click();

    const status = getStatus();
    expect(status.textContent).toContain('Chart bundle "Test Org"');
    expect(status.textContent).toContain('no versions');
  });

  it('throws error for unsupported bundle version', () => {
    const bad = { ...VALID_BUNDLE, version: 99 };
    getTextarea().value = JSON.stringify(bad);
    getParseBtn().click();

    expect(getError().textContent).toContain('Unsupported chart bundle version');
  });

  it('throws error for bundle with missing chart name', () => {
    const bad = { ...VALID_BUNDLE, chart: { ...VALID_BUNDLE.chart, name: '' } };
    getTextarea().value = JSON.stringify(bad);
    getParseBtn().click();

    expect(getError().textContent).toContain('missing chart name or working tree');
  });

  it('throws error for bundle with missing working tree', () => {
    const bad = { format: 'arbol-chart', version: 1, chart: { name: 'X', categories: [] }, versions: [] };
    getTextarea().value = JSON.stringify(bad);
    getParseBtn().click();

    expect(getError().textContent).toContain('missing chart name or working tree');
  });

  it('throws error for bundle with invalid version (missing name)', () => {
    const bad = {
      ...VALID_BUNDLE,
      versions: [{ tree: { id: '1', name: 'A', title: 'B' } }],
    };
    getTextarea().value = JSON.stringify(bad);
    getParseBtn().click();

    expect(getError().textContent).toContain('each version must have name and tree');
  });

  it('apply triggers new chart flow when confirmed', async () => {
    const onBundleImported = vi.fn();
    editor.destroy();
    editor = new ImportEditor(container, store, undefined, mockChartStore, onBundleImported);

    getTextarea().value = JSON.stringify(VALID_BUNDLE);
    getParseBtn().click();
    getApplyBtn().click();

    await new Promise((r) => setTimeout(r, 0));
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Import Chart Bundle');

    // Click "New chart" (confirm / primary button)
    const confirmBtn = dialog!.querySelector('.btn-primary') as HTMLButtonElement;
    confirmBtn.click();

    await new Promise((r) => setTimeout(r, 0));
    expect(mockChartStore.importChartAsNew).toHaveBeenCalledTimes(1);
    expect((mockChartStore.importChartAsNew as Mock).mock.calls[0][0].format).toBe('arbol-chart');
    expect(onBundleImported).toHaveBeenCalledTimes(1);
    expect(onBundleImported.mock.calls[0][0].id).toBe('new-id');
  });

  it('apply triggers replace current flow when canceled', async () => {
    const onBundleImported = vi.fn();
    editor.destroy();
    editor = new ImportEditor(container, store, undefined, mockChartStore, onBundleImported);

    getTextarea().value = JSON.stringify(VALID_BUNDLE);
    getParseBtn().click();
    getApplyBtn().click();

    await new Promise((r) => setTimeout(r, 0));
    const dialog = document.querySelector('[role="alertdialog"]');
    // Click "Replace current" (cancel / secondary button)
    const cancelBtn = dialog!.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelBtn.click();

    await new Promise((r) => setTimeout(r, 0));
    expect(mockChartStore.importChartReplaceCurrent).toHaveBeenCalledTimes(1);
    expect(onBundleImported).toHaveBeenCalledTimes(1);
    expect(onBundleImported.mock.calls[0][0].id).toBe('cur-id');
  });

  it('clearing status resets pendingBundle', () => {
    getTextarea().value = JSON.stringify(VALID_BUNDLE);
    getParseBtn().click();

    expect(getStatus().style.display).not.toBe('none');

    getCancelBtn().click();

    expect(getStatus().style.display).toBe('none');
    // Verify bundle is cleared by re-parsing a normal JSON — should NOT enter bundle flow
    const normalJson = JSON.stringify({ id: 'x', name: 'X', title: 'Y' });
    getTextarea().value = normalJson;
    getParseBtn().click();
    getApplyBtn().click();

    expect(store.getTree().id).toBe('x');
  });
});
