import { t } from '../i18n';

export interface FloatingActionsOptions {
  container: HTMLElement;
  onEdit: () => void;
  onAdd: () => void;
  onFocus: () => void;
  onMove: () => void;
  onCategory: () => void;
  onRemove: () => void;
}

interface ButtonDef {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  callback: () => void;
}

export class FloatingActions {
  private el: HTMLDivElement;
  private options: FloatingActionsOptions;

  constructor(options: FloatingActionsOptions) {
    this.options = options;

    this.el = document.createElement('div');
    this.el.className = 'floating-actions';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', t('floating.aria_label'));

    // Keyboard nav within toolbar
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const buttons = Array.from(this.el.querySelectorAll<HTMLButtonElement>('button.fa-btn'));
        const focused = document.activeElement as HTMLElement;
        const idx = buttons.indexOf(focused as HTMLButtonElement);
        if (idx === -1) return;
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        let next = idx;
        for (let i = 0; i < buttons.length; i++) {
          next = (next + dir + buttons.length) % buttons.length;
          if (buttons[next].getAttribute('aria-disabled') !== 'true') break;
        }
        buttons[next].focus();
      }
    });

    options.container.appendChild(this.el);
  }

  showSingle(opts: { isRoot: boolean; isLeaf: boolean }): void {
    this.render([
      { label: t('floating.edit'), callback: this.options.onEdit },
      { label: t('floating.add'), callback: this.options.onAdd },
      'divider',
      { label: t('floating.focus'), disabled: opts.isLeaf, callback: this.options.onFocus },
      { label: t('floating.move'), disabled: opts.isRoot, callback: this.options.onMove },
      { label: t('floating.category'), callback: this.options.onCategory },
      'divider',
      { label: t('floating.remove'), danger: true, disabled: opts.isRoot, callback: this.options.onRemove },
    ]);
    this.el.classList.add('visible');
  }

  showMulti(count: number): void {
    this.render([
      { label: t('floating.multi_category', { count }), callback: this.options.onCategory },
      { label: t('floating.multi_move', { count }), callback: this.options.onMove },
      'divider',
      { label: t('floating.multi_remove', { count }), danger: true, callback: this.options.onRemove },
    ]);
    this.el.classList.add('visible');
  }

  hide(): void {
    this.el.classList.remove('visible');
  }

  isVisible(): boolean {
    return this.el.classList.contains('visible');
  }

  destroy(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }

  private render(defs: (ButtonDef | 'divider')[]): void {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    for (const def of defs) {
      if (def === 'divider') {
        const div = document.createElement('div');
        div.className = 'fa-divider';
        this.el.appendChild(div);
        continue;
      }

      const btn = document.createElement('button');
      btn.className = `fa-btn${def.danger ? ' fa-btn-danger' : ''}`;
      btn.textContent = def.label;

      if (def.disabled) {
        btn.setAttribute('aria-disabled', 'true');
      }

      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-disabled') !== 'true') {
          def.callback();
        }
      });

      this.el.appendChild(btn);
    }
  }
}
