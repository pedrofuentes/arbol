import type { ColumnMapping, MappingPreset, OrgNode, TextNormalization } from '../types';
import { t } from '../i18n';
import { showToast } from './toast';
import { extractHeaders, parseCsvToTree } from '../utils/csv-parser';
import { normalizeText } from '../utils/text-normalize';
import { flattenTree } from '../utils/tree';
import { ColumnMapper } from './column-mapper';
import { renderImportInstructions } from './import-instructions';

export interface WizardState {
  rawText?: string;
  fileName?: string;
  format?: 'JSON' | 'CSV';
  headers?: string[];
  mapping?: ColumnMapping;
  matchedPresetName?: string;
  tree?: OrgNode;
  nodeCount?: number;
  warning?: string;
  nameNormalization?: TextNormalization;
  titleNormalization?: TextNormalization;
  destination?: 'new' | 'replace';
  chartName?: string;
}

// ─── Step 1: Source ──────────────────────────────────────────────────

export function renderSourceStep(
  container: HTMLElement,
  state: WizardState,
  onReady: (ready: boolean) => void,
): void {
  container.textContent = '';

  const title = document.createElement('h2');
  title.className = 'wizard-step-title';
  title.textContent = t('import_wizard.source_title');
  container.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'wizard-step-desc';
  desc.textContent = t('import_wizard.source_desc');
  container.appendChild(desc);

  // Company-specific import instructions (from arbol.config.json)
  const instructions = renderImportInstructions();
  if (instructions) {
    container.appendChild(instructions);
  }

  // Drop zone
  const dropzone = document.createElement('div');
  dropzone.className = 'wizard-dropzone';
  dropzone.setAttribute('role', 'button');
  dropzone.setAttribute('tabindex', '0');
  dropzone.setAttribute('aria-label', t('import_wizard.file_aria'));

  const icon = document.createElement('div');
  icon.className = 'wizard-dropzone-icon';
  icon.textContent = '📁';
  dropzone.appendChild(icon);

  const dropText = document.createElement('div');
  dropText.className = 'wizard-dropzone-text';
  dropText.textContent = state.fileName ? `✓ ${state.fileName}` : t('import_wizard.drop_text');
  dropzone.appendChild(dropText);

  const hint = document.createElement('div');
  hint.className = 'wizard-dropzone-hint';
  hint.textContent = t('import_wizard.drop_hint');
  dropzone.appendChild(hint);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,.json,.xlsx,.xls';
  fileInput.style.display = 'none';
  fileInput.setAttribute('aria-label', t('import_wizard.file_aria'));
  dropzone.appendChild(fileInput);

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) readFile(file);
  });

  function readFile(file: File): void {
    state.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      state.rawText = reader.result as string;
      dropText.textContent = `✓ ${file.name}`;
      textarea.value = '';
      onReady(true);
    };
    reader.onerror = () => {
      showToast(t('error.file_read_failed'), 'error');
    };
    reader.readAsText(file);
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) readFile(file);
  });

  container.appendChild(dropzone);

  // Paste section
  const pasteLabel = document.createElement('label');
  pasteLabel.className = 'wizard-paste-label';
  pasteLabel.textContent = t('import_wizard.paste_label');
  container.appendChild(pasteLabel);

  const textarea = document.createElement('textarea');
  textarea.className = 'wizard-paste-area';
  textarea.rows = 6;
  textarea.placeholder = t('import_wizard.paste_placeholder');
  textarea.setAttribute('aria-label', t('import_wizard.paste_aria'));

  if (state.rawText && !state.fileName) {
    textarea.value = state.rawText;
  }

  textarea.addEventListener('input', () => {
    const val = textarea.value.trim();
    if (val) {
      state.rawText = textarea.value;
      state.fileName = undefined;
      dropText.textContent = t('import_wizard.drop_text');
      onReady(true);
    } else {
      state.rawText = undefined;
      onReady(false);
    }
  });

  container.appendChild(textarea);

  onReady(!!state.rawText);
}

// ─── Step 2: Mapping ─────────────────────────────────────────────────

export function renderMappingStep(
  container: HTMLElement,
  state: WizardState,
  onReady: (ready: boolean) => void,
  presets?: MappingPreset[],
): void {
  container.textContent = '';

  const trimmed = (state.rawText ?? '').trim();
  const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  state.format = isJson ? 'JSON' : 'CSV';

  if (isJson) {
    const msg = document.createElement('p');
    msg.className = 'wizard-success';
    msg.textContent = t('import_wizard.mapping_json');
    container.appendChild(msg);
    onReady(true);
  } else {
    state.headers = extractHeaders(state.rawText!);

    // Auto-match saved presets against CSV headers
    const matchedPreset = findMatchingPreset(state.headers, presets ?? []);
    if (matchedPreset) {
      state.mapping = matchedPreset.mapping;
      state.matchedPresetName = matchedPreset.name;
      const msg = document.createElement('p');
      msg.className = 'wizard-success';
      msg.textContent = t('import_wizard.preset_matched', { name: matchedPreset.name });
      container.appendChild(msg);
    }

    const desc = document.createElement('p');
    desc.className = 'wizard-info';
    desc.textContent = matchedPreset
      ? t('import_wizard.mapping_verify')
      : t('import_wizard.mapping_csv');
    container.appendChild(desc);

    const mapperContainer = document.createElement('div');
    mapperContainer.className = 'wizard-mapper-wrap';
    container.appendChild(mapperContainer);

    let userChanged = false;

    const mapper = new ColumnMapper(
      mapperContainer,
      state.headers,
      (mapping) => {
        state.mapping = mapping;
        if (userChanged) state.matchedPresetName = undefined;
        onReady(true);
      },
      () => {},
      () => {},
    );

    // Pre-fill dropdowns if preset matched
    if (matchedPreset) {
      mapper.prefill(matchedPreset.mapping);
      mapper.handleApply();
    }

    // After prefill, any further changes are user-initiated
    userChanged = true;

    // Auto-validate on dropdown/radio change
    mapperContainer.querySelectorAll('select').forEach((sel) => {
      sel.addEventListener('change', () => mapper.handleApply());
    });
    mapperContainer.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => mapper.handleApply());
    });

    onReady(!!matchedPreset);
  }
}

function findMatchingPreset(
  headers: string[],
  presets: MappingPreset[],
): MappingPreset | undefined {
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));
  for (const preset of presets) {
    const m = preset.mapping;
    const cols = [m.name, m.title, m.parentRef];
    if (m.id) cols.push(m.id);
    if (cols.every((col) => headerSet.has(col.toLowerCase()))) {
      return preset;
    }
  }
  return undefined;
}

// ─── Step 3: Preview ─────────────────────────────────────────────────

function countNodes(node: OrgNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

export function renderPreviewStep(
  container: HTMLElement,
  state: WizardState,
  onReady: (ready: boolean) => void,
): void {
  container.textContent = '';

  try {
    if (state.format === 'JSON') {
      const parsed = JSON.parse(state.rawText!);
      if (!parsed.id || !parsed.name || !parsed.title) {
        throw new Error('Root node must have id, name, and title fields');
      }
      state.tree = parsed as OrgNode;
      state.nodeCount = countNodes(parsed);
    } else {
      const result = parseCsvToTree(state.rawText!, state.mapping);
      state.tree = result.tree;
      state.nodeCount = result.nodeCount;
    }

    const success = document.createElement('p');
    success.className = 'wizard-success';
    success.textContent = t('import_wizard.preview_success', {
      count: String(state.nodeCount),
      format: state.format!,
    });
    container.appendChild(success);

    // Sample table showing first 5 people
    const sampleNodes = flattenTree(state.tree!).slice(0, 5);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'wizard-sample-table-wrap';

    const table = document.createElement('table');
    table.className = 'wizard-sample-table';
    table.setAttribute('aria-label', t('import_wizard.preview_sample_aria'));

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const col of [t('import_wizard.preview_col_name'), t('import_wizard.preview_col_title')]) {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.setAttribute('data-testid', 'preview-tbody');

    const renderRows = () => {
      tbody.textContent = '';
      const nameMode = state.nameNormalization ?? 'none';
      const titleMode = state.titleNormalization ?? 'none';
      for (const node of sampleNodes) {
        const tr = document.createElement('tr');
        const nameTd = document.createElement('td');
        const titleTd = document.createElement('td');
        const normalizedName = normalizeText(node.name, nameMode);
        const normalizedTitle = normalizeText(node.title, titleMode);
        nameTd.textContent = normalizedName;
        titleTd.textContent = normalizedTitle;
        // Show original vs normalized if different
        if (nameMode !== 'none' && normalizedName !== node.name) {
          nameTd.textContent = '';
          const original = document.createElement('span');
          original.className = 'wizard-sample-original';
          original.textContent = node.name;
          const arrow = document.createTextNode(' → ');
          const normalized = document.createElement('span');
          normalized.className = 'wizard-sample-normalized';
          normalized.textContent = normalizedName;
          nameTd.appendChild(original);
          nameTd.appendChild(arrow);
          nameTd.appendChild(normalized);
        }
        if (titleMode !== 'none' && normalizedTitle !== node.title) {
          titleTd.textContent = '';
          const original = document.createElement('span');
          original.className = 'wizard-sample-original';
          original.textContent = node.title;
          const arrow = document.createTextNode(' → ');
          const normalized = document.createElement('span');
          normalized.className = 'wizard-sample-normalized';
          normalized.textContent = normalizedTitle;
          titleTd.appendChild(original);
          titleTd.appendChild(arrow);
          titleTd.appendChild(normalized);
        }
        tr.appendChild(nameTd);
        tr.appendChild(titleTd);
        tbody.appendChild(tr);
      }
    };

    renderRows();
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    if (sampleNodes.length < state.nodeCount!) {
      const more = document.createElement('p');
      more.className = 'wizard-sample-more';
      more.textContent = t('import_wizard.preview_more', {
        count: String(state.nodeCount! - sampleNodes.length),
      });
      tableWrap.appendChild(more);
    }

    container.appendChild(tableWrap);

    // Normalization dropdowns — re-render sample on change
    renderNormDropdown(container, 'name', t('import_wizard.norm_label_name'), state, renderRows);
    renderNormDropdown(container, 'title', t('import_wizard.norm_label_title'), state, renderRows);

    onReady(true);
  } catch (e) {
    const errorMsg = document.createElement('p');
    errorMsg.className = 'wizard-error';
    errorMsg.textContent = t('import_wizard.preview_error', {
      message: e instanceof Error ? e.message : String(e),
    });
    container.appendChild(errorMsg);
    onReady(false);
  }
}

function renderNormDropdown(
  container: HTMLElement,
  field: 'name' | 'title',
  label: string,
  state: WizardState,
  onChangeCallback?: () => void,
): void {
  const div = document.createElement('div');
  div.className = 'wizard-field';

  const lbl = document.createElement('label');
  lbl.textContent = label;
  div.appendChild(lbl);

  const select = document.createElement('select');
  const options: { value: TextNormalization; label: string }[] = [
    { value: 'none', label: t('import_wizard.norm_none') },
    { value: 'titleCase', label: t('import_wizard.norm_titleCase') },
    { value: 'uppercase', label: t('import_wizard.norm_uppercase') },
    { value: 'lowercase', label: t('import_wizard.norm_lowercase') },
  ];

  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  }

  const stateKey = field === 'name' ? 'nameNormalization' : 'titleNormalization';
  if (state[stateKey]) {
    select.value = state[stateKey]!;
  }

  select.addEventListener('change', () => {
    state[stateKey] = select.value as TextNormalization;
    if (onChangeCallback) onChangeCallback();
  });

  div.appendChild(select);
  container.appendChild(div);
}

// ─── Step 4: Import ──────────────────────────────────────────────────

export function renderImportStep(
  container: HTMLElement,
  state: WizardState,
  onReady: (ready: boolean) => void,
): void {
  container.textContent = '';

  const summary = document.createElement('p');
  summary.className = 'wizard-info';
  summary.textContent = t('import_wizard.import_summary', {
    count: String(state.nodeCount ?? 0),
    format: state.format ?? 'unknown',
  });
  container.appendChild(summary);

  const group = document.createElement('div');
  group.className = 'wizard-radio-group';
  group.setAttribute('role', 'radiogroup');

  if (!state.destination) state.destination = 'replace';

  const replaceRadio = createRadioOption(
    'replace',
    t('import_wizard.dest_replace'),
    state.destination === 'replace',
  );
  const newRadio = createRadioOption(
    'new',
    t('import_wizard.dest_new'),
    state.destination === 'new',
  );

  group.appendChild(replaceRadio.element);
  group.appendChild(newRadio.element);
  container.appendChild(group);

  const nameField = document.createElement('div');
  nameField.className = 'wizard-field';
  nameField.style.display = state.destination === 'new' ? '' : 'none';

  const nameLabel = document.createElement('label');
  nameLabel.textContent = t('import_wizard.dest_name_label');
  nameField.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = t('import_wizard.dest_name_placeholder');
  nameInput.value = state.chartName ?? '';
  nameInput.addEventListener('input', () => {
    state.chartName = nameInput.value;
  });
  nameField.appendChild(nameInput);
  container.appendChild(nameField);

  function selectOption(value: 'new' | 'replace'): void {
    state.destination = value;
    replaceRadio.element.classList.toggle('selected', value === 'replace');
    newRadio.element.classList.toggle('selected', value === 'new');
    replaceRadio.input.checked = value === 'replace';
    newRadio.input.checked = value === 'new';
    nameField.style.display = value === 'new' ? '' : 'none';
  }

  replaceRadio.element.addEventListener('click', () => selectOption('replace'));
  newRadio.element.addEventListener('click', () => selectOption('new'));

  onReady(true);
}

function createRadioOption(
  value: string,
  label: string,
  checked: boolean,
): { element: HTMLElement; input: HTMLInputElement } {
  const div = document.createElement('div');
  div.className = 'wizard-radio' + (checked ? ' selected' : '');

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'wizard-destination';
  input.value = value;
  input.checked = checked;
  div.appendChild(input);

  const span = document.createElement('span');
  span.textContent = label;
  div.appendChild(span);

  return { element: div, input };
}
