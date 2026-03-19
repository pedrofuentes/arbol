import { ChartRenderer, RendererOptions } from '../renderer/chart-renderer';
import { PreviewRenderer } from '../renderer/preview-renderer';
import { SettingsStore } from '../store/settings-store';
import { CategoryStore } from '../store/category-store';
import type { ChartDB } from '../store/chart-db';
import { type IStorage, browserStorage } from '../utils/storage';
import { t } from '../i18n';
import { PresetPanel } from './settings/preset-panel';
import { CategoryPanel } from './settings/category-panel';
import { SettingsIOPanel } from './settings/settings-io';
import { BackupPanel } from './settings/backup-panel';

export type { CombinedPreset } from './settings/preset-panel';
export { COMBINED_PRESETS, LAYOUT_PRESETS } from './settings/preset-panel';

interface SettingDef {
  key: keyof RendererOptions;
  label: string;
  description?: string;
  type: 'range' | 'color' | 'text' | 'checkbox' | 'select';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
}

interface SettingGroup {
  sectionId: string;
  title: string;
  description?: string;
  settings: SettingDef[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    sectionId: 'card-dimensions',
    title: 'settings.group.card_dimensions',
    description: 'settings.section_desc.card_dimensions',
    settings: [
      { key: 'nodeWidth', label: 'settings.label.node_width', description: 'settings.desc.node_width', type: 'range', min: 50, max: 250, step: 1, unit: 'px' },
      { key: 'nodeHeight', label: 'settings.label.node_height', description: 'settings.desc.node_height', type: 'range', min: 16, max: 60, step: 1, unit: 'px' },
    ],
  },
  {
    sectionId: 'tree-spacing',
    title: 'settings.group.tree_spacing',
    description: 'settings.section_desc.tree_spacing',
    settings: [
      {
        key: 'horizontalSpacing',
        label: 'settings.label.horizontal_spacing',
        description: 'settings.desc.horizontal_spacing',
        type: 'range',
        min: 5,
        max: 100,
        step: 1,
        unit: 'px',
      },
      { key: 'branchSpacing', label: 'settings.label.branch_spacing', description: 'settings.desc.branch_spacing', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
      {
        key: 'topVerticalSpacing',
        label: 'settings.label.top_vertical_spacing',
        description: 'settings.desc.top_vertical_spacing',
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
        unit: 'px',
      },
      {
        key: 'bottomVerticalSpacing',
        label: 'settings.label.bottom_vertical_spacing',
        description: 'settings.desc.bottom_vertical_spacing',
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    sectionId: 'ic-options',
    title: 'settings.group.ic_options',
    description: 'settings.section_desc.ic_options',
    settings: [
      { key: 'icNodeWidth', label: 'settings.label.ic_node_width', description: 'settings.desc.ic_node_width', type: 'range', min: 40, max: 220, step: 1, unit: 'px' },
      { key: 'icGap', label: 'settings.label.ic_gap', description: 'settings.desc.ic_gap', type: 'range', min: 0, max: 20, step: 1, unit: 'px' },
      {
        key: 'icContainerPadding',
        label: 'settings.label.ic_container_padding',
        description: 'settings.desc.ic_container_padding',
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
      },
      { key: 'icContainerFill', label: 'settings.label.ic_container_fill', description: 'settings.desc.ic_container_fill', type: 'color' },
      {
        key: 'icContainerBorderRadius',
        label: 'settings.label.ic_container_border_radius',
        description: 'settings.desc.ic_container_border_radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    sectionId: 'advisor-options',
    title: 'settings.group.advisor_options',
    description: 'settings.section_desc.advisor_options',
    settings: [
      { key: 'palTopGap', label: 'settings.label.advisor_top_gap', description: 'settings.desc.advisor_top_gap', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'palBottomGap', label: 'settings.label.advisor_bottom_gap', description: 'settings.desc.advisor_bottom_gap', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'palRowGap', label: 'settings.label.advisor_row_gap', description: 'settings.desc.advisor_row_gap', type: 'range', min: 0, max: 20, step: 1, unit: 'px' },
      {
        key: 'palCenterGap',
        label: 'settings.label.advisor_center_gap',
        description: 'settings.desc.advisor_center_gap',
        type: 'range',
        min: 10,
        max: 100,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    sectionId: 'typography',
    title: 'settings.group.typography',
    description: 'settings.section_desc.typography',
    settings: [
      { key: 'nameFontSize', label: 'settings.label.name_font_size', description: 'settings.desc.name_font_size', type: 'range', min: 5, max: 20, step: 1, unit: 'px' },
      { key: 'titleFontSize', label: 'settings.label.title_font_size', description: 'settings.desc.title_font_size', type: 'range', min: 5, max: 20, step: 1, unit: 'px' },
      { key: 'textPaddingTop', label: 'settings.label.text_padding_top', description: 'settings.desc.text_padding_top', type: 'range', min: 0, max: 15, step: 1, unit: 'px' },
      { key: 'textGap', label: 'settings.label.text_gap', description: 'settings.desc.text_gap', type: 'range', min: 0, max: 10, step: 1, unit: 'px' },
      {
        key: 'textAlign',
        label: 'settings.label.text_alignment',
        description: 'settings.desc.text_alignment',
        type: 'select',
        options: ['left', 'center', 'right'],
      },
      {
        key: 'fontFamily',
        label: 'settings.label.font_family',
        description: 'settings.desc.font_family',
        type: 'select',
        options: ['Calibri', 'Arial', 'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Segoe UI', 'Microsoft Sans Serif'],
      },
      {
        key: 'textPaddingHorizontal',
        label: 'settings.label.text_padding_horizontal',
        description: 'settings.desc.text_padding_horizontal',
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
      },
      { key: 'nameColor', label: 'settings.label.name_color', description: 'settings.desc.name_color', type: 'color' },
      { key: 'titleColor', label: 'settings.label.title_color', description: 'settings.desc.title_color', type: 'color' },
    ],
  },
  {
    sectionId: 'link-style',
    title: 'settings.group.link_style',
    description: 'settings.section_desc.link_style',
    settings: [
      { key: 'linkWidth', label: 'settings.label.link_width', description: 'settings.desc.link_width', type: 'range', min: 0.5, max: 5, step: 0.5, unit: 'px' },
      { key: 'linkColor', label: 'settings.label.link_color', description: 'settings.desc.link_color', type: 'color' },
      { key: 'dottedLineDash', label: 'settings.label.dotted_line_pattern', description: 'settings.desc.dotted_line_pattern', type: 'text' },
    ],
  },
  {
    sectionId: 'card-style',
    title: 'settings.group.card_style',
    description: 'settings.section_desc.card_style',
    settings: [
      {
        key: 'cardStrokeWidth',
        label: 'settings.label.card_stroke_width',
        description: 'settings.desc.card_stroke_width',
        type: 'range',
        min: 0.5,
        max: 5,
        step: 0.5,
        unit: 'px',
      },
      { key: 'cardStroke', label: 'settings.label.card_stroke', description: 'settings.desc.card_stroke', type: 'color' },
      { key: 'cardFill', label: 'settings.label.card_fill', description: 'settings.desc.card_fill', type: 'color' },
      {
        key: 'cardBorderRadius',
        label: 'settings.label.card_border_radius',
        description: 'settings.desc.card_border_radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    sectionId: 'headcount-badge',
    title: 'settings.group.headcount_badge',
    description: 'settings.section_desc.headcount_badge',
    settings: [
      { key: 'showHeadcount', label: 'settings.label.show_headcount', description: 'settings.desc.show_headcount', type: 'checkbox' },
      {
        key: 'headcountBadgeFontSize',
        label: 'settings.label.badge_font_size',
        description: 'settings.desc.badge_font_size',
        type: 'range',
        min: 5,
        max: 16,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgeHeight',
        label: 'settings.label.badge_height',
        description: 'settings.desc.badge_height',
        type: 'range',
        min: 10,
        max: 30,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgeRadius',
        label: 'settings.label.badge_radius',
        description: 'settings.desc.badge_radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgePadding',
        label: 'settings.label.badge_padding',
        description: 'settings.desc.badge_padding',
        type: 'range',
        min: 2,
        max: 16,
        step: 1,
        unit: 'px',
      },
      { key: 'headcountBadgeColor', label: 'settings.label.badge_color', description: 'settings.desc.badge_color', type: 'color' },
      { key: 'headcountBadgeTextColor', label: 'settings.label.badge_text_color', description: 'settings.desc.badge_text_color', type: 'color' },
    ],
  },
  {
    sectionId: 'categories-legend',
    title: 'settings.group.categories_legend',
    description: 'settings.section_desc.categories_legend',
    settings: [
      {
        key: 'legendRows',
        label: 'settings.label.legend_rows',
        description: 'settings.desc.legend_rows',
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
        unit: 'rows',
      },
    ],
  },
];

const DEFAULT_SETTINGS: Record<string, number | string | boolean> = {
  nodeWidth: 160,
  nodeHeight: 34,
  horizontalSpacing: 50,
  branchSpacing: 20,
  topVerticalSpacing: 10,
  bottomVerticalSpacing: 20,
  icNodeWidth: 141,
  icGap: 6,
  icContainerPadding: 10,
  palTopGap: 12,
  palBottomGap: 12,
  palRowGap: 6,
  palCenterGap: 70,
  nameFontSize: 11,
  titleFontSize: 9,
  textPaddingTop: 6,
  textGap: 2,
  textAlign: 'center',
  textPaddingHorizontal: 8,
  fontFamily: 'Calibri',
  nameColor: '#1e293b',
  titleColor: '#64748b',
  linkColor: '#94a3b8',
  linkWidth: 1.5,
  dottedLineDash: '6,4',
  cardFill: '#ffffff',
  cardStroke: '#22c55e',
  cardStrokeWidth: 1,
  cardBorderRadius: 0,
  icContainerFill: '#e5e7eb',
  icContainerBorderRadius: 0,
  showHeadcount: false,
  headcountBadgeColor: '#9ca3af',
  headcountBadgeTextColor: '#1e293b',
  headcountBadgeFontSize: 11,
  headcountBadgeRadius: 4,
  headcountBadgePadding: 8,
  headcountBadgeHeight: 22,
  legendRows: 0,
};

function sectionIdFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export class SettingsEditor {
  private container: HTMLElement;
  private renderer: ChartRenderer;
  private rerenderCallback: () => void;
  private settingsStore: SettingsStore | null;
  private categoryStore: CategoryStore | null;
  private chartDB: ChartDB | null;
  private storage: IStorage;
  private onBuildCallback: (() => void) | null = null;
  private previewArea: HTMLElement | null = null;
  private previewRenderer: PreviewRenderer | null = null;
  private presetPanel: PresetPanel;
  private categoryPanel: CategoryPanel | null = null;
  private settingsIOPanel: SettingsIOPanel;
  private backupPanel: BackupPanel | null = null;

  constructor(
    container: HTMLElement,
    renderer: ChartRenderer,
    rerenderCallback: () => void,
    settingsStore?: SettingsStore,
    categoryStore?: CategoryStore,
    chartDB?: ChartDB,
    storage: IStorage = browserStorage,
  ) {
    this.container = container;
    this.renderer = renderer;
    this.rerenderCallback = rerenderCallback;
    this.settingsStore = settingsStore ?? null;
    this.categoryStore = categoryStore ?? null;
    this.chartDB = chartDB ?? null;
    this.storage = storage;

    const rebuildCallback = () => this.build();

    this.presetPanel = new PresetPanel({
      renderer,
      storage: this.storage,
      rerenderCallback,
      rebuildCallback,
    });

    if (categoryStore) {
      this.categoryPanel = new CategoryPanel({
        categoryStore,
        rerenderCallback,
        rebuildCallback,
      });
    }

    this.settingsIOPanel = new SettingsIOPanel({
      settingsStore: settingsStore ?? null,
      renderer,
      rerenderCallback,
      rebuildCallback,
    });

    if (chartDB) {
      this.backupPanel = new BackupPanel({
        chartDB,
        storage: this.storage,
      });
    }

    this.build();
  }

  setPreviewArea(area: HTMLElement): void {
    this.previewArea = area;
    if (this.previewRenderer) {
      this.previewRenderer.destroy();
    }
    const opts = this.renderer.getOptions();
    const categories = this.categoryStore?.getAll() ?? [];
    this.previewRenderer = new PreviewRenderer(area, { ...opts, categories } as Partial<RendererOptions>);
    this.previewRenderer.render();
  }

  wirePreviewControls(
    fitBtn: HTMLButtonElement,
    resetBtn: HTMLButtonElement,
    zoomPct: HTMLElement,
  ): void {
    if (!this.previewRenderer) return;
    const zm = this.previewRenderer.getZoomManager();
    if (!zm) return;

    const updatePct = () => {
      zoomPct.textContent = `${zm.getRelativeZoomPercent()}%`;
    };

    fitBtn.addEventListener('click', () => {
      zm.fitToContent(8);
      updatePct();
    });

    resetBtn.addEventListener('click', () => {
      zm.centerAtRealSize();
      updatePct();
    });

    zm.onZoom(updatePct);
    updatePct();
  }

  onBuild(callback: () => void): void {
    this.onBuildCallback = callback;
  }

  matchesExistingPreset(): boolean {
    return this.presetPanel.matchesExistingPreset();
  }

  saveCurrentAsPreset(name: string): void {
    this.presetPanel.saveCurrentAsPreset(name);
  }

  private createAccordionSection(
    id: string,
    title: string,
    content: HTMLElement | (() => HTMLElement),
    options?: { resetCallback?: () => void },
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'accordion-section';
    section.setAttribute('data-section-id', id);

    const headerId = `accordion-header-${id}`;

    const heading = document.createElement('h3');
    heading.style.cssText = 'margin:0;padding:0;font:inherit;';

    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.id = headerId;

    const titleEl = document.createElement('span');
    titleEl.className = 'accordion-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (options?.resetCallback) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'accordion-reset';
      resetBtn.textContent = '↺';
      resetBtn.setAttribute('aria-label', t('settings.reset_aria', { title }));
      resetBtn.setAttribute('data-tooltip', t('settings.reset_tooltip'));
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.resetCallback!();
      });
      header.appendChild(resetBtn);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'accordion-content';
    contentWrapper.id = `accordion-${id}`;
    contentWrapper.setAttribute('role', 'region');
    contentWrapper.setAttribute('aria-labelledby', headerId);
    contentWrapper.setAttribute('data-expanded', 'true');

    const inner = document.createElement('div');
    inner.className = 'accordion-inner';

    const contentEl = typeof content === 'function' ? content() : content;
    inner.appendChild(contentEl);
    contentWrapper.appendChild(inner);

    heading.appendChild(header);
    section.appendChild(heading);
    section.appendChild(contentWrapper);
    return section;
  }

  private build(): void {
    this.container.innerHTML = '';

    const opts = this.renderer.getOptions();

    // Unified Presets section
    this.container.appendChild(
      this.createAccordionSection('presets', t('settings.presets_section'), () => this.presetPanel.build()),
    );

    // Node Categories section
    if (this.categoryPanel) {
      this.container.appendChild(
        this.createAccordionSection('categories', t('settings.categories_section'), () =>
          this.categoryPanel!.build(),
        ),
      );
    }

    // Setting groups — flat sections (no accordion)
    for (const group of SETTING_GROUPS) {
      const groupId = group.sectionId;
      const section = document.createElement('div');
      section.className = 'setting-section';
      section.setAttribute('data-section-id', groupId);

      const title = document.createElement('div');
      title.className = 'setting-section-title';
      title.textContent = t(group.title);
      section.appendChild(title);

      if (group.description) {
        const desc = document.createElement('div');
        desc.className = 'section-intro';
        desc.textContent = t(group.description);
        section.appendChild(desc);
      }

      for (const setting of group.settings) {
        const value = opts[setting.key] as number | string | boolean;
        section.appendChild(this.createControl(setting, value));
      }

      this.container.appendChild(section);
    }

    // Settings Import/Export section
    this.container.appendChild(
      this.createAccordionSection('settings-io', t('settings.settings_section'), this.settingsIOPanel.build()),
    );

    // Backup & Restore section
    if (this.backupPanel) {
      this.container.appendChild(
        this.createAccordionSection('backup-restore', t('settings.backup_section'), this.backupPanel.build()),
      );
    }

    this.updatePreview();
    this.onBuildCallback?.();
  }

  private createControl(setting: SettingDef, currentValue: number | string | boolean): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-row';
    const inputId = `setting-${setting.key}`;

    const defaultValue = DEFAULT_SETTINGS[setting.key];
    const isModified = defaultValue !== undefined && currentValue !== defaultValue;

    const info = document.createElement('div');
    info.className = 'setting-info';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.htmlFor = inputId;

    // Modified dot — always created, visibility toggled
    const dot = document.createElement('span');
    dot.className = 'setting-modified-dot';
    dot.style.display = isModified ? '' : 'none';
    label.appendChild(dot);

    label.appendChild(document.createTextNode(t(setting.label)));
    info.appendChild(label);

    if (setting.description) {
      const desc = document.createElement('div');
      desc.className = 'setting-desc';
      desc.textContent = t(setting.description);
      info.appendChild(desc);
    }

    const control = document.createElement('div');
    control.className = 'setting-control';

    // Reset button — always created, visibility toggled
    const resetBtn = document.createElement('button');
    resetBtn.className = 'setting-reset-btn';
    if (isModified) resetBtn.classList.add('visible');
    resetBtn.textContent = '↺';
    if (defaultValue !== undefined) {
      resetBtn.setAttribute('aria-label', t('settings.reset_setting_aria', { label: t(setting.label), default: String(defaultValue) }));
      resetBtn.setAttribute('data-tooltip', t('settings.reset_setting_tooltip', { default: String(defaultValue) + (setting.unit ? ' ' + setting.unit : '') }));
    }

    const updateModifiedState = (newValue: number | string | boolean) => {
      const modified = defaultValue !== undefined && newValue !== defaultValue;
      dot.style.display = modified ? '' : 'none';
      if (modified) {
        resetBtn.classList.add('visible');
      } else {
        resetBtn.classList.remove('visible');
      }
    };

    resetBtn.addEventListener('click', () => {
      if (defaultValue === undefined) return;
      this.renderer.updateOptions({ [setting.key]: defaultValue } as Partial<RendererOptions>);
      this.rerenderCallback();
      this.build();
    });

    if (setting.type === 'checkbox') {
      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'checkbox';
      input.checked = Boolean(currentValue);

      input.addEventListener('change', () => {
        this.renderer.updateOptions({ [setting.key]: input.checked } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.updatePreview();
        updateModifiedState(input.checked);
      });

      control.appendChild(input);
    } else if (setting.type === 'range') {
      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'range';
      input.min = String(setting.min);
      input.max = String(setting.max);
      input.step = String(setting.step);
      input.value = String(currentValue);

      const valueSpan = document.createElement('span');
      valueSpan.className = 'setting-value';
      valueSpan.textContent = String(currentValue);

      if (setting.unit) {
        const unitSpan = document.createElement('span');
        unitSpan.className = 'setting-unit';
        unitSpan.textContent = setting.unit;
        valueSpan.appendChild(document.createTextNode(' '));
        valueSpan.textContent = String(currentValue);
        valueSpan.appendChild(document.createTextNode(' '));
        valueSpan.appendChild(unitSpan);
      }

      input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        if (setting.unit) {
          valueSpan.textContent = '';
          valueSpan.appendChild(document.createTextNode(String(val) + ' '));
          const unitSpan = document.createElement('span');
          unitSpan.className = 'setting-unit';
          unitSpan.textContent = setting.unit;
          valueSpan.appendChild(unitSpan);
        } else {
          valueSpan.textContent = String(val);
        }
        this.renderer.updateOptions({ [setting.key]: val } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.updatePreview();
        updateModifiedState(val);
      });

      control.appendChild(input);
      control.appendChild(valueSpan);
    } else if (setting.type === 'select') {
      const select = document.createElement('select');
      select.id = inputId;

      for (const opt of setting.options ?? []) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
        if (opt === String(currentValue)) option.selected = true;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        this.renderer.updateOptions({ [setting.key]: select.value } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.updatePreview();
        updateModifiedState(select.value);
      });

      control.appendChild(select);
    } else if (setting.type === 'text') {
      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'text';
      input.value = String(currentValue);

      input.addEventListener('change', () => {
        this.renderer.updateOptions({ [setting.key]: input.value } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.updatePreview();
        updateModifiedState(input.value);
      });

      control.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'color';
      input.className = 'color-swatch-input';
      input.value = String(currentValue);

      input.addEventListener('input', () => {
        this.renderer.updateOptions({ [setting.key]: input.value } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.updatePreview();
        updateModifiedState(input.value);
      });

      control.appendChild(input);
    }

    control.appendChild(resetBtn);

    wrapper.appendChild(info);
    wrapper.appendChild(control);

    return wrapper;
  }

  refresh(): void {
    this.build();
  }

  private updatePreview(): void {
    if (!this.previewRenderer) return;
    const opts = this.renderer.getOptions();
    const categories = this.categoryStore?.getAll() ?? [];
    this.previewRenderer.updateOptions({ ...opts, categories } as Partial<RendererOptions>);
    this.previewRenderer.render();
  }

  destroy(): void {
    this.previewRenderer?.destroy();
    this.container.innerHTML = '';
  }
}
