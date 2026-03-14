import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { CommandPalette, CommandItem } from '../../src/ui/command-palette';

beforeAll(() => {
  setLocale('en', en);
});

function makeItems(): CommandItem[] {
  return [
    { id: 'export', label: 'Export', description: 'Export to PPTX', icon: '📊', shortcut: 'Ctrl+E', group: 'Actions', action: vi.fn() },
    { id: 'undo', label: 'Undo', icon: '↩', shortcut: 'Ctrl+Z', group: 'Actions', action: vi.fn() },
    { id: 'search', label: 'Search People', icon: '🔍', group: 'Navigation', action: vi.fn() },
    { id: 'help', label: 'Help', description: 'Keyboard shortcuts', group: 'Navigation', action: vi.fn() },
  ];
}

function createPalette() {
  const onDismiss = vi.fn();
  const palette = new CommandPalette({ onDismiss });
  return { palette, onDismiss };
}

describe('CommandPalette', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('creation', () => {
    it('creates overlay element', () => {
      const { palette } = createPalette();
      palette.open();
      const overlay = document.querySelector('.command-palette-overlay');
      expect(overlay).not.toBeNull();
      palette.destroy();
    });

    it('is hidden by default', () => {
      const { palette } = createPalette();
      expect(palette.isOpen()).toBe(false);
      palette.destroy();
    });
  });

  describe('open()', () => {
    it('adds open class to overlay', () => {
      const { palette } = createPalette();
      palette.open();
      const overlay = document.querySelector('.command-palette-overlay');
      expect(overlay!.classList.contains('open')).toBe(true);
      palette.destroy();
    });

    it('isOpen returns true', () => {
      const { palette } = createPalette();
      palette.open();
      expect(palette.isOpen()).toBe(true);
      palette.destroy();
    });

    it('clears previous input value', () => {
      const { palette } = createPalette();
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'old query';
      palette.close();
      palette.open();
      expect(input.value).toBe('');
      palette.destroy();
    });
  });

  describe('close()', () => {
    it('removes open class', () => {
      const { palette } = createPalette();
      palette.open();
      palette.close();
      const overlay = document.querySelector('.command-palette-overlay');
      expect(overlay!.classList.contains('open')).toBe(false);
      palette.destroy();
    });

    it('isOpen returns false', () => {
      const { palette } = createPalette();
      palette.open();
      palette.close();
      expect(palette.isOpen()).toBe(false);
      palette.destroy();
    });

    it('calls onDismiss', () => {
      const { palette, onDismiss } = createPalette();
      palette.open();
      palette.close();
      expect(onDismiss).toHaveBeenCalledTimes(1);
      palette.destroy();
    });
  });

  describe('rendering items', () => {
    it('renders items grouped by group', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const groups = document.querySelectorAll('.cp-group-title');
      expect(groups.length).toBe(2);
      expect(groups[0].textContent).toBe('Actions');
      expect(groups[1].textContent).toBe('Navigation');
      palette.destroy();
    });

    it('renders all items', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const items = document.querySelectorAll('.cp-item');
      expect(items.length).toBe(4);
      palette.destroy();
    });

    it('renders item labels', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const labels = document.querySelectorAll('.cp-item-label');
      expect(labels[0].textContent).toBe('Export');
      expect(labels[1].textContent).toBe('Undo');
      palette.destroy();
    });

    it('renders item descriptions', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const descs = document.querySelectorAll('.cp-item-desc');
      expect(descs.length).toBeGreaterThanOrEqual(1);
      expect(descs[0].textContent).toBe('Export to PPTX');
      palette.destroy();
    });

    it('renders item icons', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const icons = document.querySelectorAll('.cp-item-icon');
      expect(icons[0].textContent).toBe('📊');
      palette.destroy();
    });

    it('renders item shortcuts', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const shortcuts = document.querySelectorAll('.cp-item-shortcut');
      expect(shortcuts[0].textContent).toBe('Ctrl+E');
      palette.destroy();
    });

    it('first item is active by default', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const items = document.querySelectorAll('.cp-item');
      expect(items[0].classList.contains('active')).toBe(true);
      expect(items[1].classList.contains('active')).toBe(false);
      palette.destroy();
    });
  });

  describe('filtering', () => {
    it('filters items by label', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'undo';
      input.dispatchEvent(new Event('input'));
      const items = document.querySelectorAll('.cp-item');
      expect(items.length).toBe(1);
      expect(items[0].querySelector('.cp-item-label')!.textContent).toBe('Undo');
      palette.destroy();
    });

    it('filters items by description', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'pptx';
      input.dispatchEvent(new Event('input'));
      const items = document.querySelectorAll('.cp-item');
      expect(items.length).toBe(1);
      expect(items[0].querySelector('.cp-item-label')!.textContent).toBe('Export');
      palette.destroy();
    });

    it('is case insensitive', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'SEARCH';
      input.dispatchEvent(new Event('input'));
      const items = document.querySelectorAll('.cp-item');
      expect(items.length).toBe(1);
      palette.destroy();
    });

    it('shows no results message when nothing matches', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'zzzzzzz';
      input.dispatchEvent(new Event('input'));
      const noResults = document.querySelector('.cp-no-results');
      expect(noResults).not.toBeNull();
      palette.destroy();
    });

    it('clearing filter shows all items', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'undo';
      input.dispatchEvent(new Event('input'));
      expect(document.querySelectorAll('.cp-item').length).toBe(1);
      input.value = '';
      input.dispatchEvent(new Event('input'));
      expect(document.querySelectorAll('.cp-item').length).toBe(4);
      palette.destroy();
    });

    it('hides empty groups when filtering', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.value = 'undo';
      input.dispatchEvent(new Event('input'));
      const groups = document.querySelectorAll('.cp-group-title');
      expect(groups.length).toBe(1);
      expect(groups[0].textContent).toBe('Actions');
      palette.destroy();
    });
  });

  describe('keyboard navigation', () => {
    it('Arrow Down moves active to next item', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const items = document.querySelectorAll('.cp-item');
      expect(items[0].classList.contains('active')).toBe(false);
      expect(items[1].classList.contains('active')).toBe(true);
      palette.destroy();
    });

    it('Arrow Up wraps to last item', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      const items = document.querySelectorAll('.cp-item');
      expect(items[3].classList.contains('active')).toBe(true);
      palette.destroy();
    });

    it('Enter executes active item and closes', () => {
      const items = makeItems();
      const { palette } = createPalette();
      palette.setItems(items);
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(items[0].action).toHaveBeenCalledTimes(1);
      expect(palette.isOpen()).toBe(false);
      palette.destroy();
    });

    it('Escape closes palette', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(palette.isOpen()).toBe(false);
      palette.destroy();
    });
  });

  describe('mouse interaction', () => {
    it('clicking item executes it and closes', () => {
      const items = makeItems();
      const { palette } = createPalette();
      palette.setItems(items);
      palette.open();
      const itemEls = document.querySelectorAll('.cp-item');
      (itemEls[2] as HTMLElement).click();
      expect(items[2].action).toHaveBeenCalledTimes(1);
      expect(palette.isOpen()).toBe(false);
      palette.destroy();
    });

    it('clicking overlay closes palette', () => {
      const { palette, onDismiss } = createPalette();
      palette.open();
      const overlay = document.querySelector('.command-palette-overlay') as HTMLElement;
      overlay.click();
      expect(palette.isOpen()).toBe(false);
      expect(onDismiss).toHaveBeenCalled();
      palette.destroy();
    });
  });

  describe('accessibility', () => {
    it('dialog has role="dialog"', () => {
      const { palette } = createPalette();
      palette.open();
      const dialog = document.querySelector('.command-palette');
      expect(dialog!.getAttribute('role')).toBe('dialog');
      palette.destroy();
    });

    it('dialog has aria-modal="true"', () => {
      const { palette } = createPalette();
      palette.open();
      const dialog = document.querySelector('.command-palette');
      expect(dialog!.getAttribute('aria-modal')).toBe('true');
      palette.destroy();
    });

    it('input has role="combobox"', () => {
      const { palette } = createPalette();
      palette.open();
      const input = document.querySelector('.cp-input');
      expect(input!.getAttribute('role')).toBe('combobox');
      palette.destroy();
    });

    it('results list has role="listbox"', () => {
      const { palette } = createPalette();
      palette.open();
      const results = document.querySelector('.cp-results');
      expect(results!.getAttribute('role')).toBe('listbox');
      palette.destroy();
    });

    it('items have role="option"', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const items = document.querySelectorAll('.cp-item');
      items.forEach((item) => {
        expect(item.getAttribute('role')).toBe('option');
      });
      palette.destroy();
    });

    it('active item has aria-selected="true"', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const items = document.querySelectorAll('.cp-item');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
      expect(items[1].getAttribute('aria-selected')).toBe('false');
      palette.destroy();
    });

    it('input has aria-activedescendant pointing to active item', () => {
      const { palette } = createPalette();
      palette.setItems(makeItems());
      palette.open();
      const input = document.querySelector('.cp-input');
      expect(input!.getAttribute('aria-activedescendant')).toBe('cp-item-0');
      palette.destroy();
    });
  });

  describe('destroy()', () => {
    it('removes overlay from DOM', () => {
      const { palette } = createPalette();
      palette.open();
      expect(document.querySelector('.command-palette-overlay')).not.toBeNull();
      palette.destroy();
      expect(document.querySelector('.command-palette-overlay')).toBeNull();
    });
  });
});
