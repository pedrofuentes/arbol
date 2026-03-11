import { OrgStore } from '../store/org-store';
import { parseCsvToTree } from '../utils/csv-parser';
import type { OrgNode } from '../types';

interface ParsedImport {
  tree: OrgNode;
  nodeCount: number;
  format: 'JSON' | 'CSV';
  source: string;
}

export class ImportEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private fileInput!: HTMLInputElement;
  private statusArea!: HTMLDivElement;
  private errorArea!: HTMLDivElement;
  private pasteArea!: HTMLTextAreaElement;
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

    // --- File Upload Section ---
    const fileHeading = document.createElement('h4');
    fileHeading.textContent = 'From File';
    fileHeading.style.cssText =
      'margin:0 0 8px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(fileHeading);

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

    const dropZone = document.createElement('div');
    dropZone.style.cssText = `
      border: 2px dashed var(--border-default);
      border-radius: var(--radius-lg);
      padding: 20px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.22,1,0.36,1);
      margin-bottom: 14px;
    `;

    const dropLabel = document.createElement('div');
    dropLabel.innerHTML = '<span style="font-size:20px">📂</span>&nbsp;&nbsp;Drop file or <strong style="color:var(--accent);cursor:pointer;">browse</strong>';
    dropLabel.style.cssText = 'color:var(--text-secondary);font-size:12px;font-family:var(--font-sans);';
    dropZone.appendChild(dropLabel);

    const dropHint = document.createElement('div');
    dropHint.textContent = 'Supports .json and .csv files';
    dropHint.style.cssText = 'color:var(--text-tertiary);font-size:10px;margin-top:4px;font-family:var(--font-sans);';
    dropZone.appendChild(dropHint);

    dropZone.addEventListener('click', () => this.fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent)';
      dropZone.style.background = 'var(--accent-muted)';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border-default)';
      dropZone.style.background = '';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border-default)';
      dropZone.style.background = '';
      const file = e.dataTransfer?.files[0];
      if (file) this.processFile(file);
    });

    this.container.appendChild(dropZone);

    // --- Format Help Section ---
    this.container.appendChild(this.buildFormatHelp());

    // --- Paste Section ---
    const pasteHeading = document.createElement('h4');
    pasteHeading.textContent = 'Or Paste Data';
    pasteHeading.style.cssText =
      'margin:0 0 8px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(pasteHeading);

    this.pasteArea = document.createElement('textarea');
    this.pasteArea.placeholder = 'Paste JSON or CSV here...';
    this.pasteArea.style.cssText =
      'width:100%;min-height:120px;font-family:var(--font-mono);font-size:11px;' +
      'resize:vertical;padding:8px 10px;line-height:1.5;' +
      'background:var(--bg-base);border:1px solid var(--border-default);' +
      'border-radius:var(--radius-md);color:var(--text-primary);' +
      'transition:border-color 150ms ease;';
    this.container.appendChild(this.pasteArea);

    const pasteBtn = document.createElement('button');
    pasteBtn.className = 'btn btn-primary';
    pasteBtn.textContent = 'Parse & Preview';
    pasteBtn.style.marginTop = '8px';
    pasteBtn.addEventListener('click', () => this.processPaste());
    this.container.appendChild(pasteBtn);

    // --- Status & Error areas ---
    this.statusArea = document.createElement('div');
    this.statusArea.dataset.field = 'status';
    this.statusArea.style.display = 'none';
    this.container.appendChild(this.statusArea);

    this.errorArea = document.createElement('div');
    this.errorArea.dataset.field = 'error';
    this.errorArea.className = 'error-msg';
    this.errorArea.style.cssText = 'margin-top:8px;';
    this.errorArea.textContent = '';
    this.container.appendChild(this.errorArea);
  }

  private buildFormatHelp(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:14px;';

    const formats = [
      {
        label: 'CSV Format',
        examples: [
          {
            name: 'With IDs (recommended)',
            code: 'id,name,title,parent_id\nceo,Jane Doe,CEO,\nvp,John Smith,VP Eng,ceo',
          },
          {
            name: 'By manager name',
            code: 'name,title,manager_name\nJane Doe,CEO,\nJohn Smith,VP Eng,Jane Doe',
          },
        ],
      },
      {
        label: 'JSON Format',
        examples: [
          {
            name: 'Nested tree',
            code: '{\n  "id": "ceo",\n  "name": "Jane Doe",\n  "title": "CEO",\n  "children": [\n    { "id": "vp", "name": "John", "title": "VP" }\n  ]\n}',
          },
        ],
      },
    ];

    for (const fmt of formats) {
      const details = document.createElement('details');
      details.style.cssText =
        'margin-bottom:6px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);' +
        'overflow:hidden;transition:all 150ms ease;';

      const summary = document.createElement('summary');
      summary.textContent = fmt.label;
      summary.style.cssText =
        'padding:6px 10px;font-size:11px;font-weight:600;font-family:var(--font-sans);' +
        'color:var(--text-secondary);cursor:pointer;user-select:none;' +
        'background:var(--bg-elevated);list-style:none;';
      // Custom arrow
      summary.innerHTML = `<span style="display:inline-block;margin-right:6px;font-size:9px;transition:transform 150ms ease;">▶</span>${fmt.label}`;
      details.appendChild(summary);

      details.addEventListener('toggle', () => {
        const arrow = summary.querySelector('span');
        if (arrow) arrow.style.transform = details.open ? 'rotate(90deg)' : '';
      });

      const content = document.createElement('div');
      content.style.cssText = 'padding:8px 10px;background:var(--bg-base);';

      for (const ex of fmt.examples) {
        const label = document.createElement('div');
        label.textContent = ex.name;
        label.style.cssText =
          'font-size:10px;color:var(--text-tertiary);margin-bottom:3px;font-family:var(--font-sans);font-weight:600;';
        content.appendChild(label);

        const pre = document.createElement('pre');
        pre.textContent = ex.code;
        pre.style.cssText =
          'font-family:var(--font-mono);font-size:10px;line-height:1.5;color:var(--text-secondary);' +
          'white-space:pre-wrap;word-break:break-all;margin:0 0 8px;padding:6px 8px;' +
          'background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);';
        content.appendChild(pre);
      }

      details.appendChild(content);
      wrapper.appendChild(details);
    }

    return wrapper;
  }

  private processPaste(): void {
    this.clearStatus();
    const text = this.pasteArea.value.trim();
    if (!text) {
      this.showError('Nothing to parse — paste JSON or CSV data above.');
      return;
    }
    try {
      const result = this.parseContent(text, 'pasted data');
      this.pendingImport = result;
      this.showStatus(result);
    } catch (e: unknown) {
      this.showError(e instanceof Error ? e.message : String(e));
    }
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

  private parseContent(text: string, source: string): ParsedImport {
    const ext = source.lastIndexOf('.') >= 0
      ? source.slice(source.lastIndexOf('.')).toLowerCase()
      : '';

    if (ext === '.csv') return this.parseCsv(text, source);
    if (ext === '.json') return this.parseJson(text, source);

    // No extension (pasted data) — try JSON first, fall back to CSV
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return this.parseJson(text, source); } catch { /* fall through */ }
    }
    try { return this.parseCsv(text, source); } catch { /* fall through */ }
    try { return this.parseJson(text, source); } catch { /* fall through */ }
    throw new Error('Could not parse as JSON or CSV. Check your data format.');
  }

  private parseCsv(text: string, source: string): ParsedImport {
    const { tree, nodeCount } = parseCsvToTree(text);
    return { tree, nodeCount, format: 'CSV', source };
  }

  private parseJson(text: string, source: string): ParsedImport {
    const parsed = JSON.parse(text) as OrgNode;
    if (!parsed.id || !parsed.name || !parsed.title) {
      throw new Error('Invalid org tree: root must have id, name, and title');
    }
    const nodeCount = this.countNodes(parsed);
    return { tree: parsed, nodeCount, format: 'JSON', source };
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
    this.statusArea.style.cssText =
      'display:block;padding:12px;border-radius:var(--radius-md);background:var(--bg-elevated);' +
      'margin-top:12px;border:1px solid var(--border-default);';

    const info = document.createElement('div');
    info.style.cssText = 'font-size:13px;color:var(--text-primary);margin-bottom:8px;font-family:var(--font-sans);';
    info.innerHTML = `✓ Parsed <strong>${result.nodeCount}</strong> people from ${result.format}`;
    this.statusArea.appendChild(info);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.dataset.action = 'apply';
    applyBtn.textContent = 'Apply to Chart';
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
      this.pasteArea.value = '';
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
