import { CategoryStore } from '../../store/category-store';
import { t } from '../../i18n';

export interface CategoryPanelDeps {
  categoryStore: CategoryStore;
  rerenderCallback: () => void;
  rebuildCallback: () => void;
}

export class CategoryPanel {
  private categoryStore: CategoryStore;
  private rerenderCallback: () => void;
  private rebuildCallback: () => void;

  constructor(deps: CategoryPanelDeps) {
    this.categoryStore = deps.categoryStore;
    this.rerenderCallback = deps.rerenderCallback;
    this.rebuildCallback = deps.rebuildCallback;
  }

  build(): HTMLElement {
    const wrapper = document.createElement('div');

    const categories = this.categoryStore.getAll();

    for (const cat of categories) {
      const container = document.createElement('div');
      container.className = 'mb-2';
      container.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border-subtle);';

      const row = document.createElement('div');
      row.className = 'flex-row';
      row.style.cssText = 'gap:8px;margin-bottom:4px;';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = cat.color;
      colorInput.style.cssText =
        'width:32px;height:32px;border:2px solid var(--border-default);padding:0;cursor:pointer;flex-shrink:0;border-radius:var(--radius-sm);-webkit-appearance:none;appearance:none;background:none;';
      colorInput.setAttribute('aria-label', t('settings.category_color_aria', { label: cat.label }));

      const nameColorInput = document.createElement('input');
      nameColorInput.type = 'color';
      nameColorInput.value = cat.nameColor ?? '#1e293b';
      nameColorInput.className = 'category-text-color-group';
      nameColorInput.style.cssText =
        'width:22px;height:18px;border:1px solid var(--border-default);padding:0;cursor:pointer;flex-shrink:0;border-radius:3px;-webkit-appearance:none;appearance:none;background:none;';
      nameColorInput.setAttribute('aria-label', t('settings.category_name_color_aria', { label: cat.label }));
      nameColorInput.addEventListener('input', () => {
        this.categoryStore.update(cat.id, { nameColor: nameColorInput.value });
        updatePreview();
        this.rerenderCallback();
      });

      const titleColorInput = document.createElement('input');
      titleColorInput.type = 'color';
      titleColorInput.value = cat.titleColor ?? '#64748b';
      titleColorInput.style.cssText =
        'width:22px;height:18px;border:1px solid var(--border-default);padding:0;cursor:pointer;flex-shrink:0;border-radius:3px;-webkit-appearance:none;appearance:none;background:none;';
      titleColorInput.setAttribute('aria-label', t('settings.category_title_color_aria', { label: cat.label }));
      titleColorInput.addEventListener('input', () => {
        this.categoryStore.update(cat.id, { titleColor: titleColorInput.value });
        updatePreview();
        this.rerenderCallback();
      });

      // Card preview
      const preview = document.createElement('div');
      preview.className = 'category-preview-card';
      preview.style.background = cat.color;

      const previewName = document.createElement('span');
      previewName.className = 'cat-preview-name';
      previewName.textContent = t('settings.category_preview_name');
      previewName.style.color = cat.nameColor ?? '#1e293b';
      preview.appendChild(previewName);

      const previewTitle = document.createElement('span');
      previewTitle.className = 'cat-preview-title';
      previewTitle.textContent = t('settings.category_preview_title');
      previewTitle.style.color = cat.titleColor ?? '#64748b';
      preview.appendChild(previewTitle);

      const updatePreview = () => {
        const updated = this.categoryStore.getById(cat.id);
        if (updated) {
          preview.style.background = updated.color;
          previewName.style.color = updated.nameColor ?? '#1e293b';
          previewTitle.style.color = updated.titleColor ?? '#64748b';
        }
      };

      colorInput.addEventListener('input', () => {
        this.categoryStore.update(cat.id, { color: colorInput.value });
        const updated = this.categoryStore.getById(cat.id);
        if (updated?.nameColor) nameColorInput.value = updated.nameColor;
        if (updated?.titleColor) titleColorInput.value = updated.titleColor;
        updatePreview();
        this.rerenderCallback();
      });
      row.appendChild(colorInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = cat.label;
      labelInput.style.cssText =
        'flex:1;padding:4px 8px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:11px;font-family:var(--font-sans);min-width:0;';
      labelInput.setAttribute('aria-label', t('settings.category_label_aria'));
      labelInput.addEventListener('change', () => {
        const newLabel = labelInput.value.trim();
        if (newLabel) {
          this.categoryStore.update(cat.id, { label: newLabel });
          this.rerenderCallback();
        } else {
          labelInput.value = cat.label;
        }
      });
      row.appendChild(labelInput);

      row.appendChild(preview);

      // Delete button with confirmation
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText =
        'width:24px;height:24px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:transparent;color:var(--text-tertiary);cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms ease;opacity:0.4;';
      deleteBtn.setAttribute('aria-label', t('settings.category_remove_aria', { label: cat.label }));

      let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
      let isConfirming = false;

      deleteBtn.addEventListener('mouseenter', () => {
        if (!isConfirming) {
          deleteBtn.style.color = 'var(--danger)';
          deleteBtn.style.borderColor = 'var(--danger)';
          deleteBtn.style.opacity = '1';
        }
      });
      deleteBtn.addEventListener('mouseleave', () => {
        if (!isConfirming) {
          deleteBtn.style.color = 'var(--text-tertiary)';
          deleteBtn.style.borderColor = 'var(--border-default)';
          deleteBtn.style.opacity = '0.4';
        }
      });
      deleteBtn.addEventListener('click', () => {
        if (isConfirming) {
          if (confirmTimeout) clearTimeout(confirmTimeout);
          this.categoryStore.remove(cat.id);
          this.rerenderCallback();
          this.rebuildCallback();
        } else {
          isConfirming = true;
          deleteBtn.textContent = '?';
          deleteBtn.className = 'category-delete-confirm';
          deleteBtn.style.cssText =
            'padding:2px 8px;cursor:pointer;flex-shrink:0;';
          confirmTimeout = setTimeout(() => {
            isConfirming = false;
            deleteBtn.textContent = '×';
            deleteBtn.className = '';
            deleteBtn.style.cssText =
              'width:24px;height:24px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:transparent;color:var(--text-tertiary);cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms ease;opacity:0.4;';
          }, 3000);
        }
      });
      row.appendChild(deleteBtn);

      container.appendChild(row);

      // Text color sub-row (improved layout)
      const textRow = document.createElement('div');
      textRow.className = 'category-text-colors';

      const textColorsLabel = document.createElement('span');
      textColorsLabel.className = 'category-text-colors-label';
      textColorsLabel.textContent = t('settings.category_text_colors');
      textRow.appendChild(textColorsLabel);

      const nameGroup = document.createElement('div');
      nameGroup.className = 'category-text-color-group';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = t('settings.category_name');
      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameColorInput);
      textRow.appendChild(nameGroup);

      const titleGroup = document.createElement('div');
      titleGroup.className = 'category-text-color-group';
      const titleLabel = document.createElement('label');
      titleLabel.textContent = t('settings.category_title');
      titleGroup.appendChild(titleLabel);
      titleGroup.appendChild(titleColorInput);
      textRow.appendChild(titleGroup);

      container.appendChild(textRow);
      wrapper.appendChild(container);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary w-full';
    addBtn.textContent = t('settings.add_category');
    addBtn.style.cssText = 'font-size:11px;padding:6px 8px;margin-top:8px;width:100%;display:flex;align-items:center;justify-content:center;gap:4px;border-style:dashed;';
    addBtn.addEventListener('click', () => {
      this.categoryStore.add('New Category', '#94a3b8');
      this.rerenderCallback();
      this.rebuildCallback();
    });
    wrapper.appendChild(addBtn);

    return wrapper;
  }
}
