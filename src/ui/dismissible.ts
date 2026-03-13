/**
 * Creates a dismissible UI element manager. Ensures only one instance
 * is active at a time and provides cleanup tracking.
 */
export function createDismissible() {
  let activeElement: HTMLElement | null = null;
  let cleanupFns: (() => void)[] = [];

  return {
    getActive(): HTMLElement | null {
      return activeElement;
    },

    isActive(): boolean {
      return activeElement !== null;
    },

    activate(element: HTMLElement): void {
      this.dismiss();
      activeElement = element;
    },

    onDismiss(fn: () => void): void {
      cleanupFns.push(fn);
    },

    dismiss(): void {
      for (const fn of cleanupFns) {
        try { fn(); } catch { /* ignore cleanup errors */ }
      }
      cleanupFns = [];
      if (activeElement?.parentNode) {
        activeElement.parentNode.removeChild(activeElement);
      }
      activeElement = null;
    },
  };
}
