export interface ChartNameHeaderOptions {
  container: HTMLElement;
  initialName: string;
  onRename: (newName: string) => Promise<void>;
  onSaveVersion: () => void;
}

const MAX_NAME_LENGTH = 100;

export class ChartNameHeader {
  private wrapper: HTMLDivElement;
  private nameSpan: HTMLSpanElement;
  private dirtyDot: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;
  private currentName: string;
  private editing = false;
  private onRename: (newName: string) => Promise<void>;
  private onSaveVersion: () => void;
  private cleanupFns: (() => void)[] = [];

  constructor(options: ChartNameHeaderOptions) {
    this.currentName = options.initialName;
    this.onRename = options.onRename;
    this.onSaveVersion = options.onSaveVersion;

    this.wrapper = document.createElement('div');
    this.wrapper.setAttribute('data-testid', 'chart-name-header');
    this.wrapper.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:6px',
    ].join(';');

    this.nameSpan = document.createElement('span');
    this.nameSpan.setAttribute('data-testid', 'chart-name-display');
    this.nameSpan.textContent = this.currentName;
    this.applyNameStyles();

    const onNameClick = () => this.enterEditMode();
    this.nameSpan.addEventListener('click', onNameClick);
    this.cleanupFns.push(() => this.nameSpan.removeEventListener('click', onNameClick));

    const onNameMouseEnter = () => {
      if (!this.editing) this.nameSpan.style.textDecoration = 'underline';
    };
    const onNameMouseLeave = () => {
      this.nameSpan.style.textDecoration = 'none';
    };
    this.nameSpan.addEventListener('mouseenter', onNameMouseEnter);
    this.nameSpan.addEventListener('mouseleave', onNameMouseLeave);
    this.cleanupFns.push(() => {
      this.nameSpan.removeEventListener('mouseenter', onNameMouseEnter);
      this.nameSpan.removeEventListener('mouseleave', onNameMouseLeave);
    });

    this.dirtyDot = document.createElement('span');
    this.dirtyDot.setAttribute('data-testid', 'dirty-indicator');
    this.dirtyDot.textContent = '●';
    this.dirtyDot.style.cssText = [
      'color:var(--accent)',
      'font-size:8px',
      'margin-left:4px',
      'display:none',
    ].join(';');

    this.saveBtn = document.createElement('button');
    this.saveBtn.setAttribute('data-testid', 'save-version-btn');
    this.saveBtn.textContent = '💾';
    this.saveBtn.title = 'Save version';
    this.saveBtn.style.cssText = [
      'font-size:14px',
      'background-color:transparent',
      'border:none',
      'cursor:pointer',
      'padding:2px 4px',
      'opacity:0.7',
    ].join(';');

    const onSaveBtnEnter = () => { this.saveBtn.style.opacity = '1'; };
    const onSaveBtnLeave = () => { this.saveBtn.style.opacity = '0.7'; };
    this.saveBtn.addEventListener('mouseenter', onSaveBtnEnter);
    this.saveBtn.addEventListener('mouseleave', onSaveBtnLeave);
    this.cleanupFns.push(() => {
      this.saveBtn.removeEventListener('mouseenter', onSaveBtnEnter);
      this.saveBtn.removeEventListener('mouseleave', onSaveBtnLeave);
    });

    const onSaveClick = () => this.onSaveVersion();
    this.saveBtn.addEventListener('click', onSaveClick);
    this.cleanupFns.push(() => this.saveBtn.removeEventListener('click', onSaveClick));

    this.wrapper.appendChild(this.nameSpan);
    this.wrapper.appendChild(this.dirtyDot);
    this.wrapper.appendChild(this.saveBtn);
    options.container.appendChild(this.wrapper);
  }

  setName(name: string): void {
    this.currentName = name;
    if (!this.editing) {
      this.nameSpan.textContent = name;
    }
  }

  getName(): string {
    return this.currentName;
  }

  setDirty(dirty: boolean): void {
    this.dirtyDot.style.display = dirty ? 'inline' : 'none';
  }

  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    if (this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }

  private applyNameStyles(): void {
    this.nameSpan.style.cssText = [
      'font-size:13px',
      'font-weight:600',
      'color:var(--text-secondary)',
      'cursor:pointer',
      'text-decoration:none',
    ].join(';');
  }

  private enterEditMode(): void {
    if (this.editing) return;
    this.editing = true;

    const previousName = this.currentName;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.currentName;
    input.maxLength = MAX_NAME_LENGTH;
    input.setAttribute('data-testid', 'chart-name-input');
    input.setAttribute('aria-label', 'Chart name');
    input.style.cssText = [
      'font-size:13px',
      'font-weight:600',
      'color:var(--text-secondary)',
      'border:none',
      'background:transparent',
      'outline:none',
      'padding:0',
      'margin:0',
      'font-family:inherit',
      `width:${Math.max(this.nameSpan.offsetWidth, 40)}px`,
    ].join(';');

    // Auto-resize as user types
    const onInput = () => {
      input.style.width = '0';
      input.style.width = `${Math.max(input.scrollWidth, 40)}px`;
    };

    const finish = (confirm: boolean) => {
      if (!this.editing) return;
      this.editing = false;

      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('input', onInput);

      if (confirm) {
        const newName = input.value.trim();
        if (newName && newName !== previousName) {
          this.currentName = newName;
          this.nameSpan.textContent = newName;
          this.wrapper.replaceChild(this.nameSpan, input);
          this.applyNameStyles();

          this.onRename(newName).catch(() => {
            this.currentName = previousName;
            this.nameSpan.textContent = previousName;
          });
          return;
        }
      }

      // Revert on cancel or empty name
      this.nameSpan.textContent = previousName;
      this.wrapper.replaceChild(this.nameSpan, input);
      this.applyNameStyles();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    };

    const onBlur = () => finish(true);

    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('blur', onBlur);
    input.addEventListener('input', onInput);

    this.wrapper.replaceChild(input, this.nameSpan);
    input.focus();
    input.select();
  }
}
