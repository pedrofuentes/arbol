import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';

export type RestoreStrategy = 'replace' | 'merge' | 'cancel';

export interface RestoreDialogOptions {
  chartCount: number;
  versionCount: number;
  backupDate: string;
  appVersion: string;
}

export function showRestoreStrategyDialog(
  options: RestoreDialogOptions,
): Promise<RestoreStrategy> {
  return new Promise((resolve) => {
    const overlay = createOverlay();

    const titleId = 'restore-dialog-title';
    const dialog = createDialogPanel({
      role: 'dialog',
      ariaLabelledBy: titleId,
    });

    const title = document.createElement('h3');
    title.id = titleId;
    title.textContent = 'Restore from Backup';
    title.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(title);

    // Summary
    const summary = document.createElement('div');
    summary.style.cssText = `
      margin:0 0 16px;padding:12px;font-size:13px;line-height:1.5;
      color:var(--text-secondary);font-family:var(--font-sans);
      background:var(--bg-subtle);border-radius:var(--radius-md);
    `;
    summary.textContent =
      `${options.chartCount} chart(s), ${options.versionCount} version(s) · ` +
      `Created ${options.backupDate} · v${options.appVersion}`;
    dialog.appendChild(summary);

    // Strategy description
    const desc = document.createElement('p');
    desc.textContent = 'How would you like to restore?';
    desc.style.cssText = `
      margin:0 0 16px;font-size:14px;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(desc);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const replaceBtn = document.createElement('button');
    replaceBtn.className = 'btn btn-danger';
    replaceBtn.textContent = '🔄 Replace All — wipe current data and restore from backup';
    replaceBtn.style.cssText += ';text-align:left;padding:10px 14px;font-size:13px;';
    btnGroup.appendChild(replaceBtn);

    const mergeBtn = document.createElement('button');
    mergeBtn.className = 'btn btn-primary';
    mergeBtn.textContent = '➕ Merge — add new charts, keep existing ones';
    mergeBtn.style.cssText += ';text-align:left;padding:10px 14px;font-size:13px;';
    btnGroup.appendChild(mergeBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText += ';margin-top:4px;';
    btnGroup.appendChild(cancelBtn);

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

    replaceBtn.addEventListener('click', () => {
      cleanup();
      resolve('replace');
    });

    mergeBtn.addEventListener('click', () => {
      cleanup();
      resolve('merge');
    });

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve('cancel');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve('cancel');
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve('cancel');
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    mergeBtn.focus();
  });
}
