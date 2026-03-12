export interface InlineEditorOptions {
  rect: DOMRect;
  name: string;
  title: string;
  onSave: (name: string, title: string) => void;
  onCancel: () => void;
}

let activeEditor: HTMLDivElement | null = null;
let activeCleanup: (() => void) | null = null;

export function dismissInlineEditor(): void {
  if (activeEditor && document.body.contains(activeEditor)) {
    document.body.removeChild(activeEditor);
  }
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
  activeEditor = null;
}

export function showInlineEditor(options: InlineEditorOptions): void {
  // Only one editor at a time
  dismissInlineEditor();

  const { rect, name, title, onSave, onCancel } = options;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;
  container.style.height = `${rect.height}px`;
  container.style.zIndex = '1001';
  container.style.border = '1px solid var(--border-strong)';
  container.style.boxShadow = 'var(--shadow-md)';
  container.style.borderRadius = 'var(--radius-md)';
  container.style.background = 'var(--bg-elevated)';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'center';
  container.style.padding = 'var(--space-2) var(--space-3)';
  container.style.boxSizing = 'border-box';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.setAttribute('aria-label', 'Name');
  nameInput.style.border = 'none';
  nameInput.style.background = 'transparent';
  nameInput.style.outline = 'none';
  nameInput.style.fontFamily = 'Calibri, sans-serif';
  nameInput.style.fontWeight = 'bold';
  nameInput.style.fontSize = '14px';
  nameInput.style.color = 'var(--text-primary)';
  nameInput.style.width = '100%';
  nameInput.style.padding = 'var(--space-1) 0';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = title;
  titleInput.setAttribute('aria-label', 'Title');
  titleInput.style.border = 'none';
  titleInput.style.background = 'transparent';
  titleInput.style.outline = 'none';
  titleInput.style.fontFamily = 'Calibri, sans-serif';
  titleInput.style.fontSize = '12px';
  titleInput.style.color = 'var(--text-secondary)';
  titleInput.style.width = '100%';
  titleInput.style.padding = 'var(--space-1) 0';

  container.appendChild(nameInput);
  container.appendChild(titleInput);

  let dismissed = false;

  const save = () => {
    if (dismissed) return;
    dismissed = true;
    const trimmedName = nameInput.value.trim();
    if (!trimmedName) {
      onCancel();
    } else {
      onSave(trimmedName, titleInput.value.trim());
    }
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
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const onClickOutside = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      save();
    }
  };

  nameInput.addEventListener('keydown', onKeyDown);
  titleInput.addEventListener('keydown', onKeyDown);
  // Defer so the click that opened the editor doesn't immediately dismiss it
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', onClickOutside);
  });

  const cleanup = () => {
    nameInput.removeEventListener('keydown', onKeyDown);
    titleInput.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('mousedown', onClickOutside);
  };

  activeEditor = container;
  activeCleanup = cleanup;

  document.body.appendChild(container);
  nameInput.focus();
  nameInput.select();
}
