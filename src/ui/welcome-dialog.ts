import { t } from '../i18n';
import { activateDialog, createDialogPanel, createOverlay } from './dialog-utils';
import { appendIconLabel, createIcon } from './icon';

export function showWelcomeDialog(onLoadSample: () => void): void {
  const previouslyFocused = document.activeElement;
  const overlay = createOverlay();
  const dialog = createDialogPanel({ ariaLabelledBy: 'welcome-dialog-title' });
  dialog.classList.add('welcome-dialog');

  const mark = document.createElement('div');
  mark.className = 'welcome-dialog-mark';
  mark.appendChild(createIcon('tree'));
  dialog.appendChild(mark);

  const title = document.createElement('h2');
  title.id = 'welcome-dialog-title';
  title.className = 'welcome-dialog-title';
  title.textContent = t('welcome.title');
  dialog.appendChild(title);

  const description = document.createElement('p');
  description.className = 'welcome-dialog-description';
  description.textContent = t('welcome.description');
  dialog.appendChild(description);

  const importHint = document.createElement('p');
  importHint.className = 'welcome-dialog-import-hint';
  importHint.appendChild(createIcon('import'));
  importHint.appendChild(document.createTextNode(t('welcome.import_hint')));
  dialog.appendChild(importHint);

  const actions = document.createElement('div');
  actions.className = 'welcome-dialog-actions';

  const sampleButton = document.createElement('button');
  sampleButton.type = 'button';
  sampleButton.className = 'btn btn-primary';
  appendIconLabel(sampleButton, 'tree', t('welcome.load_sample'));
  actions.appendChild(sampleButton);

  const emptyButton = document.createElement('button');
  emptyButton.type = 'button';
  emptyButton.className = 'btn btn-secondary';
  appendIconLabel(emptyButton, 'add', t('welcome.start_empty'));
  actions.appendChild(emptyButton);

  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let deactivate = () => {};
  const close = () => {
    deactivate();
    overlay.remove();
  };

  deactivate = activateDialog(dialog, {
    onEscape: close,
    restoreFocusTo: previouslyFocused,
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  sampleButton.addEventListener('click', () => {
    onLoadSample();
    close();
  });
  emptyButton.addEventListener('click', close);
  sampleButton.focus();
}
