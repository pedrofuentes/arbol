import { ChartRenderer, RendererOptions } from '../../renderer/chart-renderer';
import { CHART_THEME_PRESETS, type ChartThemePreset } from '../../store/theme-presets';
import { type IStorage } from '../../utils/storage';
import { generateId } from '../../utils/id';
import { t } from '../../i18n';

export interface CombinedPreset {
  id: string;
  name: string;
  colors: ChartThemePreset['colors'];
  sizes: Partial<RendererOptions>;
  isCustom?: boolean;
}

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

export interface PresetPanelDeps {
  renderer: ChartRenderer;
  storage: IStorage;
  rerenderCallback: () => void;
  rebuildCallback: () => void;
}

export class PresetPanel {
  private static CUSTOM_PRESETS_KEY = 'arbol-custom-presets';
  private renderer: ChartRenderer;
  private storage: IStorage;
  private rerenderCallback: () => void;
  private rebuildCallback: () => void;

  constructor(deps: PresetPanelDeps) {
    this.renderer = deps.renderer;
    this.storage = deps.storage;
    this.rerenderCallback = deps.rerenderCallback;
    this.rebuildCallback = deps.rebuildCallback;
  }

  private loadCustomPresets(): CombinedPreset[] {
    try {
      const raw = this.storage.getItem(PresetPanel.CUSTOM_PRESETS_KEY);
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
      PresetPanel.CUSTOM_PRESETS_KEY,
      JSON.stringify(presets.map(({ id, name, colors, sizes }) => ({ id, name, colors, sizes }))),
    );
  }

  matchesExistingPreset(): boolean {
    const opts = this.renderer.getOptions();
    const allPresets = [...COMBINED_PRESETS, ...this.loadCustomPresets()];
    return allPresets.some((p) => {
      for (const [key, value] of Object.entries(p.colors)) {
        if (opts[key as keyof typeof opts] !== value) return false;
      }
      for (const [key, value] of Object.entries(p.sizes)) {
        if (opts[key as keyof typeof opts] !== value) return false;
      }
      return true;
    });
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
    this.rebuildCallback();
  }

  private deleteCustomPreset(id: string): void {
    const presets = this.loadCustomPresets().filter((p) => p.id !== id);
    this.saveCustomPresets(presets);
  }

  build(): HTMLElement {
    const wrapper = document.createElement('div');

    // Combined preset grid
    const allPresets = [...COMBINED_PRESETS, ...this.loadCustomPresets()];
    let activePresetFound = false;

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
          this.rebuildCallback();
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
        this.rebuildCallback();
      });

      // Check if this preset matches current settings (first match only)
      const currentOpts = this.renderer.getOptions();
      const isActive = !activePresetFound &&
        currentOpts.cardFill === preset.colors.cardFill &&
        currentOpts.cardStroke === preset.colors.cardStroke &&
        currentOpts.linkColor === preset.colors.linkColor &&
        currentOpts.cardStrokeWidth === preset.colors.cardStrokeWidth &&
        currentOpts.icContainerFill === preset.colors.icContainerFill &&
        currentOpts.nodeWidth === preset.sizes.nodeWidth &&
        currentOpts.nodeHeight === preset.sizes.nodeHeight;

      if (isActive) {
        activePresetFound = true;
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
    layoutHeading.textContent = t('settings.layout_heading');
    layoutHeading.className = 'setting-section-title';
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
        this.rebuildCallback();
      });

      layoutGrid.appendChild(btn);
    }

    wrapper.appendChild(layoutGrid);

    return wrapper;
  }
}
