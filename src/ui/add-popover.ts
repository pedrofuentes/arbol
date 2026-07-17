import { createDismissible } from './dismissible';
import { activateDialog, createDialogPanel } from './dialog-utils';
import { t } from '../i18n';
import { createButton } from '../utils/dom-builder';

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

  const container = createDialogPanel({ ariaLabel: t('add_popover.aria') });
  container.classList.add('add-popover');

  // Position: centered on anchor, below by default
  const left = anchor.left + anchor.width / 2;
  container.style.left = `${left}px`;
  container.style.transform = 'translateX(-50%)';

  // Title
  const heading = document.createElement('div');
  heading.className = 'add-popover-heading';
  heading.textContent = parentName
    ? t('add_popover.heading', { name: parentName })
    : t('add_popover.heading_default');
  container.appendChild(heading);

  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.className = 'add-popover-name-group';

  const nameId = uniqueId('add-name');
  const nameLabel = document.createElement('label');
  nameLabel.className = 'add-popover-label';
  nameLabel.textContent = t('add_popover.name_label');
  nameLabel.htmlFor = nameId;

  const required = document.createElement('span');
  required.className = 'required-indicator';
  required.textContent = ' *';
  required.setAttribute('aria-hidden', 'true');
  nameLabel.appendChild(required);

  const nameInput = document.createElement('input');
  nameInput.className = 'add-popover-input';
  nameInput.id = nameId;
  nameInput.type = 'text';
  nameInput.setAttribute('aria-required', 'true');
  nameInput.placeholder = t('add_popover.name_placeholder');

  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);

  const nameError = document.createElement('div');
  nameError.className = 'error-msg';
  nameError.id = 'add-popover-name-error';
  nameError.setAttribute('role', 'alert');
  nameError.style.marginTop = 'var(--space-1)';
  nameError.style.minHeight = '0';
  nameGroup.appendChild(nameError);

  container.appendChild(nameGroup);

  // Title field
  const titleGroup = document.createElement('div');
  titleGroup.className = 'add-popover-title-group';

  const titleId = uniqueId('add-title');
  const titleLabel = document.createElement('label');
  titleLabel.className = 'add-popover-label';
  titleLabel.textContent = t('add_popover.title_label');
  titleLabel.htmlFor = titleId;

  const titleInput = document.createElement('input');
  titleInput.className = 'add-popover-input';
  titleInput.id = titleId;
  titleInput.type = 'text';
  titleInput.placeholder = t('add_popover.title_placeholder');

  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);
  container.appendChild(titleGroup);

  // Buttons
  const btnGroup = document.createElement('div');
  btnGroup.className = 'add-popover-actions';

  const cancelBtn = createButton({
    className: 'btn btn-secondary',
    label: t('add_popover.cancel'),
  });

  const addBtn = createButton({
    className: 'btn btn-primary',
    label: t('add_popover.add'),
  });

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(addBtn);
  container.appendChild(btnGroup);

  // Validation + submit
  function trySubmit(): void {
    const name = nameInput.value.trim();
    const title = titleInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = 'var(--danger, #e53e3e)';
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.setAttribute('aria-describedby', nameError.id);
      nameError.textContent = t('add_popover.name_required');
      return;
    }
    onAdd(name, title);
    dismissAddPopover();
  }

  // Validate on blur
  nameInput.addEventListener('blur', () => {
    if (!nameInput.value.trim()) {
      nameInput.style.borderColor = 'var(--danger, #e53e3e)';
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.setAttribute('aria-describedby', nameError.id);
      nameError.textContent = t('add_popover.name_required');
    }
  });

  // Clear validation on input
  nameInput.addEventListener('input', () => {
    nameInput.style.borderColor = 'var(--border-default)';
    nameInput.removeAttribute('aria-invalid');
    nameInput.removeAttribute('aria-describedby');
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

  document.body.appendChild(container);
  dismissible.activate(container);

  const deactivate = activateDialog(container, {
    onEscape: cancel,
    restoreFocusTo: previouslyFocused,
  });

  // Register cleanup AFTER activate so dismiss() inside activate doesn't clear them
  dismissible.onDismiss(() => {
    deactivate();
    document.removeEventListener('mousedown', outsideHandler);
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
