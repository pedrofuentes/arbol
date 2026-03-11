import { ChartRenderer, RendererOptions } from '../renderer/chart-renderer';
import { CHART_THEME_PRESETS, addCustomPreset } from '../store/theme-presets';
import { SettingsStore } from '../store/settings-store';

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

export class SettingsEditor {
  private container: HTMLElement;
  private renderer: ChartRenderer;
  private rerenderCallback: () => void;
  private settingsStore: SettingsStore | null;

  constructor(
    container: HTMLElement,
    renderer: ChartRenderer,
    rerenderCallback: () => void,
    settingsStore?: SettingsStore,
  ) {
    this.container = container;
    this.renderer = renderer;
    this.rerenderCallback = rerenderCallback;
    this.settingsStore = settingsStore ?? null;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';

    const opts = this.renderer.getOptions();

    // Theme Presets section
    const presetHeader = document.createElement('h4');
    presetHeader.textContent = 'Theme Presets';
    presetHeader.style.cssText = 'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.container.appendChild(presetHeader);

    const presetGrid = document.createElement('div');
    presetGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:16px;';
    this.container.appendChild(presetGrid);

    for (const preset of CHART_THEME_PRESETS) {
      const card = document.createElement('button');
      card.className = 'preset-card';
      card.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:6px 8px;
        border:1px solid var(--border-default);border-radius:var(--radius-md);
        background:var(--bg-elevated);cursor:pointer;text-align:left;
        transition:all 120ms ease;font-family:var(--font-sans);
      `;

      // Color swatch
      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width:20px;height:20px;border-radius:3px;flex-shrink:0;
        background:${preset.colors.cardFill};
        border:2px solid ${preset.colors.cardStroke};
      `;
      card.appendChild(swatch);

      // Name
      const name = document.createElement('span');
      name.textContent = preset.name;
      name.style.cssText = 'font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      card.appendChild(name);

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--accent)';
        card.style.background = 'var(--bg-hover)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--border-default)';
        card.style.background = 'var(--bg-elevated)';
      });

      card.addEventListener('click', () => {
        this.renderer.updateOptions(preset.colors as Partial<RendererOptions>);
        this.rerenderCallback();
        this.build(); // Rebuild to update slider/color values
      });

      presetGrid.appendChild(card);
    }

    // Layout Presets section
    this.container.appendChild(this.buildLayoutPresets());

    for (const group of SETTING_GROUPS) {
      const header = document.createElement('h4');
      header.textContent = group.title;
      header.style.cssText =
        'margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
      this.container.appendChild(header);

      for (const setting of group.settings) {
        const value = opts[setting.key] as number | string;
        this.container.appendChild(this.createControl(setting, value));
      }
    }

    // Settings Import/Export section
    const ioHeader = document.createElement('h4');
    ioHeader.textContent = 'Settings';
    ioHeader.style.cssText = 'margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    this.container.appendChild(ioHeader);

    const ioBtnGroup = document.createElement('div');
    ioBtnGroup.className = 'btn-group';
    this.container.appendChild(ioBtnGroup);

    const exportSettingsBtn = document.createElement('button');
    exportSettingsBtn.className = 'btn btn-secondary';
    exportSettingsBtn.textContent = '💾 Export';
    exportSettingsBtn.addEventListener('click', () => {
      if (this.settingsStore) {
        const opts = this.renderer.getOptions();
        this.settingsStore.saveImmediate(opts as any);
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
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const raw = JSON.parse(reader.result as string);
            const settings = this.settingsStore!.importFromFile(reader.result as string);
            this.renderer.updateOptions(settings as unknown as Partial<RendererOptions>);

            // Add as custom preset
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
  }

  private buildLayoutPresets(): HTMLElement {
    const LAYOUT_PRESETS: { name: string; icon: string; sizes: Partial<RendererOptions> }[] = [
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

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:16px;';

    const heading = document.createElement('h4');
    heading.textContent = 'Layout Presets';
    heading.style.cssText =
      'margin:0 0 8px;font-size:11px;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:0.08em;font-family:var(--font-sans);';
    wrapper.appendChild(heading);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';

    for (const preset of LAYOUT_PRESETS) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:2px;
        padding:6px 4px;border:1px solid var(--border-default);
        border-radius:var(--radius-md);background:var(--bg-elevated);
        cursor:pointer;transition:all 120ms ease;font-family:var(--font-sans);
      `;

      const icon = document.createElement('span');
      icon.textContent = preset.icon;
      icon.style.cssText = 'font-size:14px;line-height:1;color:var(--text-secondary);';
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = preset.name;
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
        this.renderer.updateOptions(preset.sizes);
        this.rerenderCallback();
        this.build();
      });

      grid.appendChild(btn);
    }

    wrapper.appendChild(grid);
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

  refresh(): void {
    this.build();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
