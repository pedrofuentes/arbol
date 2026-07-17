import { t } from '../i18n';
import { createIcon } from './icon';
import { createBanner } from './dialog-utils';

export interface ComparisonBannerOptions {
  container: HTMLElement;
  oldLabel: string;
  newLabel: string;
  stats: { added: number; removed: number; moved: number; modified: number };
  viewMode: 'merged' | 'side-by-side';
  dimUnchanged: boolean;
  onToggleView: () => void;
  onToggleDimUnchanged: (enabled: boolean) => void;
  onExit: () => void;
}

let activeBanner: HTMLDivElement | null = null;

export function dismissComparisonBanner(): void {
  if (activeBanner && activeBanner.parentElement) {
    activeBanner.parentElement.removeChild(activeBanner);
  }
  activeBanner = null;
}

export function isComparisonBannerActive(): boolean {
  return activeBanner !== null;
}

export function showComparisonBanner(options: ComparisonBannerOptions): void {
  dismissComparisonBanner();

  const banner = createBanner('comparison-banner');
  banner.setAttribute('data-testid', 'comparison-banner');
  banner.setAttribute('data-view-mode', options.viewMode);

  const label = document.createElement('span');
  label.setAttribute('data-testid', 'comparison-banner-label');
  label.appendChild(createIcon('replace'));

  const labelPrefix = document.createTextNode(' Comparing \u201c');
  label.appendChild(labelPrefix);

  const oldStrong = document.createElement('strong');
  oldStrong.textContent = options.oldLabel;
  label.appendChild(oldStrong);

  const labelMiddle = document.createTextNode('\u201d \u2192 \u201c');
  label.appendChild(labelMiddle);

  const newStrong = document.createElement('strong');
  newStrong.textContent = options.newLabel;
  label.appendChild(newStrong);

  const labelSuffix = document.createTextNode('\u201d');
  label.appendChild(labelSuffix);

  banner.appendChild(label);

  // Separator
  const sep1 = document.createElement('span');
  sep1.className = 'ui-banner-separator';
  banner.appendChild(sep1);

  // Stats
  const statsContainer = document.createElement('span');
  statsContainer.className = 'comparison-banner-stats';
  statsContainer.setAttribute('data-testid', 'comparison-banner-stats');

  const statDefs: Array<{ key: string; prefix: string; color: string; value: number }> = [
    { key: 'added', prefix: '+', color: '#22c55e', value: options.stats.added },
    { key: 'removed', prefix: '\u2212', color: '#ef4444', value: options.stats.removed },
    { key: 'moved', prefix: '\u2197', color: '#a78bfa', value: options.stats.moved },
    { key: 'modified', prefix: '~', color: '#f59e0b', value: options.stats.modified },
  ];

  for (const stat of statDefs) {
    if (stat.value > 0) {
      const span = document.createElement('span');
      span.setAttribute('data-testid', `comparison-stat-${stat.key}`);
      span.setAttribute('style', `color:${stat.color}`);
      span.textContent = `${stat.prefix}${stat.value}`;
      statsContainer.appendChild(span);
    }
  }

  banner.appendChild(statsContainer);

  // Separator
  const sep2 = document.createElement('span');
  sep2.className = 'ui-banner-separator';
  banner.appendChild(sep2);

  // Dim unchanged toggle
  const dimBtn = document.createElement('button');
  dimBtn.setAttribute('data-testid', 'comparison-banner-dim-toggle');
  dimBtn.className = 'btn btn-secondary';
  dimBtn.setAttribute('aria-label', t('comparison.dim_aria'));
  let dimState = options.dimUnchanged;
  dimBtn.textContent = dimState ? t('comparison.dim_on') : t('comparison.dim_off');
  dimBtn.addEventListener('click', () => {
    dimState = !dimState;
    dimBtn.textContent = dimState ? t('comparison.dim_on') : t('comparison.dim_off');
    options.onToggleDimUnchanged(dimState);
  });
  banner.appendChild(dimBtn);

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.setAttribute('data-testid', 'comparison-banner-toggle');
  toggleBtn.className = 'btn btn-secondary';
  toggleBtn.setAttribute('aria-label', t('comparison.toggle_view_aria'));
  toggleBtn.textContent =
    options.viewMode === 'merged' ? t('comparison.side_by_side') : t('comparison.merged');
  toggleBtn.addEventListener('click', () => {
    options.onToggleView();
  });
  banner.appendChild(toggleBtn);

  // Exit button
  const exitBtn = document.createElement('button');
  exitBtn.setAttribute('data-testid', 'comparison-banner-exit');
  exitBtn.className = 'btn btn-secondary';
  exitBtn.setAttribute('aria-label', t('comparison.exit_aria'));
  exitBtn.appendChild(createIcon('close'));
  exitBtn.appendChild(document.createTextNode(t('comparison.exit')));
  exitBtn.addEventListener('click', () => {
    options.onExit();
  });
  banner.appendChild(exitBtn);

  options.container.appendChild(banner);
  activeBanner = banner;
}
