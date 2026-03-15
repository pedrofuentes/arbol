import { ChartRenderer, RendererOptions } from '../renderer/chart-renderer';
import { CHART_THEME_PRESETS, ChartThemePreset, addCustomPreset } from '../store/theme-presets';
import { SettingsStore, type PersistableSettings } from '../store/settings-store';
import { CategoryStore } from '../store/category-store';
import { generateId } from '../utils/id';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showToast } from '../ui/toast';
import type { ChartDB } from '../store/chart-db';
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreFullReplace,
  restoreMerge,
  getBackupSummary,
} from '../store/backup-manager';
import { showRestoreStrategyDialog } from '../ui/restore-dialog';
import { type IStorage, browserStorage } from '../utils/storage';
import { t } from '../i18n';

const ARBOL_STORAGE_KEYS = [
  'arbol-org-data',
  'arbol-settings',
  'arbol-categories',
  'arbol-csv-mappings',
  'arbol-accordion-state',
  'arbol-custom-presets',
  'arbol-theme',
];

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

export const LAYOUT_PRESETS: { name: string; icon: string; sizes: Partial<RendererOptions> }[] = [
  {
    name: 'Compact',
    icon: '▪',
    sizes: {
      nodeWidth: 110,
      nodeHeight: 22,
      horizontalSpacing: 30,
      branchSpacing: 10,
      topVerticalSpacing: 5,
      bottomVerticalSpacing: 12,
      icNodeWidth: 99,
      icGap: 4,
      icContainerPadding: 6,
      palTopGap: 7,
      palBottomGap: 7,
      palRowGap: 4,
      palCenterGap: 50,
      nameFontSize: 8,
      titleFontSize: 7,
      legendFontSize: 8,
      textPaddingTop: 4,
      textGap: 1,
    },
  },
  {
    name: 'Default',
    icon: '▫',
    sizes: {
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
      legendFontSize: 12,
      textPaddingTop: 6,
      textGap: 2,
    },
  },
  {
    name: 'Spacious',
    icon: '▢',
    sizes: {
      nodeWidth: 190,
      nodeHeight: 42,
      horizontalSpacing: 60,
      branchSpacing: 26,
      topVerticalSpacing: 14,
      bottomVerticalSpacing: 26,
      icNodeWidth: 167,
      icGap: 8,
      icContainerPadding: 12,
      palTopGap: 16,
      palBottomGap: 16,
      palRowGap: 8,
      palCenterGap: 85,
      nameFontSize: 13,
      titleFontSize: 11,
      legendFontSize: 14,
      textPaddingTop: 8,
      textGap: 3,
    },
  },
  {
    name: 'Presentation',
    icon: '▣',
    sizes: {
      nodeWidth: 220,
      nodeHeight: 50,
      horizontalSpacing: 70,
      branchSpacing: 32,
      topVerticalSpacing: 18,
      bottomVerticalSpacing: 32,
      icNodeWidth: 194,
      icGap: 10,
      icContainerPadding: 14,
      palTopGap: 20,
      palBottomGap: 20,
      palRowGap: 10,
      palCenterGap: 100,
      nameFontSize: 15,
      titleFontSize: 12,
      legendFontSize: 16,
      textPaddingTop: 10,
      textGap: 3,
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
  'settings-io',
  'backup-restore',
];

export class SettingsEditor {
  private container: HTMLElement;
  private renderer: ChartRenderer;
  private rerenderCallback: () => void;
  private settingsStore: SettingsStore | null;
  private categoryStore: CategoryStore | null;
  private chartDB: ChartDB | null;
  private storage: IStorage;

  private static ACCORDION_STORAGE_KEY = 'arbol-accordion-state';
  private static DEFAULT_EXPANDED = new Set(['presets', 'categories']);

  private accordionState: Map<string, boolean> = new Map();
  private previewAreas: Map<string, HTMLElement> = new Map();

  private static CUSTOM_PRESETS_KEY = 'arbol-custom-presets';

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
    this.loadAccordionState();
    this.build();
  }

  private loadAccordionState(): void {
    try {
      const raw = this.storage.getItem(SettingsEditor.ACCORDION_STORAGE_KEY);
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
    } catch {
      /* ignore */
    }
  }

  private saveAccordionState(): void {
    const obj: Record<string, boolean> = {};
    for (const [key, value] of this.accordionState) {
      obj[key] = value;
    }
    this.storage.setItem(SettingsEditor.ACCORDION_STORAGE_KEY, JSON.stringify(obj));
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
      const raw = this.storage.getItem(SettingsEditor.CUSTOM_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: Record<string, unknown>) => ({
        ...p,
        isCustom: true,
      })) as CombinedPreset[];
    } catch {
      return [];
    }
  }

  private saveCustomPresets(presets: CombinedPreset[]): void {
    this.storage.setItem(
      SettingsEditor.CUSTOM_PRESETS_KEY,
      JSON.stringify(presets.map(({ id, name, colors, sizes }) => ({ id, name, colors, sizes }))),
    );
  }

  saveCurrentAsPreset(name: string): void {
    const opts = this.renderer.getOptions();
    const newPreset: CombinedPreset = {
      id: 'custom-' + generateId(),
      name,
      colors: {
        cardFill: String(opts.cardFill),
        cardStroke: String(opts.cardStroke),
        cardStrokeWidth: Number(opts.cardStrokeWidth),
        linkColor: String(opts.linkColor),
        linkWidth: Number(opts.linkWidth),
        icContainerFill: String(opts.icContainerFill),
        nameColor: String(opts.nameColor),
        titleColor: String(opts.titleColor),
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
    section.setAttribute('data-section-id', id);

    const headerId = `accordion-header-${id}`;

    const heading = document.createElement('h3');
    heading.style.cssText = 'margin:0;padding:0;font:inherit;';

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.id = headerId;
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
    contentWrapper.setAttribute('role', 'region');
    contentWrapper.setAttribute('aria-labelledby', headerId);
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

    heading.appendChild(header);
    section.appendChild(heading);
    section.appendChild(contentWrapper);
    return section;
  }

  private build(): void {
    this.container.innerHTML = '';
    this.previewAreas.clear();

    const opts = this.renderer.getOptions();

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

    // Preview strips for each tab
    const previewTabs = ['presets', 'layout', 'typography', 'cards', 'connectors', 'ic', 'advisors', 'badges'];
    for (const tabId of previewTabs) {
      this.container.appendChild(this.buildPreviewStrip(tabId));
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
          showToast('Settings file too large (max 1MB).', 'error');
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
                nameColor: settings.nameColor,
                titleColor: settings.titleColor,
              },
            });

            this.rerenderCallback();
            this.build();
          } catch (e) {
            showToast(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
          }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
    ioBtnGroup.appendChild(importSettingsBtn);

    this.container.appendChild(this.createAccordionSection('settings-io', 'Settings', ioBtnGroup));

    // Backup & Restore section
    if (this.chartDB) {
      const backupBtnGroup = document.createElement('div');
      backupBtnGroup.className = 'btn-group';

      const backupBtn = document.createElement('button');
      backupBtn.className = 'btn btn-secondary';
      backupBtn.textContent = '💾 Create Backup';
      backupBtn.addEventListener('click', async () => {
        try {
          const backup = await createBackup(this.chartDB!);
          downloadBackup(backup);
        } catch (e) {
          showToast(`Backup failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
      });
      backupBtnGroup.appendChild(backupBtn);

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-secondary';
      restoreBtn.textContent = '📂 Restore';
      restoreBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const backup = await readBackupFile(file);
            const summary = getBackupSummary(backup);
            const date = new Date(summary.createdAt).toLocaleString();

            const strategy = await showRestoreStrategyDialog({
              chartCount: summary.chartCount,
              versionCount: summary.versionCount,
              backupDate: date,
              appVersion: summary.appVersion,
            });

            if (strategy === 'cancel') return;

            if (strategy === 'replace') {
              // Auto-backup before destructive replace
              try {
                const autoBackup = await createBackup(this.chartDB!);
                downloadBackup(autoBackup);
              } catch {
                // If auto-backup fails, still let the user proceed
              }

              const confirmed = await showConfirmDialog({
                title: 'Replace All Data',
                message:
                  'This will permanently replace all existing charts, versions, and settings ' +
                  'with the backup data. A backup of your current data has been downloaded.\n\n' +
                  'Continue?',
                confirmLabel: 'Replace everything',
                danger: true,
              });
              if (!confirmed) return;

              await restoreFullReplace(this.chartDB!, backup);
              window.location.reload();
            } else {
              const result = await restoreMerge(this.chartDB!, backup);
              await showConfirmDialog({
                title: 'Merge Complete',
                message:
                  `Added ${result.chartsAdded} chart(s) and ${result.versionsAdded} version(s). ` +
                  `Skipped ${result.chartsSkipped} chart(s) that already existed.\n\n` +
                  'The page will reload to apply changes.',
                confirmLabel: 'OK',
              });
              window.location.reload();
            }
          } catch (e) {
            showToast(`Restore failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
          }
        });
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
      backupBtnGroup.appendChild(restoreBtn);

      // Clear All Data button — inside the backup section
      const clearDataBtn = document.createElement('button');
      clearDataBtn.textContent = '🗑 Clear All Data';
      clearDataBtn.setAttribute('aria-label', 'Clear all local data');
      clearDataBtn.style.cssText = `
        width:100%;margin-top:12px;padding:8px 14px;font-size:12px;
        font-family:var(--font-sans);cursor:pointer;
        background:transparent;color:var(--text-tertiary);
        border:1px solid var(--border-default);border-radius:var(--radius-md);
        transition:background var(--transition-fast),color var(--transition-fast),border-color var(--transition-fast);
      `;
      clearDataBtn.addEventListener('mouseenter', () => {
        clearDataBtn.style.background = 'var(--bg-danger, #fef2f2)';
        clearDataBtn.style.color = 'var(--text-danger, #dc2626)';
        clearDataBtn.style.borderColor = 'var(--text-danger, #dc2626)';
      });
      clearDataBtn.addEventListener('mouseleave', () => {
        clearDataBtn.style.background = 'transparent';
        clearDataBtn.style.color = 'var(--text-tertiary)';
        clearDataBtn.style.borderColor = 'var(--border-default)';
      });
      clearDataBtn.addEventListener('click', async () => {
        // Auto-backup before destructive clear
        if (this.chartDB) {
          try {
            const autoBackup = await createBackup(this.chartDB);
            downloadBackup(autoBackup);
          } catch {
            // If auto-backup fails, still allow the user to proceed
          }
        }

        const confirmed = await showConfirmDialog({
          title: 'Clear All Data',
          message:
            'This will permanently delete all your org charts, versions, settings, themes, and preferences. ' +
            'This cannot be undone.\n\nAre you sure?',
          confirmLabel: 'Delete everything',
          danger: true,
        });
        if (confirmed) {
          for (const key of ARBOL_STORAGE_KEYS) {
            this.storage.removeItem(key);
          }
          indexedDB.deleteDatabase('arbol-db');
          window.location.reload();
        }
      });
      backupBtnGroup.appendChild(clearDataBtn);

      this.container.appendChild(
        this.createAccordionSection('backup-restore', 'Backup & Restore', backupBtnGroup),
      );
    }

  }

  private buildCategoriesContent(): HTMLElement {
    const wrapper = document.createElement('div');

    const categories = this.categoryStore!.getAll();

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
        this.categoryStore!.update(cat.id, { nameColor: nameColorInput.value });
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
        this.categoryStore!.update(cat.id, { titleColor: titleColorInput.value });
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
        const updated = this.categoryStore!.getById(cat.id);
        if (updated) {
          preview.style.background = updated.color;
          previewName.style.color = updated.nameColor ?? '#1e293b';
          previewTitle.style.color = updated.titleColor ?? '#64748b';
        }
      };

      colorInput.addEventListener('input', () => {
        this.categoryStore!.update(cat.id, { color: colorInput.value });
        const updated = this.categoryStore!.getById(cat.id);
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
          this.categoryStore!.update(cat.id, { label: newLabel });
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
          this.categoryStore!.remove(cat.id);
          this.rerenderCallback();
          this.build();
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
      this.categoryStore!.add('New Category', '#94a3b8');
      this.rerenderCallback();
      this.build();
    });
    wrapper.appendChild(addBtn);

    return wrapper;
  }

  private buildPreviewStrip(tabId: string): HTMLElement {
    const strip = document.createElement('div');
    strip.className = 'preview-strip';
    strip.setAttribute('data-section-id', `preview-${tabId}`);

    const header = document.createElement('div');
    header.className = 'preview-header';
    const title = document.createElement('span');
    title.className = 'preview-title';
    title.textContent = t('settings.preview_title');
    const hint = document.createElement('span');
    hint.className = 'preview-hint';
    hint.textContent = t('settings.preview_hint');
    header.appendChild(title);
    header.appendChild(hint);
    strip.appendChild(header);

    const area = document.createElement('div');
    area.className = 'preview-area';
    this.previewAreas.set(tabId, area);
    this.renderPreviewSvg(tabId, area);

    strip.appendChild(area);
    return strip;
  }

  private renderPreviewSvg(tabId: string, area: HTMLElement): void {
    area.innerHTML = '';

    const ns = 'http://www.w3.org/2000/svg';
    const svgEl = (tag: string, attrs: Record<string, string | number>): SVGElement => {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      return el;
    };

    const svg = svgEl('svg', { viewBox: '0 0 440 120', width: '440', height: '120' }) as SVGSVGElement;
    svg.style.cssText = 'display:block;max-width:100%;height:auto;';

    const opts = this.renderer.getOptions();

    switch (tabId) {
      case 'presets': {
        const cw = 70;
        const ch = 20;
        const rootX = 220 - cw / 2;
        const rootY = 4;

        // Root card
        svg.appendChild(svgEl('rect', { x: rootX, y: rootY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: 220, y: rootY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.nameColor ?? '#1e293b' })).textContent = 'CEO';

        // Connectors
        const midY = rootY + ch + 8;
        svg.appendChild(svgEl('line', { x1: 220, y1: rootY + ch, x2: 220, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: 90, y1: midY, x2: 350, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        const childY = midY + 8;
        const childXs = [55, 175, 305];
        const labels = ['VP Eng', 'VP Sales', 'VP Product'];
        for (let i = 0; i < 3; i++) {
          svg.appendChild(svgEl('line', { x1: childXs[i] + cw / 2, y1: midY, x2: childXs[i] + cw / 2, y2: childY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
          svg.appendChild(svgEl('rect', { x: childXs[i], y: childY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
          svg.appendChild(svgEl('text', { x: childXs[i] + cw / 2, y: childY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = labels[i];
        }

        // IC stack under first child
        const icTop = childY + ch + 4;
        const icW = cw - 8;
        const icContainer = svgEl('rect', { x: childXs[0] + 4, y: icTop, width: icW, height: 28, rx: opts.icContainerBorderRadius ?? 0, fill: opts.icContainerFill ?? '#e5e7eb' });
        svg.appendChild(icContainer);
        for (let i = 0; i < 2; i++) {
          const icY = icTop + 4 + i * 12;
          svg.appendChild(svgEl('rect', { x: childXs[0] + 8, y: icY, width: icW - 8, height: 9, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': 0.5 }));
          svg.appendChild(svgEl('text', { x: childXs[0] + cw / 2, y: icY + 6, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '5', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = `IC ${i + 1}`;
        }

        // Category-colored card
        const cats = this.categoryStore ? this.categoryStore.getAll() : [];
        if (cats.length > 0) {
          const cat = cats[0];
          svg.appendChild(svgEl('rect', { x: childXs[1], y: childY + ch + 4, width: cw, height: 14, rx: opts.cardBorderRadius ?? 0, fill: cat.color, stroke: cat.color, 'stroke-width': 0.5 }));
          svg.appendChild(svgEl('text', { x: childXs[1] + cw / 2, y: childY + ch + 13, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '5', 'font-family': opts.fontFamily ?? 'Calibri', fill: cat.nameColor ?? '#fff' })).textContent = cat.label;
        }
        break;
      }

      case 'layout': {
        const s = 0.5;
        const cw = opts.nodeWidth * s;
        const ch = opts.nodeHeight * s;
        const rootX = 220 - cw / 2;
        const rootY = 8;
        const childY = rootY + ch + (opts.topVerticalSpacing ?? 10) * s + (opts.bottomVerticalSpacing ?? 20) * s;
        const gap = (opts.horizontalSpacing ?? 50) * s;
        const child1X = 220 - gap / 2 - cw;
        const child2X = 220 + gap / 2;

        // Root card
        svg.appendChild(svgEl('rect', { x: rootX, y: rootY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: rootX + cw / 2, y: rootY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Manager';

        // Connectors
        const midY = rootY + ch + (opts.topVerticalSpacing ?? 10) * s;
        svg.appendChild(svgEl('line', { x1: 220, y1: rootY + ch, x2: 220, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: child1X + cw / 2, y1: midY, x2: child2X + cw / 2, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: child1X + cw / 2, y1: midY, x2: child1X + cw / 2, y2: childY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: child2X + cw / 2, y1: midY, x2: child2X + cw / 2, y2: childY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        // Child cards
        svg.appendChild(svgEl('rect', { x: child1X, y: childY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: child1X + cw / 2, y: childY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Report A';
        svg.appendChild(svgEl('rect', { x: child2X, y: childY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: child2X + cw / 2, y: childY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Report B';

        // Spacing indicators
        const dashStyle = 'stroke:#94a3b8;stroke-width:0.5;stroke-dasharray:2,2';
        // Horizontal spacing indicator
        const indY = childY + ch + 8;
        svg.appendChild(svgEl('line', { x1: child1X + cw, y1: indY, x2: child2X, y2: indY, style: dashStyle }));
        const spacingLabel = svgEl('text', { x: 220, y: indY + 8, 'text-anchor': 'middle', 'font-size': '6', fill: '#94a3b8' });
        spacingLabel.textContent = `${opts.horizontalSpacing ?? 50}px`;
        svg.appendChild(spacingLabel);
        break;
      }

      case 'typography': {
        const cw = Math.min(opts.nodeWidth * 1.4, 200);
        const ch = Math.max(opts.nodeHeight * 1.8, 50);
        const cx = 220 - cw / 2;
        const cy = 10;
        svg.appendChild(svgEl('rect', { x: cx, y: cy, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));

        const align = opts.textAlign ?? 'center';
        let textX = cx + cw / 2;
        let anchor = 'middle';
        if (align === 'left' || align === 'start') { textX = cx + (opts.textPaddingHorizontal ?? 8); anchor = 'start'; }
        else if (align === 'right' || align === 'end') { textX = cx + cw - (opts.textPaddingHorizontal ?? 8); anchor = 'end'; }

        const nameY = cy + (opts.textPaddingTop ?? 6) + (opts.nameFontSize ?? 11);
        const titleY = nameY + (opts.textGap ?? 2) + (opts.titleFontSize ?? 9);

        svg.appendChild(svgEl('text', { x: textX, y: nameY, 'text-anchor': anchor, 'font-size': opts.nameFontSize ?? 11, 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Sarah Chen';
        svg.appendChild(svgEl('text', { x: textX, y: titleY, 'text-anchor': anchor, 'font-size': opts.titleFontSize ?? 9, 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.titleColor ?? '#64748b' })).textContent = 'Chief Executive Officer';

        // Font label
        svg.appendChild(svgEl('text', { x: cx + cw + 10, y: nameY, 'font-size': '6', fill: '#94a3b8' })).textContent = `${opts.nameFontSize ?? 11}px`;
        svg.appendChild(svgEl('text', { x: cx + cw + 10, y: titleY, 'font-size': '6', fill: '#94a3b8' })).textContent = `${opts.titleFontSize ?? 9}px`;
        svg.appendChild(svgEl('text', { x: 220, y: cy + ch + 14, 'text-anchor': 'middle', 'font-size': '7', fill: '#94a3b8' })).textContent = opts.fontFamily ?? 'Calibri';
        break;
      }

      case 'cards': {
        const cw = 100;
        const ch = 36;
        const gap = 20;
        const startX = 220 - (3 * cw + 2 * gap) / 2;
        for (let i = 0; i < 3; i++) {
          const x = startX + i * (cw + gap);
          const y = 20;
          svg.appendChild(svgEl('rect', { x, y, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + 14, 'text-anchor': 'middle', 'font-size': '8', 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.nameColor ?? '#1e293b' })).textContent = ['Alice', 'Bob', 'Carol'][i];
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + 26, 'text-anchor': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.titleColor ?? '#64748b' })).textContent = ['Engineer', 'Designer', 'Manager'][i];
        }
        // Labels
        svg.appendChild(svgEl('text', { x: 220, y: 72, 'text-anchor': 'middle', 'font-size': '7', fill: '#94a3b8' })).textContent = `fill: ${opts.cardFill ?? '#fff'}  stroke: ${opts.cardStroke ?? '#22c55e'}  radius: ${opts.cardBorderRadius ?? 0}px`;
        break;
      }

      case 'connectors': {
        const cw = 70;
        const ch = 24;
        const rootX = 220 - cw / 2;
        const rootY = 8;
        const childY = 68;
        const positions = [80, 185, 290];

        svg.appendChild(svgEl('rect', { x: rootX, y: rootY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: 220, y: rootY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Manager';

        const midY = rootY + ch + 12;
        svg.appendChild(svgEl('line', { x1: 220, y1: rootY + ch, x2: 220, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: positions[0] + cw / 2, y1: midY, x2: positions[2] + cw / 2, y2: midY, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        for (let i = 0; i < 3; i++) {
          const x = positions[i];
          const isDotted = i === 2;
          svg.appendChild(svgEl('line', {
            x1: x + cw / 2, y1: midY, x2: x + cw / 2, y2: childY,
            stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5,
            ...(isDotted ? { 'stroke-dasharray': opts.dottedLineDash ?? '6,4' } : {}),
          }));
          svg.appendChild(svgEl('rect', { x, y: childY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
          const labels = ['Solid', 'Solid', 'Dotted'];
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: childY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = labels[i];
        }
        // Label
        svg.appendChild(svgEl('text', { x: 220, y: 110, 'text-anchor': 'middle', 'font-size': '7', fill: '#94a3b8' })).textContent = `width: ${opts.linkWidth ?? 1.5}px  dash: ${opts.dottedLineDash ?? '6,4'}`;
        break;
      }

      case 'ic': {
        const cw = 80;
        const ch = 22;
        const icW = Math.min((opts.icNodeWidth ?? 141) * 0.5, 70);
        const icH = 16;
        const icGap = opts.icGap ?? 6;
        const pad = opts.icContainerPadding ?? 10;

        // Manager card
        const mgrX = 220 - cw / 2;
        const mgrY = 6;
        svg.appendChild(svgEl('rect', { x: mgrX, y: mgrY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: 220, y: mgrY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'M1 Manager';

        // Connector
        const containerTop = mgrY + ch + 10;
        svg.appendChild(svgEl('line', { x1: 220, y1: mgrY + ch, x2: 220, y2: containerTop, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        // IC container
        const containerH = pad * 2 + 3 * icH + 2 * icGap;
        const containerW = icW + pad * 2;
        const containerX = 220 - containerW / 2;
        svg.appendChild(svgEl('rect', { x: containerX, y: containerTop, width: containerW, height: containerH, rx: opts.icContainerBorderRadius ?? 0, fill: opts.icContainerFill ?? '#e5e7eb' }));

        // IC cards
        for (let i = 0; i < 3; i++) {
          const icX = 220 - icW / 2;
          const icY = containerTop + pad + i * (icH + icGap);
          svg.appendChild(svgEl('rect', { x: icX, y: icY, width: icW, height: icH, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
          svg.appendChild(svgEl('text', { x: 220, y: icY + icH / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = `IC ${i + 1}`;
        }
        break;
      }

      case 'advisors': {
        const cw = 70;
        const ch = 22;
        const advW = 60;
        const advH = 18;
        const centerGap = (opts.palCenterGap ?? 70) * 0.5;
        const topGap = (opts.palTopGap ?? 12) * 0.5;
        const rowGap = (opts.palRowGap ?? 6) * 0.5;

        // Manager card
        const mgrX = 220 - cw / 2;
        const mgrY = 8;
        svg.appendChild(svgEl('rect', { x: mgrX, y: mgrY, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: 220, y: mgrY + ch / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Director';

        // Advisors
        const advY1 = mgrY + ch + topGap;
        const advY2 = advY1 + advH + rowGap;

        // Left advisor
        const leftX = 220 - centerGap / 2 - advW;
        svg.appendChild(svgEl('rect', { x: leftX, y: advY1, width: advW, height: advH, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: leftX + advW / 2, y: advY1 + advH / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Advisor L1';
        // Left elbow connector
        svg.appendChild(svgEl('line', { x1: leftX + advW, y1: advY1 + advH / 2, x2: 220, y2: advY1 + advH / 2, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: 220, y1: mgrY + ch, x2: 220, y2: advY1 + advH / 2, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        // Right advisor
        const rightX = 220 + centerGap / 2;
        svg.appendChild(svgEl('rect', { x: rightX, y: advY1, width: advW, height: advH, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: rightX + advW / 2, y: advY1 + advH / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Advisor R1';
        svg.appendChild(svgEl('line', { x1: rightX, y1: advY1 + advH / 2, x2: 220, y2: advY1 + advH / 2, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));

        // Second row
        svg.appendChild(svgEl('rect', { x: leftX, y: advY2, width: advW, height: advH, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: leftX + advW / 2, y: advY2 + advH / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': '6', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Advisor L2';
        svg.appendChild(svgEl('line', { x1: leftX + advW, y1: advY2 + advH / 2, x2: 220, y2: advY2 + advH / 2, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        svg.appendChild(svgEl('line', { x1: 220, y1: advY1 + advH / 2, x2: 220, y2: advY2 + advH / 2, stroke: opts.linkColor ?? '#94a3b8', 'stroke-width': opts.linkWidth ?? 1.5 }));
        break;
      }

      case 'badges': {
        const cw = 110;
        const ch = 34;
        const gap = 40;

        // Card without badge
        const x1 = 220 - gap / 2 - cw;
        svg.appendChild(svgEl('rect', { x: x1, y: 20, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: x1 + cw / 2, y: 34, 'text-anchor': 'middle', 'font-size': '8', 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.nameColor ?? '#1e293b' })).textContent = 'No Badge';
        svg.appendChild(svgEl('text', { x: x1 + cw / 2, y: 46, 'text-anchor': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.titleColor ?? '#64748b' })).textContent = 'Leaf node';

        // Card with badge
        const x2 = 220 + gap / 2;
        svg.appendChild(svgEl('rect', { x: x2, y: 20, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: x2 + cw / 2, y: 34, 'text-anchor': 'middle', 'font-size': '8', 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Manager';
        svg.appendChild(svgEl('text', { x: x2 + cw / 2, y: 46, 'text-anchor': 'middle', 'font-size': '7', 'font-family': opts.fontFamily ?? 'Calibri', fill: opts.titleColor ?? '#64748b' })).textContent = 'VP Eng';

        // Badge
        const badgeH = Math.min((opts.headcountBadgeHeight ?? 22) * 0.8, 18);
        const badgeR = opts.headcountBadgeRadius ?? 4;
        const badgeFS = Math.min((opts.headcountBadgeFontSize ?? 11) * 0.9, 10);
        const badgeW = 28;
        const badgeX = x2 + cw / 2 - badgeW / 2;
        const badgeY = 20 + ch + 2;
        svg.appendChild(svgEl('rect', { x: badgeX, y: badgeY, width: badgeW, height: badgeH, rx: badgeR, fill: opts.headcountBadgeColor ?? '#9ca3af' }));
        svg.appendChild(svgEl('text', { x: badgeX + badgeW / 2, y: badgeY + badgeH / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': badgeFS, 'font-family': opts.fontFamily ?? 'Calibri', 'font-weight': 'bold', fill: opts.headcountBadgeTextColor ?? '#1e293b' })).textContent = '12';
        break;
      }

      default: {
        // Fallback: show a single card
        const cw = 120;
        const ch = 36;
        svg.appendChild(svgEl('rect', { x: 220 - cw / 2, y: 42, width: cw, height: ch, rx: opts.cardBorderRadius ?? 0, fill: opts.cardFill ?? '#ffffff', stroke: opts.cardStroke ?? '#22c55e', 'stroke-width': opts.cardStrokeWidth ?? 1 }));
        svg.appendChild(svgEl('text', { x: 220, y: 62, 'text-anchor': 'middle', 'font-size': '8', fill: opts.nameColor ?? '#1e293b' })).textContent = 'Preview';
        break;
      }
    }

    area.appendChild(svg);
  }

  private rebuildPreviews(): void {
    for (const [tabId, area] of this.previewAreas) {
      this.renderPreviewSvg(tabId, area);
    }
  }

  private buildPresetsContent(): HTMLElement {
    const wrapper = document.createElement('div');

    // Combined preset grid
    const allPresets = [...COMBINED_PRESETS, ...this.loadCustomPresets()];

    const presetGrid = document.createElement('div');
    presetGrid.className = 'preset-grid';
    presetGrid.style.cssText =
      'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:12px;';

    for (const preset of allPresets) {
      const card = document.createElement('button');
      card.className = 'preset-card';
      card.setAttribute('data-preset-id', preset.id);
      card.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:6px 8px;position:relative;
        border:1px solid var(--border-default);border-radius:var(--radius-md);
        background:var(--bg-elevated);cursor:pointer;text-align:start;
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
      name.style.cssText =
        'font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;';
      card.appendChild(name);

      if (preset.isCustom) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'preset-delete';
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.style.cssText = `
          position:absolute;top:2px;right:4px;font-size:13px;line-height:1;
          color:var(--text-tertiary);cursor:pointer;opacity:0;
          transition:opacity 120ms ease;padding:0 2px;
          border:none;background:none;font-family:inherit;
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

      // Check if this preset matches current settings
      const currentOpts = this.renderer.getOptions();
      const isActive =
        currentOpts.cardFill === preset.colors.cardFill &&
        currentOpts.cardStroke === preset.colors.cardStroke &&
        currentOpts.linkColor === preset.colors.linkColor;

      if (isActive) {
        card.classList.add('preset-active');
        const badge = document.createElement('span');
        badge.className = 'preset-active-badge';
        badge.textContent = t('settings.preset_active');
        card.appendChild(badge);
      }

      presetGrid.appendChild(card);
    }

    wrapper.appendChild(presetGrid);

    // Layout preset buttons (4-column grid)
    const layoutHeading = document.createElement('div');
    layoutHeading.textContent = 'Layout';
    layoutHeading.className = 'text-xs text-tertiary';
    layoutHeading.style.cssText = 'margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;';
    wrapper.appendChild(layoutHeading);

    const layoutGrid = document.createElement('div');
    layoutGrid.style.cssText =
      'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;';

    for (const lp of LAYOUT_PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'layout-preset-card';

      const icon = document.createElement('span');
      icon.textContent = lp.icon;
      icon.style.cssText = 'font-size:18px;line-height:1;';
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = lp.name;
      label.className = 'layout-preset-name';
      btn.appendChild(label);

      const dims = document.createElement('span');
      dims.className = 'layout-preset-dims';
      dims.textContent = `${lp.sizes.nodeWidth} × ${lp.sizes.nodeHeight}`;
      btn.appendChild(dims);

      const descKey = `settings.layout_${lp.name.toLowerCase()}_desc`;
      const descEl = document.createElement('span');
      descEl.className = 'layout-preset-desc';
      descEl.textContent = t(descKey);
      btn.appendChild(descEl);

      // Check if this layout preset matches current settings
      const curOpts = this.renderer.getOptions();
      const layoutActive =
        curOpts.nodeWidth === lp.sizes.nodeWidth &&
        curOpts.nodeHeight === lp.sizes.nodeHeight;

      if (layoutActive) {
        btn.classList.add('layout-active');
      }

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'var(--accent)';
        btn.style.background = 'var(--bg-hover)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = layoutActive ? 'var(--accent)' : 'var(--border-default)';
        btn.style.background = layoutActive ? 'var(--accent-muted)' : 'var(--bg-elevated)';
      });

      btn.addEventListener('click', () => {
        this.renderer.updateOptions(lp.sizes);
        this.rerenderCallback();
        this.build();
      });

      layoutGrid.appendChild(btn);
    }

    wrapper.appendChild(layoutGrid);

    return wrapper;
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

    if (isModified) {
      const dot = document.createElement('span');
      dot.className = 'setting-modified-dot';
      label.appendChild(dot);
    }

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

    if (setting.type === 'checkbox') {
      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'checkbox';
      input.checked = Boolean(currentValue);

      input.addEventListener('change', () => {
        this.renderer.updateOptions({ [setting.key]: input.checked } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.rebuildPreviews();
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
        this.rebuildPreviews();
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
        this.rebuildPreviews();
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
        this.rebuildPreviews();
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
        this.rebuildPreviews();
      });

      control.appendChild(input);
    }

    // Per-setting reset button
    if (defaultValue !== undefined) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'setting-reset-btn';
      if (isModified) resetBtn.classList.add('visible');
      resetBtn.textContent = '↺';
      resetBtn.setAttribute('aria-label', `Reset ${setting.label} to default (${defaultValue})`);
      resetBtn.setAttribute('data-tooltip', `Default: ${defaultValue}${setting.unit ? ' ' + setting.unit : ''}`);
      resetBtn.addEventListener('click', () => {
        this.renderer.updateOptions({ [setting.key]: defaultValue } as Partial<RendererOptions>);
        this.rerenderCallback();
        this.rebuildPreviews();
        this.build();
      });
      control.appendChild(resetBtn);
    }

    wrapper.appendChild(info);
    wrapper.appendChild(control);

    return wrapper;
  }

  refresh(): void {
    this.build();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
