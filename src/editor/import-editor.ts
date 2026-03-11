import { OrgStore } from '../store/org-store';
import { MappingStore } from '../store/mapping-store';
import { parseCsvToTree, extractHeaders } from '../utils/csv-parser';
import { ColumnMapper } from '../ui/column-mapper';
import { PresetCreator } from '../ui/preset-creator';
import type { OrgNode, ColumnMapping } from '../types';

interface ParsedImport {
  tree: OrgNode;
  nodeCount: number;
  format: 'JSON' | 'CSV';
  source: string;
}

export class ImportEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private mappingStore: MappingStore;
  private fileInput!: HTMLInputElement;
  private statusArea!: HTMLDivElement;
  private errorArea!: HTMLDivElement;
  private pasteArea!: HTMLTextAreaElement;
  private presetSelect!: HTMLSelectElement;
  private mappingArea!: HTMLDivElement;
  private manageSlot!: HTMLDivElement;
  private currentMapper: ColumnMapper | null = null;
  private currentCreator: PresetCreator | null = null;
  private slotMapper: ColumnMapper | null = null;
  private pendingCsvText: string | null = null;
  private pendingImport: ParsedImport | null = null;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.mappingStore = new MappingStore();
    this.build();
  }

  destroy(): void {
    this.clearManageSlot();
    if (this.currentMapper) {
      this.currentMapper.destroy();
      this.currentMapper = null;
    }
    this.container.innerHTML = '';
  }

  private build(): void {
    this.container.innerHTML = '';

    // --- Mapping Preset Section ---
    const presetHeading = document.createElement('h4');
    presetHeading.textContent = 'Mapping Preset';
    presetHeading.style.cssText =
      'margin:0 0 8px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(presetHeading);

    const presetRow = document.createElement('div');
    presetRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';

    this.presetSelect = document.createElement('select');
    this.presetSelect.style.cssText =
      'flex:1;padding:4px 8px;font-size:11px;font-family:var(--font-sans);' +
      'background:var(--bg-base);border:1px solid var(--border-default);' +
      'border-radius:var(--radius-md);color:var(--text-primary);';
    this.refreshPresetDropdown();
    presetRow.appendChild(this.presetSelect);

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn btn-secondary';
    manageBtn.textContent = 'Manage';
    manageBtn.style.cssText = 'font-size:10px;padding:3px 8px;';

    const manageArea = document.createElement('div');
    manageArea.style.cssText = 'display:none;margin-bottom:14px;padding:8px 10px;' +
      'background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);';

    // --- Action buttons row ---
    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;';

    const actionBtnStyle = 'font-size:10px;padding:3px 8px;';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-secondary';
    createBtn.textContent = 'Create';
    createBtn.style.cssText = actionBtnStyle;

    const fromSampleBtn = document.createElement('button');
    fromSampleBtn.className = 'btn btn-secondary';
    fromSampleBtn.textContent = 'From Sample';
    fromSampleBtn.style.cssText = actionBtnStyle;

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.textContent = 'Import';
    importBtn.style.cssText = actionBtnStyle;

    const exportAllBtn = document.createElement('button');
    exportAllBtn.className = 'btn btn-secondary';
    exportAllBtn.textContent = 'Export All';
    exportAllBtn.style.cssText = actionBtnStyle;

    actionRow.append(createBtn, fromSampleBtn, importBtn, exportAllBtn);
    manageArea.appendChild(actionRow);

    // --- Manage slot (dynamic inline area) ---
    this.manageSlot = document.createElement('div');
    this.manageSlot.style.cssText = 'display:none;padding:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:8px;';
    manageArea.appendChild(this.manageSlot);

    // --- Preset list ---
    const presetListContainer = document.createElement('div');

    const rebuildManageList = () => {
      presetListContainer.innerHTML = '';
      const presets = this.mappingStore.getPresets();
      if (presets.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No saved presets.';
        empty.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
        presetListContainer.appendChild(empty);
        return;
      }
      for (const preset of presets) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;';
        const label = document.createElement('span');
        label.textContent = preset.name;
        label.style.cssText = 'font-size:11px;color:var(--text-primary);font-family:var(--font-sans);';

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:4px;';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-secondary';
        exportBtn.textContent = 'Export';
        exportBtn.style.cssText = 'font-size:10px;padding:1px 6px;line-height:1;min-width:0;';
        exportBtn.addEventListener('click', () => {
          const json = this.mappingStore.exportPresets([preset.name]);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `arbol-${preset.name.replace(/\s+/g, '-').toLowerCase()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-secondary';
        delBtn.textContent = '×';
        delBtn.style.cssText = 'font-size:12px;padding:1px 6px;line-height:1;min-width:0;';
        delBtn.addEventListener('click', () => {
          this.mappingStore.deletePreset(preset.name);
          this.refreshPresetDropdown();
          rebuildManageList();
        });

        btnGroup.append(exportBtn, delBtn);
        row.append(label, btnGroup);
        presetListContainer.appendChild(row);
      }
    };

    manageArea.appendChild(presetListContainer);

    // --- Action button handlers ---

    createBtn.addEventListener('click', () => {
      this.clearManageSlot();
      this.manageSlot.style.display = 'block';
      this.currentCreator = new PresetCreator(
        this.manageSlot,
        (preset) => {
          this.mappingStore.savePreset(preset);
          this.refreshPresetDropdown();
          rebuildManageList();
          this.clearManageSlot();
        },
        () => {
          this.clearManageSlot();
        },
      );
    });

    fromSampleBtn.addEventListener('click', () => {
      this.clearManageSlot();
      const sampleInput = document.createElement('input');
      sampleInput.type = 'file';
      sampleInput.accept = '.csv';
      sampleInput.style.display = 'none';
      this.manageSlot.appendChild(sampleInput);
      sampleInput.addEventListener('change', () => {
        const file = sampleInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          const headers = extractHeaders(text);
          if (headers.length === 0) {
            this.manageSlot.style.display = 'block';
            this.manageSlot.innerHTML = '';
            const errMsg = document.createElement('div');
            errMsg.textContent = 'Could not extract headers from CSV file.';
            errMsg.style.cssText = 'font-size:11px;color:var(--danger);font-family:var(--font-sans);';
            this.manageSlot.appendChild(errMsg);
            return;
          }
          this.manageSlot.style.display = 'block';
          this.manageSlot.innerHTML = '';
          // Use a fresh ColumnMapper in the manage slot (not the auto-detect one)
          const slotMapper = new ColumnMapper(
            this.manageSlot,
            headers,
            (mapping: ColumnMapping) => {
              // "Apply" in this context means save as preset
              const presetName = prompt('Enter a name for this preset:');
              if (!presetName?.trim()) return;
              this.mappingStore.savePreset({ name: presetName.trim(), mapping });
              this.refreshPresetDropdown();
              rebuildManageList();
              this.clearManageSlot();
            },
            (mapping: ColumnMapping, presetName: string) => {
              this.mappingStore.savePreset({ name: presetName, mapping });
              this.refreshPresetDropdown();
              rebuildManageList();
              const successMsg = document.createElement('div');
              successMsg.textContent = 'Preset saved!';
              successMsg.style.cssText = 'font-size:11px;color:var(--success, #22c55e);font-family:var(--font-sans);margin-top:4px;';
              this.manageSlot.appendChild(successMsg);
              setTimeout(() => this.clearManageSlot(), 1200);
            },
            () => {
              this.clearManageSlot();
            },
          );
          // Track so clearManageSlot can destroy it
          this.currentCreator = null;
          this.slotMapper = slotMapper;
        };
        reader.onerror = () => {
          this.manageSlot.style.display = 'block';
          this.manageSlot.innerHTML = '';
          const errMsg = document.createElement('div');
          errMsg.textContent = 'Failed to read file.';
          errMsg.style.cssText = 'font-size:11px;color:var(--danger);font-family:var(--font-sans);';
          this.manageSlot.appendChild(errMsg);
        };
        reader.readAsText(file);
      });
      sampleInput.click();
    });

    importBtn.addEventListener('click', () => {
      this.clearManageSlot();
      this.manageSlot.style.display = 'block';

      const heading = document.createElement('h4');
      heading.textContent = 'Import Presets';
      heading.style.cssText =
        'margin:0 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
      this.manageSlot.appendChild(heading);

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Paste preset JSON here...';
      textarea.style.cssText =
        'width:100%;min-height:80px;font-family:var(--font-mono);font-size:11px;' +
        'resize:vertical;padding:8px 10px;line-height:1.5;' +
        'background:var(--bg-base);border:1px solid var(--border-default);' +
        'border-radius:var(--radius-md);color:var(--text-primary);margin-bottom:6px;';
      this.manageSlot.appendChild(textarea);

      const loadFileLink = document.createElement('a');
      loadFileLink.textContent = 'Or load file';
      loadFileLink.href = '#';
      loadFileLink.style.cssText = 'font-size:10px;color:var(--accent);display:block;margin-bottom:8px;font-family:var(--font-sans);';
      this.manageSlot.appendChild(loadFileLink);

      const jsonFileInput = document.createElement('input');
      jsonFileInput.type = 'file';
      jsonFileInput.accept = '.json';
      jsonFileInput.style.display = 'none';
      this.manageSlot.appendChild(jsonFileInput);

      loadFileLink.addEventListener('click', (e) => {
        e.preventDefault();
        jsonFileInput.click();
      });

      jsonFileInput.addEventListener('change', () => {
        const file = jsonFileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          textarea.value = reader.result as string;
        };
        reader.readAsText(file);
      });

      const importMsg = document.createElement('div');
      importMsg.style.cssText = 'font-size:11px;font-family:var(--font-sans);margin-bottom:6px;min-height:0;';
      this.manageSlot.appendChild(importMsg);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

      const cancelImportBtn = document.createElement('button');
      cancelImportBtn.className = 'btn btn-secondary';
      cancelImportBtn.textContent = 'Cancel';
      cancelImportBtn.style.cssText = actionBtnStyle;
      cancelImportBtn.addEventListener('click', () => this.clearManageSlot());

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-primary';
      loadBtn.textContent = 'Load';
      loadBtn.style.cssText = actionBtnStyle;
      loadBtn.addEventListener('click', () => {
        importMsg.textContent = '';
        importMsg.style.color = '';
        const json = textarea.value.trim();
        if (!json) {
          importMsg.textContent = 'Please paste JSON or load a file first.';
          importMsg.style.color = 'var(--danger)';
          return;
        }
        try {
          const count = this.mappingStore.importPresets(json);
          importMsg.textContent = `Imported ${count} preset${count === 1 ? '' : 's'} successfully.`;
          importMsg.style.color = 'var(--success, #22c55e)';
          this.refreshPresetDropdown();
          rebuildManageList();
        } catch (e: unknown) {
          importMsg.textContent = e instanceof Error ? e.message : 'Invalid JSON';
          importMsg.style.color = 'var(--danger)';
        }
      });

      btnRow.append(cancelImportBtn, loadBtn);
      this.manageSlot.appendChild(btnRow);
    });

    exportAllBtn.addEventListener('click', () => {
      const json = this.mappingStore.exportPresets();
      const presets = this.mappingStore.getPresets();
      if (presets.length === 0) {
        this.clearManageSlot();
        this.manageSlot.style.display = 'block';
        const msg = document.createElement('div');
        msg.textContent = 'No presets to export';
        msg.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
        this.manageSlot.appendChild(msg);
        setTimeout(() => this.clearManageSlot(), 2000);
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arbol-mappings.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    manageBtn.addEventListener('click', () => {
      const isVisible = manageArea.style.display !== 'none';
      manageArea.style.display = isVisible ? 'none' : 'block';
      if (isVisible) {
        this.clearManageSlot();
      } else {
        rebuildManageList();
      }
    });
    presetRow.appendChild(manageBtn);
    this.container.appendChild(presetRow);
    this.container.appendChild(manageArea);

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

    // --- Column Mapping Area ---
    this.mappingArea = document.createElement('div');
    this.mappingArea.style.display = 'none';
    this.container.appendChild(this.mappingArea);
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
      summary.textContent = '';
      const arrow = document.createElement('span');
      arrow.style.cssText = 'display:inline-block;margin-right:6px;font-size:9px;transition:transform 150ms ease;';
      arrow.textContent = '▶';
      summary.append(arrow, fmt.label);
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
    const presetName = this.presetSelect.value;
    if (presetName) {
      const preset = this.mappingStore.getPreset(presetName);
      if (preset) {
        const { tree, nodeCount } = parseCsvToTree(text, preset.mapping);
        return { tree, nodeCount, format: 'CSV', source };
      }
    }

    try {
      const { tree, nodeCount } = parseCsvToTree(text);
      return { tree, nodeCount, format: 'CSV', source };
    } catch (e) {
      this.pendingCsvText = text;
      const headers = extractHeaders(text);
      this.showColumnMapper(headers);
      throw new Error('Auto-detection failed. Please map columns below.');
    }
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
    info.textContent = '';
    info.append('✓ Parsed ');
    const strong = document.createElement('strong');
    strong.textContent = String(result.nodeCount);
    info.append(strong);
    info.append(` people from ${result.format}`);
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

  private showColumnMapper(headers: string[]): void {
    this.mappingArea.style.display = 'block';
    if (this.currentMapper) {
      this.currentMapper.destroy();
      this.currentMapper = null;
    }

    this.currentMapper = new ColumnMapper(
      this.mappingArea,
      headers,
      (mapping: ColumnMapping) => {
        if (!this.pendingCsvText) return;
        try {
          const { tree, nodeCount } = parseCsvToTree(this.pendingCsvText, mapping);
          this.pendingImport = { tree, nodeCount, format: 'CSV', source: 'mapped CSV' };
          this.showStatus(this.pendingImport);
          this.hideColumnMapper();
        } catch (e: unknown) {
          this.showError(e instanceof Error ? e.message : String(e));
        }
      },
      (mapping: ColumnMapping, presetName: string) => {
        this.mappingStore.savePreset({ name: presetName, mapping });
        this.refreshPresetDropdown();
      },
      () => {
        this.hideColumnMapper();
      },
    );
  }

  private hideColumnMapper(): void {
    this.mappingArea.style.display = 'none';
    if (this.currentMapper) {
      this.currentMapper.destroy();
      this.currentMapper = null;
    }
    this.pendingCsvText = null;
  }

  private clearManageSlot(): void {
    if (this.currentCreator) {
      this.currentCreator.destroy();
      this.currentCreator = null;
    }
    if (this.slotMapper) {
      this.slotMapper.destroy();
      this.slotMapper = null;
    }
    this.manageSlot.innerHTML = '';
    this.manageSlot.style.display = 'none';
  }

  private refreshPresetDropdown(): void {
    this.presetSelect.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Auto-detect';
    this.presetSelect.appendChild(defaultOpt);

    for (const preset of this.mappingStore.getPresets()) {
      const opt = document.createElement('option');
      opt.value = preset.name;
      opt.textContent = preset.name;
      this.presetSelect.appendChild(opt);
    }
  }
}
