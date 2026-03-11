import { OrgStore } from '../store/org-store';
import { parseCsvToTree } from '../utils/csv-parser';
import type { OrgNode } from '../types';

interface ParsedImport {
  tree: OrgNode;
  nodeCount: number;
  format: 'JSON' | 'CSV';
  fileName: string;
}

export class ImportEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private dropZone!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private statusArea!: HTMLDivElement;
  private errorArea!: HTMLDivElement;
  private pendingImport: ParsedImport | null = null;

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

    const heading = document.createElement('h4');
    heading.textContent = 'Import Data';
    heading.style.cssText =
      'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;';
    this.container.appendChild(heading);

    // Hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,.csv';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) this.processFile(file);
      this.fileInput.value = '';
    });
    this.container.appendChild(this.fileInput);

    // Drop zone
    this.dropZone = document.createElement('div');
    this.dropZone.style.cssText = `
      border: 2px dashed var(--border-default);
      border-radius: var(--radius-lg);
      padding: 32px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 200ms ease, background 200ms ease;
      margin-bottom: 12px;
    `;

    const icon = document.createElement('div');
    icon.textContent = '📂';
    icon.style.cssText = 'font-size:32px;margin-bottom:8px;';

    const label = document.createElement('div');
    label.textContent = 'Drop JSON or CSV file here';
    label.style.cssText = 'color:var(--text-secondary);font-size:13px;margin-bottom:8px;';

    const separator = document.createElement('div');
    separator.textContent = 'or';
    separator.style.cssText = 'color:var(--text-tertiary);font-size:11px;margin-bottom:8px;';

    const browseBtn = document.createElement('button');
    browseBtn.className = 'btn btn-secondary';
    browseBtn.textContent = 'Browse Files';
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.dropZone.append(icon, label, separator, browseBtn);
    this.dropZone.addEventListener('click', () => this.fileInput.click());

    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.style.borderColor = 'var(--accent)';
      this.dropZone.style.background = 'var(--accent-muted)';
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.style.borderColor = 'var(--border-default)';
      this.dropZone.style.background = '';
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.style.borderColor = 'var(--border-default)';
      this.dropZone.style.background = '';
      const file = e.dataTransfer?.files[0];
      if (file) this.processFile(file);
    });

    this.container.appendChild(this.dropZone);

    // Status/preview area (hidden initially)
    this.statusArea = document.createElement('div');
    this.statusArea.dataset.field = 'status';
    this.statusArea.style.display = 'none';
    this.container.appendChild(this.statusArea);

    // Error area
    this.errorArea = document.createElement('div');
    this.errorArea.dataset.field = 'error';
    this.errorArea.className = 'error-msg';
    this.errorArea.style.cssText = 'color:var(--danger);font-size:12px;margin-top:8px;';
    this.errorArea.textContent = '';
    this.container.appendChild(this.errorArea);
  }

  private processFile(file: File): void {
    this.clearStatus();
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const result = this.parseContent(text, file.name);
        this.pendingImport = result;
        this.showStatus(result);
      } catch (e: unknown) {
        this.showError(e instanceof Error ? e.message : String(e));
      }
    };
    reader.onerror = () => this.showError('Failed to read file');
    reader.readAsText(file);
  }

  private parseContent(text: string, fileName: string): ParsedImport {
    const ext = fileName.lastIndexOf('.') >= 0
      ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
      : '';

    if (ext === '.csv') {
      return this.parseCsv(text, fileName);
    }
    if (ext === '.json') {
      return this.parseJson(text, fileName);
    }
    // No recognised extension — try JSON first, fall back to CSV
    try {
      return this.parseJson(text, fileName);
    } catch {
      return this.parseCsv(text, fileName);
    }
  }

  private parseCsv(text: string, fileName: string): ParsedImport {
    const { tree, nodeCount } = parseCsvToTree(text);
    return { tree, nodeCount, format: 'CSV', fileName };
  }

  private parseJson(text: string, fileName: string): ParsedImport {
    const parsed = JSON.parse(text) as OrgNode;
    if (!parsed.id || !parsed.name || !parsed.title) {
      throw new Error('Invalid org tree: root must have id, name, and title');
    }
    const nodeCount = this.countNodes(parsed);
    return { tree: parsed, nodeCount, format: 'JSON', fileName };
  }

  private countNodes(node: OrgNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  private showStatus(result: ParsedImport): void {
    this.statusArea.innerHTML = '';
    this.statusArea.style.display = 'block';
    this.statusArea.style.cssText +=
      ';padding:12px;border-radius:var(--radius-md);background:var(--bg-elevated);margin-bottom:8px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size:13px;color:var(--text-primary);margin-bottom:8px;';
    info.textContent = `Loaded: ${result.fileName} (${result.format}, ${result.nodeCount} people)`;
    this.statusArea.appendChild(info);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.dataset.action = 'apply';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this.applyImport());

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.clearStatus());

    btnGroup.append(applyBtn, cancelBtn);
    this.statusArea.appendChild(btnGroup);
  }

  private applyImport(): void {
    if (!this.pendingImport) return;
    try {
      this.store.fromJSON(JSON.stringify(this.pendingImport.tree));
      this.clearStatus();
    } catch (e: unknown) {
      this.showError(e instanceof Error ? e.message : String(e));
    }
  }

  private showError(message: string): void {
    this.errorArea.textContent = message;
  }

  private clearStatus(): void {
    this.pendingImport = null;
    this.statusArea.style.display = 'none';
    this.statusArea.innerHTML = '';
    this.errorArea.textContent = '';
  }
}
