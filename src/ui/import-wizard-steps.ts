import type { ColumnMapping, OrgNode, TextNormalization } from '../types';
import { t } from '../i18n';
import { extractHeaders, parseCsvToTree } from '../utils/csv-parser';
import { ColumnMapper } from './column-mapper';

export interface WizardState {
  rawText?: string;
  fileName?: string;
  format?: 'JSON' | 'CSV';
  headers?: string[];
  mapping?: ColumnMapping;
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
  dropText.textContent = state.fileName
    ? `✓ ${state.fileName}`
    : t('import_wizard.drop_text');
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
    const desc = document.createElement('p');
    desc.className = 'wizard-info';
    desc.textContent = t('import_wizard.mapping_csv');
    container.appendChild(desc);

    state.headers = extractHeaders(state.rawText!);

    const mapperContainer = document.createElement('div');
    mapperContainer.className = 'wizard-mapper-wrap';
    container.appendChild(mapperContainer);

    new ColumnMapper(
      mapperContainer,
      state.headers,
      (mapping) => { state.mapping = mapping; onReady(true); },
      () => {},
      () => {},
    );

    // Auto-trigger apply when any dropdown changes (so Next button works without clicking Apply)
    mapperContainer.querySelectorAll('select').forEach((sel) => {
      sel.addEventListener('change', () => {
        const applyBtn = mapperContainer.querySelector('.btn-primary') as HTMLButtonElement | null;
        if (applyBtn) applyBtn.click();
      });
    });
    // Also auto-trigger on radio button change
    mapperContainer.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const applyBtn = mapperContainer.querySelector('.btn-primary') as HTMLButtonElement | null;
        if (applyBtn) applyBtn.click();
      });
    });

    onReady(false);
  }
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

    renderNormDropdown(container, 'name', t('import_wizard.norm_label_name'), state);
    renderNormDropdown(container, 'title', t('import_wizard.norm_label_title'), state);

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
