import { createDismissible } from './dismissible';
import { t } from '../i18n';

const dismissible = createDismissible();

let handleOnline: (() => void) | null = null;
let handleOffline: (() => void) | null = null;

export function isOfflineBannerActive(): boolean {
  return dismissible.isActive();
}

export function teardownOfflineBanner(): void {
  if (handleOnline) window.removeEventListener('online', handleOnline);
  if (handleOffline) window.removeEventListener('offline', handleOffline);
  handleOnline = null;
  handleOffline = null;
  dismissible.dismiss();
}

export function initOfflineBanner(container: HTMLElement): void {
  teardownOfflineBanner();

  handleOffline = () => showOfflineBanner(container);
  handleOnline = () => dismissible.dismiss();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (!navigator.onLine) showOfflineBanner(container);
}

function showOfflineBanner(container: HTMLElement): void {
  if (dismissible.isActive()) return;

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('data-testid', 'offline-banner');

  const bannerStyles = [
    'position:absolute',
    'top:var(--space-3)',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:100',
    'display:flex',
    'align-items:center',
    'gap:var(--space-3)',
    'padding:var(--space-2) var(--space-4)',
    'background:var(--bg-elevated)',
    'border:1px solid var(--accent)',
    'border-radius:var(--radius-lg)',
    'box-shadow:var(--shadow-md)',
    'font-family:var(--font-sans)',
    'font-size:var(--text-sm)',
    'color:var(--text-primary)',
    'animation:offlineBannerIn 200ms ease',
    'pointer-events:none',
    'white-space:nowrap',
  ].join(';');
  banner.setAttribute('style', bannerStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes offlineBannerIn {
      from { opacity:0; transform:translateX(-50%) translateY(-8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `;
  banner.appendChild(style);

  const label = document.createElement('span');
  label.setAttribute('data-testid', 'offline-banner-text');
  label.textContent = t('offline.banner_message');
  banner.appendChild(label);

  dismissible.activate(banner);
  container.appendChild(banner);
}
