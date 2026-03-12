export interface ContextMenuItem {
  label: string;
  icon?: string;
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
}

export function showContextMenu(options: ContextMenuOptions): void {
  dismissContextMenu();

  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');

  const baseStyles = [
    'position:fixed',
    'z-index:2000',
    'min-width:160px',
    'background:var(--bg-elevated)',
    'border:1px solid var(--border-default)',
    'border-radius:var(--radius-md)',
    'box-shadow:var(--shadow-lg)',
    'padding:var(--space-1) 0',
    'animation:contextMenuIn 120ms ease',
  ].join(';');
  menu.setAttribute('style', baseStyles);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes contextMenuIn {
      from { opacity:0; transform:translateY(-4px); }
      to   { opacity:1; transform:translateY(0); }
    }
  `;
  menu.appendChild(style);

  const buttons: HTMLButtonElement[] = [];

  for (const item of options.items) {
    const btn = document.createElement('button');
    btn.setAttribute('role', 'menuitem');
    btn.style.cssText = `
      display:flex;
      align-items:center;
      gap:var(--space-2);
      width:100%;
      padding:var(--space-2) var(--space-3);
      border:none;
      background:transparent;
      color:var(--text-primary);
      font-size:13px;
      font-family:inherit;
      text-align:left;
      cursor:pointer;
      white-space:nowrap;
      transition:background var(--transition-fast, 100ms ease);
    `;

    if (item.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = item.icon;
      iconSpan.style.cssText = 'flex-shrink:0;width:16px;text-align:center;';
      btn.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    if (item.danger) {
      btn.style.color = 'var(--danger)';
    }

    if (item.disabled) {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'default';
    }

    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) btn.style.background = 'var(--bg-hover)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    if (item.submenu) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = '▸';
      arrowSpan.style.cssText = 'margin-left:auto;padding-left:12px;font-size:10px;color:var(--text-tertiary);';
      btn.appendChild(arrowSpan);

      let submenuEl: HTMLDivElement | null = null;

      let hideTimeout: ReturnType<typeof setTimeout> | null = null;
      const scheduleHide = () => {
        hideTimeout = setTimeout(() => hideSubmenu(), 100);
      };
      const cancelHide = () => {
        if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
      };

      const showSubmenu = () => {
        if (submenuEl) return;
        submenuEl = document.createElement('div');
        submenuEl.setAttribute('role', 'menu');
        submenuEl.style.cssText = `
          position:fixed;z-index:2001;min-width:140px;
          background:var(--bg-elevated);border:1px solid var(--border-default);
          border-radius:var(--radius-md);box-shadow:var(--shadow-lg);
          padding:var(--space-1) 0;
        `;

        for (const subItem of item.submenu!) {
          const subBtn = document.createElement('button');
          subBtn.setAttribute('role', 'menuitem');
          subBtn.style.cssText = `
            display:flex;align-items:center;gap:var(--space-2);width:100%;
            padding:var(--space-2) var(--space-3);border:none;background:transparent;
            color:var(--text-primary);font-size:13px;font-family:inherit;
            text-align:left;cursor:pointer;white-space:nowrap;
            transition:background var(--transition-fast, 100ms ease);
          `;

          if (subItem.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.textContent = subItem.icon;
            iconSpan.style.cssText = 'flex-shrink:0;width:16px;text-align:center;';
            subBtn.appendChild(iconSpan);
          }

          const labelSpan = document.createElement('span');
          labelSpan.textContent = subItem.label;
          subBtn.appendChild(labelSpan);

          subBtn.addEventListener('mouseenter', () => {
            subBtn.style.background = 'var(--bg-hover)';
          });
          subBtn.addEventListener('mouseleave', () => {
            subBtn.style.background = 'transparent';
          });

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
      };

      const hideSubmenu = () => {
        if (submenuEl) {
          const idx = activeSubmenus.indexOf(submenuEl);
          if (idx !== -1) activeSubmenus.splice(idx, 1);
          if (document.body.contains(submenuEl)) document.body.removeChild(submenuEl);
          submenuEl = null;
        }
      };

      btn.addEventListener('mouseenter', () => {
        cancelHide();
        showSubmenu();
      });
      btn.addEventListener('mouseleave', scheduleHide);

      cleanupFns.push(() => hideSubmenu());

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (submenuEl) { hideSubmenu(); } else { showSubmenu(); }
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
  const x = options.x + rect.width > window.innerWidth
    ? options.x - rect.width
    : options.x;
  const y = options.y + rect.height > window.innerHeight
    ? options.y - rect.height
    : options.y;
  const current = menu.getAttribute('style') ?? '';
  menu.setAttribute('style', `${current};left:${x}px;top:${y}px`);

  // Focus first enabled item
  const firstEnabled = buttons.find(b => !b.disabled);
  if (firstEnabled) firstEnabled.focus();

  // Keyboard navigation
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissContextMenu();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const focused = document.activeElement as HTMLElement;
      const idx = buttons.indexOf(focused as HTMLButtonElement);
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      let next = idx;
      // Cycle through buttons to find next enabled one
      for (let i = 0; i < buttons.length; i++) {
        next = (next + dir + buttons.length) % buttons.length;
        if (!buttons[next].disabled) break;
      }
      buttons[next].focus();
      return;
    }

    if (e.key === 'Enter') {
      const focused = document.activeElement as HTMLButtonElement;
      if (buttons.includes(focused) && !focused.disabled) {
        e.preventDefault();
        focused.click();
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));

  // Dismiss on click outside
  const outsideHandler = (e: MouseEvent) => {
    const target = e.target as Node;
    if (!menu.contains(target) && !activeSubmenus.some(sub => sub.contains(target))) {
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
