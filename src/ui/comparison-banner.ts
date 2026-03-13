export interface ComparisonBannerOptions {
  container: HTMLElement;
  oldLabel: string;
  newLabel: string;
  stats: { added: number; removed: number; moved: number; modified: number };
  viewMode: 'merged' | 'side-by-side';
  onToggleView: () => void;
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

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('data-testid', 'comparison-banner');

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
    'animation:comparisonBannerIn 200ms ease',
    'pointer-events:auto',
    'white-space:nowrap',
  ].join(';');
  banner.setAttribute('style', bannerStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes comparisonBannerIn {
      from { opacity:0; transform:translateX(-50%) translateY(-8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `;
  banner.appendChild(style);

  // Label: 🔄 Comparing "oldLabel" → "newLabel"
  const label = document.createElement('span');
  label.setAttribute('data-testid', 'comparison-banner-label');

  const labelPrefix = document.createTextNode('🔄 Comparing \u201c');
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
  sep1.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  banner.appendChild(sep1);

  // Stats
  const statsContainer = document.createElement('span');
  statsContainer.setAttribute('data-testid', 'comparison-banner-stats');
  statsContainer.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:600;';

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
  sep2.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  banner.appendChild(sep2);

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.setAttribute('data-testid', 'comparison-banner-toggle');
  toggleBtn.className = 'btn btn-secondary';
  toggleBtn.style.cssText = 'padding:4px 12px;font-size:11px;';
  toggleBtn.textContent = options.viewMode === 'merged' ? 'Side by side' : 'Merged';
  toggleBtn.addEventListener('click', () => {
    options.onToggleView();
  });
  banner.appendChild(toggleBtn);

  // Exit button
  const exitBtn = document.createElement('button');
  exitBtn.setAttribute('data-testid', 'comparison-banner-exit');
  exitBtn.className = 'btn btn-secondary';
  exitBtn.style.cssText = 'padding:4px 12px;font-size:11px;';
  exitBtn.textContent = '✕ Exit';
  exitBtn.addEventListener('click', () => {
    options.onExit();
  });
  banner.appendChild(exitBtn);

  options.container.appendChild(banner);
  activeBanner = banner;
}
