import type { ColumnMapping, MappingPreset } from '../types';

let formIdCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++formIdCounter}`;
}

export class PresetCreator {
  private container: HTMLElement;
  private onSave: (preset: MappingPreset) => void;
  private onCancel: () => void;

  private presetNameInput!: HTMLInputElement;
  private nameInput!: HTMLInputElement;
  private titleInput!: HTMLInputElement;
  private parentRefInput!: HTMLInputElement;
  private idInput!: HTMLInputElement;
  private byNameRadio!: HTMLInputElement;
  private byIdRadio!: HTMLInputElement;
  private errorArea!: HTMLDivElement;

  constructor(
    container: HTMLElement,
    onSave: (preset: MappingPreset) => void,
    onCancel: () => void,
  ) {
    this.container = container;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.build();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  private build(): void {
    this.container.innerHTML = '';

    // Heading
    const heading = document.createElement('h4');
    heading.textContent = 'Create Mapping Preset';
    heading.style.cssText =
      'margin:0 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(heading);

    // Description
    const desc = document.createElement('p');
    desc.textContent = 'Type the column header names from your CSV file.';
    desc.style.cssText =
      'margin:0 0 12px;font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-normal);';
    this.container.appendChild(desc);

    // Form fields
    this.presetNameInput = this.createTextInput('Preset Name', 'HJR Export');
    this.nameInput = this.createTextInput('Name Column', 'e.g. employee_name');
    this.titleInput = this.createTextInput('Title Column', 'e.g. job_title');
    this.parentRefInput = this.createTextInput('Reports To Column', 'e.g. supervisor');
    this.idInput = this.createTextInput('ID Column (optional)', 'e.g. employee_id');

    // Parent Reference Type toggle
    this.buildParentRefTypeToggle();

    // Error area
    this.errorArea = document.createElement('div');
    this.errorArea.className = 'error-msg';
    this.errorArea.style.cssText = 'min-height:0;';
    this.container.appendChild(this.errorArea);

    // Button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.onCancel());

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleSave());

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    this.container.appendChild(btnGroup);

    // Wire up ID field listener for radio state
    this.idInput.addEventListener('input', () => this.onIdFieldChanged());
  }

  private createTextInput(labelText: string, placeholder: string): HTMLInputElement {
    const id = uniqueId('preset');
    const group = this.createFormGroup(labelText, id);
    const input = document.createElement('input');
    input.id = id;
    input.type = 'text';
    input.placeholder = placeholder;
    group.appendChild(input);
    this.container.appendChild(group);
    return input;
  }

  private createFormGroup(labelText: string, inputId?: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    if (inputId) label.htmlFor = inputId;
    group.appendChild(label);
    return group;
  }

  private buildParentRefTypeToggle(): void {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Parent Reference Type';
    group.appendChild(label);

    const radioGroup = document.createElement('div');
    radioGroup.style.cssText = 'display:flex;gap:12px;align-items:center;';

    const nameLabel = this.createRadioOption('parentRefType', 'name', 'By Name', true);
    this.byNameRadio = nameLabel.querySelector('input')!;

    const idLabel = this.createRadioOption('parentRefType', 'id', 'By ID', false);
    this.byIdRadio = idLabel.querySelector('input')!;
    this.byIdRadio.disabled = true;

    radioGroup.appendChild(nameLabel);
    radioGroup.appendChild(idLabel);
    group.appendChild(radioGroup);
    this.container.appendChild(group);
  }

  private createRadioOption(
    name: string,
    value: string,
    text: string,
    checked: boolean,
  ): HTMLLabelElement {
    const label = document.createElement('label');
    label.style.cssText =
      'display:flex;align-items:center;gap:4px;font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer;text-transform:none;letter-spacing:normal;font-weight:var(--font-medium);';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    radio.checked = checked;

    label.appendChild(radio);
    label.appendChild(document.createTextNode(text));
    return label;
  }

  private onIdFieldChanged(): void {
    const hasId = this.idInput.value.trim() !== '';
    this.byIdRadio.disabled = !hasId;
    if (!hasId && this.byIdRadio.checked) {
      this.byNameRadio.checked = true;
    }
  }

  private handleSave(): void {
    this.errorArea.textContent = '';

    const presetName = this.presetNameInput.value.trim();
    const name = this.nameInput.value.trim();
    const title = this.titleInput.value.trim();
    const parentRef = this.parentRefInput.value.trim();
    const id = this.idInput.value.trim() || undefined;
    const parentRefType: 'id' | 'name' = this.byIdRadio.checked ? 'id' : 'name';

    if (!presetName) {
      this.errorArea.textContent = 'Preset name is required.';
      return;
    }
    if (!name || !title || !parentRef) {
      this.errorArea.textContent = 'Name, Title, and Reports To columns are required.';
      return;
    }
    if (parentRefType === 'id' && !id) {
      this.errorArea.textContent = 'ID column is required when parent reference type is "By ID".';
      return;
    }

    const mapping: ColumnMapping = { name, title, parentRef, id, parentRefType };
    this.onSave({ name: presetName, mapping });
  }
}
