import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = createOverlay();

    const dialogTitleId = 'confirm-dialog-title';
    const dialog = createDialogPanel({
      role: 'alertdialog',
      ariaLabelledBy: dialogTitleId,
    });

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
    btnGroup.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = options.danger ? 'btn btn-danger' : 'btn btn-primary';
    confirmBtn.textContent = options.confirmLabel ?? 'Confirm';
    btnGroup.appendChild(confirmBtn);

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
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}
