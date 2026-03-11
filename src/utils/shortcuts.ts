export interface ShortcutAction {
  key: string;           // e.g., 'z', 'e', 'f'
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;   // For tooltip display
}

export class ShortcutManager {
  private shortcuts: ShortcutAction[] = [];
  private active: boolean = true;

  constructor() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  register(action: ShortcutAction): void {
    this.shortcuts.push(action);
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  getShortcutLabel(description: string): string | null {
    const action = this.shortcuts.find(s => s.description === description);
    if (!action) return null;
    const parts: string[] = [];
    if (action.ctrl) parts.push('Ctrl');
    if (action.shift) parts.push('Shift');
    if (action.alt) parts.push('Alt');
    parts.push(action.key.toUpperCase());
    return parts.join('+');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;

    // Don't intercept when typing in input/textarea/select
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      // Exception: Escape should still work in inputs (to blur/deselect)
      if (e.key !== 'Escape') return;
    }

    for (const shortcut of this.shortcuts) {
      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!e.ctrlKey === !!shortcut.ctrl &&
        !!e.shiftKey === !!shortcut.shift &&
        !!e.altKey === !!shortcut.alt
      ) {
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }

  destroy(): void {
    // Could remove event listener if needed
  }
}
