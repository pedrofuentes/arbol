import { t } from '../i18n';
import { EventEmitter } from '../utils/event-emitter';

export class AnalyticsDrawer extends EventEmitter {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private _isOpen = false;

  constructor(parent: HTMLElement) {
    super();

    this.root = document.createElement('div');
    this.root.className = 'analytics-drawer collapsed';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', t('analytics.drawer_aria'));

    // Handle bar
    const handle = document.createElement('div');
    handle.className = 'analytics-drawer-handle';

    // Grip indicator (visual only)
    const grip = document.createElement('div');
    grip.className = 'analytics-drawer-grip';
    grip.setAttribute('aria-hidden', 'true');
    handle.appendChild(grip);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'analytics-drawer-close';
    closeBtn.setAttribute('aria-label', t('analytics.drawer_close'));
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());
    handle.appendChild(closeBtn);

    this.root.appendChild(handle);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'analytics-drawer-body';
    this.root.appendChild(this.body);

    parent.appendChild(this.root);
  }

  getContentContainer(): HTMLElement {
    return this.body;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.root.classList.remove('collapsed');
    this.emit();
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.root.classList.add('collapsed');
    this.emit();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  getElement(): HTMLElement {
    return this.root;
  }

  destroy(): void {
    this.root.remove();
  }
}
