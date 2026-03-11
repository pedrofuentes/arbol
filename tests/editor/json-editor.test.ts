import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';
import { JsonEditor } from '../../src/editor/json-editor';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('JsonEditor', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let editor: JsonEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeRoot());
    editor = new JsonEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  describe('initial render', () => {
    it('renders textarea with current JSON', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]');
      expect(textarea).not.toBeNull();
      const parsed = JSON.parse(textarea!.value);
      expect(parsed.id).toBe('root');
      expect(parsed.children).toHaveLength(2);
    });

    it('renders apply button', () => {
      const applyBtn = container.querySelector<HTMLButtonElement>('button[data-action="apply"]');
      expect(applyBtn).not.toBeNull();
      expect(applyBtn!.textContent).toBe('Apply');
    });

    it('renders error message container', () => {
      const errorMsg = container.querySelector<HTMLElement>('[data-field="error"]');
      expect(errorMsg).not.toBeNull();
      expect(errorMsg!.textContent).toBe('');
    });
  });

  describe('apply valid JSON', () => {
    it('applies valid JSON to store', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]')!;
      const applyBtn = container.querySelector<HTMLButtonElement>('button[data-action="apply"]')!;

      const newTree: OrgNode = { id: 'new', name: 'Zara', title: 'Founder' };
      textarea.value = JSON.stringify(newTree, null, 2);
      applyBtn.click();

      expect(store.getTree().id).toBe('new');
      expect(store.getTree().name).toBe('Zara');
    });

    it('clears error on successful apply', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]')!;
      const applyBtn = container.querySelector<HTMLButtonElement>('button[data-action="apply"]')!;
      const errorMsg = container.querySelector<HTMLElement>('[data-field="error"]')!;

      // First cause an error
      textarea.value = 'not json';
      applyBtn.click();
      expect(errorMsg.textContent).not.toBe('');

      // Then apply valid JSON
      textarea.value = JSON.stringify({ id: 'x', name: 'X', title: 'X' });
      applyBtn.click();
      expect(errorMsg.textContent).toBe('');
    });
  });

  describe('error handling', () => {
    it('shows error for invalid JSON syntax', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]')!;
      const applyBtn = container.querySelector<HTMLButtonElement>('button[data-action="apply"]')!;
      const errorMsg = container.querySelector<HTMLElement>('[data-field="error"]')!;

      textarea.value = '{bad json!!!}';
      applyBtn.click();

      expect(errorMsg.textContent).not.toBe('');
    });

    it('shows error for invalid tree structure', () => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]')!;
      const applyBtn = container.querySelector<HTMLButtonElement>('button[data-action="apply"]')!;
      const errorMsg = container.querySelector<HTMLElement>('[data-field="error"]')!;

      textarea.value = JSON.stringify({ foo: 'bar' });
      applyBtn.click();

      expect(errorMsg.textContent).not.toBe('');
    });
  });

  describe('refresh', () => {
    it('refreshes textarea when store changes externally', () => {
      store.addChild('root', { name: 'Dan', title: 'VP' });
      editor.refresh();

      const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-field="json"]')!;
      const parsed = JSON.parse(textarea.value);
      expect(parsed.children).toHaveLength(3);
    });
  });

  describe('destroy', () => {
    it('clears the container', () => {
      editor.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
