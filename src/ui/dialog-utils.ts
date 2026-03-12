/**
 * Shared dialog utilities — overlay creation and focus trapping.
 */

/**
 * Creates a modal overlay with standard backdrop styling.
 */
export function createOverlay(zIndex: number = 1000): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);z-index:${zIndex};
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(2px);
    animation:fadeIn 150ms ease;
  `;
  return overlay;
}

/**
 * Creates a dialog panel with standard styling.
 */
export function createDialogPanel(
  opts: {
    role?: string;
    ariaModal?: boolean;
    ariaLabelledBy?: string;
    ariaLabel?: string;
    minWidth?: string;
    maxWidth?: string;
    padding?: string;
  } = {},
): HTMLDivElement {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', opts.role ?? 'dialog');
  dialog.setAttribute('aria-modal', String(opts.ariaModal ?? true));
  if (opts.ariaLabelledBy) dialog.setAttribute('aria-labelledby', opts.ariaLabelledBy);
  if (opts.ariaLabel) dialog.setAttribute('aria-label', opts.ariaLabel);
  dialog.style.cssText = `
    background:var(--bg-elevated);
    border:1px solid var(--border-default);
    border-radius:var(--radius-xl);
    padding:${opts.padding ?? '24px'};
    min-width:${opts.minWidth ?? '320px'};
    max-width:${opts.maxWidth ?? '420px'};
    box-shadow:var(--shadow-lg);
    animation:slideUp 200ms ease;
  `;
  return dialog;
}

/**
 * Traps keyboard focus within a container element.
 * Returns a cleanup function to remove the trap.
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}
