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
