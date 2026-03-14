import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';

export interface ManagerPickerItem {
  id: string;
  name: string;
  title: string;
}

export interface ManagerPickerResult {
  managerId: string;
  dottedLine: boolean;
}

export interface ManagerPickerOptions {
  title: string;
  managers: ManagerPickerItem[];
  excludeIds?: Set<string>;
  showDottedLineOption?: boolean;
}

export function showManagerPicker(options: ManagerPickerOptions): Promise<ManagerPickerResult | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let removeTrap: (() => void) | null = null;
    let dottedLineChecked = false;

    const dismiss = (result: ManagerPickerResult | null) => {
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

    const dialogTitleId = 'manager-picker-title';
    const dialog = createDialogPanel({
      ariaLabelledBy: dialogTitleId,
      minWidth: '360px',
      maxWidth: '480px',
    });

    const titleEl = document.createElement('h3');
    titleEl.id = dialogTitleId;
    titleEl.textContent = options.title;
    titleEl.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(titleEl);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search managers…';
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
    listContainer.style.cssText = `
      max-height:300px;overflow-y:auto;
      border:1px solid var(--border-subtle);
      border-radius:var(--radius-md);
    `;
    dialog.appendChild(listContainer);

    const excludeIds = options.excludeIds ?? new Set<string>();
    const availableManagers = options.managers.filter((m) => !excludeIds.has(m.id));

    const noMatchesEl = document.createElement('div');
    noMatchesEl.textContent = 'No matches';
    noMatchesEl.style.cssText = `
      padding:16px;text-align:center;
      font-size:14px;font-family:var(--font-sans);
      color:var(--text-tertiary);
    `;

    let highlightIndex = -1;
    searchInput.setAttribute('aria-activedescendant', '');

    const getVisibleOptions = (): HTMLButtonElement[] =>
      Array.from(listContainer.querySelectorAll<HTMLButtonElement>('[role="option"]'));

    const updateHighlight = (newIndex: number) => {
      const items = getVisibleOptions();
      for (const item of items) {
        item.setAttribute('aria-selected', 'false');
        item.style.background = 'transparent';
      }
      highlightIndex = newIndex;
      if (newIndex >= 0 && newIndex < items.length) {
        items[newIndex].setAttribute('aria-selected', 'true');
        items[newIndex].style.background = 'var(--bg-hover)';
        searchInput.setAttribute('aria-activedescendant', items[newIndex].id);
        items[newIndex].scrollIntoView?.({ block: 'nearest' });
      } else {
        searchInput.setAttribute('aria-activedescendant', '');
      }
    };

    const renderList = (query: string) => {
      listContainer.textContent = '';
      const lower = query.toLowerCase();
      const filtered = availableManagers.filter(
        (m) => m.name.toLowerCase().includes(lower) || m.title.toLowerCase().includes(lower),
      );

      if (filtered.length === 0) {
        listContainer.appendChild(noMatchesEl);
        return;
      }

      for (const manager of filtered) {
        const item = document.createElement('button');
        item.id = 'manager-option-' + manager.id;
        item.setAttribute('role', 'option');
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
        nameEl.textContent = manager.name;
        nameEl.style.cssText = `
          font-size:14px;font-weight:600;
          color:var(--text-primary);
        `;
        item.appendChild(nameEl);

        const titleTextEl = document.createElement('span');
        titleTextEl.textContent = manager.title;
        titleTextEl.style.cssText = `
          font-size:12px;
          color:var(--text-secondary);
          margin-top:2px;
        `;
        item.appendChild(titleTextEl);

        item.addEventListener('click', () => dismiss({ managerId: manager.id, dottedLine: dottedLineChecked }));
        listContainer.appendChild(item);
      }

      highlightIndex = -1;
      searchInput.setAttribute('aria-activedescendant', '');
    };

    renderList('');

    searchInput.addEventListener('input', () => {
      renderList(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      const items = getVisibleOptions();
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = highlightIndex < items.length - 1 ? highlightIndex + 1 : 0;
        updateHighlight(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = highlightIndex > 0 ? highlightIndex - 1 : items.length - 1;
        updateHighlight(next);
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0 && highlightIndex < items.length) {
          e.preventDefault();
          items[highlightIndex].click();
        }
      }
    });

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dismiss(null));
    btnGroup.appendChild(cancelBtn);

    if (options.showDottedLineOption) {
      const checkboxGroup = document.createElement('label');
      checkboxGroup.style.cssText = `
        display:flex;align-items:center;gap:8px;
        margin-top:12px;cursor:pointer;
        font-size:14px;font-family:var(--font-sans);
        color:var(--text-primary);
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'dotted-line-checkbox';
      checkbox.addEventListener('change', () => {
        dottedLineChecked = checkbox.checked;
      });
      checkboxGroup.appendChild(checkbox);

      const labelText = document.createElement('span');
      labelText.textContent = 'Dotted line (reports elsewhere)';
      checkboxGroup.appendChild(labelText);

      dialog.appendChild(checkboxGroup);
    }

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
