import type { LevelStore } from '../../store/level-store';
import { t } from '../../i18n';

type LevelDisplayMode = 'original' | 'mapped';

export interface LevelMappingPanelDeps {
  container: HTMLElement;
  levelStore: LevelStore;
  rerenderCallback: () => void;
  rebuildCallback: () => void;
}

export class LevelMappingPanel {
  private container: HTMLElement;
  private levelStore: LevelStore;
  private rerenderCallback: () => void;
  private rebuildCallback: () => void;
  private unsubscribe: (() => void) | null = null;

  constructor(deps: LevelMappingPanelDeps) {
    this.container = deps.container;
    this.levelStore = deps.levelStore;
    this.rerenderCallback = deps.rerenderCallback;
    this.rebuildCallback = deps.rebuildCallback;
    this.build();
    this.unsubscribe = this.levelStore.onChange(() => this.rebuild());
  }

  private build(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-section-id', 'level-mapping');

    const desc = document.createElement('div');
    desc.className = 'section-intro';
    desc.textContent = t('settings.section_desc.level_mapping');
    wrapper.appendChild(desc);

    wrapper.appendChild(this.buildDisplayModeSection());
    wrapper.appendChild(this.buildMappingsTable());
    wrapper.appendChild(this.buildAddForm());
    wrapper.appendChild(this.buildCsvSection());

    this.container.appendChild(wrapper);
  }

  private buildDisplayModeSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:12px;';

    const label = document.createElement('div');
    label.className = 'setting-section-title';
    label.textContent = t('settings.label.display_mode');
    section.appendChild(label);

    const descEl = document.createElement('div');
    descEl.className = 'section-intro';
    descEl.textContent = t('settings.desc.display_mode');
    section.appendChild(descEl);

    const currentMode = this.levelStore.getDisplayMode();

    const modes: { value: LevelDisplayMode; labelKey: string }[] = [
      { value: 'original', labelKey: 'settings.label.display_mode_original' },
      { value: 'mapped', labelKey: 'settings.label.display_mode_mapped' },
    ];

    const fieldset = document.createElement('fieldset');
    fieldset.style.cssText = 'border:none;padding:0;margin:4px 0 0 0;display:flex;flex-direction:column;gap:6px;';

    for (const mode of modes) {
      const radioLabel = document.createElement('label');
      radioLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-secondary);';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'display-mode';
      radio.value = mode.value;
      radio.checked = currentMode === mode.value;
      radio.addEventListener('change', () => {
        this.levelStore.setDisplayMode(mode.value);
        this.rerenderCallback();
      });

      const text = document.createElement('span');
      text.textContent = t(mode.labelKey);

      radioLabel.appendChild(radio);
      radioLabel.appendChild(text);
      fieldset.appendChild(radioLabel);
    }

    section.appendChild(fieldset);
    return section;
  }

  private buildMappingsTable(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:12px;';

    const mappings = this.levelStore.getMappings();

    if (mappings.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px;text-align:center;color:var(--text-tertiary);font-size:11px;font-style:italic;';
      empty.textContent = t('settings.label.no_mappings');
      section.appendChild(empty);
      return section;
    }

    const table = document.createElement('div');
    table.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    if (mappings.length > 0) {
      const headerRow = document.createElement('div');
      headerRow.className = 'flex-row';
      headerRow.style.cssText = 'gap:8px;padding:2px 8px;align-items:center;font-size:10px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;';

      const hLevel = document.createElement('span');
      hLevel.style.cssText = 'min-width:50px;';
      hLevel.textContent = t('settings.label.raw_level');
      headerRow.appendChild(hLevel);

      const hSpacer = document.createElement('span');
      hSpacer.style.cssText = 'width:11px;';
      headerRow.appendChild(hSpacer);

      const hIcTitle = document.createElement('span');
      hIcTitle.style.cssText = 'flex:1;';
      hIcTitle.textContent = t('settings.label.display_title');
      headerRow.appendChild(hIcTitle);

      const hMgrTitle = document.createElement('span');
      hMgrTitle.style.cssText = 'flex:1;';
      hMgrTitle.textContent = t('settings.label.manager_display_title');
      headerRow.appendChild(hMgrTitle);

      const hAction = document.createElement('span');
      hAction.style.cssText = 'width:22px;';
      headerRow.appendChild(hAction);

      table.appendChild(headerRow);
    }

    for (const mapping of mappings) {
      const row = document.createElement('div');
      row.className = 'flex-row';
      row.style.cssText = 'gap:8px;padding:6px 8px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);align-items:center;';
      row.setAttribute('data-testid', 'mapping-row');

      const rawLabel = document.createElement('span');
      rawLabel.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-primary);min-width:50px;';
      rawLabel.textContent = mapping.rawLevel;
      row.appendChild(rawLabel);

      const arrow = document.createElement('span');
      arrow.style.cssText = 'color:var(--text-tertiary);font-size:11px;';
      arrow.textContent = '→';
      row.appendChild(arrow);

      const titleLabel = document.createElement('span');
      titleLabel.style.cssText = 'flex:1;font-size:12px;color:var(--text-secondary);cursor:pointer;';
      titleLabel.textContent = mapping.displayTitle;
      titleLabel.setAttribute('data-testid', 'ic-title');
      titleLabel.title = t('settings.label.click_to_edit');
      titleLabel.addEventListener('click', () => {
        this.startInlineEdit(titleLabel, mapping.displayTitle, 'ic-title-input', (newValue) => {
          if (!newValue.trim()) return false;
          this.levelStore.updateMapping(mapping.rawLevel, newValue.trim());
          this.rerenderCallback();
          return true;
        });
      });
      row.appendChild(titleLabel);

      const mgrLabel = document.createElement('span');
      mgrLabel.style.cssText = 'flex:1;font-size:12px;color:var(--text-secondary);font-style:italic;cursor:pointer;';
      mgrLabel.textContent = mapping.managerDisplayTitle || t('settings.label.manager_title_fallback');
      mgrLabel.setAttribute('data-testid', 'manager-title');
      mgrLabel.title = t('settings.label.click_to_edit');
      if (!mapping.managerDisplayTitle) {
        mgrLabel.style.color = 'var(--text-tertiary)';
      }
      mgrLabel.addEventListener('click', () => {
        this.startInlineEdit(mgrLabel, mapping.managerDisplayTitle ?? '', 'manager-title-input-edit', (newValue) => {
          this.levelStore.updateMapping(mapping.rawLevel, mapping.displayTitle, newValue.trim() || '');
          this.rerenderCallback();
          return true;
        });
      });
      row.appendChild(mgrLabel);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText =
        'width:22px;height:22px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:transparent;color:var(--text-tertiary);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0.5;';
      deleteBtn.setAttribute('aria-label', t('settings.label.delete_mapping'));
      deleteBtn.setAttribute('data-testid', 'delete-mapping');
      deleteBtn.addEventListener('click', () => {
        this.levelStore.removeMapping(mapping.rawLevel);
        this.rerenderCallback();
      });
      row.appendChild(deleteBtn);

      table.appendChild(row);
    }

    section.appendChild(table);
    return section;
  }

  private buildAddForm(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:12px;padding:8px;border:1px dashed var(--border-subtle);border-radius:var(--radius-sm);';

    const formTitle = document.createElement('div');
    formTitle.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;';
    formTitle.textContent = t('settings.label.add_mapping');
    section.appendChild(formTitle);

    const row = document.createElement('div');
    row.className = 'flex-row';
    row.style.cssText = 'gap:6px;align-items:flex-start;';

    const rawInput = document.createElement('input');
    rawInput.type = 'text';
    rawInput.placeholder = t('settings.label.raw_level_placeholder');
    rawInput.setAttribute('aria-label', t('settings.label.raw_level'));
    rawInput.setAttribute('data-testid', 'raw-level-input');
    rawInput.style.cssText =
      'flex:1;padding:4px 8px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:11px;font-family:var(--font-sans);min-width:0;';
    row.appendChild(rawInput);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = t('settings.label.display_title_placeholder');
    titleInput.setAttribute('aria-label', t('settings.label.display_title'));
    titleInput.setAttribute('data-testid', 'display-title-input');
    titleInput.style.cssText =
      'flex:1;padding:4px 8px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:11px;font-family:var(--font-sans);min-width:0;';
    row.appendChild(titleInput);

    const mgrTitleInput = document.createElement('input');
    mgrTitleInput.type = 'text';
    mgrTitleInput.placeholder = t('settings.label.manager_title_placeholder');
    mgrTitleInput.setAttribute('aria-label', t('settings.label.manager_display_title'));
    mgrTitleInput.setAttribute('data-testid', 'manager-title-input');
    mgrTitleInput.style.cssText =
      'flex:1;padding:4px 8px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:11px;font-family:var(--font-sans);min-width:0;';
    row.appendChild(mgrTitleInput);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', t('settings.label.add_mapping'));
    addBtn.setAttribute('data-testid', 'add-mapping-btn');
    addBtn.style.cssText = 'padding:4px 10px;font-size:13px;flex-shrink:0;';

    const errorEl = document.createElement('div');
    errorEl.style.cssText = 'color:var(--danger);font-size:10px;margin-top:4px;display:none;';
    errorEl.setAttribute('data-testid', 'mapping-error');

    addBtn.addEventListener('click', () => {
      const raw = rawInput.value.trim();
      const title = titleInput.value.trim();
      const mgrTitle = mgrTitleInput.value.trim() || undefined;

      errorEl.style.display = 'none';
      errorEl.textContent = '';

      if (!raw || !title) {
        errorEl.textContent = t('settings.label.raw_level') + ' / ' + t('settings.label.display_title');
        errorEl.style.display = 'block';
        return;
      }

      try {
        this.levelStore.addMapping(raw, title, mgrTitle);
        this.rerenderCallback();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('Duplicate')) {
          errorEl.textContent = t('settings.label.mapping_duplicate_error');
        } else {
          errorEl.textContent = msg;
        }
        errorEl.style.display = 'block';
      }
    });

    row.appendChild(addBtn);
    section.appendChild(row);
    section.appendChild(errorEl);
    return section;
  }

  private buildCsvSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'display:flex;gap:8px;';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.cssText = 'display:none;';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const count = this.levelStore.importFromCsv(text);
        if (count > 0) this.rerenderCallback();
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
    section.appendChild(fileInput);

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.textContent = t('settings.label.import_csv');
    importBtn.setAttribute('data-testid', 'import-csv-btn');
    importBtn.style.cssText = 'font-size:11px;padding:4px 10px;';
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });
    section.appendChild(importBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.textContent = t('settings.label.export_csv');
    exportBtn.setAttribute('data-testid', 'export-csv-btn');
    exportBtn.style.cssText = 'font-size:11px;padding:4px 10px;';
    exportBtn.addEventListener('click', () => {
      const csv = this.levelStore.exportToCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'level-mappings.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
    section.appendChild(exportBtn);

    return section;
  }

  private rebuild(): void {
    this.build();
  }

  private startInlineEdit(
    span: HTMLElement,
    currentValue: string,
    testId: string,
    onSave: (newValue: string) => boolean,
  ): void {
    const parent = span.parentElement;
    if (!parent) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.setAttribute('data-testid', testId);
    input.style.cssText =
      'flex:1;padding:2px 6px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:12px;font-family:var(--font-sans);min-width:0;';

    const commit = () => {
      if (onSave(input.value)) return;
      revert();
    };

    const revert = () => {
      parent.replaceChild(span, input);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        revert();
      }
    });

    input.addEventListener('blur', () => {
      if (parent.contains(input)) {
        commit();
      }
    });

    parent.replaceChild(input, span);
    input.focus();
    input.select();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.container.innerHTML = '';
  }
}
