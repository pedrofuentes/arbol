import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';
import { FormEditor } from '../../src/editor/form-editor';
import { flattenTree } from '../../src/utils/tree';

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

describe('FormEditor', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let editor: FormEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeRoot());
    editor = new FormEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  describe('Add Person section', () => {
    it('renders parent dropdown with all nodes', () => {
      const select = container.querySelector<HTMLSelectElement>('select[data-field="parent"]');
      expect(select).not.toBeNull();
      const allNodes = flattenTree(store.getTree());
      expect(select!.options.length).toBe(allNodes.length);
      expect(select!.options[0].value).toBe('root');
      expect(select!.options[0].textContent).toContain('Alice');
    });

    it('renders name and title inputs', () => {
      const nameInput = container.querySelector<HTMLInputElement>('input[data-field="name"]');
      const titleInput = container.querySelector<HTMLInputElement>('input[data-field="title"]');
      expect(nameInput).not.toBeNull();
      expect(titleInput).not.toBeNull();
    });

    it('renders add button', () => {
      const addBtn = container.querySelector<HTMLButtonElement>('button[data-action="add"]');
      expect(addBtn).not.toBeNull();
      expect(addBtn!.textContent).toBe('Add');
    });

    it('adds a child when form is submitted', () => {
      const select = container.querySelector<HTMLSelectElement>('select[data-field="parent"]')!;
      const nameInput = container.querySelector<HTMLInputElement>('input[data-field="name"]')!;
      const titleInput = container.querySelector<HTMLInputElement>('input[data-field="title"]')!;
      const addBtn = container.querySelector<HTMLButtonElement>('button[data-action="add"]')!;

      select.value = 'root';
      nameInput.value = 'Dan';
      titleInput.value = 'VP';
      addBtn.click();

      const tree = store.getTree();
      expect(tree.children).toHaveLength(3);
      expect(tree.children![2].name).toBe('Dan');
      expect(tree.children![2].title).toBe('VP');
    });

    it('clears inputs after adding', () => {
      const nameInput = container.querySelector<HTMLInputElement>('input[data-field="name"]')!;
      const titleInput = container.querySelector<HTMLInputElement>('input[data-field="title"]')!;
      const addBtn = container.querySelector<HTMLButtonElement>('button[data-action="add"]')!;

      nameInput.value = 'Dan';
      titleInput.value = 'VP';
      addBtn.click();

      expect(nameInput.value).toBe('');
      expect(titleInput.value).toBe('');
    });

    it('refreshes dropdown when store changes', () => {
      store.addChild('root', { name: 'Dan', title: 'VP' });
      editor.refresh();

      const select = container.querySelector<HTMLSelectElement>('select[data-field="parent"]')!;
      const allNodes = flattenTree(store.getTree());
      expect(select.options.length).toBe(allNodes.length);
    });
  });

  describe('Edit Person section', () => {
    it('shows edit fields when node is selected', () => {
      editor.selectNode('b');

      const editName = container.querySelector<HTMLInputElement>('input[data-field="edit-name"]');
      const editTitle = container.querySelector<HTMLInputElement>('input[data-field="edit-title"]');
      expect(editName).not.toBeNull();
      expect(editName!.value).toBe('Bob');
      expect(editTitle).not.toBeNull();
      expect(editTitle!.value).toBe('CTO');
    });

    it('updates node when save is clicked', () => {
      editor.selectNode('b');

      const editName = container.querySelector<HTMLInputElement>('input[data-field="edit-name"]')!;
      const editTitle = container.querySelector<HTMLInputElement>('input[data-field="edit-title"]')!;
      const saveBtn = container.querySelector<HTMLButtonElement>('button[data-action="save"]')!;

      editName.value = 'Robert';
      editTitle.value = 'VP Engineering';
      saveBtn.click();

      expect(store.getTree().children![0].name).toBe('Robert');
      expect(store.getTree().children![0].title).toBe('VP Engineering');
    });

    it('deletes node when delete is clicked', () => {
      editor.selectNode('b');

      const deleteBtn = container.querySelector<HTMLButtonElement>('button[data-action="delete"]')!;
      deleteBtn.click();

      expect(store.getTree().children).toHaveLength(1);
      expect(store.getTree().children![0].id).toBe('c');
    });

    it('does not show delete button for root node', () => {
      editor.selectNode('root');

      const deleteBtn = container.querySelector<HTMLButtonElement>('button[data-action="delete"]');
      expect(deleteBtn).toBeNull();
    });

    it('deselects when cancel is clicked', () => {
      const handler = vi.fn();
      editor.setSelectionChangeHandler(handler);

      editor.selectNode('b');
      const cancelBtn = container.querySelector<HTMLButtonElement>('button[data-action="deselect"]')!;
      cancelBtn.click();

      expect(handler).toHaveBeenCalledWith(null);
      const editName = container.querySelector<HTMLInputElement>('input[data-field="edit-name"]');
      expect(editName).toBeNull();
    });

    it('fires selectionChangeHandler when selectNode is called', () => {
      const handler = vi.fn();
      editor.setSelectionChangeHandler(handler);

      editor.selectNode('b');
      expect(handler).toHaveBeenCalledWith('b');

      editor.selectNode(null);
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  describe('destroy', () => {
    it('clears the container', () => {
      editor.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
