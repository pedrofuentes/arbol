import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';
import { t } from '../i18n';

export interface InputDialogOptions {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
}

export function showInputDialog(options: InputDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = createOverlay();

    const dialogTitleId = 'input-dialog-title';
    const dialog = createDialogPanel({
      role: 'dialog',
      ariaLabelledBy: dialogTitleId,
    });

    const title = document.createElement('h3');
    title.id = dialogTitleId;
    title.textContent = options.title;
    title.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(title);

    const label = document.createElement('label');
    label.textContent = options.label;
    label.style.cssText = `
      display:block;font-size:13px;font-weight:500;
      color:var(--text-secondary);font-family:var(--font-sans);
      margin-bottom:var(--space-1, 4px);
    `;
    dialog.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.initialValue) input.value = options.initialValue;
    if (options.maxLength) input.maxLength = options.maxLength;
    input.style.cssText = `
      width:100%;box-sizing:border-box;
      padding:var(--space-2, 8px) var(--space-3, 12px);
      background:var(--bg-base);
      border:1px solid var(--border-default);
      border-radius:var(--radius-md, 6px);
      color:var(--text-primary);
      font-family:var(--font-sans);
      font-size:14px;
      outline:none;
      margin-bottom:16px;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--accent)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--border-default)';
    });
    dialog.appendChild(input);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = options.cancelLabel ?? t('dialog.cancel');
    btnGroup.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = options.confirmLabel ?? t('dialog.ok');
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
      if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(input.value);
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve(input.value);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    input.focus();
    if (options.initialValue) {
      input.select();
    }
  });
}
