export interface VersionViewerOptions {
  versionName: string;
  container: HTMLElement;
  onRestore: () => void;
  onClose: () => void;
}

let activeBanner: HTMLDivElement | null = null;

export function dismissVersionViewer(): void {
  if (activeBanner && activeBanner.parentElement) {
    activeBanner.parentElement.removeChild(activeBanner);
  }
  activeBanner = null;
}

export function isVersionViewerActive(): boolean {
  return activeBanner !== null;
}

export function showVersionViewer(options: VersionViewerOptions): void {
  dismissVersionViewer();

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('data-version-viewer', '');
  banner.setAttribute('data-testid', 'version-viewer');

  const bannerStyles = [
    'position:absolute',
    'top:8px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:100',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'padding:8px 16px',
    'background:var(--bg-elevated)',
    'border-left:3px solid var(--accent)',
    'border-radius:var(--radius-lg)',
    'box-shadow:var(--shadow-md)',
    'font-family:var(--font-sans)',
    'font-size:13px',
    'color:var(--text-primary)',
    'animation:versionViewerIn 200ms ease',
    'pointer-events:auto',
    'white-space:nowrap',
  ].join(';');
  banner.setAttribute('style', bannerStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes versionViewerIn {
      from { opacity:0; transform:translateX(-50%) translateY(-8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `;
  banner.appendChild(style);

  // Label: 📋 Viewing version "[name]"
  const label = document.createElement('span');
  label.setAttribute('data-testid', 'version-viewer-label');

  const labelPrefix = document.createTextNode('📋 Viewing version \u201c');
  label.appendChild(labelPrefix);

  const nameSpan = document.createElement('strong');
  nameSpan.style.fontWeight = '600';
  nameSpan.textContent = options.versionName;
  label.appendChild(nameSpan);

  const labelSuffix = document.createTextNode('\u201d');
  label.appendChild(labelSuffix);
  banner.appendChild(label);

  // Read-only tag
  const readOnly = document.createElement('span');
  readOnly.setAttribute('data-testid', 'version-viewer-readonly');
  readOnly.textContent = '(read-only)';
  readOnly.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-style:italic;';
  banner.appendChild(readOnly);

  // Separator
  const separator = document.createElement('span');
  separator.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  banner.appendChild(separator);

  // Restore button
  const restoreBtn = document.createElement('button');
  restoreBtn.setAttribute('data-testid', 'version-viewer-restore');
  restoreBtn.className = 'btn btn-primary';
  restoreBtn.textContent = 'Restore';
  restoreBtn.style.cssText = 'padding:4px 12px;font-size:11px;';
  restoreBtn.addEventListener('click', () => {
    options.onRestore();
  });
  banner.appendChild(restoreBtn);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('data-testid', 'version-viewer-close');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = '✕ Close';
  closeBtn.style.cssText = 'padding:4px 12px;font-size:11px;';
  closeBtn.addEventListener('click', () => {
    options.onClose();
  });
  banner.appendChild(closeBtn);

  options.container.appendChild(banner);
  activeBanner = banner;
}
