import type { ColumnMapping } from '../types';

export class ColumnMapper {
  private container: HTMLElement;
  private headers: string[];
  private onApply: (mapping: ColumnMapping) => void;
  private onSavePreset: (mapping: ColumnMapping, presetName: string) => void;
  private onCancel: () => void;

  private nameSelect!: HTMLSelectElement;
  private titleSelect!: HTMLSelectElement;
  private parentRefSelect!: HTMLSelectElement;
  private idSelect!: HTMLSelectElement;
  private byIdRadio!: HTMLInputElement;
  private byNameRadio!: HTMLInputElement;
  private presetNameInput!: HTMLInputElement;
  private savePresetBtn!: HTMLButtonElement;
  private errorArea!: HTMLDivElement;

  constructor(
    container: HTMLElement,
    headers: string[],
    onApply: (mapping: ColumnMapping) => void,
    onSavePreset: (mapping: ColumnMapping, presetName: string) => void,
    onCancel: () => void,
  ) {
    this.container = container;
    this.headers = headers;
    this.onApply = onApply;
    this.onSavePreset = onSavePreset;
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
    heading.textContent = 'Map CSV Columns';
    heading.style.cssText =
      'margin:0 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(heading);

    // Description
    const desc = document.createElement('p');
    desc.textContent =
      "We couldn't auto-detect your CSV format. Please map each column below.";
    desc.style.cssText =
      'margin:0 0 12px;font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-normal);';
    this.container.appendChild(desc);

    // Column dropdowns
    this.nameSelect = this.createDropdown('Person Name Column', true);
    this.titleSelect = this.createDropdown('Job Title Column', true);
    this.parentRefSelect = this.createDropdown('Reports To Column', true);
    this.idSelect = this.createDropdown('Person ID Column (optional)', false);

    // Parent Reference Type toggle
    this.buildParentRefTypeToggle();

    // Save as Preset section
    this.buildPresetSection();

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

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = 'Apply Mapping';
    applyBtn.addEventListener('click', () => this.handleApply());

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(applyBtn);
    this.container.appendChild(btnGroup);

    // Wire up change listeners
    this.idSelect.addEventListener('change', () => this.onIdFieldChanged());
    this.nameSelect.addEventListener('change', () => this.updatePresetBtnState());
    this.titleSelect.addEventListener('change', () => this.updatePresetBtnState());
    this.parentRefSelect.addEventListener('change', () => this.updatePresetBtnState());
  }

  private createDropdown(labelText: string, required: boolean): HTMLSelectElement {
    const group = this.createFormGroup(labelText);
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = required ? '— Select —' : '— None —';
    select.appendChild(placeholder);

    for (const header of this.headers) {
      const opt = document.createElement('option');
      opt.value = header;
      opt.textContent = header;
      select.appendChild(opt);
    }

    group.appendChild(select);
    this.container.appendChild(group);
    return select;
  }

  private createFormGroup(labelText: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = labelText;
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

    // By Name radio
    const nameLabel = this.createRadioOption('parentRefType', 'name', 'By Name', true);
    this.byNameRadio = nameLabel.querySelector('input')!;

    // By ID radio
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

  private buildPresetSection(): void {
    const heading = document.createElement('h4');
    heading.textContent = 'Save as Preset';
    heading.style.cssText =
      'margin:12px 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(heading);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:12px;';

    const inputGroup = this.createFormGroup('Preset Name');
    inputGroup.style.cssText = 'flex:1;margin-bottom:0;';
    this.presetNameInput = document.createElement('input');
    this.presetNameInput.type = 'text';
    this.presetNameInput.placeholder = 'My preset';
    inputGroup.appendChild(this.presetNameInput);

    this.savePresetBtn = document.createElement('button');
    this.savePresetBtn.className = 'btn btn-secondary';
    this.savePresetBtn.textContent = 'Save Preset';
    this.savePresetBtn.disabled = true;
    this.savePresetBtn.addEventListener('click', () => this.handleSavePreset());

    this.presetNameInput.addEventListener('input', () => this.updatePresetBtnState());

    row.appendChild(inputGroup);
    row.appendChild(this.savePresetBtn);
    this.container.appendChild(row);
  }

  private onIdFieldChanged(): void {
    const hasId = this.idSelect.value !== '';
    this.byIdRadio.disabled = !hasId;
    if (!hasId && this.byIdRadio.checked) {
      this.byNameRadio.checked = true;
    }
    this.updatePresetBtnState();
  }

  private updatePresetBtnState(): void {
    const mapping = this.tryBuildMapping();
    const hasPresetName = this.presetNameInput.value.trim() !== '';
    this.savePresetBtn.disabled = mapping === null || !hasPresetName;
  }

  private tryBuildMapping(): ColumnMapping | null {
    const name = this.nameSelect.value;
    const title = this.titleSelect.value;
    const parentRef = this.parentRefSelect.value;
    const id = this.idSelect.value || undefined;
    const parentRefType: 'id' | 'name' = this.byIdRadio.checked ? 'id' : 'name';

    if (!name || !title || !parentRef) return null;
    if (parentRefType === 'id' && !id) return null;

    const selected = [name, title, parentRef];
    if (id) selected.push(id);
    if (new Set(selected).size !== selected.length) return null;

    return { name, title, parentRef, id, parentRefType };
  }

  private handleApply(): void {
    this.errorArea.textContent = '';

    const name = this.nameSelect.value;
    const title = this.titleSelect.value;
    const parentRef = this.parentRefSelect.value;

    if (!name || !title || !parentRef) {
      this.errorArea.textContent = 'Please select a column for Name, Title, and Reports To.';
      return;
    }

    const parentRefType: 'id' | 'name' = this.byIdRadio.checked ? 'id' : 'name';
    const id = this.idSelect.value || undefined;

    if (parentRefType === 'id' && !id) {
      this.errorArea.textContent =
        'When using "By ID" parent references, the Person ID column must be mapped.';
      return;
    }

    const selected = [name, title, parentRef];
    if (id) selected.push(id);
    if (new Set(selected).size !== selected.length) {
      this.errorArea.textContent = 'Each column can only be mapped to one field. Please remove duplicates.';
      return;
    }

    this.onApply({ name, title, parentRef, id, parentRefType });
  }

  private handleSavePreset(): void {
    const mapping = this.tryBuildMapping();
    const presetName = this.presetNameInput.value.trim();
    if (mapping && presetName) {
      this.onSavePreset(mapping, presetName);
    }
  }
}
