import { ChartRenderer, RendererOptions } from '../renderer/chart-renderer';
import { CHART_THEME_PRESETS, ChartThemePreset, addCustomPreset } from '../store/theme-presets';
import { SettingsStore, type PersistableSettings } from '../store/settings-store';
import { CategoryStore } from '../store/category-store';
import { generateId } from '../utils/id';

interface SettingDef {
  key: keyof RendererOptions;
  label: string;
  type: 'range' | 'color';
  min?: number;
  max?: number;
  step?: number;
}

interface SettingGroup {
  title: string;
  settings: SettingDef[];
}

export interface CombinedPreset {
  id: string;
  name: string;
  colors: ChartThemePreset['colors'];
  sizes: Partial<RendererOptions>;
  isCustom?: boolean;
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Card Dimensions',
    settings: [
      { key: 'nodeWidth', label: 'Node Width', type: 'range', min: 50, max: 200, step: 1 },
      { key: 'nodeHeight', label: 'Node Height', type: 'range', min: 16, max: 60, step: 1 },
    ],
  },
  {
    title: 'Tree Spacing',
    settings: [
      { key: 'horizontalSpacing', label: 'Horizontal Spacing', type: 'range', min: 5, max: 100, step: 1 },
      { key: 'branchSpacing', label: 'Branch Spacing', type: 'range', min: 0, max: 60, step: 1 },
      { key: 'topVerticalSpacing', label: 'Top Vertical Spacing', type: 'range', min: 0, max: 50, step: 1 },
      { key: 'bottomVerticalSpacing', label: 'Bottom Vertical Spacing', type: 'range', min: 0, max: 50, step: 1 },
    ],
  },
  {
    title: 'IC Options',
    settings: [
      { key: 'icNodeWidth', label: 'IC Node Width', type: 'range', min: 40, max: 200, step: 1 },
      { key: 'icGap', label: 'IC Gap', type: 'range', min: 0, max: 20, step: 1 },
      { key: 'icContainerPadding', label: 'IC Container Padding', type: 'range', min: 0, max: 20, step: 1 },
    ],
  },
  {
    title: 'PAL Options',
    settings: [
      { key: 'palTopGap', label: 'PAL Top Gap', type: 'range', min: 0, max: 40, step: 1 },
      { key: 'palBottomGap', label: 'PAL Bottom Gap', type: 'range', min: 0, max: 40, step: 1 },
      { key: 'palRowGap', label: 'PAL Row Gap', type: 'range', min: 0, max: 20, step: 1 },
      { key: 'palCenterGap', label: 'PAL Center Gap', type: 'range', min: 10, max: 100, step: 1 },
    ],
  },
  {
    title: 'Typography',
    settings: [
      { key: 'nameFontSize', label: 'Name Font Size', type: 'range', min: 5, max: 20, step: 1 },
      { key: 'titleFontSize', label: 'Title Font Size', type: 'range', min: 5, max: 20, step: 1 },
      { key: 'textPaddingTop', label: 'Text Padding Top', type: 'range', min: 0, max: 15, step: 1 },
      { key: 'textGap', label: 'Text Gap', type: 'range', min: 0, max: 10, step: 1 },
    ],
  },
  {
    title: 'Link Style',
    settings: [
      { key: 'linkWidth', label: 'Link Width', type: 'range', min: 0.5, max: 5, step: 0.5 },
      { key: 'linkColor', label: 'Link Color', type: 'color' },
    ],
  },
  {
    title: 'Card Style',
    settings: [
      { key: 'cardStrokeWidth', label: 'Card Stroke Width', type: 'range', min: 0.5, max: 5, step: 0.5 },
      { key: 'cardStroke', label: 'Card Stroke', type: 'color' },
      { key: 'cardFill', label: 'Card Fill', type: 'color' },
      { key: 'icContainerFill', label: 'IC Container Fill', type: 'color' },
    ],
  },
];

const DEFAULT_SETTINGS: Record<string, number | string> = {
  nodeWidth: 110, nodeHeight: 22, horizontalSpacing: 30, branchSpacing: 10,
  topVerticalSpacing: 5, bottomVerticalSpacing: 12,
  icNodeWidth: 99, icGap: 4, icContainerPadding: 6,
  palTopGap: 7, palBottomGap: 7, palRowGap: 4, palCenterGap: 50,
  nameFontSize: 8, titleFontSize: 7, textPaddingTop: 4, textGap: 1,
  linkColor: '#94a3b8', linkWidth: 1.5,
  cardFill: '#ffffff', cardStroke: '#22c55e', cardStrokeWidth: 1, icContainerFill: '#e5e7eb',
};

export const LAYOUT_PRESETS: { name: string; icon: string; sizes: Partial<RendererOptions> }[] = [
  {
    name: 'Compact',
    icon: '▪',
    sizes: {
      nodeWidth: 90, nodeHeight: 18, horizontalSpacing: 20, branchSpacing: 6,
      topVerticalSpacing: 3, bottomVerticalSpacing: 8,
      icNodeWidth: 83, icGap: 3, icContainerPadding: 4,
      palTopGap: 5, palBottomGap: 5, palRowGap: 3, palCenterGap: 40,
      nameFontSize: 7, titleFontSize: 6, textPaddingTop: 3, textGap: 1,
    },
  },
  {
    name: 'Default',
    icon: '▫',
    sizes: {
      nodeWidth: 110, nodeHeight: 22, horizontalSpacing: 30, branchSpacing: 10,
      topVerticalSpacing: 5, bottomVerticalSpacing: 12,
      icNodeWidth: 99, icGap: 4, icContainerPadding: 6,
      palTopGap: 7, palBottomGap: 7, palRowGap: 4, palCenterGap: 50,
      nameFontSize: 8, titleFontSize: 7, textPaddingTop: 4, textGap: 1,
    },
  },
  {
    name: 'Spacious',
    icon: '▢',
    sizes: {
      nodeWidth: 140, nodeHeight: 28, horizontalSpacing: 40, branchSpacing: 16,
      topVerticalSpacing: 8, bottomVerticalSpacing: 16,
      icNodeWidth: 125, icGap: 5, icContainerPadding: 8,
      palTopGap: 10, palBottomGap: 10, palRowGap: 5, palCenterGap: 60,
      nameFontSize: 9, titleFontSize: 8, textPaddingTop: 5, textGap: 2,
    },
  },
  {
    name: 'Presentation',
    icon: '▣',
    sizes: {
      nodeWidth: 160, nodeHeight: 34, horizontalSpacing: 50, branchSpacing: 20,
      topVerticalSpacing: 10, bottomVerticalSpacing: 20,
      icNodeWidth: 141, icGap: 6, icContainerPadding: 10,
      palTopGap: 12, palBottomGap: 12, palRowGap: 6, palCenterGap: 70,
      nameFontSize: 11, titleFontSize: 9, textPaddingTop: 6, textGap: 2,
    },
  },
];

const DEFAULT_LAYOUT_SIZES = LAYOUT_PRESETS.find((p) => p.name === 'Default')!.sizes;

export const COMBINED_PRESETS: CombinedPreset[] = CHART_THEME_PRESETS.map((theme) => ({
  id: theme.id,
  name: theme.name,
  colors: theme.colors,
  sizes: DEFAULT_LAYOUT_SIZES,
}));

function sectionIdFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

const ALL_SECTION_IDS = [
  'presets',
  'categories',
  ...SETTING_GROUPS.map((g) => sectionIdFromTitle(g.title)),
  'settings-io',
];

export class SettingsEditor {
  private container: HTMLElement;
  private renderer: ChartRenderer;
  private rerenderCallback: () => void;
  private settingsStore: SettingsStore | null;
  private categoryStore: CategoryStore | null;

  private static ACCORDION_STORAGE_KEY = 'arbol-accordion-state';
  private static DEFAULT_EXPANDED = new Set(['presets', 'categories']);

  private accordionState: Map<string, boolean> = new Map();

  private static CUSTOM_PRESETS_KEY = 'arbol-custom-presets';

  constructor(
    container: HTMLElement,
    renderer: ChartRenderer,
    rerenderCallback: () => void,
    settingsStore?: SettingsStore,
    categoryStore?: CategoryStore,
  ) {
    this.container = container;
    this.renderer = renderer;
    this.rerenderCallback = rerenderCallback;
    this.settingsStore = settingsStore ?? null;
    this.categoryStore = categoryStore ?? null;
    this.loadAccordionState();
    this.build();
  }

  private loadAccordionState(): void {
    try {
      const raw = localStorage.getItem(SettingsEditor.ACCORDION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object') {
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'boolean') {
              this.accordionState.set(key, value);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  private saveAccordionState(): void {
    const obj: Record<string, boolean> = {};
    for (const [key, value] of this.accordionState) {
      obj[key] = value;
    }
    localStorage.setItem(SettingsEditor.ACCORDION_STORAGE_KEY, JSON.stringify(obj));
  }

  private isExpanded(sectionId: string): boolean {
    if (this.accordionState.has(sectionId)) {
      return this.accordionState.get(sectionId)!;
    }
    return SettingsEditor.DEFAULT_EXPANDED.has(sectionId);
  }

  private toggleSection(sectionId: string): void {
    const current = this.isExpanded(sectionId);
    this.accordionState.set(sectionId, !current);
    this.saveAccordionState();
  }

  private loadCustomPresets(): CombinedPreset[] {
    try {
      const raw = localStorage.getItem(SettingsEditor.CUSTOM_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: Record<string, unknown>) => ({
        ...p,
        isCustom: true,
      })) as CombinedPreset[];
    } catch { return []; }
  }

  private saveCustomPresets(presets: CombinedPreset[]): void {
    localStorage.setItem(
      SettingsEditor.CUSTOM_PRESETS_KEY,
      JSON.stringify(presets.map(({ id, name, colors, sizes }) => ({ id, name, colors, sizes }))),
    );
  }

  private deleteCustomPreset(id: string): void {
    const presets = this.loadCustomPresets().filter((p) => p.id !== id);
    this.saveCustomPresets(presets);
  }

  private createAccordionSection(
    id: string,
    title: string,
    content: HTMLElement | (() => HTMLElement),
    options?: { resetCallback?: () => void },
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'accordion-section';

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.setAttribute('aria-expanded', String(this.isExpanded(id)));
    header.setAttribute('aria-controls', `accordion-${id}`);

    const chevron = document.createElement('span');
    chevron.className = 'accordion-chevron';
    chevron.textContent = '▶';
    header.appendChild(chevron);

    const titleEl = document.createElement('span');
    titleEl.className = 'accordion-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (options?.resetCallback) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'accordion-reset';
      resetBtn.textContent = '↺';
      resetBtn.setAttribute('aria-label', `Reset ${title} to defaults`);
      resetBtn.setAttribute('data-tooltip', 'Reset to defaults');
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.resetCallback!();
      });
      header.appendChild(resetBtn);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'accordion-content';
    contentWrapper.id = `accordion-${id}`;
    contentWrapper.setAttribute('data-expanded', String(this.isExpanded(id)));

    const inner = document.createElement('div');
    inner.className = 'accordion-inner';

    const contentEl = typeof content === 'function' ? content() : content;
    inner.appendChild(contentEl);
    contentWrapper.appendChild(inner);

    header.addEventListener('click', () => {
      this.toggleSection(id);
      const expanded = this.isExpanded(id);
      header.setAttribute('aria-expanded', String(expanded));
      contentWrapper.setAttribute('data-expanded', String(expanded));
    });

    section.appendChild(header);
    section.appendChild(contentWrapper);
    return section;
  }

  private build(): void {
    this.container.innerHTML = '';

    const opts = this.renderer.getOptions();

    // Settings filter
    const filterWrapper = document.createElement('div');
    filterWrapper.style.cssText = 'margin-bottom:8px;position:relative;';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = '🔍  Filter settings…';
    filterInput.setAttribute('aria-label', 'Filter settings');
    filterInput.style.cssText =
      'width:100%;padding:6px 28px 6px 12px;font-size:12px;font-family:var(--font-sans);' +
      'border:1px solid var(--border-default);border-radius:var(--radius-full);' +
      'background:var(--bg-base);color:var(--text-primary);' +
      'transition:border-color var(--transition-fast);';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '×';
    clearBtn.setAttribute('aria-label', 'Clear filter');
    clearBtn.style.cssText =
      'position:absolute;right:8px;top:50%;transform:translateY(-50%);' +
      'border:none;background:transparent;color:var(--text-tertiary);' +
      'cursor:pointer;font-size:14px;padding:0 2px;' +
      'transition:color var(--transition-fast);';
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => {
      filterInput.value = '';
      filterInput.dispatchEvent(new Event('input'));
      filterInput.focus();
    });

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(clearBtn);
    this.container.appendChild(filterWrapper);

    // Mini card preview
    this.container.appendChild(this.buildPreviewCard());

    // Expand All / Collapse All toggle
    const actionsRow = document.createElement('div');
    actionsRow.className = 'accordion-actions';

    const toggleAllBtn = document.createElement('button');
    toggleAllBtn.textContent = 'Expand all';
    toggleAllBtn.addEventListener('click', () => {
      const allExpanded = ALL_SECTION_IDS.every((id) => this.isExpanded(id));
      for (const id of ALL_SECTION_IDS) {
        this.accordionState.set(id, !allExpanded);
      }
      this.saveAccordionState();
      this.build();
    });
    actionsRow.appendChild(toggleAllBtn);
    this.container.appendChild(actionsRow);

    // Unified Presets section
    this.container.appendChild(
      this.createAccordionSection('presets', 'Presets', () => this.buildPresetsContent()),
    );

    // Node Categories section
    if (this.categoryStore) {
      this.container.appendChild(
        this.createAccordionSection('categories', 'Node Categories', () =>
          this.buildCategoriesContent(),
        ),
      );
    }

    // Setting groups
    for (const group of SETTING_GROUPS) {
      const groupId = sectionIdFromTitle(group.title);
      const controlsContainer = document.createElement('div');
      for (const setting of group.settings) {
        const value = opts[setting.key] as number | string;
        controlsContainer.appendChild(this.createControl(setting, value));
      }

      const resetCallback = () => {
        const updates: Partial<RendererOptions> = {};
        for (const setting of group.settings) {
          const defaultVal = DEFAULT_SETTINGS[setting.key];
          if (defaultVal !== undefined) {
            (updates as Record<string, unknown>)[setting.key] = defaultVal;
          }
        }
        this.renderer.updateOptions(updates);
        this.rerenderCallback();
        this.build();
      };

      this.container.appendChild(
        this.createAccordionSection(groupId, group.title, controlsContainer, { resetCallback }),
      );
    }

    // Settings Import/Export section
    const ioBtnGroup = document.createElement('div');
    ioBtnGroup.className = 'btn-group';

    const exportSettingsBtn = document.createElement('button');
    exportSettingsBtn.className = 'btn btn-secondary';
    exportSettingsBtn.textContent = '💾 Export';
    exportSettingsBtn.addEventListener('click', () => {
      if (this.settingsStore) {
        const currentOpts = this.renderer.getOptions();
        this.settingsStore.saveImmediate(currentOpts as Partial<PersistableSettings>);
        this.settingsStore.exportToFile('my-chart-theme');
      }
    });
    ioBtnGroup.appendChild(exportSettingsBtn);

    const importSettingsBtn = document.createElement('button');
    importSettingsBtn.className = 'btn btn-secondary';
    importSettingsBtn.textContent = '📂 Import';
    importSettingsBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file || !this.settingsStore) return;
        if (file.size > 1 * 1024 * 1024) {
          alert('Settings file too large (max 1MB).');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const raw = JSON.parse(reader.result as string);
            const settings = this.settingsStore!.importFromFile(reader.result as string);
            this.renderer.updateOptions(settings as unknown as Partial<RendererOptions>);

            const presetName = raw.name || file.name.replace(/\.json$/i, '');
            const presetId = 'custom-' + presetName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            addCustomPreset({
              id: presetId,
              name: '⭐ ' + presetName,
              description: 'Imported custom theme',
              colors: {
                cardFill: settings.cardFill,
                cardStroke: settings.cardStroke,
                cardStrokeWidth: settings.cardStrokeWidth,
                linkColor: settings.linkColor,
                linkWidth: settings.linkWidth,
                icContainerFill: settings.icContainerFill,
              },
            });

            this.rerenderCallback();
            this.build();
          } catch (e) {
            alert(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
    ioBtnGroup.appendChild(importSettingsBtn);

    this.container.appendChild(
      this.createAccordionSection('settings-io', 'Settings', ioBtnGroup),
    );

    // Filter handler — wired after all sections are built
    let filterTimeout: ReturnType<typeof setTimeout> | null = null;

    filterInput.addEventListener('input', () => {
      if (filterTimeout) clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        const query = filterInput.value.trim().toLowerCase();
        clearBtn.style.display = query ? 'block' : 'none';

        const sections = this.container.querySelectorAll('.accordion-section');

        if (!query) {
          sections.forEach((section) => {
            (section as HTMLElement).style.opacity = '1';
            (section as HTMLElement).style.pointerEvents = '';
            const header = section.querySelector('.accordion-header') as HTMLElement;
            const content = section.querySelector('.accordion-content') as HTMLElement;
            if (header && content) {
              const sectionId = content.id.replace('accordion-', '');
              const expanded = this.isExpanded(sectionId);
              header.setAttribute('aria-expanded', String(expanded));
              content.setAttribute('data-expanded', String(expanded));
            }
          });
          return;
        }

        sections.forEach((section) => {
          const titleEl = section.querySelector('.accordion-title');
          const titleText = titleEl?.textContent?.toLowerCase() ?? '';

          let labelMatch = false;
          const labels = section.querySelectorAll('label');
          labels.forEach((label) => {
            if (label.textContent?.toLowerCase().includes(query)) {
              labelMatch = true;
            }
          });

          const presetNames = section.querySelectorAll('.preset-card span, button span');
          presetNames.forEach((el) => {
            if (el.textContent?.toLowerCase().includes(query)) {
              labelMatch = true;
            }
          });

          const matches = titleText.includes(query) || labelMatch;

          (section as HTMLElement).style.opacity = matches ? '1' : '0.3';
          (section as HTMLElement).style.pointerEvents = matches ? '' : 'none';

          const header = section.querySelector('.accordion-header') as HTMLElement;
          const content = section.querySelector('.accordion-content') as HTMLElement;
          if (header && content && matches) {
            header.setAttribute('aria-expanded', 'true');
            content.setAttribute('data-expanded', 'true');
          }
        });
      }, 150);
    });
  }

  private buildCategoriesContent(): HTMLElement {
    const wrapper = document.createElement('div');

    const categories = this.categoryStore!.getAll();

    for (const cat of categories) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = cat.color;
      colorInput.style.cssText = 'width:28px;height:22px;border:none;padding:0;cursor:pointer;flex-shrink:0;';
      colorInput.setAttribute('aria-label', `Color for ${cat.label}`);
      colorInput.addEventListener('input', () => {
        this.categoryStore!.update(cat.id, { color: colorInput.value });
        this.rerenderCallback();
      });
      row.appendChild(colorInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = cat.label;
      labelInput.style.cssText = 'flex:1;padding:3px 6px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:11px;font-family:var(--font-sans);min-width:0;';
      labelInput.setAttribute('aria-label', 'Category label');
      labelInput.addEventListener('change', () => {
        const newLabel = labelInput.value.trim();
        if (newLabel) {
          this.categoryStore!.update(cat.id, { label: newLabel });
          this.rerenderCallback();
        } else {
          labelInput.value = cat.label;
        }
      });
      row.appendChild(labelInput);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText = 'width:22px;height:22px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:transparent;color:var(--text-tertiary);cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms ease;';
      deleteBtn.setAttribute('aria-label', `Remove ${cat.label}`);
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.color = 'var(--danger)';
        deleteBtn.style.borderColor = 'var(--danger)';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.color = 'var(--text-tertiary)';
        deleteBtn.style.borderColor = 'var(--border-default)';
      });
      deleteBtn.addEventListener('click', () => {
        this.categoryStore!.remove(cat.id);
        this.rerenderCallback();
        this.build();
      });
      row.appendChild(deleteBtn);

      wrapper.appendChild(row);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = '+ Add Category';
    addBtn.style.cssText = 'font-size:11px;padding:4px 8px;width:100%;';
    addBtn.addEventListener('click', () => {
      this.categoryStore!.add('New Category', '#94a3b8');
      this.rerenderCallback();
      this.build();
    });
    wrapper.appendChild(addBtn);

    return wrapper;
  }

  private buildPresetsContent(): HTMLElement {
    const wrapper = document.createElement('div');

    // Combined preset grid
    const allPresets = [...COMBINED_PRESETS, ...this.loadCustomPresets()];

    const presetGrid = document.createElement('div');
    presetGrid.className = 'preset-grid';
    presetGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:12px;';

    for (const preset of allPresets) {
      const card = document.createElement('button');
      card.className = 'preset-card';
      card.setAttribute('data-preset-id', preset.id);
      card.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:6px 8px;position:relative;
        border:1px solid var(--border-default);border-radius:var(--radius-md);
        background:var(--bg-elevated);cursor:pointer;text-align:left;
        transition:all 120ms ease;font-family:var(--font-sans);
      `;

      const swatch = document.createElement('div');
      swatch.className = 'preset-swatch';
      swatch.style.cssText = `
        width:20px;height:20px;border-radius:3px;flex-shrink:0;
        background:${preset.colors.cardFill};
        border:2px solid ${preset.colors.cardStroke};
      `;
      card.appendChild(swatch);

      const name = document.createElement('span');
      name.textContent = preset.isCustom ? `⭐ ${preset.name}` : preset.name;
      name.style.cssText = 'font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;';
      card.appendChild(name);

      if (preset.isCustom) {
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'preset-delete';
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.style.cssText = `
          position:absolute;top:2px;right:4px;font-size:13px;line-height:1;
          color:var(--text-tertiary);cursor:pointer;opacity:0;
          transition:opacity 120ms ease;padding:0 2px;
        `;
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteCustomPreset(preset.id);
          this.build();
        });
        card.appendChild(deleteBtn);

        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--accent)';
          card.style.background = 'var(--bg-hover)';
          deleteBtn.style.opacity = '1';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--border-default)';
          card.style.background = 'var(--bg-elevated)';
          deleteBtn.style.opacity = '0';
        });
      } else {
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--accent)';
          card.style.background = 'var(--bg-hover)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--border-default)';
          card.style.background = 'var(--bg-elevated)';
        });
      }

      card.addEventListener('click', () => {
        this.renderer.updateOptions({
          ...preset.colors,
          ...preset.sizes,
        } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.build();
      });

      presetGrid.appendChild(card);
    }

    wrapper.appendChild(presetGrid);

    // Layout preset buttons (4-column grid)
    const layoutHeading = document.createElement('div');
    layoutHeading.textContent = 'Layout';
    layoutHeading.style.cssText = 'font-size:10px;color:var(--text-tertiary);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;';
    wrapper.appendChild(layoutHeading);

    const layoutGrid = document.createElement('div');
    layoutGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;';

    for (const lp of LAYOUT_PRESETS) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:2px;
        padding:6px 4px;border:1px solid var(--border-default);
        border-radius:var(--radius-md);background:var(--bg-elevated);
        cursor:pointer;transition:all 120ms ease;font-family:var(--font-sans);
      `;

      const icon = document.createElement('span');
      icon.textContent = lp.icon;
      icon.style.cssText = 'font-size:14px;line-height:1;color:var(--text-secondary);';
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = lp.name;
      label.style.cssText = 'font-size:9px;color:var(--text-tertiary);font-weight:600;';
      btn.appendChild(label);

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'var(--accent)';
        btn.style.background = 'var(--bg-hover)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'var(--border-default)';
        btn.style.background = 'var(--bg-elevated)';
      });

      btn.addEventListener('click', () => {
        this.renderer.updateOptions(lp.sizes);
        this.rerenderCallback();
        this.build();
      });

      layoutGrid.appendChild(btn);
    }

    wrapper.appendChild(layoutGrid);

    // Save as Preset button + inline name input
    const saveRow = document.createElement('div');
    saveRow.style.cssText = 'display:flex;gap:6px;align-items:center;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Preset name…';
    nameInput.setAttribute('aria-label', 'Custom preset name');
    nameInput.style.cssText =
      'flex:1;padding:4px 8px;font-size:11px;font-family:var(--font-sans);' +
      'border:1px solid var(--border-default);border-radius:var(--radius-sm);' +
      'background:var(--bg-surface);color:var(--text-primary);display:none;';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-secondary save-preset-btn';
    saveBtn.textContent = '💾 Save as Preset';
    saveBtn.style.cssText = 'font-size:11px;padding:4px 8px;width:100%;';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'Save';
    confirmBtn.style.cssText = 'font-size:11px;padding:4px 10px;display:none;';

    saveBtn.addEventListener('click', () => {
      nameInput.style.display = 'block';
      confirmBtn.style.display = 'block';
      saveBtn.style.display = 'none';
      nameInput.focus();
    });

    const doSave = () => {
      const presetName = nameInput.value.trim();
      if (!presetName) return;

      const opts = this.renderer.getOptions();
      const newPreset: CombinedPreset = {
        id: 'custom-' + generateId(),
        name: presetName,
        colors: {
          cardFill: String(opts.cardFill),
          cardStroke: String(opts.cardStroke),
          cardStrokeWidth: Number(opts.cardStrokeWidth),
          linkColor: String(opts.linkColor),
          linkWidth: Number(opts.linkWidth),
          icContainerFill: String(opts.icContainerFill),
        },
        sizes: {
          nodeWidth: Number(opts.nodeWidth),
          nodeHeight: Number(opts.nodeHeight),
          horizontalSpacing: Number(opts.horizontalSpacing),
          branchSpacing: Number(opts.branchSpacing),
          topVerticalSpacing: Number(opts.topVerticalSpacing),
          bottomVerticalSpacing: Number(opts.bottomVerticalSpacing),
          icNodeWidth: Number(opts.icNodeWidth),
          icGap: Number(opts.icGap),
          icContainerPadding: Number(opts.icContainerPadding),
          palTopGap: Number(opts.palTopGap),
          palBottomGap: Number(opts.palBottomGap),
          palRowGap: Number(opts.palRowGap),
          palCenterGap: Number(opts.palCenterGap),
          nameFontSize: Number(opts.nameFontSize),
          titleFontSize: Number(opts.titleFontSize),
          textPaddingTop: Number(opts.textPaddingTop),
          textGap: Number(opts.textGap),
        },
        isCustom: true,
      };

      const customs = this.loadCustomPresets();
      customs.push(newPreset);
      this.saveCustomPresets(customs);
      this.build();
    };

    confirmBtn.addEventListener('click', doSave);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSave();
    });

    saveRow.appendChild(saveBtn);
    saveRow.appendChild(nameInput);
    saveRow.appendChild(confirmBtn);
    wrapper.appendChild(saveRow);

    return wrapper;
  }

  private createControl(
    setting: SettingDef,
    currentValue: number | string,
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    if (setting.type === 'range') {
      const label = document.createElement('label');
      label.textContent = `${setting.label} `;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'setting-value';
      valueSpan.textContent = String(currentValue);
      label.appendChild(valueSpan);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(setting.min);
      input.max = String(setting.max);
      input.step = String(setting.step);
      input.value = String(currentValue);

      input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        valueSpan.textContent = String(val);
        this.renderer.updateOptions({ [setting.key]: val } as Partial<RendererOptions>);
        this.rerenderCallback();
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
    } else {
      const label = document.createElement('label');
      label.textContent = setting.label;

      const input = document.createElement('input');
      input.type = 'color';
      input.value = String(currentValue);

      input.addEventListener('input', () => {
        this.renderer.updateOptions({ [setting.key]: input.value } as Partial<RendererOptions>);
        this.rerenderCallback();
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
    }

    return wrapper;
  }

  private buildPreviewCard(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;justify-content:center;padding:12px 0 4px;';

    const opts = this.renderer.getOptions();

    const maxWidth = 160;
    const scale = Math.min(1, maxWidth / opts.nodeWidth);
    const w = opts.nodeWidth * scale;
    const h = opts.nodeHeight * scale;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(Math.ceil(w + 4)));
    svg.setAttribute('height', String(Math.ceil(h + 4)));
    svg.setAttribute('viewBox', `0 0 ${w + 4} ${h + 4}`);
    svg.setAttribute('aria-label', 'Card preview');
    svg.style.cssText = 'border-radius:var(--radius-sm);';

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '2');
    rect.setAttribute('y', '2');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', opts.cardFill);
    rect.setAttribute('stroke', opts.cardStroke);
    rect.setAttribute('stroke-width', String(opts.cardStrokeWidth));
    svg.appendChild(rect);

    const nameSize = (opts.nameFontSize ?? 8) * scale;
    const titleSize = (opts.titleFontSize ?? 7) * scale;
    const paddingTop = (opts.textPaddingTop ?? 4) * scale;
    const gap = (opts.textGap ?? 1) * scale;

    const nameText = document.createElementNS(svgNS, 'text');
    nameText.setAttribute('x', String(w / 2 + 2));
    nameText.setAttribute('y', String(2 + paddingTop + nameSize));
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('font-size', String(nameSize));
    nameText.setAttribute('font-weight', '600');
    nameText.setAttribute('font-family', 'var(--font-sans, sans-serif)');
    nameText.setAttribute('fill', 'var(--text-primary, #333)');
    nameText.textContent = 'Jane Doe';
    svg.appendChild(nameText);

    const titleText = document.createElementNS(svgNS, 'text');
    titleText.setAttribute('x', String(w / 2 + 2));
    titleText.setAttribute('y', String(2 + paddingTop + nameSize + gap + titleSize));
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('font-size', String(titleSize));
    titleText.setAttribute('font-family', 'var(--font-sans, sans-serif)');
    titleText.setAttribute('fill', 'var(--text-secondary, #666)');
    titleText.textContent = 'CEO';
    svg.appendChild(titleText);

    wrapper.appendChild(svg);
    return wrapper;
  }

  refresh(): void {
    this.build();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
