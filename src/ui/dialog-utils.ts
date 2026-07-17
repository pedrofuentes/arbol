/**
 * Shared dialog and floating-surface utilities.
 */

export type DialogLayer = `var(--z-${string})`;

export interface DialogPanelOptions {
  role?: string;
  ariaModal?: boolean;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  minWidth?: string;
  maxWidth?: string;
  padding?: string;
}

export interface DialogActivationOptions {
  onEscape: () => void;
  restoreFocusTo?: Element | null;
  trapFocus?: boolean;
}

const activeSurfaces: symbol[] = [];

function removeSurface(token: symbol): void {
  const index = activeSurfaces.indexOf(token);
  if (index !== -1) activeSurfaces.splice(index, 1);
}

/** Adds an anonymous surface to the shared Escape stack. */
export function pushSurface(): () => void {
  const token = Symbol('active-surface');
  let active = true;
  activeSurfaces.push(token);

  return () => {
    if (!active) return;
    active = false;
    removeSurface(token);
  };
}

/** Test-only observer for verifying surface cleanup. */
export function __getActiveSurfaceCountForTests(): number {
  return activeSurfaces.length;
}

/** Creates a modal overlay with shared class-based backdrop styling. */
export function createOverlay(zIndex: DialogLayer = 'var(--z-dialog)'): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.style.zIndex = zIndex;
  return overlay;
}

/** Creates a modal dialog panel with shared class-based chrome. */
export function createDialogPanel(opts: DialogPanelOptions = {}): HTMLDivElement {
  const dialog = document.createElement('div');
  dialog.className = 'panel-chrome dialog-panel';
  dialog.setAttribute('role', opts.role ?? 'dialog');
  dialog.setAttribute('aria-modal', String(opts.ariaModal ?? true));
  if (opts.ariaLabelledBy) dialog.setAttribute('aria-labelledby', opts.ariaLabelledBy);
  if (opts.ariaLabel) dialog.setAttribute('aria-label', opts.ariaLabel);
  if (opts.minWidth) dialog.style.setProperty('--dialog-panel-min-width', opts.minWidth);
  if (opts.maxWidth) dialog.style.setProperty('--dialog-panel-max-width', opts.maxWidth);
  if (opts.padding) dialog.style.setProperty('--dialog-panel-padding', opts.padding);
  return dialog;
}

/** Creates the shared lightweight shell used by canvas banners. */
export function createBanner(
  className: string,
  opts: { interactive?: boolean } = {},
): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = `ui-banner ${className}`;
  banner.setAttribute('role', 'status');
  if (opts.interactive === false) banner.classList.add('ui-banner--passive');
  return banner;
}

/**
 * Owns Escape, optional focus trapping, and focus restoration for a surface.
 * The top registered surface consumes Escape when the event comes from that
 * surface (or the document body), but yields to an unregistered focused layer.
 */
export function activateDialog(container: HTMLElement, opts: DialogActivationOptions): () => void {
  const token = Symbol('active-dialog');
  const restoreFocusTo = opts.restoreFocusTo ?? document.activeElement;
  const removeTrap = opts.trapFocus === false ? () => {} : trapFocus(container);
  let active = true;

  activeSurfaces.push(token);

  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || activeSurfaces.at(-1) !== token) return;
    const target = event.target;
    if (
      target instanceof Node &&
      target !== document &&
      target !== document.body &&
      !container.contains(target)
    ) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    opts.onEscape();
  };
  document.addEventListener('keydown', escapeHandler, true);

  return () => {
    if (!active) return;
    active = false;
    removeTrap();
    document.removeEventListener('keydown', escapeHandler, true);
    removeSurface(token);
    if (restoreFocusTo instanceof HTMLElement) restoreFocusTo.focus();
  };
}

/** Traps keyboard focus within a container element. */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}
