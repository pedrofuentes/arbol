export interface ChartThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    cardFill: string;
    cardStroke: string;
    cardStrokeWidth: number;
    linkColor: string;
    linkWidth: number;
    icContainerFill: string;
    icContainerBorderRadius?: number;
    nameColor: string;
    titleColor: string;
    textAlign?: 'left' | 'center' | 'right';
    cardBorderRadius?: number;
    fontFamily?: string;
  };
}

export const CHART_THEME_PRESETS: ChartThemePreset[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'The default green-accented theme with clean white cards',
    colors: {
      cardFill: '#ffffff',
      cardStroke: '#22c55e',
      cardStrokeWidth: 1,
      linkColor: '#94a3b8',
      linkWidth: 1.5,
      icContainerFill: '#e5e7eb',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue-toned theme suited for business presentations',
    colors: {
      cardFill: '#f8fafc',
      cardStroke: '#2563eb',
      cardStrokeWidth: 1,
      linkColor: '#64748b',
      linkWidth: 1.5,
      icContainerFill: '#dbeafe',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep forest greens evoking a natural, organic feel',
    colors: {
      cardFill: '#f0fdf4',
      cardStroke: '#166534',
      cardStrokeWidth: 1,
      linkColor: '#4ade80',
      linkWidth: 1.5,
      icContainerFill: '#dcfce7',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    description: 'Warm amber and orange tones inspired by golden-hour light',
    colors: {
      cardFill: '#fffbeb',
      cardStroke: '#d97706',
      cardStrokeWidth: 1,
      linkColor: '#f59e0b',
      linkWidth: 1.5,
      icContainerFill: '#fef3c7',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Clean grayscale palette that keeps the focus on structure',
    colors: {
      cardFill: '#ffffff',
      cardStroke: '#374151',
      cardStrokeWidth: 1,
      linkColor: '#6b7280',
      linkWidth: 1.5,
      icContainerFill: '#e5e7eb',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark-mode chart colors with light-blue accents on dark cards',
    colors: {
      cardFill: '#1e293b',
      cardStroke: '#38bdf8',
      cardStrokeWidth: 1.5,
      linkColor: '#475569',
      linkWidth: 1.5,
      icContainerFill: '#0f172a',
      icContainerBorderRadius: 0,
      nameColor: '#e2e8f0',
      titleColor: '#cbd5e1',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soft pink and purple tones for a gentle, approachable look',
    colors: {
      cardFill: '#fdf2f8',
      cardStroke: '#ec4899',
      cardStrokeWidth: 1,
      linkColor: '#d946ef',
      linkWidth: 1.5,
      icContainerFill: '#fce7f3',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum-accessibility theme with bold borders and stark contrasts',
    colors: {
      cardFill: '#ffffff',
      cardStroke: '#000000',
      cardStrokeWidth: 2,
      linkColor: '#000000',
      linkWidth: 2,
      icContainerFill: '#f3f4f6',
      icContainerBorderRadius: 0,
      nameColor: '#000000',
      titleColor: '#374151',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    description: 'Modern teal-accented theme with left-aligned text',
    colors: {
      cardFill: '#ffffff',
      cardStroke: '#14b8a6',
      cardStrokeWidth: 1.5,
      linkColor: '#5eead4',
      linkWidth: 1.5,
      icContainerFill: '#ccfbf1',
      icContainerBorderRadius: 8,
      nameColor: '#1e293b',
      titleColor: '#64748b',
      textAlign: 'left',
      cardBorderRadius: 6,
      fontFamily: 'Microsoft Sans Serif',
    },
  },
];

export function getPresetById(id: string): ChartThemePreset | undefined {
  return CHART_THEME_PRESETS.find((preset) => preset.id === id);
}

export function getPresetNames(): { id: string; name: string }[] {
  return CHART_THEME_PRESETS.map(({ id, name }) => ({ id, name }));
}

export function addCustomPreset(preset: ChartThemePreset): void {
  // Replace if same id already exists
  const idx = CHART_THEME_PRESETS.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    CHART_THEME_PRESETS[idx] = preset;
  } else {
    CHART_THEME_PRESETS.push(preset);
  }
}
