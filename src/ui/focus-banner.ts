import { createDismissible } from './dismissible';
import { t } from '../i18n';

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

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('data-testid', 'focus-banner');

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
    'animation:focusBannerIn 200ms ease',
    'pointer-events:auto',
    'white-space:nowrap',
  ].join(';');
  banner.setAttribute('style', bannerStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes focusBannerIn {
      from { opacity:0; transform:translateX(-50%) translateY(-8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `;
  banner.appendChild(style);

  const label = document.createElement('span');
  label.setAttribute('data-testid', 'focus-banner-label');
  label.textContent = t('focus.viewing', { name: options.name });
  banner.appendChild(label);

  const separator = document.createElement('span');
  separator.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  banner.appendChild(separator);

  const exitBtn = document.createElement('button');
  exitBtn.setAttribute('data-testid', 'focus-banner-exit');
  exitBtn.textContent = t('focus.show_full');
  exitBtn.style.cssText = [
    'border:none',
    'background:transparent',
    'color:var(--accent)',
    'font-family:var(--font-sans)',
    'font-size:var(--text-sm)',
    'font-weight:600',
    'cursor:pointer',
    'padding:0',
    'transition:color var(--transition-fast, 100ms ease)',
  ].join(';');

  exitBtn.addEventListener('mouseenter', () => {
    exitBtn.style.color = 'var(--accent-hover)';
  });
  exitBtn.addEventListener('mouseleave', () => {
    exitBtn.style.color = 'var(--accent)';
  });
  exitBtn.addEventListener('click', () => {
    options.onExit();
  });
  banner.appendChild(exitBtn);

  dismissible.activate(banner);
  options.container.appendChild(banner);
}
