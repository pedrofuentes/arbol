import { OrgStore } from '../store/org-store';
import { MappingStore } from '../store/mapping-store';
import { parseCsvToTree, extractHeaders } from '../utils/csv-parser';
import { normalizeTreeText } from '../utils/text-normalize';
import { ColumnMapper } from '../ui/column-mapper';
import { PresetCreator } from '../ui/preset-creator';
import type { OrgNode, ColumnMapping, TextNormalization, ChartBundle, ChartRecord } from '../types';
import type { ChartStore } from '../store/chart-store';
import { timestampedFilename } from '../utils/filename';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showInputDialog } from '../ui/input-dialog';
import { detectArbolFileType } from '../utils/file-type';
import { t } from '../i18n';

let formIdCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++formIdCounter}`;
}

interface ParsedImport {
  tree: OrgNode;
  nodeCount: number;
  format: 'JSON' | 'CSV';
  source: string;
  warning?: string;
  nameNormalization?: TextNormalization;
  titleNormalization?: TextNormalization;
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
  private pendingBundle: ChartBundle | null = null;
  private nameNormSelect: HTMLSelectElement | null = null;
  private titleNormSelect: HTMLSelectElement | null = null;
  private onImportAsNewChart: ((tree: OrgNode, name: string) => Promise<void>) | null;
  private chartStore: ChartStore | null;
  private onBundleImported: ((chart: ChartRecord) => void) | null;

  constructor(
    container: HTMLElement,
    store: OrgStore,
    onImportAsNewChart?: (tree: OrgNode, name: string) => Promise<void>,
    chartStore?: ChartStore,
    onBundleImported?: (chart: ChartRecord) => void,
  ) {
    this.container = container;
    this.store = store;
    this.onImportAsNewChart = onImportAsNewChart ?? null;
    this.chartStore = chartStore ?? null;
    this.onBundleImported = onBundleImported ?? null;
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
    presetRow.className = 'flex-row gap-2 mb-2';

    this.presetSelect = document.createElement('select');
    this.presetSelect.setAttribute('aria-label', 'Mapping preset');
    this.presetSelect.style.cssText =
      'flex:1;padding:4px 8px;font-size:11px;font-family:var(--font-sans);' +
      'background:var(--bg-base);border:1px solid var(--border-default);' +
      'border-radius:var(--radius-md);color:var(--text-primary);';
    this.refreshPresetDropdown();
    presetRow.appendChild(this.presetSelect);

    this.container.appendChild(presetRow);

    // --- Preset list (always visible) ---
    const presetListContainer = document.createElement('div');
    presetListContainer.className = 'mb-2';

    const rebuildManageList = () => {
      presetListContainer.innerHTML = '';
      const presets = this.mappingStore.getPresets();
      if (presets.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No saved presets.';
        empty.style.cssText =
          'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
        presetListContainer.appendChild(empty);
        return;
      }
      for (const preset of presets) {
        const row = document.createElement('div');
        row.className = 'flex-between';
        row.style.cssText = 'padding:3px 0;';
        const label = document.createElement('span');
        label.textContent = preset.name;
        label.style.cssText =
          'font-size:11px;color:var(--text-primary);font-family:var(--font-sans);';

        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex-row gap-1';

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
          a.download = timestampedFilename(`arbol-${preset.name.replace(/\s+/g, '-').toLowerCase()}.json`);
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

    rebuildManageList();
    this.container.appendChild(presetListContainer);

    // --- Action buttons row ---
    const actionBtnStyle = 'font-size:10px;padding:3px 8px;';

    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-secondary';
    createBtn.textContent = '+ New';
    createBtn.style.cssText = actionBtnStyle;

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.textContent = '📂 Import';
    importBtn.style.cssText = actionBtnStyle;

    const exportAllBtn = document.createElement('button');
    exportAllBtn.className = 'btn btn-secondary';
    exportAllBtn.textContent = '💾 Export All';
    exportAllBtn.style.cssText = actionBtnStyle;

    actionRow.append(createBtn, importBtn, exportAllBtn);
    this.container.appendChild(actionRow);

    // --- Dynamic slot for inline forms ---
    this.manageSlot = document.createElement('div');
    this.manageSlot.style.cssText =
      'display:none;padding:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:8px;';
    this.container.appendChild(this.manageSlot);

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
      loadFileLink.style.cssText =
        'font-size:10px;color:var(--accent);display:block;margin-bottom:8px;font-family:var(--font-sans);';
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

      const importMsg = document.createElement('div');
      importMsg.style.cssText =
        'font-size:11px;font-family:var(--font-sans);margin-bottom:6px;min-height:0;';
      this.manageSlot.appendChild(importMsg);

      jsonFileInput.addEventListener('change', () => {
        const file = jsonFileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          textarea.value = reader.result as string;
        };
        reader.onerror = () => {
          importMsg.textContent = t('error.file_read_failed');
          importMsg.style.color = 'var(--danger)';
        };
        reader.readAsText(file);
      });

      const btnRow = document.createElement('div');
      btnRow.className = 'flex-row gap-2';
      btnRow.style.cssText = 'justify-content:flex-end;';

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
        msg.style.cssText =
          'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
        this.manageSlot.appendChild(msg);
        setTimeout(() => this.clearManageSlot(), 2000);
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = timestampedFilename('arbol-mappings.json');
      a.click();
      URL.revokeObjectURL(url);
    });

    // --- File Upload Section ---
    const fileHeading = document.createElement('h4');
    fileHeading.textContent = 'From File';
    fileHeading.style.cssText =
      'margin:0 0 8px;font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);';
    this.container.appendChild(fileHeading);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,.csv,.xlsx,.xls';
    this.fileInput.setAttribute('aria-label', 'Upload org chart file');
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
    const icon = document.createElement('span');
    icon.style.fontSize = '20px';
    icon.textContent = '📂';
    const browseLabel = document.createElement('strong');
    browseLabel.style.color = 'var(--accent)';
    browseLabel.style.cursor = 'pointer';
    browseLabel.textContent = 'browse';
    dropLabel.append(icon, '\u00A0\u00A0Drop file or ', browseLabel);
    dropLabel.className = 'text-secondary text-sm';
    dropLabel.style.cssText = 'font-family:var(--font-sans);';
    dropZone.appendChild(dropLabel);

    const dropHint = document.createElement('div');
    dropHint.textContent = 'Supports .json, .csv, .xlsx, and .arbol.json files';
    dropHint.className = 'text-tertiary text-xs mt-1';
    dropHint.style.cssText = 'font-family:var(--font-sans);';
    dropZone.appendChild(dropHint);

    dropZone.setAttribute('role', 'button');
    dropZone.setAttribute('tabindex', '0');
    dropZone.setAttribute('aria-label', 'Upload org chart file');
    dropZone.addEventListener('click', () => this.fileInput.click());
    dropZone.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.fileInput.click();
      }
    });

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
    this.pasteArea.setAttribute('aria-label', 'Paste JSON or CSV data');
    this.pasteArea.style.cssText =
      'width:100%;min-height:120px;font-family:var(--font-mono);font-size:11px;' +
      'resize:vertical;padding:8px 10px;line-height:1.5;' +
      'background:var(--bg-base);border:1px solid var(--border-default);' +
      'border-radius:var(--radius-md);color:var(--text-primary);' +
      'transition:border-color 150ms ease;';
    this.container.appendChild(this.pasteArea);

    const pasteBtn = document.createElement('button');
    pasteBtn.className = 'btn btn-primary mt-2';
    pasteBtn.textContent = 'Parse & Preview';
    pasteBtn.addEventListener('click', () => this.processPaste());
    this.container.appendChild(pasteBtn);

    // --- Status & Error areas ---
    this.statusArea = document.createElement('div');
    this.statusArea.dataset.field = 'status';
    this.statusArea.style.display = 'none';
    this.container.appendChild(this.statusArea);

    this.errorArea = document.createElement('div');
    this.errorArea.dataset.field = 'error';
    this.errorArea.className = 'error-msg mt-2';
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
      arrow.style.cssText =
        'display:inline-block;margin-right:6px;font-size:9px;transition:transform 150ms ease;';
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

  private static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  private showLoading(message: string): void {
    this.statusArea.style.display = 'block';
    this.statusArea.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'import-loading';
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(spinner);
    const label = document.createElement('span');
    label.textContent = message;
    wrapper.appendChild(label);
    this.statusArea.appendChild(wrapper);
  }

  private processFile(file: File): void {
    this.clearStatus();
    if (file.size > ImportEditor.MAX_FILE_SIZE) {
      this.showError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`,
      );
      return;
    }

    this.showLoading(`Parsing ${file.name}…`);

    const ext =
      file.name.lastIndexOf('.') >= 0
        ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        : '';

    if (ext === '.xlsx' || ext === '.xls') {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(reader.result as ArrayBuffer);
          const worksheet = workbook.worksheets[0];
          const rows: string[] = [];
          worksheet.eachRow((row) => {
            const cells = row.values as (string | number | boolean | null | undefined)[];
            // row.values is 1-indexed (index 0 is undefined), so slice from 1
            const csvRow = cells.slice(1).map((v) => {
              if (v == null) return '';
              const s = String(v);
              return s.includes(',') || s.includes('"') || s.includes('\n')
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
            });
            rows.push(csvRow.join(','));
          });
          const csvText = rows.join('\n');
          const result = this.parseCsv(csvText, file.name);
          if (workbook.worksheets.length > 1) {
            const sheetName = worksheet.name;
            result.warning = `This workbook has ${workbook.worksheets.length} sheets. Only "${sheetName}" was imported.`;
          }
          this.pendingImport = result;
          this.showStatus(result);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('Encrypted') || msg.includes('EncryptionInfo')) {
            this.showError(
              'This file is encrypted or rights-protected. ' +
                'Open it in Excel, save as a new unprotected .xlsx or .csv, then import that file.',
            );
          } else {
            this.showError(msg);
          }
        }
      };
      reader.onerror = () => this.showError(t('error.file_read_failed'));
      reader.readAsArrayBuffer(file);
      return;
    }

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
    reader.onerror = () => this.showError(t('error.file_read_failed'));
    reader.readAsText(file);
  }

  private parseContent(text: string, source: string): ParsedImport {
    const ext =
      source.lastIndexOf('.') >= 0 ? source.slice(source.lastIndexOf('.')).toLowerCase() : '';

    // Detect chart bundle format and file-type mismatches
    if (ext === '.json' || ext === '') {
      const trimmed = text.trimStart();
      if (trimmed.startsWith('{')) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* not valid JSON, continue to CSV */
        }

        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>;
          if (obj.format === 'arbol-chart') {
            return this.parseChartBundle(parsed, source);
          }

          const fileType = detectArbolFileType(parsed);
          if (fileType === 'backup') {
            throw new Error(t('import.wrong_file_backup'));
          }
          if (fileType === 'settings') {
            throw new Error(t('import.wrong_file_settings'));
          }
        }
      }
    }

    if (ext === '.csv') return this.parseCsv(text, source);
    if (ext === '.json') return this.parseJson(text, source);

    // No extension (pasted data) — try JSON first, fall back to CSV
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return this.parseJson(text, source);
      } catch {
        /* fall through */
      }
    }
    try {
      return this.parseCsv(text, source);
    } catch {
      /* fall through */
    }
    try {
      return this.parseJson(text, source);
    } catch {
      /* fall through */
    }
    throw new Error('Could not parse as JSON or CSV. Check your data format.');
  }

  private parseCsv(text: string, source: string): ParsedImport {
    const presetName = this.presetSelect.value;
    if (presetName) {
      const preset = this.mappingStore.getPreset(presetName);
      if (preset) {
        const { tree, nodeCount } = parseCsvToTree(text, preset.mapping);
        return {
          tree,
          nodeCount,
          format: 'CSV',
          source,
          nameNormalization: preset.mapping.nameNormalization,
          titleNormalization: preset.mapping.titleNormalization,
        };
      }
    }

    try {
      const { tree, nodeCount } = parseCsvToTree(text);
      return { tree, nodeCount, format: 'CSV', source };
    } catch (e) {
      this.pendingCsvText = text;
      const headers = extractHeaders(text);
      this.showColumnMapper(headers);
      throw new Error('Auto-detection failed. Please map columns below.', { cause: e });
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

  private parseChartBundle(parsed: unknown, source: string): ParsedImport {
    const bundle = parsed as ChartBundle;

    if (bundle.version !== 1) {
      throw new Error(`Unsupported chart bundle version: ${bundle.version}`);
    }
    if (!bundle.chart?.name || !bundle.chart?.workingTree) {
      throw new Error('Invalid chart bundle: missing chart name or working tree');
    }
    const root = bundle.chart.workingTree;
    if (!root.id || !root.name || !root.title) {
      throw new Error('Invalid chart bundle: working tree root must have id, name, and title');
    }
    if (bundle.versions && !Array.isArray(bundle.versions)) {
      throw new Error('Invalid chart bundle: versions must be an array');
    }
    for (const v of bundle.versions ?? []) {
      if (!v.name || !v.tree) {
        throw new Error('Invalid chart bundle: each version must have name and tree');
      }
    }

    this.pendingBundle = bundle;

    const nodeCount = this.countNodes(root);
    const versionCount = bundle.versions?.length ?? 0;
    return {
      tree: root,
      nodeCount,
      format: 'JSON',
      source,
      warning: versionCount > 0
        ? `Chart bundle "${bundle.chart.name}" with ${versionCount} version${versionCount === 1 ? '' : 's'}`
        : `Chart bundle "${bundle.chart.name}" with no versions`,
    };
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
    info.style.cssText =
      'font-size:13px;color:var(--text-primary);margin-bottom:8px;font-family:var(--font-sans);';
    info.textContent = '';
    info.append('✓ Parsed ');
    const strong = document.createElement('strong');
    strong.textContent = String(result.nodeCount);
    info.append(strong);
    info.append(` people from ${result.format}`);
    this.statusArea.appendChild(info);

    if (result.warning) {
      const warning = document.createElement('div');
      warning.style.cssText =
        'font-size:12px;color:var(--text-warning, #b08800);margin-bottom:8px;font-family:var(--font-sans);';
      warning.textContent = `⚠ ${result.warning}`;
      this.statusArea.appendChild(warning);
    }

    // Text normalization options
    this.statusArea.appendChild(this.buildNormalizationRow());

    // Pre-populate normalization from preset if available
    if (result.nameNormalization && this.nameNormSelect) {
      this.nameNormSelect.value = result.nameNormalization;
    }
    if (result.titleNormalization && this.titleNormSelect) {
      this.titleNormSelect.value = result.titleNormalization;
    }

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

  private async applyImport(): Promise<void> {
    if (!this.pendingImport) return;
    try {
      // Chart bundle flow
      if (this.pendingBundle && this.chartStore) {
        const importAsNew = await showConfirmDialog({
          title: 'Import Chart Bundle',
          message: `Import "${this.pendingBundle.chart.name}" with ${this.pendingBundle.versions.length} version(s). Create a new chart or replace the current one?`,
          confirmLabel: 'New chart',
          cancelLabel: 'Replace current',
          danger: false,
        });

        if (importAsNew) {
          const chart = await this.chartStore.importChartAsNew(this.pendingBundle);
          if (this.onBundleImported) this.onBundleImported(chart);
        } else {
          const chart = await this.chartStore.importChartReplaceCurrent(this.pendingBundle);
          if (this.onBundleImported) this.onBundleImported(chart);
        }

        this.pasteArea.value = '';
        this.clearStatus();
        return;
      }

      const nameMode = (this.nameNormSelect?.value ?? 'none') as TextNormalization;
      const titleMode = (this.titleNormSelect?.value ?? 'none') as TextNormalization;
      let tree = this.pendingImport.tree;
      if (nameMode !== 'none' || titleMode !== 'none') {
        tree = normalizeTreeText(tree, nameMode, titleMode);
      }

      if (this.onImportAsNewChart) {
        const importAsNew = await showConfirmDialog({
          title: 'Import Destination',
          message: 'Would you like to create a new chart from this import, or replace the current chart?',
          confirmLabel: 'New chart',
          cancelLabel: 'Replace current',
          danger: false,
        });

        if (importAsNew) {
          const name = await showInputDialog({
            title: 'New Chart',
            label: 'Chart name',
            placeholder: 'e.g. Engineering Org',
            maxLength: 100,
          });
          if (!name?.trim()) return;
          await this.onImportAsNewChart(tree, name.trim());
        } else {
          this.store.fromJSON(JSON.stringify(tree));
        }
      } else {
        this.store.fromJSON(JSON.stringify(tree));
      }

      this.pasteArea.value = '';
      this.clearStatus();
    } catch (e: unknown) {
      this.showError(e instanceof Error ? e.message : String(e));
    }
  }

  private static readonly NORM_OPTIONS: { value: TextNormalization; label: string }[] = [
    { value: 'none', label: 'As imported' },
    { value: 'titleCase', label: 'Title Case' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'lowercase', label: 'lowercase' },
  ];

  private buildNormalizationRow(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.dataset.section = 'normalization';
    wrapper.className = 'mb-2';

    const heading = document.createElement('div');
    heading.textContent = 'Text Normalization';
    heading.style.cssText =
      'font-size:10px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.1em;font-weight:700;font-family:var(--font-sans);margin-bottom:6px;';
    wrapper.appendChild(heading);

    const row = document.createElement('div');
    row.className = 'flex-row gap-2';

    this.nameNormSelect= this.createNormSelect('Name');
    this.titleNormSelect = this.createNormSelect('Title');
    row.appendChild(this.nameNormSelect.parentElement!);
    row.appendChild(this.titleNormSelect.parentElement!);

    wrapper.appendChild(row);
    return wrapper;
  }

  private createNormSelect(labelText: string): HTMLSelectElement {
    const group = document.createElement('div');
    group.style.cssText = 'flex:1;';

    const id = uniqueId('import-norm');
    const label = document.createElement('label');
    label.textContent = `${labelText} Format`;
    label.htmlFor = id;
    label.style.cssText =
      'display:block;font-size:11px;color:var(--text-secondary);margin-bottom:2px;font-family:var(--font-sans);font-weight:var(--font-medium);';
    group.appendChild(label);

    const select = document.createElement('select');
    select.id = id;
    select.dataset.normField = labelText.toLowerCase();
    select.style.cssText =
      'width:100%;padding:3px 6px;font-size:11px;font-family:var(--font-sans);' +
      'background:var(--bg-base);border:1px solid var(--border-default);' +
      'border-radius:var(--radius-md);color:var(--text-primary);';
    for (const opt of ImportEditor.NORM_OPTIONS) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }
    group.appendChild(select);
    return select;
  }

  private showError(message: string): void {
    this.errorArea.textContent = message;
  }

  private clearStatus(): void {
    this.pendingImport = null;
    this.pendingBundle = null;
    this.nameNormSelect = null;
    this.titleNormSelect = null;
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
          this.pendingImport = {
            tree,
            nodeCount,
            format: 'CSV',
            source: 'mapped CSV',
            nameNormalization: mapping.nameNormalization,
            titleNormalization: mapping.titleNormalization,
          };
          this.showStatus(this.pendingImport);
          this.hideColumnMapper();
        } catch (e: unknown) {
          this.showError(e instanceof Error ? e.message : String(e));
        }
      },
      (mapping: ColumnMapping, presetName: string) => {
        this.mappingStore.savePreset({ name: presetName, mapping });
        this.refreshPresetDropdown();
        this.errorArea.style.color = 'var(--accent)';
        this.errorArea.textContent = `✓ Preset "${presetName}" saved`;
        setTimeout(() => {
          this.errorArea.textContent = '';
          this.errorArea.style.color = '';
        }, 2000);
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
