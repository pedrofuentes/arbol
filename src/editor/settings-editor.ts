import { ChartRenderer, RendererOptions } from '../renderer/chart-renderer';

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
      { key: 'verticalSpacing', label: 'Vertical Spacing', type: 'range', min: 5, max: 100, step: 1 },
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

  constructor(
    container: HTMLElement,
    renderer: ChartRenderer,
    rerenderCallback: () => void,
  ) {
    this.container = container;
    this.renderer = renderer;
    this.rerenderCallback = rerenderCallback;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';

    const opts = this.renderer.getOptions();

    for (const group of SETTING_GROUPS) {
      const header = document.createElement('h4');
      header.textContent = group.title;
      header.style.cssText =
        'margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;';
      this.container.appendChild(header);

      for (const setting of group.settings) {
        const value = opts[setting.key] as number | string;
        this.container.appendChild(this.createControl(setting, value));
      }
    }
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
