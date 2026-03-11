export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);z-index:1000;
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(2px);
      animation:fadeIn 150ms ease;
    `;

    const dialogTitleId = 'confirm-dialog-title';
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', dialogTitleId);
    dialog.style.cssText = `
      background:var(--bg-elevated);
      border:1px solid var(--border-default);
      border-radius:var(--radius-xl);
      padding:24px;
      min-width:320px;
      max-width:420px;
      box-shadow:var(--shadow-lg);
      animation:slideUp 200ms ease;
    `;

    const title = document.createElement('h3');
    title.id = dialogTitleId;
    title.textContent = options.title;
    title.style.cssText = `
      margin:0 0 8px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(title);

    const message = document.createElement('p');
    message.textContent = options.message;
    message.style.cssText = `
      margin:0 0 20px;font-size:14px;line-height:1.5;
      color:var(--text-secondary);font-family:var(--font-sans);
    `;
    dialog.appendChild(message);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = options.cancelLabel ?? 'Cancel';
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });
    btnGroup.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = options.danger ? 'btn btn-danger' : 'btn btn-primary';
    confirmBtn.textContent = options.confirmLabel ?? 'Confirm';
    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });
    btnGroup.appendChild(confirmBtn);

    dialog.appendChild(btnGroup);
    overlay.appendChild(dialog);

    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    });

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
          resolve(false);
        }
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}
