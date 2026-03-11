import { OrgStore } from '../store/org-store';

export class JsonEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private textarea!: HTMLTextAreaElement;
  private errorMsg!: HTMLElement;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.build();
  }

  refresh(): void {
    this.textarea.value = this.store.toJSON();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  private build(): void {
    this.container.innerHTML = '';

    // Textarea
    const textareaGroup = document.createElement('div');
    textareaGroup.className = 'form-group';
    this.textarea = document.createElement('textarea');
    this.textarea.dataset.field = 'json';
    this.textarea.value = this.store.toJSON();
    this.textarea.style.cssText =
      'width:100%;min-height:200px;font-family:Calibri,sans-serif;font-size:12px;resize:vertical;';
    textareaGroup.appendChild(this.textarea);
    this.container.appendChild(textareaGroup);

    // Error message
    this.errorMsg = document.createElement('div');
    this.errorMsg.className = 'error-msg';
    this.errorMsg.dataset.field = 'error';
    this.errorMsg.textContent = '';
    this.container.appendChild(this.errorMsg);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.dataset.action = 'apply';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this.handleApply());
    this.container.appendChild(applyBtn);
  }

  private handleApply(): void {
    try {
      this.store.fromJSON(this.textarea.value);
      this.errorMsg.textContent = '';
    } catch (e: unknown) {
      this.errorMsg.textContent = e instanceof Error ? e.message : String(e);
    }
  }
}
