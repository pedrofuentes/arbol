import { t } from '../i18n';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  group: string;
  action: () => void;
}

export interface CommandPaletteOptions {
  onDismiss: () => void;
}

export class CommandPalette {
  private overlay: HTMLDivElement;
  private dialog: HTMLDivElement;
  private input: HTMLInputElement;
  private resultsList: HTMLDivElement;
  private footer: HTMLDivElement;
  private items: CommandItem[] = [];
  private filteredItems: CommandItem[] = [];
  private activeIndex = 0;
  private previousFocus: HTMLElement | null = null;
  private options: CommandPaletteOptions;
  private mounted = false;

  constructor(options: CommandPaletteOptions) {
    this.options = options;

    // Overlay (backdrop)
    this.overlay = document.createElement('div');
    this.overlay.className = 'command-palette-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Dialog container
    this.dialog = document.createElement('div');
    this.dialog.className = 'command-palette';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-label', t('command_palette.aria_label'));

    // Input wrapper
    const inputWrap = document.createElement('div');
    inputWrap.className = 'cp-input-wrap';

    const icon = document.createElement('span');
    icon.className = 'cp-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔍';

    this.input = document.createElement('input');
    this.input.className = 'cp-input';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-expanded', 'true');
    this.input.setAttribute('aria-controls', 'cp-results');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.placeholder = t('command_palette.placeholder');

    this.input.addEventListener('input', () => this.onFilter());
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));

    inputWrap.appendChild(icon);
    inputWrap.appendChild(this.input);

    // Results list
    this.resultsList = document.createElement('div');
    this.resultsList.className = 'cp-results';
    this.resultsList.id = 'cp-results';
    this.resultsList.setAttribute('role', 'listbox');

    // Footer
    this.footer = document.createElement('div');
    this.footer.className = 'cp-footer';
    const hints = [
      t('command_palette.navigate'),
      t('command_palette.select'),
      t('command_palette.close'),
    ];
    for (const hint of hints) {
      const span = document.createElement('span');
      span.textContent = hint;
      this.footer.appendChild(span);
    }

    this.dialog.appendChild(inputWrap);
    this.dialog.appendChild(this.resultsList);
    this.dialog.appendChild(this.footer);
    this.overlay.appendChild(this.dialog);
  }

  setItems(items: CommandItem[]): void {
    this.items = items;
  }

  open(): void {
    if (!this.mounted) {
      document.body.appendChild(this.overlay);
      this.mounted = true;
    }
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.input.value = '';
    this.filteredItems = [...this.items];
    this.activeIndex = 0;
    this.renderItems();
    this.overlay.classList.add('open');
    // Delay focus to after CSS transition starts
    requestAnimationFrame(() => this.input.focus());
  }

  close(): void {
    this.overlay.classList.remove('open');
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
    this.options.onDismiss();
  }

  isOpen(): boolean {
    return this.overlay.classList.contains('open');
  }

  destroy(): void {
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.mounted = false;
  }

  private onFilter(): void {
    const query = this.input.value.trim().toLowerCase();
    if (query === '') {
      this.filteredItems = [...this.items];
    } else {
      this.filteredItems = this.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)),
      );
    }
    this.activeIndex = 0;
    this.renderItems();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.filteredItems.length > 0) {
        this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
        this.updateActive();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.filteredItems.length > 0) {
        this.activeIndex =
          (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
        this.updateActive();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.filteredItems.length > 0 && this.activeIndex < this.filteredItems.length) {
        const item = this.filteredItems[this.activeIndex];
        this.close();
        item.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  private renderItems(): void {
    // Clear list
    while (this.resultsList.firstChild) {
      this.resultsList.removeChild(this.resultsList.firstChild);
    }

    if (this.filteredItems.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'cp-no-results';
      noResults.textContent = t('command_palette.no_results');
      this.resultsList.appendChild(noResults);
      this.input.removeAttribute('aria-activedescendant');
      return;
    }

    // Group items
    const groups = new Map<string, CommandItem[]>();
    for (const item of this.filteredItems) {
      const list = groups.get(item.group) || [];
      list.push(item);
      groups.set(item.group, list);
    }

    let globalIndex = 0;
    for (const [groupName, groupItems] of groups) {
      const groupTitle = document.createElement('div');
      groupTitle.className = 'cp-group-title';
      groupTitle.textContent = groupName;
      this.resultsList.appendChild(groupTitle);

      for (const item of groupItems) {
        const itemEl = document.createElement('div');
        itemEl.className = 'cp-item';
        itemEl.id = `cp-item-${globalIndex}`;
        itemEl.setAttribute('role', 'option');
        itemEl.setAttribute('aria-selected', globalIndex === this.activeIndex ? 'true' : 'false');

        if (globalIndex === this.activeIndex) {
          itemEl.classList.add('active');
        }

        // Icon
        if (item.icon) {
          const iconEl = document.createElement('div');
          iconEl.className = 'cp-item-icon';
          iconEl.textContent = item.icon;
          itemEl.appendChild(iconEl);
        }

        // Text
        const textEl = document.createElement('div');
        textEl.className = 'cp-item-text';

        const labelEl = document.createElement('div');
        labelEl.className = 'cp-item-label';
        labelEl.textContent = item.label;
        textEl.appendChild(labelEl);

        if (item.description) {
          const descEl = document.createElement('div');
          descEl.className = 'cp-item-desc';
          descEl.textContent = item.description;
          textEl.appendChild(descEl);
        }

        itemEl.appendChild(textEl);

        // Shortcut
        if (item.shortcut) {
          const shortcutEl = document.createElement('span');
          shortcutEl.className = 'cp-item-shortcut';
          shortcutEl.textContent = item.shortcut;
          itemEl.appendChild(shortcutEl);
        }

        // Click handler
        const idx = globalIndex;
        itemEl.addEventListener('click', () => {
          this.close();
          this.filteredItems[idx].action();
        });

        this.resultsList.appendChild(itemEl);
        globalIndex++;
      }
    }

    // Set aria-activedescendant
    if (this.activeIndex < this.filteredItems.length) {
      this.input.setAttribute('aria-activedescendant', `cp-item-${this.activeIndex}`);
    }
  }

  private updateActive(): void {
    const items = this.resultsList.querySelectorAll('.cp-item');
    items.forEach((el, i) => {
      const isActive = i === this.activeIndex;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
    this.input.setAttribute('aria-activedescendant', `cp-item-${this.activeIndex}`);
  }
}
