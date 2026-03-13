import { createDismissible } from './dismissible';
import { trapFocus } from './dialog-utils';

let formIdCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++formIdCounter}`;
}

export interface AddPopoverOptions {
  anchor: DOMRect;
  parentName?: string;
  onAdd: (name: string, title: string) => void;
  onCancel: () => void;
}

const dismissible = createDismissible();
let previouslyFocused: Element | null = null;

export function dismissAddPopover(): void {
  dismissible.dismiss();
}

export function showAddPopover(options: AddPopoverOptions): void {
  dismissible.dismiss();

  previouslyFocused = document.activeElement;

  const { anchor, parentName, onAdd, onCancel } = options;

  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-label', 'Add Person');
  container.style.cssText = `
    position:fixed;
    z-index:1001;
    min-width:240px;
    background:var(--bg-elevated);
    border:1px solid var(--border-default);
    border-radius:var(--radius-lg);
    box-shadow:var(--shadow-lg);
    padding:var(--space-4);
    font-family:var(--font-sans);
    animation:popoverFadeIn 150ms ease;
  `;

  // Position: centered on anchor, below by default
  const left = anchor.left + anchor.width / 2;
  container.style.left = `${left}px`;
  container.style.transform = 'translateX(-50%)';

  // Title
  const heading = document.createElement('div');
  heading.textContent = parentName ? `Add under ${parentName}` : 'Add Person';
  heading.style.cssText = `
    font-size:14px;font-weight:600;
    color:var(--text-primary);
    margin-bottom:var(--space-3);
  `;
  container.appendChild(heading);

  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.style.cssText = 'margin-bottom:var(--space-2);';

  const nameId = uniqueId('add-name');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  nameLabel.htmlFor = nameId;
  nameLabel.style.cssText = `
    display:block;font-size:12px;font-weight:500;
    color:var(--text-secondary);
    margin-bottom:var(--space-1);
  `;

  const nameInput = document.createElement('input');
  nameInput.id = nameId;
  nameInput.type = 'text';
  nameInput.placeholder = 'Name';
  nameInput.style.cssText = `
    width:100%;box-sizing:border-box;
    padding:var(--space-1) var(--space-2);
    background:var(--bg-base);
    border:1px solid var(--border-default);
    border-radius:var(--radius-sm, 4px);
    color:var(--text-primary);
    font-family:var(--font-sans);
    font-size:13px;
    outline:none;
  `;

  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);

  const nameError = document.createElement('div');
  nameError.className = 'error-msg';
  nameError.setAttribute('role', 'alert');
  nameError.style.marginTop = 'var(--space-1)';
  nameError.style.minHeight = '0';
  nameGroup.appendChild(nameError);

  container.appendChild(nameGroup);

  // Title field
  const titleGroup = document.createElement('div');
  titleGroup.style.cssText = 'margin-bottom:var(--space-3);';

  const titleId = uniqueId('add-title');
  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  titleLabel.htmlFor = titleId;
  titleLabel.style.cssText = `
    display:block;font-size:12px;font-weight:500;
    color:var(--text-secondary);
    margin-bottom:var(--space-1);
  `;

  const titleInput = document.createElement('input');
  titleInput.id = titleId;
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  titleInput.style.cssText = nameInput.style.cssText;

  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);
  container.appendChild(titleGroup);

  // Buttons
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:var(--space-2);justify-content:flex-end;';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancel';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = 'Add';

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(addBtn);
  container.appendChild(btnGroup);

  // Validation + submit
  function trySubmit(): void {
    const name = nameInput.value.trim();
    const title = titleInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = 'var(--danger, #e53e3e)';
      nameError.textContent = 'Name is required';
      return;
    }
    onAdd(name, title);
    dismissAddPopover();
  }

  // Clear validation on input
  nameInput.addEventListener('input', () => {
    nameInput.style.borderColor = 'var(--border-default)';
    nameError.textContent = '';
  });

  addBtn.addEventListener('click', trySubmit);

  titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      trySubmit();
    }
  });

  // Cancel handlers
  function cancel(): void {
    onCancel();
    dismissAddPopover();
  }

  cancelBtn.addEventListener('click', cancel);

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancel();
    }
  };
  document.addEventListener('keydown', escHandler);

  // Click outside — use mousedown to detect before focus shifts
  const outsideHandler = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      cancel();
    }
  };
  // Defer so the click that opened the popover doesn't immediately close it
  setTimeout(() => {
    document.addEventListener('mousedown', outsideHandler);
  }, 0);

  // Inject animation keyframes if not already present
  if (!document.getElementById('popover-fade-style')) {
    const style = document.createElement('style');
    style.id = 'popover-fade-style';
    style.textContent = `
      @keyframes popoverFadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(4px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);
  dismissible.activate(container);

  const removeTrap = trapFocus(container);

  // Register cleanup AFTER activate so dismiss() inside activate doesn't clear them
  dismissible.onDismiss(() => {
    removeTrap();
    document.removeEventListener('keydown', escHandler);
    document.removeEventListener('mousedown', outsideHandler);
    if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  });

  // Viewport-aware positioning: below anchor by default, above if no room
  const popoverHeight = container.offsetHeight;
  const spaceBelow = window.innerHeight - anchor.bottom - 8;
  if (popoverHeight > spaceBelow && anchor.top - 8 > spaceBelow) {
    container.style.top = `${anchor.top - popoverHeight - 8}px`;
  } else {
    container.style.top = `${anchor.bottom + 8}px`;
  }

  nameInput.focus();
}
