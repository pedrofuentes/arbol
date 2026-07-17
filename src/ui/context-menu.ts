import { createIcon, isIconName, type IconName } from './icon';
import { activateDialog } from './dialog-utils';

export interface ContextMenuItem {
  label: string;
  icon?: IconName | string;
  swatch?: string;
  disabled?: boolean;
  danger?: boolean;
  action?: () => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuOptions {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

let activeMenu: HTMLDivElement | null = null;
let cleanupFns: (() => void)[] = [];
let activeSubmenus: HTMLDivElement[] = [];
let previouslyFocused: Element | null = null;

export function dismissContextMenu(): void {
  for (const sub of activeSubmenus) {
    if (document.body.contains(sub)) document.body.removeChild(sub);
  }
  activeSubmenus = [];
  if (activeMenu && document.body.contains(activeMenu)) {
    document.body.removeChild(activeMenu);
  }
  activeMenu = null;
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
  previouslyFocused = null;
}

export function showContextMenu(options: ContextMenuOptions): void {
  dismissContextMenu();

  previouslyFocused = document.activeElement;

  const menu = document.createElement('div');
  menu.className = 'panel-chrome dialog-panel context-menu';
  menu.setAttribute('role', 'menu');

  interface SubmenuInfo {
    show: () => void;
    hide: () => void;
    getSubmenuEl: () => HTMLDivElement | null;
  }
  const submenuMap = new Map<HTMLButtonElement, SubmenuInfo>();

  const buttons: HTMLButtonElement[] = [];

  for (const item of options.items) {
    const btn = document.createElement('button');
    btn.className = 'context-menu-item';
    btn.setAttribute('role', 'menuitem');

    if (item.icon) {
      if (isIconName(item.icon)) {
        btn.appendChild(createIcon(item.icon));
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'context-menu-icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = item.icon;
        btn.appendChild(iconSpan);
      }
    }

    if (item.swatch) {
      const swatchSpan = document.createElement('span');
      swatchSpan.className = 'context-menu-swatch';
      swatchSpan.setAttribute('aria-hidden', 'true');
      swatchSpan.style.setProperty('--context-menu-swatch', item.swatch);
      btn.appendChild(swatchSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    if (item.danger) {
      btn.classList.add('context-menu-item--danger');
    }

    if (item.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }

    if (item.submenu) {
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'context-menu-arrow';
      arrowSpan.textContent = '▸';
      btn.appendChild(arrowSpan);

      let submenuEl: HTMLDivElement | null = null;

      let hideTimeout: ReturnType<typeof setTimeout> | null = null;
      const scheduleHide = () => {
        hideTimeout = setTimeout(() => hideSubmenu(), 100);
      };
      const cancelHide = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      };

      const showSubmenu = () => {
        if (submenuEl) return;
        submenuEl = document.createElement('div');
        submenuEl.className = 'panel-chrome dialog-panel context-submenu';
        submenuEl.setAttribute('role', 'menu');

        for (const subItem of item.submenu!) {
          const subBtn = document.createElement('button');
          subBtn.className = 'context-menu-item';
          subBtn.setAttribute('role', 'menuitem');

          if (subItem.icon) {
            if (isIconName(subItem.icon)) {
              subBtn.appendChild(createIcon(subItem.icon));
            } else {
              const iconSpan = document.createElement('span');
              iconSpan.className = 'context-menu-icon';
              iconSpan.setAttribute('aria-hidden', 'true');
              iconSpan.textContent = subItem.icon;
              subBtn.appendChild(iconSpan);
            }
          }

          if (subItem.swatch) {
            const swatchSpan = document.createElement('span');
            swatchSpan.className = 'context-menu-swatch';
            swatchSpan.setAttribute('aria-hidden', 'true');
            swatchSpan.style.setProperty('--context-menu-swatch', subItem.swatch);
            subBtn.appendChild(swatchSpan);
          }

          const labelSpan = document.createElement('span');
          labelSpan.textContent = subItem.label;
          subBtn.appendChild(labelSpan);

          subBtn.addEventListener('click', () => {
            dismissContextMenu();
            subItem.action?.();
          });

          submenuEl.appendChild(subBtn);
        }

        document.body.appendChild(submenuEl);
        activeSubmenus.push(submenuEl);

        const btnRect = btn.getBoundingClientRect();
        const subRect = submenuEl.getBoundingClientRect();
        let subX = btnRect.right;
        let subY = btnRect.top;

        if (subX + subRect.width > window.innerWidth) {
          subX = btnRect.left - subRect.width;
        }
        if (subY + subRect.height > window.innerHeight) {
          subY = window.innerHeight - subRect.height;
        }

        submenuEl.style.left = `${subX}px`;
        submenuEl.style.top = `${subY}px`;

        submenuEl.addEventListener('mouseenter', cancelHide);
        submenuEl.addEventListener('mouseleave', scheduleHide);

        btn.setAttribute('aria-expanded', 'true');
      };

      const hideSubmenu = () => {
        if (submenuEl) {
          const idx = activeSubmenus.indexOf(submenuEl);
          if (idx !== -1) activeSubmenus.splice(idx, 1);
          if (document.body.contains(submenuEl)) document.body.removeChild(submenuEl);
          submenuEl = null;
        }
        btn.setAttribute('aria-expanded', 'false');
      };

      submenuMap.set(btn, { show: showSubmenu, hide: hideSubmenu, getSubmenuEl: () => submenuEl });

      btn.addEventListener('mouseenter', () => {
        cancelHide();
        showSubmenu();
      });
      btn.addEventListener('mouseleave', scheduleHide);

      cleanupFns.push(() => hideSubmenu());

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (submenuEl) {
          hideSubmenu();
        } else {
          showSubmenu();
        }
      });
    } else {
      btn.addEventListener('click', () => {
        if (!item.disabled) {
          dismissContextMenu();
          item.action?.();
        }
      });
    }

    menu.appendChild(btn);
    buttons.push(btn);
  }

  document.body.appendChild(menu);
  activeMenu = menu;

  // Viewport clamping
  const rect = menu.getBoundingClientRect();
  const x = options.x + rect.width > window.innerWidth ? options.x - rect.width : options.x;
  const y = options.y + rect.height > window.innerHeight ? options.y - rect.height : options.y;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // Focus first enabled item
  const firstEnabled = buttons.find((b) => !b.disabled);
  if (firstEnabled) firstEnabled.focus();

  // Keyboard navigation
  const keyHandler = (e: KeyboardEvent) => {
    const focused = document.activeElement as HTMLButtonElement;

    // Check if focus is inside a submenu
    for (const [parentBtn, info] of submenuMap) {
      const subEl = info.getSubmenuEl();
      if (!subEl || !subEl.contains(focused)) continue;

      const subBtns = Array.from(subEl.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      const subIdx = subBtns.indexOf(focused);
      if (subIdx === -1) continue;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        subBtns[(subIdx + 1) % subBtns.length].focus();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        subBtns[(subIdx - 1 + subBtns.length) % subBtns.length].focus();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        info.hide();
        parentBtn.focus();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focused.click();
        return;
      }
      return;
    }

    // ArrowRight on a main menu button with submenu → open it
    if (e.key === 'ArrowRight') {
      const info = submenuMap.get(focused);
      if (info) {
        e.preventDefault();
        info.show();
        const subEl = info.getSubmenuEl();
        if (subEl) {
          const firstSub = subEl.querySelector<HTMLButtonElement>('[role="menuitem"]');
          if (firstSub) firstSub.focus();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = buttons.indexOf(focused);
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      let next = idx;
      for (let i = 0; i < buttons.length; i++) {
        next = (next + dir + buttons.length) % buttons.length;
        if (!buttons[next].disabled) break;
      }
      buttons[next].focus();
      return;
    }

    if (e.key === 'Enter') {
      if (buttons.includes(focused) && !focused.disabled) {
        e.preventDefault();
        focused.click();
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));

  const handleEscape = () => {
    const focused = document.activeElement as HTMLElement;
    for (const [parentBtn, info] of submenuMap) {
      const subEl = info.getSubmenuEl();
      if (subEl?.contains(focused)) {
        info.hide();
        parentBtn.focus();
        return;
      }
    }
    dismissContextMenu();
  };
  cleanupFns.push(
    activateDialog(menu, {
      onEscape: handleEscape,
      restoreFocusTo: previouslyFocused,
      trapFocus: false,
    }),
  );

  // Dismiss on click outside
  const outsideHandler = (e: MouseEvent) => {
    const target = e.target as Node;
    if (!menu.contains(target) && !activeSubmenus.some((sub) => sub.contains(target))) {
      dismissContextMenu();
    }
  };
  // Use setTimeout so the opening right-click doesn't immediately dismiss
  setTimeout(() => {
    document.addEventListener('click', outsideHandler);
    document.addEventListener('contextmenu', outsideHandler);
    cleanupFns.push(() => {
      document.removeEventListener('click', outsideHandler);
      document.removeEventListener('contextmenu', outsideHandler);
    });
  }, 0);

  // Dismiss on scroll/resize
  const dismissOnEvent = () => dismissContextMenu();
  window.addEventListener('scroll', dismissOnEvent, { once: true });
  window.addEventListener('resize', dismissOnEvent, { once: true });
  cleanupFns.push(() => {
    window.removeEventListener('scroll', dismissOnEvent);
    window.removeEventListener('resize', dismissOnEvent);
  });
}
