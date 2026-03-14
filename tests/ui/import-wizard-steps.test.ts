import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import {
  WizardState,
  renderSourceStep,
  renderMappingStep,
  renderPreviewStep,
  renderImportStep,
} from '../../src/ui/import-wizard-steps';

beforeAll(() => {
  setLocale('en', en);
});

describe('renderSourceStep', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders title', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const title = container.querySelector('.wizard-step-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Choose your data source');
  });

  it('renders description', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const desc = container.querySelector('.wizard-step-desc');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toContain('Upload a file or paste data directly');
  });

  it('renders dropzone with role button', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const dropzone = container.querySelector('.wizard-dropzone');
    expect(dropzone).not.toBeNull();
    expect(dropzone!.getAttribute('role')).toBe('button');
    expect(dropzone!.getAttribute('tabindex')).toBe('0');
  });

  it('renders hidden file input in dropzone', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toBe('.csv,.json,.xlsx,.xls');
    expect(input.style.display).toBe('none');
  });

  it('renders paste option buttons', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const btns = container.querySelectorAll('.wizard-source-option');
    expect(btns.length).toBe(2);
  });

  it('shows textarea after clicking paste button', () => {
    const state: WizardState = {};
    renderSourceStep(container, state, vi.fn());
    const pasteBtn = container.querySelector('.wizard-source-option') as HTMLElement;
    pasteBtn.click();
    const textarea = container.querySelector('.wizard-paste-area') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.closest('.wizard-paste-wrap')!.getAttribute('style')).not.toContain('display: none');
  });

  it('calls onReady(false) when state is empty', () => {
    const state: WizardState = {};
    const onReady = vi.fn();
    renderSourceStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(false);
  });

  it('calls onReady(true) when state already has rawText', () => {
    const state: WizardState = { rawText: 'some data' };
    const onReady = vi.fn();
    renderSourceStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it('updates state on textarea input and calls onReady(true)', () => {
    const state: WizardState = {};
    const onReady = vi.fn();
    renderSourceStep(container, state, onReady);
    (container.querySelector('.wizard-source-option') as HTMLElement).click();
    const textarea = container.querySelector('.wizard-paste-area') as HTMLTextAreaElement;
    textarea.value = 'name,title\nAlice,CEO';
    textarea.dispatchEvent(new Event('input'));
    expect(state.rawText).toBe('name,title\nAlice,CEO');
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it('calls onReady(false) when textarea is cleared', () => {
    const state: WizardState = { rawText: 'some data' };
    const onReady = vi.fn();
    renderSourceStep(container, state, onReady);
    (container.querySelector('.wizard-source-option') as HTMLElement).click();
    const textarea = container.querySelector('.wizard-paste-area') as HTMLTextAreaElement;
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    expect(onReady).toHaveBeenLastCalledWith(false);
  });

  it('restores existing paste text from state when going back', () => {
    const state: WizardState = { rawText: 'restored data' };
    renderSourceStep(container, state, vi.fn());
    const textarea = container.querySelector('.wizard-paste-area') as HTMLTextAreaElement;
    expect(textarea.value).toBe('restored data');
    // Paste wrap should be visible when state has rawText
    expect(textarea.closest('.wizard-paste-wrap')!.getAttribute('style')).not.toContain('display: none');
  });

  it('shows filename in dropzone when state has fileName', () => {
    const state: WizardState = { rawText: 'data', fileName: 'mydata.csv' };
    renderSourceStep(container, state, vi.fn());
    const dropText = container.querySelector('.wizard-dropzone-text');
    expect(dropText!.textContent).toBe('✓ mydata.csv');
  });

  it('clears filename when pasting text', () => {
    const state: WizardState = { rawText: 'data', fileName: 'old.csv' };
    renderSourceStep(container, state, vi.fn());
    (container.querySelector('.wizard-source-option') as HTMLElement).click();
    const textarea = container.querySelector('.wizard-paste-area') as HTMLTextAreaElement;
    textarea.value = 'new data';
    textarea.dispatchEvent(new Event('input'));
    expect(state.fileName).toBeUndefined();
  });

  it('clears container before rendering', () => {
    const state: WizardState = {};
    container.textContent = 'old content';
    renderSourceStep(container, state, vi.fn());
    expect(container.textContent).not.toContain('old content');
  });
});

describe('renderMappingStep', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('detects JSON format for data starting with {', () => {
    const state: WizardState = { rawText: '{"id":"1","name":"Alice","title":"CEO"}' };
    renderMappingStep(container, state, vi.fn());
    expect(state.format).toBe('JSON');
  });

  it('detects JSON format for data starting with [', () => {
    const state: WizardState = { rawText: '[{"id":"1"}]' };
    renderMappingStep(container, state, vi.fn());
    expect(state.format).toBe('JSON');
  });

  it('shows success message for JSON', () => {
    const state: WizardState = { rawText: '{"id":"1"}' };
    renderMappingStep(container, state, vi.fn());
    const msg = container.querySelector('.wizard-success');
    expect(msg).not.toBeNull();
    expect(msg!.textContent).toContain('JSON format detected');
  });

  it('calls onReady(true) for JSON', () => {
    const state: WizardState = { rawText: '{"id":"1"}' };
    const onReady = vi.fn();
    renderMappingStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it('detects CSV format for non-JSON data', () => {
    const state: WizardState = { rawText: 'name,title,manager_name\nAlice,CEO,\n' };
    renderMappingStep(container, state, vi.fn());
    expect(state.format).toBe('CSV');
  });

  it('shows CSV description for CSV data', () => {
    const state: WizardState = { rawText: 'name,title,manager_name\nAlice,CEO,\n' };
    renderMappingStep(container, state, vi.fn());
    const desc = container.querySelector('.wizard-info');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toContain('Map your CSV columns');
  });

  it('extracts headers from CSV and stores in state', () => {
    const state: WizardState = { rawText: 'name,title,manager_name\nAlice,CEO,\n' };
    renderMappingStep(container, state, vi.fn());
    expect(state.headers).toEqual(['name', 'title', 'manager_name']);
  });

  it('calls onReady(false) initially for CSV', () => {
    const state: WizardState = { rawText: 'name,title,manager_name\nAlice,CEO,\n' };
    const onReady = vi.fn();
    renderMappingStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(false);
  });

  it('clears container before rendering', () => {
    const state: WizardState = { rawText: '{"id":"1"}' };
    container.textContent = 'old';
    renderMappingStep(container, state, vi.fn());
    expect(container.textContent).not.toContain('old');
  });
});

describe('renderPreviewStep', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('parses valid JSON and shows success message', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({
        id: '1', name: 'Alice', title: 'CEO',
        children: [{ id: '2', name: 'Bob', title: 'VP' }],
      }),
    };
    renderPreviewStep(container, state, vi.fn());
    const success = container.querySelector('.wizard-success');
    expect(success).not.toBeNull();
    expect(success!.textContent).toContain('2 people parsed from JSON');
  });

  it('stores tree and nodeCount for valid JSON', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({
        id: '1', name: 'Alice', title: 'CEO',
        children: [{ id: '2', name: 'Bob', title: 'VP' }],
      }),
    };
    renderPreviewStep(container, state, vi.fn());
    expect(state.tree).not.toBeUndefined();
    expect(state.tree!.name).toBe('Alice');
    expect(state.nodeCount).toBe(2);
  });

  it('calls onReady(true) on valid JSON', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ id: '1', name: 'Alice', title: 'CEO' }),
    };
    const onReady = vi.fn();
    renderPreviewStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it('shows error on invalid JSON', () => {
    const state: WizardState = { format: 'JSON', rawText: 'not json' };
    renderPreviewStep(container, state, vi.fn());
    const error = container.querySelector('.wizard-error');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('Error:');
  });

  it('calls onReady(false) on invalid JSON', () => {
    const state: WizardState = { format: 'JSON', rawText: 'not json' };
    const onReady = vi.fn();
    renderPreviewStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(false);
  });

  it('shows error when JSON root lacks required fields', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ foo: 'bar' }),
    };
    const onReady = vi.fn();
    renderPreviewStep(container, state, onReady);
    const error = container.querySelector('.wizard-error');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('id, name, and title');
    expect(onReady).toHaveBeenCalledWith(false);
  });

  it('renders name normalization dropdown on success', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ id: '1', name: 'Alice', title: 'CEO' }),
    };
    renderPreviewStep(container, state, vi.fn());
    const labels = container.querySelectorAll('.wizard-field label');
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).toContain('Name format');
    expect(texts).toContain('Title format');
  });

  it('normalization dropdown has correct options', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ id: '1', name: 'Alice', title: 'CEO' }),
    };
    renderPreviewStep(container, state, vi.fn());
    const selects = container.querySelectorAll('.wizard-field select');
    expect(selects.length).toBe(2);
    const options = selects[0].querySelectorAll('option');
    expect(options.length).toBe(4);
    expect(options[0].value).toBe('none');
    expect(options[1].value).toBe('titleCase');
    expect(options[2].value).toBe('uppercase');
    expect(options[3].value).toBe('lowercase');
  });

  it('updates nameNormalization state on dropdown change', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ id: '1', name: 'Alice', title: 'CEO' }),
    };
    renderPreviewStep(container, state, vi.fn());
    const selects = container.querySelectorAll('.wizard-field select');
    const nameSelect = selects[0] as HTMLSelectElement;
    nameSelect.value = 'uppercase';
    nameSelect.dispatchEvent(new Event('change'));
    expect(state.nameNormalization).toBe('uppercase');
  });

  it('updates titleNormalization state on dropdown change', () => {
    const state: WizardState = {
      format: 'JSON',
      rawText: JSON.stringify({ id: '1', name: 'Alice', title: 'CEO' }),
    };
    renderPreviewStep(container, state, vi.fn());
    const selects = container.querySelectorAll('.wizard-field select');
    const titleSelect = selects[1] as HTMLSelectElement;
    titleSelect.value = 'lowercase';
    titleSelect.dispatchEvent(new Event('change'));
    expect(state.titleNormalization).toBe('lowercase');
  });

  it('parses valid CSV with mapping', () => {
    const csv = 'name,title,manager_name\nAlice,CEO,\nBob,VP,Alice\n';
    const state: WizardState = {
      format: 'CSV',
      rawText: csv,
      mapping: {
        name: 'name',
        title: 'title',
        parentRef: 'manager_name',
        parentRefType: 'name',
      },
    };
    renderPreviewStep(container, state, vi.fn());
    const success = container.querySelector('.wizard-success');
    expect(success).not.toBeNull();
    expect(success!.textContent).toContain('2 people parsed from CSV');
    expect(state.tree).not.toBeUndefined();
    expect(state.nodeCount).toBe(2);
  });
});

describe('renderImportStep', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders summary text', () => {
    const state: WizardState = { nodeCount: 5, format: 'CSV' };
    renderImportStep(container, state, vi.fn());
    const info = container.querySelector('.wizard-info');
    expect(info).not.toBeNull();
    expect(info!.textContent).toContain('5 people');
    expect(info!.textContent).toContain('CSV');
  });

  it('renders radio group with replace and new options', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    const radios = container.querySelectorAll('.wizard-radio');
    expect(radios.length).toBe(2);
    expect(radios[0].textContent).toContain('Import to current chart');
    expect(radios[1].textContent).toContain('Create new chart');
  });

  it('defaults destination to replace', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    expect(state.destination).toBe('replace');
    const replaceRadio = container.querySelectorAll('.wizard-radio')[0];
    expect(replaceRadio.classList.contains('selected')).toBe(true);
  });

  it('calls onReady(true) immediately', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    const onReady = vi.fn();
    renderImportStep(container, state, onReady);
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it('hides name input by default', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    const nameField = container.querySelectorAll('.wizard-field')[0] as HTMLElement;
    expect(nameField.style.display).toBe('none');
  });

  it('shows name input when new chart is selected', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    const newRadio = container.querySelectorAll('.wizard-radio')[1] as HTMLElement;
    newRadio.click();
    const nameField = container.querySelectorAll('.wizard-field')[0] as HTMLElement;
    expect(nameField.style.display).toBe('');
    expect(state.destination).toBe('new');
  });

  it('hides name input when switching back to replace', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON', destination: 'new' };
    renderImportStep(container, state, vi.fn());
    const replaceRadio = container.querySelectorAll('.wizard-radio')[0] as HTMLElement;
    replaceRadio.click();
    const nameField = container.querySelectorAll('.wizard-field')[0] as HTMLElement;
    expect(nameField.style.display).toBe('none');
    expect(state.destination).toBe('replace');
  });

  it('stores chartName on input', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON', destination: 'new' };
    renderImportStep(container, state, vi.fn());
    const nameInput = container.querySelector('.wizard-field input') as HTMLInputElement;
    nameInput.value = 'My Team Chart';
    nameInput.dispatchEvent(new Event('input'));
    expect(state.chartName).toBe('My Team Chart');
  });

  it('renders radiogroup with correct role', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    const group = container.querySelector('.wizard-radio-group');
    expect(group!.getAttribute('role')).toBe('radiogroup');
  });

  it('renders name input with placeholder', () => {
    const state: WizardState = { nodeCount: 3, format: 'JSON' };
    renderImportStep(container, state, vi.fn());
    const nameInput = container.querySelector('.wizard-field input') as HTMLInputElement;
    expect(nameInput.placeholder).toBe('My Org Chart');
  });
});
