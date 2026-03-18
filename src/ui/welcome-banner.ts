import { t } from '../i18n';

const STORAGE_KEY = 'arbol-welcome-seen';

export function showWelcomeBanner(container: HTMLElement): void {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const banner = document.createElement('div');
  banner.className = 'welcome-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', t('welcome.aria'));
  banner.setAttribute('data-testid', 'welcome-banner');

  const bannerStyles = [
    'position:absolute',
    'top:var(--space-3)',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:90',
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
    'animation:welcomeBannerIn 300ms ease',
    'pointer-events:auto',
    'max-width:90%',
  ].join(';');
  banner.setAttribute('style', bannerStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes welcomeBannerIn {
      from { opacity:0; transform:translateX(-50%) translateY(-8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `;
  banner.appendChild(style);

  const text = document.createElement('span');
  text.setAttribute('data-testid', 'welcome-banner-text');
  text.textContent = t('welcome.message');
  banner.appendChild(text);

  const separator = document.createElement('span');
  separator.style.cssText = 'width:1px;height:14px;background:var(--border-default);flex-shrink:0;';
  banner.appendChild(separator);

  const dismiss = document.createElement('button');
  dismiss.setAttribute('data-testid', 'welcome-banner-dismiss');
  dismiss.setAttribute('aria-label', t('welcome.dismiss'));
  dismiss.textContent = t('welcome.dismiss');
  dismiss.style.cssText = [
    'border:none',
    'background:transparent',
    'color:var(--accent)',
    'font-family:var(--font-sans)',
    'font-size:var(--text-sm)',
    'font-weight:600',
    'cursor:pointer',
    'padding:0',
    'white-space:nowrap',
    'transition:color var(--transition-fast, 100ms ease)',
  ].join(';');

  dismiss.addEventListener('mouseenter', () => {
    dismiss.style.color = 'var(--accent-hover)';
  });
  dismiss.addEventListener('mouseleave', () => {
    dismiss.style.color = 'var(--accent)';
  });
  dismiss.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    banner.remove();
  });

  banner.appendChild(dismiss);
  container.appendChild(banner);
}
