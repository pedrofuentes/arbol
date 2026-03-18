import { VersionRecord } from '../types';
import { t, getLocale } from '../i18n';
import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';

export type VersionPickerResult =
  | { type: 'version'; version: VersionRecord }
  | { type: 'working' };

export interface VersionPickerOptions {
  versions: VersionRecord[];
  excludeVersionId?: string;
  includeWorkingTree: boolean;
}

export function showVersionPicker(options: VersionPickerOptions): Promise<VersionPickerResult | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let removeTrap: (() => void) | null = null;

    const dismiss = (result: VersionPickerResult | null) => {
      if (resolved) return;
      resolved = true;
      removeTrap?.();
      document.removeEventListener('keydown', escHandler);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      resolve(result);
    };

    const overlay = createOverlay();

    const dialogTitleId = 'version-picker-title';
    const dialog = createDialogPanel({
      ariaLabelledBy: dialogTitleId,
      minWidth: '360px',
      maxWidth: '480px',
    });

    const titleEl = document.createElement('h3');
    titleEl.id = dialogTitleId;
    titleEl.dataset.testid = 'version-picker-title';
    titleEl.textContent = t('version_picker.title');
    titleEl.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(titleEl);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = t('version_picker.search_placeholder');
    searchInput.dataset.testid = 'version-picker-search';
    searchInput.setAttribute('aria-label', t('picker.search_versions_aria'));
    searchInput.style.cssText = `
      width:100%;box-sizing:border-box;
      padding:8px 12px;margin-bottom:12px;
      font-size:14px;font-family:var(--font-sans);
      border:1px solid var(--border-default);
      border-radius:var(--radius-md);
      background:var(--bg-base);
      color:var(--text-primary);
      outline:none;
    `;
    dialog.appendChild(searchInput);

    const listContainer = document.createElement('div');
    listContainer.setAttribute('role', 'listbox');
    listContainer.dataset.testid = 'version-picker-list';
    listContainer.style.cssText = `
      max-height:300px;overflow-y:auto;
      border:1px solid var(--border-subtle);
      border-radius:var(--radius-md);
    `;
    dialog.appendChild(listContainer);

    const availableVersions = options.versions.filter(
      (v) => v.id !== options.excludeVersionId,
    );

    const noMatchesEl = document.createElement('div');
    noMatchesEl.textContent = t('version_picker.no_matches');
    noMatchesEl.style.cssText = `
      padding:16px;text-align:center;
      font-size:14px;font-family:var(--font-sans);
      color:var(--text-tertiary);
    `;

    const createWorkingTreeItem = (): HTMLButtonElement => {
      const item = document.createElement('button');
      item.setAttribute('role', 'option');
      item.dataset.testid = 'version-picker-working-tree';
      item.style.cssText = `
        display:flex;flex-direction:column;align-items:flex-start;
        width:100%;box-sizing:border-box;
        padding:10px 12px;border:none;
        background:transparent;cursor:pointer;
        text-align:start;font-family:var(--font-sans);
        border-bottom:2px solid var(--border-default);
      `;
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--bg-hover)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });

      const nameEl = document.createElement('span');
      nameEl.textContent = t('version_picker.working_tree');
      nameEl.style.cssText = `
        font-size:14px;font-weight:600;
        color:var(--text-primary);
      `;
      item.appendChild(nameEl);

      const descEl = document.createElement('span');
      descEl.textContent = t('version_picker.working_tree_desc');
      descEl.style.cssText = `
        font-size:12px;
        color:var(--text-tertiary);
        margin-top:2px;
      `;
      item.appendChild(descEl);

      item.addEventListener('click', () => dismiss({ type: 'working' }));
      return item;
    };

    const renderList = (query: string) => {
      listContainer.textContent = '';

      if (options.includeWorkingTree) {
        listContainer.appendChild(createWorkingTreeItem());
      }

      const lower = query.toLowerCase();
      const filtered = availableVersions.filter(
        (v) => v.name.toLowerCase().includes(lower),
      );

      if (filtered.length === 0) {
        listContainer.appendChild(noMatchesEl);
        return;
      }

      for (const version of filtered) {
        const item = document.createElement('button');
        item.setAttribute('role', 'option');
        item.dataset.testid = 'version-picker-item';
        item.dataset.versionId = version.id;
        item.style.cssText = `
          display:flex;flex-direction:column;align-items:flex-start;
          width:100%;box-sizing:border-box;
          padding:10px 12px;border:none;
          background:transparent;cursor:pointer;
          text-align:start;font-family:var(--font-sans);
          border-bottom:1px solid var(--border-subtle);
        `;
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--bg-hover)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });

        const nameEl = document.createElement('span');
        nameEl.textContent = version.name;
        nameEl.style.cssText = `
          font-size:14px;font-weight:600;
          color:var(--text-primary);
        `;
        item.appendChild(nameEl);

        const dateEl = document.createElement('span');
        dateEl.textContent = new Date(version.createdAt).toLocaleDateString(getLocale());
        dateEl.style.cssText = `
          font-size:12px;
          color:var(--text-tertiary);
          margin-top:2px;
        `;
        item.appendChild(dateEl);

        item.addEventListener('click', () => dismiss({ type: 'version', version }));
        listContainer.appendChild(item);
      }
    };

    renderList('');

    searchInput.addEventListener('input', () => {
      renderList(searchInput.value);
    });

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.dataset.testid = 'version-picker-cancel';
    cancelBtn.textContent = t('version_picker.cancel');
    cancelBtn.addEventListener('click', () => dismiss(null));
    btnGroup.appendChild(cancelBtn);

    dialog.appendChild(btnGroup);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismiss(null);
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss(null);
      }
    };
    document.addEventListener('keydown', escHandler);

    removeTrap = trapFocus(dialog);

    document.body.appendChild(overlay);
    searchInput.focus();
  });
}
