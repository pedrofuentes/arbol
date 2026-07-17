import { createDismissible } from './dismissible';
import { t } from '../i18n';
import { createIcon } from './icon';
import { createBanner } from './dialog-utils';

export interface FocusBannerOptions {
  name: string;
  container: HTMLElement;
  onExit: () => void;
}

const dismissible = createDismissible();

export function dismissFocusBanner(): void {
  dismissible.dismiss();
}

export function isFocusBannerActive(): boolean {
  return dismissible.isActive();
}

export function showFocusBanner(options: FocusBannerOptions): void {
  dismissible.dismiss();

  const banner = createBanner('focus-banner');
  banner.setAttribute('data-testid', 'focus-banner');

  const label = document.createElement('span');
  label.setAttribute('data-testid', 'focus-banner-label');
  label.appendChild(createIcon('focus'));
  label.appendChild(document.createTextNode(t('focus.viewing', { name: options.name })));
  banner.appendChild(label);

  const separator = document.createElement('span');
  separator.className = 'ui-banner-separator';
  banner.appendChild(separator);

  const exitBtn = document.createElement('button');
  exitBtn.className = 'focus-banner-exit';
  exitBtn.setAttribute('data-testid', 'focus-banner-exit');
  exitBtn.textContent = t('focus.show_full');
  exitBtn.setAttribute('aria-label', t('focus.show_full_aria'));
  exitBtn.addEventListener('click', () => {
    options.onExit();
  });
  banner.appendChild(exitBtn);

  dismissible.activate(banner);
  options.container.appendChild(banner);
}
