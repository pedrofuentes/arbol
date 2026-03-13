import { t } from '../i18n';

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
    name: t('theme.emerald.name'),
    description: t('theme.emerald.description'),
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
    name: t('theme.corporate_blue.name'),
    description: t('theme.corporate_blue.description'),
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
    name: t('theme.forest.name'),
    description: t('theme.forest.description'),
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
    name: t('theme.sunset_warm.name'),
    description: t('theme.sunset_warm.description'),
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
    name: t('theme.monochrome.name'),
    description: t('theme.monochrome.description'),
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
    name: t('theme.midnight.name'),
    description: t('theme.midnight.description'),
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
    name: t('theme.pastel.name'),
    description: t('theme.pastel.description'),
    colors: {
      cardFill: '#fdf2f8',
      cardStroke: '#ec4899',
      cardStrokeWidth: 1,
      linkColor: '#d946ef',
      linkWidth: 1.5,
      icContainerFill: '#fce7f3',
      icContainerBorderRadius: 0,
      nameColor: '#1e293b',
      titleColor: '#475569',
      textAlign: 'center',
      cardBorderRadius: 0,
      fontFamily: 'Calibri',
    },
  },
  {
    id: 'high-contrast',
    name: t('theme.high_contrast.name'),
    description: t('theme.high_contrast.description'),
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
    name: t('theme.ocean_teal.name'),
    description: t('theme.ocean_teal.description'),
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
