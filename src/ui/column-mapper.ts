import type { ColumnMapping } from '../types';
import { t } from '../i18n';

let formIdCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++formIdCounter}`;
}

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
  private caseInsensitiveCheckbox!: HTMLInputElement;
  private parentRefLabel!: HTMLLabelElement;
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
    desc.textContent = "We couldn't auto-detect your CSV format. Please map each column below.";
    desc.style.cssText =
      'margin:0 0 12px;font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-normal);';
    this.container.appendChild(desc);

    // Column dropdowns
    this.nameSelect = this.createDropdown('Person Name Column', true);
    this.titleSelect = this.createDropdown('Job Title Column', true);
    const parentRefGroup = this.createDropdown('Reports To (Name)', true);
    this.parentRefSelect = parentRefGroup;
    this.parentRefLabel = this.parentRefSelect.parentElement!.querySelector('label')!;
    this.idSelect = this.createDropdown('Person ID Column (optional)', false);

    // Parent Reference Type toggle
    this.buildParentRefTypeToggle();

    // Case-insensitive checkbox
    this.buildCaseInsensitiveOption();

    // Error area
    this.errorArea = document.createElement('div');
    this.errorArea.className = 'error-msg';
    this.errorArea.style.cssText = 'min-height:0;';
    this.container.appendChild(this.errorArea);


    // Wire up change listeners
    this.idSelect.addEventListener('change', () => this.onIdFieldChanged());
  }

  private createDropdown(labelText: string, required: boolean): HTMLSelectElement {
    const id = uniqueId('mapper');
    const group = this.createFormGroup(labelText, id);
    const select = document.createElement('select');
    select.id = id;
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

    // By Name radio
    const nameLabel = this.createRadioOption('parentRefType', 'name', 'By Name', true);
    this.byNameRadio = nameLabel.querySelector('input')!;

    // By ID radio
    const idLabel = this.createRadioOption('parentRefType', 'id', 'By ID', false);
    this.byIdRadio = idLabel.querySelector('input')!;

    radioGroup.appendChild(nameLabel);
    radioGroup.appendChild(idLabel);
    group.appendChild(radioGroup);

    const helpText = document.createElement('small');
    helpText.textContent = t('column_mapper.parent_ref_help');
    helpText.style.cssText = 'display:block;margin-top:4px;font-size:11px;color:var(--text-tertiary);';
    group.appendChild(helpText);

    this.container.appendChild(group);

    // Update Reports To label when toggle changes
    this.byNameRadio.addEventListener('change', () => {
      this.updateParentRefLabel();
    });
    this.byIdRadio.addEventListener('change', () => {
      this.updateParentRefLabel();
    });
  }

  private buildCaseInsensitiveOption(): void {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.style.cssText = 'margin-bottom:10px;';

    const label = document.createElement('label');
    label.style.cssText =
      'display:flex;align-items:center;gap:6px;font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer;text-transform:none;letter-spacing:normal;font-weight:var(--font-medium);';

    this.caseInsensitiveCheckbox = document.createElement('input');
    this.caseInsensitiveCheckbox.type = 'checkbox';
    this.caseInsensitiveCheckbox.checked = true;

    label.appendChild(this.caseInsensitiveCheckbox);
    label.appendChild(document.createTextNode('Case-insensitive matching'));
    group.appendChild(label);
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
    this.updateParentRefLabel();
  }

  private updateParentRefLabel(): void {
    this.parentRefLabel.textContent = this.byIdRadio.checked
      ? 'Reports To (ID)'
      : 'Reports To (Name)';
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

    return {
      name,
      title,
      parentRef,
      id,
      parentRefType,
      caseInsensitive: this.caseInsensitiveCheckbox.checked,
    };
  }

  /** Pre-fill dropdowns from a saved mapping */
  prefill(mapping: ColumnMapping): void {
    this.nameSelect.value = mapping.name;
    this.titleSelect.value = mapping.title;
    this.parentRefSelect.value = mapping.parentRef;
    if (mapping.id) this.idSelect.value = mapping.id;
    if (mapping.parentRefType === 'id') {
      this.byIdRadio.checked = true;
      this.byNameRadio.checked = false;
    } else {
      this.byNameRadio.checked = true;
      this.byIdRadio.checked = false;
    }
    this.updateParentRefLabel();
    if (mapping.caseInsensitive !== undefined) {
      this.caseInsensitiveCheckbox.checked = mapping.caseInsensitive;
    }
  }

  handleApply(): void {
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
      this.errorArea.textContent =
        'Each column can only be mapped to one field. Please remove duplicates.';
      return;
    }

    this.onApply({
      name,
      title,
      parentRef,
      id,
      parentRefType,
      caseInsensitive: this.caseInsensitiveCheckbox.checked,
    });
  }
}
