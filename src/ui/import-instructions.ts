import { getAppConfig } from '../config/app-config';
import { renderMarkdown } from '../utils/markdown';
import { t } from '../i18n';

/**
 * Renders company-specific import instructions from app config as a
 * collapsible `<details>` element. Returns null if no instructions configured.
 */
export function renderImportInstructions(): HTMLDetailsElement | null {
  const config = getAppConfig();
  if (!config.importInstructions?.trim()) return null;

  const details = document.createElement('details');
  details.className = 'import-instructions';

  const summary = document.createElement('summary');
  summary.textContent = t('import_instructions.summary');
  details.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'import-instructions-content';
  content.appendChild(renderMarkdown(config.importInstructions));
  details.appendChild(content);

  return details;
}
