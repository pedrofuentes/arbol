import { t } from '../i18n';
import type { OrgNode } from '../types';

export interface CategoryInfo {
  id: string;
  label: string;
  color: string;
}

export interface PropertyPanelOptions {
  container: HTMLElement;
  onEdit: (nodeId: string, name: string, title: string) => void;
  onAddChild: (nodeId: string) => void;
  onMove: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
  onFocus: (nodeId: string) => void;
  onCategoryChange: (nodeId: string, categoryId: string | null) => void;
  onClose: () => void;
}

export class PropertyPanel {
  private el: HTMLDivElement;
  private options: PropertyPanelOptions;
  private nodeId: string | null = null;

  // Cached DOM refs
  private nameDisplay: HTMLDivElement;
  private titleDisplay: HTMLDivElement;
  private metaReportsTo: HTMLElement;
  private metaDirectReports: HTMLElement;
  private metaTotalOrg: HTMLElement;
  private metaSpanOfControl: HTMLElement;
  private nameInput: HTMLInputElement;
  private titleInput: HTMLInputElement;
  private categorySelect: HTMLSelectElement;
  private focusBtn: HTMLButtonElement;
  private moveBtn: HTMLButtonElement;
  private removeBtn: HTMLButtonElement;

  private savedName = '';
  private savedTitle = '';

  constructor(options: PropertyPanelOptions) {
    this.options = options;

    this.el = document.createElement('div');
    this.el.className = 'property-panel';
    this.el.setAttribute('role', 'complementary');
    this.el.setAttribute('aria-label', t('property_panel.aria_label'));

    // Header
    const header = document.createElement('div');
    header.className = 'pp-header';

    const headerTitle = document.createElement('span');
    headerTitle.className = 'pp-header-title';
    headerTitle.textContent = t('property_panel.title');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pp-close';
    closeBtn.setAttribute('aria-label', t('property_panel.close_aria'));
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => options.onClose());

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'pp-content';

    // Node card (info display)
    const card = document.createElement('div');
    card.className = 'pp-node-card';

    this.nameDisplay = document.createElement('div');
    this.nameDisplay.className = 'pp-node-name';

    this.titleDisplay = document.createElement('div');
    this.titleDisplay.className = 'pp-node-title';

    const meta = document.createElement('div');
    meta.className = 'pp-node-meta';

    this.metaReportsTo = this.createMetaRow('📍', t('property_panel.reports_to'));
    this.metaDirectReports = this.createMetaRow('👥', t('property_panel.direct_reports'));
    this.metaTotalOrg = this.createMetaRow('📊', t('property_panel.total_org'));
    this.metaSpanOfControl = this.createMetaRow('📐', t('property_panel.span_of_control'));

    meta.appendChild(this.metaReportsTo);
    meta.appendChild(this.metaDirectReports);
    meta.appendChild(this.metaTotalOrg);
    meta.appendChild(this.metaSpanOfControl);

    card.appendChild(this.nameDisplay);
    card.appendChild(this.titleDisplay);
    card.appendChild(meta);
    content.appendChild(card);

    // Edit section
    const editSection = document.createElement('div');
    editSection.className = 'pp-section';

    const editTitle = document.createElement('div');
    editTitle.className = 'pp-section-title';
    editTitle.textContent = t('property_panel.edit');
    editSection.appendChild(editTitle);

    // Name field
    const nameField = this.createField('pp-name-input', t('property_panel.name'));
    this.nameInput = nameField.input;
    editSection.appendChild(nameField.group);

    // Title field
    const titleField = this.createField('pp-title-input', t('property_panel.title_field'));
    this.titleInput = titleField.input;
    editSection.appendChild(titleField.group);

    // Category field
    const catGroup = document.createElement('div');
    catGroup.className = 'pp-field';
    const catLabel = document.createElement('label');
    catLabel.htmlFor = 'pp-category-select';
    catLabel.textContent = t('property_panel.category');
    this.categorySelect = document.createElement('select');
    this.categorySelect.id = 'pp-category-select';
    this.categorySelect.addEventListener('change', () => {
      if (this.nodeId) {
        options.onCategoryChange(this.nodeId, this.categorySelect.value || null);
      }
    });
    catGroup.appendChild(catLabel);
    catGroup.appendChild(this.categorySelect);
    editSection.appendChild(catGroup);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'pp-save-btn';
    saveBtn.textContent = t('property_panel.save');
    saveBtn.addEventListener('click', () => {
      if (!this.nodeId) return;
      const newName = this.nameInput.value.trim();
      const newTitle = this.titleInput.value.trim();
      if (newName !== this.savedName || newTitle !== this.savedTitle) {
        options.onEdit(this.nodeId, newName, newTitle);
        this.savedName = newName;
        this.savedTitle = newTitle;
      }
    });
    editSection.appendChild(saveBtn);
    content.appendChild(editSection);

    // Actions section
    const actionsSection = document.createElement('div');
    actionsSection.className = 'pp-section';

    const actionsTitle = document.createElement('div');
    actionsTitle.className = 'pp-section-title';
    actionsTitle.textContent = t('property_panel.actions');
    actionsSection.appendChild(actionsTitle);

    const row1 = document.createElement('div');
    row1.className = 'pp-actions';

    const addBtn = this.createActionBtn(t('property_panel.add_child'), false, false);
    addBtn.addEventListener('click', () => {
      if (this.nodeId) options.onAddChild(this.nodeId);
    });

    this.moveBtn = this.createActionBtn(t('property_panel.move'), false, false);
    this.moveBtn.addEventListener('click', () => {
      if (this.nodeId && this.moveBtn.getAttribute('aria-disabled') !== 'true') {
        options.onMove(this.nodeId);
      }
    });

    row1.appendChild(addBtn);
    row1.appendChild(this.moveBtn);

    const row2 = document.createElement('div');
    row2.className = 'pp-actions';

    this.focusBtn = this.createActionBtn(t('property_panel.focus'), false, false);
    this.focusBtn.addEventListener('click', () => {
      if (this.nodeId && this.focusBtn.getAttribute('aria-disabled') !== 'true') {
        options.onFocus(this.nodeId);
      }
    });

    this.removeBtn = this.createActionBtn(t('property_panel.remove'), true, false);
    this.removeBtn.addEventListener('click', () => {
      if (this.nodeId && this.removeBtn.getAttribute('aria-disabled') !== 'true') {
        options.onRemove(this.nodeId);
      }
    });

    row2.appendChild(this.focusBtn);
    row2.appendChild(this.removeBtn);

    actionsSection.appendChild(row1);
    actionsSection.appendChild(row2);
    content.appendChild(actionsSection);

    // Escape key
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        options.onClose();
      }
    });

    this.el.appendChild(header);
    this.el.appendChild(content);
    options.container.appendChild(this.el);
  }

  show(node: OrgNode, parentName: string | null, directReports: number, totalOrg: number, avgSpan: number, categories: CategoryInfo[]): void {
    this.nodeId = node.id;
    this.populateContent(node, parentName, directReports, totalOrg, avgSpan, categories);
    this.el.classList.add('open');
    this.nameInput.focus();
  }

  update(node: OrgNode, parentName: string | null, directReports: number, totalOrg: number, avgSpan: number, categories: CategoryInfo[]): void {
    this.populateContent(node, parentName, directReports, totalOrg, avgSpan, categories);
  }

  hide(): void {
    this.el.classList.remove('open');
    this.nodeId = null;
  }

  isVisible(): boolean {
    return this.el.classList.contains('open');
  }

  getNodeId(): string | null {
    return this.nodeId;
  }

  destroy(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }

  private populateContent(node: OrgNode, parentName: string | null, directReports: number, totalOrg: number, avgSpan: number, categories: CategoryInfo[]): void {
    this.nameDisplay.textContent = node.name;
    this.titleDisplay.textContent = node.title;

    const isRoot = parentName === null;
    this.updateMetaValue(this.metaReportsTo, isRoot ? t('property_panel.root_node') : parentName);
    this.updateMetaValue(this.metaDirectReports, String(directReports));
    this.updateMetaValue(this.metaTotalOrg, String(totalOrg));

    const nodeIsLeaf = !node.children || node.children.length === 0;
    this.updateMetaValue(this.metaSpanOfControl, nodeIsLeaf ? '—' : avgSpan.toFixed(1));
    this.metaSpanOfControl.style.display = nodeIsLeaf ? 'none' : '';

    this.savedName = node.name;
    this.savedTitle = node.title;
    this.nameInput.value = node.name;
    this.titleInput.value = node.title;

    // Category dropdown
    while (this.categorySelect.firstChild) this.categorySelect.removeChild(this.categorySelect.firstChild);
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = t('property_panel.category_none');
    this.categorySelect.appendChild(noneOpt);
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      this.categorySelect.appendChild(opt);
    }
    this.categorySelect.value = node.categoryId ?? '';

    // Disable states
    this.setDisabled(this.focusBtn, nodeIsLeaf);
    this.setDisabled(this.moveBtn, isRoot);
    this.setDisabled(this.removeBtn, isRoot);
  }

  private createMetaRow(icon: string, label: string): HTMLSpanElement {
    const span = document.createElement('span');
    const iconEl = document.createElement('span');
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    span.appendChild(iconEl);
    span.appendChild(document.createTextNode(` ${label} `));
    const strong = document.createElement('strong');
    span.appendChild(strong);
    return span;
  }

  private updateMetaValue(metaRow: HTMLElement, value: string): void {
    const strong = metaRow.querySelector('strong');
    if (strong) strong.textContent = value;
  }

  private createField(id: string, label: string): { group: HTMLDivElement; input: HTMLInputElement } {
    const group = document.createElement('div');
    group.className = 'pp-field';
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.textContent = label;
    const input = document.createElement('input');
    input.id = id;
    input.type = 'text';
    group.appendChild(lbl);
    group.appendChild(input);
    return { group, input };
  }

  private createActionBtn(text: string, danger: boolean, disabled: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `pp-action-btn${danger ? ' btn-danger' : ''}`;
    btn.textContent = text;
    if (disabled) this.setDisabled(btn, true);
    return btn;
  }

  private setDisabled(btn: HTMLButtonElement, disabled: boolean): void {
    if (disabled) {
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.removeAttribute('aria-disabled');
    }
  }
}
