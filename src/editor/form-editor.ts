import { OrgStore } from '../store/org-store';
import { flattenTree } from '../utils/tree';
import { t } from '../i18n';
import { createButton, createFormGroup as createFormGroupBase } from '../utils/dom-builder';

let formIdCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++formIdCounter}`;
}

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
    addHeading.textContent = t('form.add_heading');
    addHeading.style.cssText =
      'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.container.appendChild(addHeading);

    // Parent dropdown
    const parentId = uniqueId('form-parent');
    const parentGroup = this.createFormGroup(t('form.parent_label'), parentId);
    this.parentSelect = document.createElement('select');
    this.parentSelect.id = parentId;
    this.parentSelect.dataset.field = 'parent';
    this.parentSelect.setAttribute('aria-label', t('form.parent_aria'));
    parentGroup.appendChild(this.parentSelect);
    this.container.appendChild(parentGroup);

    // Name input
    const nameId = uniqueId('form-name');
    const nameGroup = this.createFormGroup(t('form.name_label'), nameId);
    this.nameInput = document.createElement('input');
    this.nameInput.id = nameId;
    this.nameInput.type = 'text';
    this.nameInput.maxLength = 200;
    this.nameInput.dataset.field = 'name';
    this.nameInput.setAttribute('aria-label', t('form.name_aria'));
    nameGroup.appendChild(this.nameInput);
    this.container.appendChild(nameGroup);

    // Title input
    const titleId = uniqueId('form-title');
    const titleGroup = this.createFormGroup(t('form.title_label'), titleId);
    this.titleInput = document.createElement('input');
    this.titleInput.id = titleId;
    this.titleInput.type = 'text';
    this.titleInput.maxLength = 200;
    this.titleInput.dataset.field = 'title';
    this.titleInput.setAttribute('aria-label', t('form.title_aria'));
    titleGroup.appendChild(this.titleInput);
    this.container.appendChild(titleGroup);

    // Add button
    const addBtn = createButton({
      className: 'btn btn-primary',
      dataAction: 'add',
      label: t('form.add_button'),
      onClick: () => this.handleAdd(),
    });
    this.container.appendChild(addBtn);

    // --- Edit Person Section (hidden initially) ---
    this.editSection = document.createElement('div');
    this.container.appendChild(this.editSection);

    this.populateParentDropdown();
  }

  private createFormGroup(labelText: string, inputId?: string): HTMLDivElement {
    return createFormGroupBase(labelText, inputId);
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
    heading.textContent = t('form.edit_heading');
    heading.style.cssText =
      'margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.editSection.appendChild(heading);

    // Edit Name
    const editNameId = uniqueId('form-edit-name');
    const nameGroup = this.createFormGroup(t('form.name_label'), editNameId);
    const editNameInput = document.createElement('input');
    editNameInput.id = editNameId;
    editNameInput.type = 'text';
    editNameInput.maxLength = 200;
    editNameInput.dataset.field = 'edit-name';
    editNameInput.value = node.name;
    nameGroup.appendChild(editNameInput);
    this.editSection.appendChild(nameGroup);

    // Edit Title
    const editTitleId = uniqueId('form-edit-title');
    const titleGroup = this.createFormGroup(t('form.title_label'), editTitleId);
    const editTitleInput = document.createElement('input');
    editTitleInput.id = editTitleId;
    editTitleInput.type = 'text';
    editTitleInput.maxLength = 200;
    editTitleInput.dataset.field = 'edit-title';
    editTitleInput.value = node.title;
    titleGroup.appendChild(editTitleInput);
    this.editSection.appendChild(titleGroup);

    // Button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const saveBtn = createButton({
      className: 'btn btn-primary',
      dataAction: 'save',
      label: t('form.save_button'),
      onClick: () => {
        this.store.updateNode(this.selectedNodeId!, {
          name: editNameInput.value,
          title: editTitleInput.value,
        });
      },
    });
    btnGroup.appendChild(saveBtn);

    if (!isRoot) {
      const deleteBtn = createButton({
        className: 'btn btn-danger',
        dataAction: 'delete',
        ariaLabel: t('form.delete_aria'),
        label: t('form.delete_button'),
        onClick: () => {
          this.store.removeNode(this.selectedNodeId!);
          this.selectNode(null);
        },
      });
      btnGroup.appendChild(deleteBtn);
    }

    const cancelBtn = createButton({
      className: 'btn btn-secondary',
      dataAction: 'deselect',
      label: t('form.cancel_button'),
      onClick: () => {
        this.selectNode(null);
      },
    });
    btnGroup.appendChild(cancelBtn);

    this.editSection.appendChild(btnGroup);
  }
}
