import { createDismissible } from './dismissible';
import { t } from '../i18n';
import { createBanner } from './dialog-utils';

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

  const banner = createBanner('offline-banner', { interactive: false });
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('data-testid', 'offline-banner');

  const label = document.createElement('span');
  label.setAttribute('data-testid', 'offline-banner-text');
  label.textContent = t('offline.banner_message');
  banner.appendChild(label);

  dismissible.activate(banner);
  container.appendChild(banner);
}
