import { OrgStore } from '../store/org-store';
import { normalizeTreeText } from '../utils/text-normalize';
import type { TextNormalization } from '../types';
import { t } from '../i18n';

const NORM_OPTIONS: { value: TextNormalization; label: string }[] = [
  { value: 'none', label: 'As is (no change)' },
  { value: 'titleCase', label: 'Title Case' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
];

export class UtilitiesEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private nameNormSelect!: HTMLSelectElement;
  private titleNormSelect!: HTMLSelectElement;
  private applyBtn!: HTMLButtonElement;
  private statusMsg!: HTMLDivElement;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.build();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  private build(): void {
    this.container.innerHTML = '';

    // --- Text Normalization Section ---
    const heading = document.createElement('h4');
    heading.textContent = t('utilities.heading');
    heading.style.cssText =
      'margin:0 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(heading);

    const desc = document.createElement('p');
    desc.textContent =
      'Normalize the text casing of all names and titles in the current org chart.';
    desc.style.cssText =
      'margin:0 0 12px;font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-normal);';
    this.container.appendChild(desc);

    this.nameNormSelect = this.createNormDropdown('Name Format');
    this.titleNormSelect = this.createNormDropdown('Title Format');

    this.nameNormSelect.addEventListener('change', () => this.updateApplyState());
    this.titleNormSelect.addEventListener('change', () => this.updateApplyState());

    // Status message
    this.statusMsg = document.createElement('div');
    this.statusMsg.dataset.field = 'normStatus';
    this.statusMsg.style.cssText =
      'font-size:12px;font-family:var(--font-sans);min-height:0;margin-bottom:8px;';
    this.container.appendChild(this.statusMsg);

    // Apply button
    this.applyBtn = document.createElement('button');
    this.applyBtn.className = 'btn btn-primary';
    this.applyBtn.dataset.action = 'applyNorm';
    this.applyBtn.textContent = t('utilities.apply_btn');
    this.applyBtn.disabled = true;
    this.applyBtn.addEventListener('click', () => this.applyNormalization());
    this.container.appendChild(this.applyBtn);
  }

  private createNormDropdown(labelText: string): HTMLSelectElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const id = 'norm-' + labelText.toLowerCase().replace(/\s+/g, '-');
    const label = document.createElement('label');
    label.textContent = labelText;
    label.htmlFor = id;
    group.appendChild(label);

    const select = document.createElement('select');
    select.id = id;
    select.dataset.normField = labelText.toLowerCase().replace(/\s+/g, '-');
    for (const opt of NORM_OPTIONS) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }

    group.appendChild(select);
    this.container.appendChild(group);
    return select;
  }

  private updateApplyState(): void {
    const nameMode = this.nameNormSelect.value as TextNormalization;
    const titleMode = this.titleNormSelect.value as TextNormalization;
    this.applyBtn.disabled = nameMode === 'none' && titleMode === 'none';
    this.statusMsg.textContent = '';
    this.statusMsg.style.color = '';
  }

  private applyNormalization(): void {
    const nameMode = this.nameNormSelect.value as TextNormalization;
    const titleMode = this.titleNormSelect.value as TextNormalization;

    if (nameMode === 'none' && titleMode === 'none') return;

    try {
      const tree = this.store.getTree();
      const normalized = normalizeTreeText(tree, nameMode, titleMode);
      this.store.fromJSON(JSON.stringify(normalized));

      this.statusMsg.textContent = '✓ Org chart text normalized successfully.';
      this.statusMsg.style.color = 'var(--success, #22c55e)';
    } catch (e: unknown) {
      this.statusMsg.textContent = e instanceof Error ? e.message : String(e);
      this.statusMsg.style.color = 'var(--danger)';
    }
  }
}
