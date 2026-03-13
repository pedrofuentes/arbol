// Screen reader announcement utility
// Creates a visually hidden aria-live region for dynamic announcements

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (!region) {
    region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(region);
  }
  return region;
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = ensureRegion();
  el.setAttribute('aria-live', priority);
  // Clear then set — ensures repeated identical messages are still announced
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

/** Reset internal state — for testing only. */
export function _resetForTesting(): void {
  if (region) {
    region.remove();
    region = null;
  }
}
