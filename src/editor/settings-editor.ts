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
  title: string;
  description?: string;
  settings: SettingDef[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Card Dimensions',
    description: 'settings.section_desc.card_dimensions',
    settings: [
      { key: 'nodeWidth', label: 'Node Width', description: 'Width of each card in pixels', type: 'range', min: 50, max: 250, step: 1, unit: 'px' },
      { key: 'nodeHeight', label: 'Node Height', description: 'Height of each card in pixels', type: 'range', min: 16, max: 60, step: 1, unit: 'px' },
    ],
  },
  {
    title: 'Tree Spacing',
    description: 'settings.section_desc.tree_spacing',
    settings: [
      {
        key: 'horizontalSpacing',
        label: 'Horizontal Spacing',
        description: 'Minimum gap between adjacent cards',
        type: 'range',
        min: 5,
        max: 100,
        step: 1,
        unit: 'px',
      },
      { key: 'branchSpacing', label: 'Branch Spacing', description: 'Gap between sibling subtrees', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
      {
        key: 'topVerticalSpacing',
        label: 'Top Vertical Spacing',
        description: 'Manager to connector line gap',
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
        unit: 'px',
      },
      {
        key: 'bottomVerticalSpacing',
        label: 'Bottom Vertical Spacing',
        description: 'Connector line to child gap',
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    title: 'IC Options',
    description: 'settings.section_desc.ic_options',
    settings: [
      { key: 'icNodeWidth', label: 'IC Node Width', description: 'Width of IC cards', type: 'range', min: 40, max: 220, step: 1, unit: 'px' },
      { key: 'icGap', label: 'IC Gap', description: 'Spacing between stacked ICs', type: 'range', min: 0, max: 20, step: 1, unit: 'px' },
      {
        key: 'icContainerPadding',
        label: 'IC Container Padding',
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
      },
      { key: 'icContainerFill', label: 'IC Container Fill', description: 'Background of IC group box', type: 'color' },
      {
        key: 'icContainerBorderRadius',
        label: 'IC Container Border Radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    title: 'Advisor Options',
    description: 'settings.section_desc.advisor_options',
    settings: [
      { key: 'palTopGap', label: 'Advisor Top Gap', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'palBottomGap', label: 'Advisor Bottom Gap', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'palRowGap', label: 'Advisor Row Gap', type: 'range', min: 0, max: 20, step: 1, unit: 'px' },
      {
        key: 'palCenterGap',
        label: 'Advisor Center Gap',
        description: 'Gap between left/right columns',
        type: 'range',
        min: 10,
        max: 100,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    title: 'Typography',
    description: 'settings.section_desc.typography',
    settings: [
      { key: 'nameFontSize', label: 'Name Font Size', description: 'Font size for person names', type: 'range', min: 5, max: 20, step: 1, unit: 'px' },
      { key: 'titleFontSize', label: 'Title Font Size', description: 'Font size for job titles', type: 'range', min: 5, max: 20, step: 1, unit: 'px' },
      { key: 'textPaddingTop', label: 'Text Padding Top', type: 'range', min: 0, max: 15, step: 1, unit: 'px' },
      { key: 'textGap', label: 'Text Gap', description: 'Space between name and title', type: 'range', min: 0, max: 10, step: 1, unit: 'px' },
      {
        key: 'textAlign',
        label: 'Text Alignment',
        description: 'Text alignment within cards',
        type: 'select',
        options: ['left', 'center', 'right'],
      },
      {
        key: 'fontFamily',
        label: 'Font Family',
        type: 'select',
        options: ['Calibri', 'Arial', 'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Segoe UI', 'Microsoft Sans Serif'],
      },
      {
        key: 'textPaddingHorizontal',
        label: 'Text Padding Horizontal',
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
      },
      { key: 'nameColor', label: 'Name Color', description: 'Color for person names', type: 'color' },
      { key: 'titleColor', label: 'Title Color', description: 'Color for job titles', type: 'color' },
    ],
  },
  {
    title: 'Link Style',
    description: 'settings.section_desc.link_style',
    settings: [
      { key: 'linkWidth', label: 'Link Width', type: 'range', min: 0.5, max: 5, step: 0.5, unit: 'px' },
      { key: 'linkColor', label: 'Link Color', description: 'Color of connector lines', type: 'color' },
      { key: 'dottedLineDash', label: 'Dotted Line Pattern', description: 'Dash pattern e.g. "6,4"', type: 'text' },
    ],
  },
  {
    title: 'Card Style',
    description: 'settings.section_desc.card_style',
    settings: [
      {
        key: 'cardStrokeWidth',
        label: 'Card Stroke Width',
        type: 'range',
        min: 0.5,
        max: 5,
        step: 0.5,
        unit: 'px',
      },
      { key: 'cardStroke', label: 'Card Stroke', description: 'Card border color', type: 'color' },
      { key: 'cardFill', label: 'Card Fill', description: 'Background color of cards', type: 'color' },
      {
        key: 'cardBorderRadius',
        label: 'Card Border Radius',
        description: 'Rounded corner radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    title: 'Headcount Badge',
    description: 'settings.section_desc.headcount_badge',
    settings: [
      { key: 'showHeadcount', label: 'Show Headcount', description: 'Show badges on manager cards', type: 'checkbox' },
      {
        key: 'headcountBadgeFontSize',
        label: 'Badge Font Size',
        type: 'range',
        min: 5,
        max: 16,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgeHeight',
        label: 'Badge Height',
        type: 'range',
        min: 10,
        max: 30,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgeRadius',
        label: 'Badge Radius',
        type: 'range',
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
      },
      {
        key: 'headcountBadgePadding',
        label: 'Badge Padding',
        type: 'range',
        min: 2,
        max: 16,
        step: 1,
        unit: 'px',
      },
      { key: 'headcountBadgeColor', label: 'Badge Color', type: 'color' },
      { key: 'headcountBadgeTextColor', label: 'Badge Text Color', type: 'color' },
    ],
  },
  {
    title: 'Categories Legend',
    description: 'settings.section_desc.categories_legend',
    settings: [
      {
        key: 'legendRows',
        label: 'Legend Rows (0 = auto)',
        description: 'Number of rows in the legend',
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
      this.createAccordionSection('presets', 'Presets', () => this.presetPanel.build()),
    );

    // Node Categories section
    if (this.categoryPanel) {
      this.container.appendChild(
        this.createAccordionSection('categories', 'Node Categories', () =>
          this.categoryPanel!.build(),
        ),
      );
    }

    // Setting groups — flat sections (no accordion)
    for (const group of SETTING_GROUPS) {
      const groupId = sectionIdFromTitle(group.title);
      const section = document.createElement('div');
      section.className = 'setting-section';
      section.setAttribute('data-section-id', groupId);

      const title = document.createElement('div');
      title.className = 'setting-section-title';
      title.textContent = group.title;
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
      this.createAccordionSection('settings-io', 'Settings', this.settingsIOPanel.build()),
    );

    // Backup & Restore section
    if (this.backupPanel) {
      this.container.appendChild(
        this.createAccordionSection('backup-restore', 'Backup & Restore', this.backupPanel.build()),
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

    label.appendChild(document.createTextNode(setting.label));
    info.appendChild(label);

    // Description from i18n if available, fallback to inline description
    const descKey = `settings.desc.${setting.key.replace(/([A-Z])/g, '_$1').toLowerCase()}` as string;
    const descText = setting.description || '';
    if (descText) {
      const desc = document.createElement('div');
      desc.className = 'setting-desc';
      desc.textContent = descText;
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
      resetBtn.setAttribute('aria-label', `Reset ${setting.label} to default (${defaultValue})`);
      resetBtn.setAttribute('data-tooltip', `Default: ${defaultValue}${setting.unit ? ' ' + setting.unit : ''}`);
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
