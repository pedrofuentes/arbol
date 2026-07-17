import { activateDialog } from './dialog-utils';
import { t } from '../i18n';

export interface InlineEditorOptions {
  rect: DOMRect;
  name: string;
  title: string;
  level?: string;
  onSave: (name: string, title: string, level?: string) => void;
  onCancel: () => void;
}

let activeEditor: HTMLDivElement | null = null;
let activeCleanup: (() => void) | null = null;
let previouslyFocused: Element | null = null;

export function dismissInlineEditor(): void {
  if (activeEditor && document.body.contains(activeEditor)) {
    document.body.removeChild(activeEditor);
  }
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
  activeEditor = null;
  previouslyFocused = null;
}

export function showInlineEditor(options: InlineEditorOptions): void {
  // Only one editor at a time
  dismissInlineEditor();

  previouslyFocused = document.activeElement;

  const { rect, name, title, level, onSave, onCancel } = options;

  const container = document.createElement('div');
  container.className = 'panel-chrome dialog-panel inline-editor';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-label', t('inline_editor.aria'));
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;
  container.style.zIndex = 'var(--z-menu)';

  const nameInput = document.createElement('input');
  nameInput.className = 'inline-editor-input inline-editor-name';
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.setAttribute('aria-label', t('inline_editor.name_aria'));

  const titleInput = document.createElement('input');
  titleInput.className = 'inline-editor-input inline-editor-title';
  titleInput.type = 'text';
  titleInput.value = title;
  titleInput.setAttribute('aria-label', t('inline_editor.title_aria'));

  const levelInput = document.createElement('input');
  levelInput.className = 'inline-editor-input inline-editor-level';
  levelInput.type = 'text';
  levelInput.value = level ?? '';
  levelInput.setAttribute('aria-label', t('inline_editor.level_aria'));
  levelInput.setAttribute('placeholder', t('inline_editor.level_placeholder'));
  levelInput.maxLength = 50;

  const buttonRow = document.createElement('div');
  buttonRow.className = 'inline-editor-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary inline-editor-action';
  saveBtn.textContent = t('inline_editor.save');

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary inline-editor-action';
  cancelBtn.textContent = t('inline_editor.cancel');

  buttonRow.appendChild(saveBtn);
  buttonRow.appendChild(cancelBtn);

  container.appendChild(nameInput);
  container.appendChild(titleInput);
  container.appendChild(levelInput);
  container.appendChild(buttonRow);

  const errorMsg = document.createElement('div');
  errorMsg.className = 'error-msg';
  errorMsg.id = 'inline-editor-error';
  errorMsg.setAttribute('role', 'alert');
  errorMsg.style.marginTop = 'var(--space-1)';
  errorMsg.style.minHeight = '0';
  container.appendChild(errorMsg);

  nameInput.addEventListener('input', () => {
    errorMsg.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    nameInput.removeAttribute('aria-describedby');
  });

  let dismissed = false;

  const save = () => {
    if (dismissed) return;
    const trimmedName = nameInput.value.trim();
    if (!trimmedName) {
      errorMsg.textContent = t('inline_editor.name_required');
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.setAttribute('aria-describedby', errorMsg.id);
      nameInput.focus();
      return;
    }
    dismissed = true;
    const trimmedLevel = levelInput.value.trim() || undefined;
    onSave(trimmedName, titleInput.value.trim(), trimmedLevel);
    dismissInlineEditor();
  };

  const cancel = () => {
    if (dismissed) return;
    dismissed = true;
    onCancel();
    dismissInlineEditor();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };

  const onClickOutside = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      save();
    }
  };

  nameInput.addEventListener('keydown', onKeyDown);
  titleInput.addEventListener('keydown', onKeyDown);
  levelInput.addEventListener('keydown', onKeyDown);
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  // Defer so the click that opened the editor doesn't immediately dismiss it
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', onClickOutside);
  });

  const deactivate = activateDialog(container, {
    onEscape: cancel,
    restoreFocusTo: previouslyFocused,
  });

  const cleanup = () => {
    deactivate();
    nameInput.removeEventListener('keydown', onKeyDown);
    titleInput.removeEventListener('keydown', onKeyDown);
    levelInput.removeEventListener('keydown', onKeyDown);
    saveBtn.removeEventListener('click', save);
    cancelBtn.removeEventListener('click', cancel);
    document.removeEventListener('mousedown', onClickOutside);
  };

  activeEditor = container;
  activeCleanup = cleanup;

  document.body.appendChild(container);
  nameInput.focus();
  nameInput.select();
}
