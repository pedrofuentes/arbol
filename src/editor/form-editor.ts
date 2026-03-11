import { OrgStore } from '../store/org-store';
import { flattenTree } from '../utils/tree';

type SelectionChangeHandler = (nodeId: string | null) => void;

export class FormEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private selectedNodeId: string | null = null;
  private selectionChangeHandler: SelectionChangeHandler | null = null;

  // Add section elements
  private parentSelect!: HTMLSelectElement;
  private nameInput!: HTMLInputElement;
  private titleInput!: HTMLInputElement;

  // Edit section container
  private editSection!: HTMLDivElement;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.build();
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    this.renderEditSection();
    this.selectionChangeHandler?.(nodeId);
  }

  refresh(): void {
    this.populateParentDropdown();
    if (this.selectedNodeId) {
      this.renderEditSection();
    }
  }

  setSelectionChangeHandler(handler: SelectionChangeHandler): void {
    this.selectionChangeHandler = handler;
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  private build(): void {
    this.container.innerHTML = '';

    // --- Add Person Section ---
    const addHeading = document.createElement('h4');
    addHeading.textContent = 'Add Person';
    addHeading.style.cssText =
      'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.container.appendChild(addHeading);

    // Parent dropdown
    const parentGroup = this.createFormGroup('Parent');
    this.parentSelect = document.createElement('select');
    this.parentSelect.dataset.field = 'parent';
    this.parentSelect.setAttribute('aria-label', 'Parent person');
    parentGroup.appendChild(this.parentSelect);
    this.container.appendChild(parentGroup);

    // Name input
    const nameGroup = this.createFormGroup('Name');
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.dataset.field = 'name';
    this.nameInput.setAttribute('aria-label', 'Name');
    nameGroup.appendChild(this.nameInput);
    this.container.appendChild(nameGroup);

    // Title input
    const titleGroup = this.createFormGroup('Title');
    this.titleInput = document.createElement('input');
    this.titleInput.type = 'text';
    this.titleInput.dataset.field = 'title';
    this.titleInput.setAttribute('aria-label', 'Title');
    titleGroup.appendChild(this.titleInput);
    this.container.appendChild(titleGroup);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.dataset.action = 'add';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => this.handleAdd());
    this.container.appendChild(addBtn);

    // --- Edit Person Section (hidden initially) ---
    this.editSection = document.createElement('div');
    this.container.appendChild(this.editSection);

    this.populateParentDropdown();
  }

  private createFormGroup(labelText: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    group.appendChild(label);
    return group;
  }

  private populateParentDropdown(): void {
    this.parentSelect.innerHTML = '';
    const nodes = flattenTree(this.store.getTree());
    for (const node of nodes) {
      const option = document.createElement('option');
      option.value = node.id;
      option.textContent = `${node.name} (${node.title})`;
      this.parentSelect.appendChild(option);
    }
  }

  private handleAdd(): void {
    const parentId = this.parentSelect.value;
    const name = this.nameInput.value;
    const title = this.titleInput.value;

    this.store.addChild(parentId, { name, title });
    this.nameInput.value = '';
    this.titleInput.value = '';
    this.populateParentDropdown();
  }

  private renderEditSection(): void {
    this.editSection.innerHTML = '';

    if (!this.selectedNodeId) return;

    const tree = this.store.getTree();
    const allNodes = flattenTree(tree);
    const node = allNodes.find((n) => n.id === this.selectedNodeId);
    if (!node) return;

    const isRoot = node.id === tree.id;

    const heading = document.createElement('h4');
    heading.textContent = 'Edit Person';
    heading.style.cssText =
      'margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.editSection.appendChild(heading);

    // Edit Name
    const nameGroup = this.createFormGroup('Name');
    const editNameInput = document.createElement('input');
    editNameInput.type = 'text';
    editNameInput.dataset.field = 'edit-name';
    editNameInput.value = node.name;
    nameGroup.appendChild(editNameInput);
    this.editSection.appendChild(nameGroup);

    // Edit Title
    const titleGroup = this.createFormGroup('Title');
    const editTitleInput = document.createElement('input');
    editTitleInput.type = 'text';
    editTitleInput.dataset.field = 'edit-title';
    editTitleInput.value = node.title;
    titleGroup.appendChild(editTitleInput);
    this.editSection.appendChild(titleGroup);

    // Button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.dataset.action = 'save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      this.store.updateNode(this.selectedNodeId!, {
        name: editNameInput.value,
        title: editTitleInput.value,
      });
    });
    btnGroup.appendChild(saveBtn);

    if (!isRoot) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.setAttribute('aria-label', 'Delete selected person');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        this.store.removeNode(this.selectedNodeId!);
        this.selectNode(null);
      });
      btnGroup.appendChild(deleteBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.dataset.action = 'deselect';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.selectNode(null);
    });
    btnGroup.appendChild(cancelBtn);

    this.editSection.appendChild(btnGroup);
  }
}
