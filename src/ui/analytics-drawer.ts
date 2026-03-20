import { t } from '../i18n';
import { EventEmitter } from '../utils/event-emitter';

const STORAGE_KEY = 'arbol-analytics-drawer-height';
const MIN_HEIGHT = 120;
const MAX_HEIGHT_VH = 0.8;

export class AnalyticsDrawer extends EventEmitter {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private _isOpen = false;

  private dragging = false;
  private startY = 0;
  private startHeight = 0;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: () => void;

  constructor(parent: HTMLElement) {
    super();

    this.root = document.createElement('div');
    this.root.className = 'analytics-drawer collapsed';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', t('analytics.drawer_aria'));

    // Handle bar
    const handle = document.createElement('div');
    handle.className = 'analytics-drawer-handle';
    handle.style.cursor = 'ns-resize';
    handle.setAttribute('aria-label', t('analytics.drawer_resize'));

    // Grip indicator
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

    // Drag resize
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      this.dragging = true;
      this.startY = e.clientY;
      this.startHeight = this.root.offsetHeight;
      this.root.style.transition = 'none';
      document.addEventListener('pointermove', this.boundOnPointerMove);
      document.addEventListener('pointerup', this.boundOnPointerUp);
    });

    this.root.appendChild(handle);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'analytics-drawer-body';
    this.root.appendChild(this.body);

    parent.appendChild(this.root);

    this.restoreHeight();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const delta = this.startY - e.clientY;
    const maxHeight = window.innerHeight * MAX_HEIGHT_VH;
    const newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, this.startHeight + delta));
    this.root.style.height = `${newHeight}px`;
    this.root.style.maxHeight = `${newHeight}px`;
  }

  private onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.root.style.transition = '';
    document.removeEventListener('pointermove', this.boundOnPointerMove);
    document.removeEventListener('pointerup', this.boundOnPointerUp);

    try {
      localStorage.setItem(STORAGE_KEY, this.root.style.height);
    } catch {
      // Ignore storage errors
    }
  }

  private restoreHeight(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.root.style.height = saved;
        this.root.style.maxHeight = saved;
      }
    } catch {
      // Ignore storage errors
    }
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
    document.removeEventListener('pointermove', this.boundOnPointerMove);
    document.removeEventListener('pointerup', this.boundOnPointerUp);
    this.root.remove();
  }
}
