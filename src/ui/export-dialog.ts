import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';
import { t, getLocale } from '../i18n';
import type { VersionRecord } from '../types';

export type ExportFormat = 'pptx' | 'svg' | 'png';

export interface ExportDialogOptions {
  chartName: string;
  versions: VersionRecord[];
  onExport: (format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => void;
  onCancel: () => void;
}

export function showExportDialog(options: ExportDialogOptions): { destroy: () => void } {
  const overlay = createOverlay();

  const dialogTitleId = 'export-dialog-title';
  const dialog = createDialogPanel({
    ariaLabelledBy: dialogTitleId,
  });

  const title = document.createElement('h3');
  title.id = dialogTitleId;
  title.textContent = t('export_dialog.title');
  title.style.cssText = `
    margin:0 0 8px;font-size:16px;font-weight:600;
    color:var(--text-primary);font-family:var(--font-sans);
  `;
  dialog.appendChild(title);

  const chartNameEl = document.createElement('p');
  chartNameEl.textContent = options.chartName;
  chartNameEl.style.cssText = `
    margin:0 0 16px;font-size:14px;line-height:1.5;
    color:var(--text-secondary);font-family:var(--font-sans);
  `;
  dialog.appendChild(chartNameEl);

  // --- Format selector ---
  let selectedFormat: ExportFormat = 'pptx';

  const formatGroup = document.createElement('div');
  formatGroup.className = 'export-format-group';

  const formatLabel = document.createElement('label');
  formatLabel.textContent = t('export.format_label');
  formatGroup.appendChild(formatLabel);

  const formatOptions = document.createElement('div');
  formatOptions.className = 'export-format-options';

  const formatChoices: { value: ExportFormat; labelKey: string }[] = [
    { value: 'pptx', labelKey: 'export.format_pptx' },
    { value: 'svg', labelKey: 'export.format_svg' },
    { value: 'png', labelKey: 'export.format_png' },
  ];

  const formatRadios: HTMLInputElement[] = [];
  for (const choice of formatChoices) {
    const radioLabel = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'export-format';
    radio.value = choice.value;
    if (choice.value === 'pptx') radio.checked = true;
    formatRadios.push(radio);
    radioLabel.appendChild(radio);
    radioLabel.appendChild(document.createTextNode(t(choice.labelKey)));
    formatOptions.appendChild(radioLabel);
  }

  formatGroup.appendChild(formatOptions);
  dialog.appendChild(formatGroup);

  // --- Scale selector (PNG only) ---
  const scaleGroup = document.createElement('div');
  scaleGroup.className = 'export-scale-group';
  scaleGroup.style.display = 'none';

  const scaleLabel = document.createElement('label');
  scaleLabel.textContent = t('export.scale_label');
  scaleGroup.appendChild(scaleLabel);

  const scaleSelect = document.createElement('select');
  const scaleChoices: { value: string; labelKey: string; selected?: boolean }[] = [
    { value: '1', labelKey: 'export.scale_1x' },
    { value: '2', labelKey: 'export.scale_2x', selected: true },
    { value: '3', labelKey: 'export.scale_3x' },
  ];
  for (const sc of scaleChoices) {
    const opt = document.createElement('option');
    opt.value = sc.value;
    opt.textContent = t(sc.labelKey);
    if (sc.selected) opt.selected = true;
    scaleSelect.appendChild(opt);
  }
  scaleGroup.appendChild(scaleSelect);
  dialog.appendChild(scaleGroup);

  // --- Version selection (PPTX only) ---
  const versionSection = document.createElement('div');
  versionSection.className = 'export-version-section';

  const checkboxes: HTMLInputElement[] = [];

  if (options.versions.length > 0) {
    const toggleLink = document.createElement('a');
    toggleLink.href = '#';
    toggleLink.textContent = t('export_dialog.select_all');
    toggleLink.style.cssText = `
      display:inline-block;margin-bottom:8px;font-size:12px;
      color:var(--accent);cursor:pointer;font-family:var(--font-sans);
      text-decoration:none;
    `;
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      const allChecked = checkboxes.every((cb) => cb.checked);
      checkboxes.forEach((cb) => {
        cb.checked = !allChecked;
      });
      toggleLink.textContent = allChecked ? t('export_dialog.select_all') : t('export_dialog.deselect_all');
    });
    versionSection.appendChild(toggleLink);

    const hintParagraph = document.createElement('p');
    hintParagraph.textContent = t('export_dialog.versions_hint');
    hintParagraph.style.cssText = `
      margin:0 0 8px;font-size:13px;
      color:var(--text-secondary);font-family:var(--font-sans);
    `;
    versionSection.appendChild(hintParagraph);

    const list = document.createElement('div');
    list.setAttribute('role', 'list');
    list.style.cssText = `
      max-height:240px;overflow-y:auto;margin-bottom:16px;
      border:1px solid var(--border-default);border-radius:6px;
    `;

    options.versions.forEach((version, index) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      const borderTop = index > 0 ? 'border-top:1px solid var(--border-default);' : '';
      item.style.cssText = `
        display:flex;align-items:flex-start;gap:8px;padding:8px 12px;
        font-family:var(--font-sans);${borderTop}
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.id = `export-version-${version.id}`;
      checkbox.value = version.id;
      checkbox.style.marginTop = '2px';
      checkboxes.push(checkbox);

      const labelWrap = document.createElement('label');
      labelWrap.htmlFor = checkbox.id;
      labelWrap.style.cssText = `
        display:flex;flex-direction:column;cursor:pointer;flex:1;
      `;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = version.name;
      nameSpan.style.cssText = `
        font-size:13px;color:var(--text-primary);
      `;

      const dateSpan = document.createElement('span');
      dateSpan.textContent = new Date(version.createdAt).toLocaleString(getLocale());
      dateSpan.style.cssText = `
        font-size:11px;color:var(--text-tertiary);
      `;

      labelWrap.appendChild(nameSpan);
      labelWrap.appendChild(dateSpan);
      item.appendChild(checkbox);
      item.appendChild(labelWrap);
      list.appendChild(item);
    });

    versionSection.appendChild(list);
  } else {
    const noVersions = document.createElement('p');
    noVersions.textContent = t('export_dialog.no_versions');
    noVersions.style.cssText = `
      margin:0 0 16px;font-size:13px;
      color:var(--text-tertiary);font-family:var(--font-sans);
      font-style:italic;
    `;
    versionSection.appendChild(noVersions);
  }

  dialog.appendChild(versionSection);

  // --- Visibility toggling on format change ---
  const updateVisibility = () => {
    versionSection.style.display = selectedFormat === 'pptx' ? '' : 'none';
    scaleGroup.style.display = selectedFormat === 'png' ? '' : 'none';
  };

  for (const radio of formatRadios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        selectedFormat = radio.value as ExportFormat;
        updateVisibility();
      }
    });
  }
  updateVisibility();

  // --- Action buttons ---
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = t('export_dialog.cancel');
  btnGroup.appendChild(cancelBtn);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-primary';
  exportBtn.textContent = t('export_dialog.export');
  btnGroup.appendChild(exportBtn);

  dialog.appendChild(btnGroup);
  overlay.appendChild(dialog);

  const removeTrap = trapFocus(dialog);

  const cleanup = () => {
    removeTrap();
    document.removeEventListener('keydown', escHandler);
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  cancelBtn.addEventListener('click', () => {
    cleanup();
    options.onCancel();
  });

  exportBtn.addEventListener('click', () => {
    const selectedIds = checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
    const pngScale = selectedFormat === 'png' ? Number(scaleSelect.value) : undefined;
    cleanup();
    options.onExport(selectedFormat, selectedIds, pngScale);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      options.onCancel();
    }
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      options.onCancel();
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  exportBtn.focus();

  return {
    destroy: cleanup,
  };
}
