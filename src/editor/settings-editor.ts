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
