import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';
import { t, getLocale } from '../i18n';
import type { VersionRecord } from '../types';

export interface ExportDialogOptions {
  chartName: string;
  versions: VersionRecord[];
  onExport: (selectedVersionIds: string[]) => void;
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

  const checkboxes: HTMLInputElement[] = [];

  if (options.versions.length > 0) {
    const toggleLink = document.createElement('a');
    toggleLink.href = '#';
    toggleLink.textContent = t('export_dialog.deselect_all');
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
    dialog.appendChild(toggleLink);

    const hintParagraph = document.createElement('p');
    hintParagraph.textContent = t('export_dialog.versions_hint');
    hintParagraph.style.cssText = `
      margin:0 0 8px;font-size:13px;
      color:var(--text-secondary);font-family:var(--font-sans);
    `;
    dialog.appendChild(hintParagraph);

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
      checkbox.checked = true;
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

    dialog.appendChild(list);
  } else {
    const noVersions = document.createElement('p');
    noVersions.textContent = t('export_dialog.no_versions');
    noVersions.style.cssText = `
      margin:0 0 16px;font-size:13px;
      color:var(--text-tertiary);font-family:var(--font-sans);
      font-style:italic;
    `;
    dialog.appendChild(noVersions);
  }

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
    cleanup();
    options.onExport(selectedIds);
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
