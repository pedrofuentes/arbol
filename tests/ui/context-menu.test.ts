import { describe, it, expect, afterEach } from 'vitest';
import { showContextMenu, dismissContextMenu, ContextMenuItem } from '../../src/ui/context-menu';

function makeItems(overrides?: Partial<ContextMenuItem>[]): ContextMenuItem[] {
  const defaults: ContextMenuItem[] = [
    { label: 'Edit', action: vi.fn() },
    { label: 'Duplicate', action: vi.fn() },
    { label: 'Delete', danger: true, action: vi.fn() },
  ];
  if (!overrides) return defaults;
  return defaults.map((d, i) => ({ ...d, ...(overrides[i] ?? {}) }));
}

function getMenu(): HTMLDivElement | null {
  return document.querySelector('[role="menu"]');
}

function getMenuItems(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
}

describe('ContextMenu', () => {
  afterEach(() => {
    dismissContextMenu();
  });

  describe('rendering', () => {
    it('renders menu items as buttons with role="menuitem"', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item.tagName).toBe('BUTTON');
        expect(item.getAttribute('role')).toBe('menuitem');
      });
    });

    it('renders item labels via textContent', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      expect(items[0].textContent).toBe('Edit');
      expect(items[1].textContent).toBe('Duplicate');
      expect(items[2].textContent).toBe('Delete');
    });

    it('renders the menu container with role="menu"', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const menu = getMenu();
      expect(menu).not.toBeNull();
      expect(menu!.getAttribute('role')).toBe('menu');
    });

    it('renders icon prefix when icon is provided', () => {
      const items: ContextMenuItem[] = [{ label: 'Edit', icon: '✏️', action: vi.fn() }];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      const spans = btn.querySelectorAll('span');
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe('✏️');
      expect(spans[1].textContent).toBe('Edit');
    });

    it('renders swatch circle when swatch color is provided', () => {
      const items: ContextMenuItem[] = [{ label: 'Engineering', swatch: '#3b82f6', action: vi.fn() }];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      const swatchEl = btn.querySelector('span[aria-hidden="true"]');
      expect(swatchEl).not.toBeNull();
      const spans = btn.querySelectorAll('span');
      expect(spans).toHaveLength(2);
      expect(spans[1].textContent).toBe('Engineering');
    });

    it('renders both icon and swatch when both provided', () => {
      const items: ContextMenuItem[] = [{ label: 'Test', icon: '✓', swatch: '#ff0000', action: vi.fn() }];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      const spans = btn.querySelectorAll('span');
      expect(spans).toHaveLength(3);
      expect(spans[0].textContent).toBe('✓');
      expect(spans[1].getAttribute('aria-hidden')).toBe('true');
      expect(spans[2].textContent).toBe('Test');
    });

    it('uses position:fixed on the menu element', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const menu = getMenu();
      expect(menu!.getAttribute('style')).toContain('position:fixed');
    });
  });

  describe('danger items', () => {
    it('applies danger color to danger items', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      expect(items[2].style.color).toBe('var(--danger)');
    });

    it('does not apply danger color to normal items', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      expect(items[0].style.color).not.toBe('var(--danger)');
    });
  });

  describe('disabled items', () => {
    it('sets disabled attribute on disabled items', () => {
      const items: ContextMenuItem[] = [
        { label: 'Disabled', disabled: true, action: vi.fn() },
        { label: 'Enabled', action: vi.fn() },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btns = getMenuItems();
      expect(btns[0].disabled).toBe(true);
      expect(btns[1].disabled).toBe(false);
    });

    it('applies reduced opacity to disabled items', () => {
      const items: ContextMenuItem[] = [{ label: 'Disabled', disabled: true, action: vi.fn() }];
      showContextMenu({ x: 100, y: 100, items });
      expect(getMenuItems()[0].style.opacity).toBe('0.4');
    });

    it('does not fire action on disabled item click', () => {
      const action = vi.fn();
      const items: ContextMenuItem[] = [{ label: 'Disabled', disabled: true, action }];
      showContextMenu({ x: 100, y: 100, items });
      getMenuItems()[0].click();
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('item actions', () => {
    it('calls action on enabled item click', () => {
      const items = makeItems();
      showContextMenu({ x: 100, y: 100, items });
      getMenuItems()[0].click();
      expect(items[0].action).toHaveBeenCalledOnce();
    });

    it('dismisses menu after item click', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      getMenuItems()[0].click();
      expect(getMenu()).toBeNull();
    });
  });

  describe('dismissal', () => {
    it('dismissContextMenu() removes the menu from DOM', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      expect(getMenu()).not.toBeNull();
      dismissContextMenu();
      expect(getMenu()).toBeNull();
    });

    it('dismisses on Escape key', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      expect(getMenu()).not.toBeNull();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(getMenu()).toBeNull();
    });

    it('dismisses on click outside', async () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      expect(getMenu()).not.toBeNull();
      // The outside click handler is deferred with setTimeout(0)
      await new Promise((r) => setTimeout(r, 0));
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getMenu()).toBeNull();
    });

    it('dismisses on window scroll', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      expect(getMenu()).not.toBeNull();
      window.dispatchEvent(new Event('scroll'));
      expect(getMenu()).toBeNull();
    });

    it('dismisses on window resize', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      expect(getMenu()).not.toBeNull();
      window.dispatchEvent(new Event('resize'));
      expect(getMenu()).toBeNull();
    });

    it('calling dismissContextMenu when no menu is open is a no-op', () => {
      expect(() => dismissContextMenu()).not.toThrow();
    });
  });

  describe('singleton behavior', () => {
    it('only one menu can be open at a time', () => {
      showContextMenu({ x: 10, y: 10, items: makeItems() });
      showContextMenu({ x: 200, y: 200, items: makeItems() });
      const menus = document.querySelectorAll('[role="menu"]');
      expect(menus).toHaveLength(1);
    });

    it('second showContextMenu replaces the first menu', () => {
      const items1: ContextMenuItem[] = [{ label: 'First', action: vi.fn() }];
      const items2: ContextMenuItem[] = [{ label: 'Second', action: vi.fn() }];
      showContextMenu({ x: 10, y: 10, items: items1 });
      showContextMenu({ x: 200, y: 200, items: items2 });
      const btns = getMenuItems();
      expect(btns).toHaveLength(1);
      expect(btns[0].textContent).toBe('Second');
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves focus to the next item', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      // First enabled item should be focused initially
      items[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[1]);
    });

    it('ArrowUp moves focus to the previous item', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      items[1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowDown wraps from last to first item', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const items = getMenuItems();
      items[2].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowDown skips disabled items', () => {
      const items: ContextMenuItem[] = [
        { label: 'A', action: vi.fn() },
        { label: 'B', disabled: true, action: vi.fn() },
        { label: 'C', action: vi.fn() },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btns = getMenuItems();
      btns[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(btns[2]);
    });

    it('Enter activates the focused item', () => {
      const items = makeItems();
      showContextMenu({ x: 100, y: 100, items });
      const btns = getMenuItems();
      btns[1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(items[1].action).toHaveBeenCalledOnce();
    });
  });

  describe('viewport clamping', () => {
    it('positions menu at the given coordinates', () => {
      showContextMenu({ x: 50, y: 60, items: makeItems() });
      const menu = getMenu();
      const style = menu!.getAttribute('style')!;
      expect(style).toContain('left:50px');
      expect(style).toContain('top:60px');
    });
  });

  describe('styling', () => {
    it('uses design system variables for background and border', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const menu = getMenu();
      const style = menu!.getAttribute('style')!;
      expect(style).toContain('--bg-elevated');
      expect(style).toContain('--border-default');
      expect(style).toContain('--radius-md');
    });

    it('includes animation on menu', () => {
      showContextMenu({ x: 100, y: 100, items: makeItems() });
      const menu = getMenu();
      expect(menu!.getAttribute('style')).toContain('contextMenuIn');
    });
  });

  describe('submenu support', () => {
    it('renders arrow indicator for items with submenu', () => {
      const items: ContextMenuItem[] = [
        { label: 'Category', submenu: [{ label: 'Engineering', action: vi.fn() }] },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      expect(btn.textContent).toContain('▸');
    });

    it('shows submenu on hover', () => {
      const items: ContextMenuItem[] = [
        {
          label: 'Category',
          submenu: [
            { label: 'Engineering', action: vi.fn() },
            { label: 'Design', action: vi.fn() },
          ],
        },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const menus = document.querySelectorAll('[role="menu"]');
      expect(menus).toHaveLength(2);

      const submenuItems = menus[1].querySelectorAll('[role="menuitem"]');
      expect(submenuItems).toHaveLength(2);
      expect(submenuItems[0].textContent).toBe('Engineering');
      expect(submenuItems[1].textContent).toBe('Design');
    });

    it('clicking submenu item dismisses entire menu and calls action', () => {
      const action = vi.fn();
      const items: ContextMenuItem[] = [
        { label: 'Category', submenu: [{ label: 'Engineering', action }] },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const allItems = getMenuItems();
      const submenuItem = allItems[allItems.length - 1];
      submenuItem.click();

      expect(action).toHaveBeenCalledOnce();
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it('renders submenu items with icons', () => {
      const items: ContextMenuItem[] = [
        { label: 'Category', submenu: [{ label: 'Engineering', icon: '🔧', action: vi.fn() }] },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const menus = document.querySelectorAll('[role="menu"]');
      const submenuBtn = menus[1].querySelector('[role="menuitem"]')!;
      const spans = submenuBtn.querySelectorAll('span');
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe('🔧');
      expect(spans[1].textContent).toBe('Engineering');
    });

    it('hides submenu when mouse leaves', () => {
      vi.useFakeTimers();
      try {
        const items: ContextMenuItem[] = [
          { label: 'Category', submenu: [{ label: 'Engineering', action: vi.fn() }] },
        ];
        showContextMenu({ x: 100, y: 100, items });
        const btn = getMenuItems()[0];
        btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

        expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2);

        btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        vi.advanceTimersByTime(150);

        const menus = document.querySelectorAll('[role="menu"]');
        expect(menus).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not call parent action for submenu items', () => {
      const parentAction = vi.fn();
      const items: ContextMenuItem[] = [
        {
          label: 'Category',
          action: parentAction,
          submenu: [{ label: 'Engineering', action: vi.fn() }],
        },
      ];
      showContextMenu({ x: 100, y: 100, items });
      const btn = getMenuItems()[0];
      btn.click();
      expect(parentAction).not.toHaveBeenCalled();
    });
  });
});
