import { t } from '../i18n';

let overlay: HTMLDivElement | null = null;

export function showLoading(message?: string): void {
  hideLoading();
  overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  overlay.appendChild(spinner);

  if (message) {
    const text = document.createElement('p');
    text.className = 'loading-text';
    text.textContent = message;
    overlay.appendChild(text);
  }

  document.body.appendChild(overlay);
}

export function hideLoading(): void {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}
