import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';
import { t } from '../i18n';

export interface ChartCreationSource {
  type: 'none' | 'preset' | 'chart';
  name?: string;
  id?: string;
}

export interface CreateChartResult {
  name: string;
  categorySource: ChartCreationSource;
  levelMappingSource: ChartCreationSource;
}

export interface CreateChartDialogOptions {
  categoryPresets: string[];
  levelMappingPresets: string[];
  charts: { id: string; name: string }[];
}

export function showCreateChartDialog(
  options: CreateChartDialogOptions,
): Promise<CreateChartResult | null> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = createOverlay();

    const dialogTitleId = 'create-chart-dialog-title';
    const dialog = createDialogPanel({
      role: 'dialog',
      ariaLabelledBy: dialogTitleId,
    });

    // Title
    const title = document.createElement('h3');
    title.id = dialogTitleId;
    title.textContent = t('chart_editor.new_chart_dialog_title');
    title.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(title);

    // Name input
    const nameId = 'create-chart-name';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = t('chart_editor.new_chart_dialog_label');
    nameLabel.htmlFor = nameId;
    nameLabel.style.cssText = `
      display:block;font-size:13px;font-weight:500;
      color:var(--text-secondary);font-family:var(--font-sans);
      margin-bottom:var(--space-1, 4px);
    `;
    dialog.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = nameId;
    nameInput.placeholder = t('chart_editor.new_chart_placeholder');
    nameInput.setAttribute('data-testid', 'create-chart-name');
    nameInput.style.cssText = `
      width:100%;box-sizing:border-box;
      padding:var(--space-2, 8px) var(--space-3, 12px);
      background:var(--bg-base);
      border:1px solid var(--border-default);
      border-radius:var(--radius-md, 6px);
      color:var(--text-primary);
      font-family:var(--font-sans);
      font-size:14px;outline:none;
      margin-bottom:12px;
    `;
    nameInput.addEventListener('focus', () => {
      nameInput.style.borderColor = 'var(--accent)';
    });
    nameInput.addEventListener('blur', () => {
      nameInput.style.borderColor = 'var(--border-default)';
    });
    dialog.appendChild(nameInput);

    // Helper to build a source <select>
    function createSourceSelect(
      labelText: string,
      presets: string[],
      testId: string,
    ): HTMLSelectElement {
      const selectId = `create-chart-${testId}`;
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      lbl.htmlFor = selectId;
      lbl.style.cssText = `
        display:block;font-size:13px;font-weight:500;
        color:var(--text-secondary);font-family:var(--font-sans);
        margin-bottom:var(--space-1, 4px);
      `;
      dialog.appendChild(lbl);

      const select = document.createElement('select');
      select.id = selectId;
      select.setAttribute('data-testid', testId);
      select.style.cssText = `
        width:100%;box-sizing:border-box;
        padding:var(--space-2, 8px) var(--space-3, 12px);
        background:var(--bg-base);
        border:1px solid var(--border-default);
        border-radius:var(--radius-md, 6px);
        color:var(--text-primary);
        font-family:var(--font-sans);
        font-size:14px;
        margin-bottom:12px;
      `;

      const noneOpt = document.createElement('option');
      noneOpt.value = 'none:';
      noneOpt.textContent = t('chart_editor.source_none');
      select.appendChild(noneOpt);

      for (const name of presets) {
        const opt = document.createElement('option');
        opt.value = `preset:${name}`;
        opt.textContent = t('chart_editor.source_preset', { name });
        select.appendChild(opt);
      }

      for (const chart of options.charts) {
        const opt = document.createElement('option');
        opt.value = `chart:${chart.id}`;
        opt.textContent = t('chart_editor.source_chart', { name: chart.name });
        select.appendChild(opt);
      }

      dialog.appendChild(select);
      return select;
    }

    const catSelect = createSourceSelect(
      t('chart_editor.categories_source'),
      options.categoryPresets,
      'cat-source',
    );

    const levelSelect = createSourceSelect(
      t('chart_editor.level_mappings_source'),
      options.levelMappingPresets,
      'level-source',
    );

    // Error message
    const errorEl = document.createElement('div');
    errorEl.setAttribute('role', 'alert');
    errorEl.style.cssText = `
      color:var(--danger, #d32f2f);font-size:12px;
      font-family:var(--font-sans);min-height:0;margin-bottom:8px;
    `;
    dialog.appendChild(errorEl);

    // Buttons
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = t('dialog.cancel');
    cancelBtn.setAttribute('data-testid', 'create-chart-cancel');
    btnGroup.appendChild(cancelBtn);

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-primary';
    createBtn.textContent = t('dialog.create');
    createBtn.setAttribute('data-testid', 'create-chart-confirm');
    btnGroup.appendChild(createBtn);

    dialog.appendChild(btnGroup);
    overlay.appendChild(dialog);

    const removeTrap = trapFocus(dialog);

    function parseSource(value: string): ChartCreationSource {
      const colonIdx = value.indexOf(':');
      const type = value.slice(0, colonIdx);
      const id = value.slice(colonIdx + 1);
      if (type === 'preset') return { type: 'preset', name: id };
      if (type === 'chart') {
        const chart = options.charts.find((c) => c.id === id);
        return { type: 'chart', id, name: chart?.name };
      }
      return { type: 'none' };
    }

    function dismiss(result: CreateChartResult | null): void {
      removeTrap();
      document.removeEventListener('keydown', escHandler);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      resolve(result);
    }

    function submit(): void {
      const name = nameInput.value.trim();
      if (!name) {
        errorEl.textContent = t('chart_editor.name_required');
        nameInput.focus();
        return;
      }
      dismiss({
        name,
        categorySource: parseSource(catSelect.value),
        levelMappingSource: parseSource(levelSelect.value),
      });
    }

    createBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => dismiss(null));

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); dismiss(null); }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss(null);
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(null);
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    nameInput.focus();
  });
}
