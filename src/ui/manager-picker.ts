export interface ManagerPickerItem {
  id: string;
  name: string;
  title: string;
}

export interface ManagerPickerOptions {
  title: string;
  managers: ManagerPickerItem[];
  excludeIds?: Set<string>;
}

export function showManagerPicker(options: ManagerPickerOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;

    const dismiss = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener('keydown', escHandler);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      resolve(result);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);z-index:1000;
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(2px);
      animation:fadeIn 150ms ease;
    `;

    const dialogTitleId = 'manager-picker-title';
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', dialogTitleId);
    dialog.style.cssText = `
      background:var(--bg-elevated);
      border:1px solid var(--border-default);
      border-radius:var(--radius-xl);
      padding:24px;
      min-width:360px;
      max-width:480px;
      box-shadow:var(--shadow-lg);
      animation:slideUp 200ms ease;
    `;

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
        item.setAttribute('role', 'option');
        item.style.cssText = `
          display:flex;flex-direction:column;align-items:flex-start;
          width:100%;box-sizing:border-box;
          padding:10px 12px;border:none;
          background:transparent;cursor:pointer;
          text-align:left;font-family:var(--font-sans);
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

        item.addEventListener('click', () => dismiss(manager.id));
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
    cancelBtn.textContent = 'Cancel';
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

    document.body.appendChild(overlay);
    searchInput.focus();
  });
}
