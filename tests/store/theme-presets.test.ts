import { describe, it, expect, beforeEach } from 'vitest';
import {
  CHART_THEME_PRESETS,
  ChartThemePreset,
  getPresetById,
  getPresetNames,
  addCustomPreset,
} from '../../src/store/theme-presets';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const REQUIRED_COLOR_FIELDS: (keyof ChartThemePreset['colors'])[] = [
  'cardFill',
  'cardStroke',
  'cardStrokeWidth',
  'linkColor',
  'linkWidth',
  'icContainerFill',
];

// Snapshot the original presets so addCustomPreset mutations can be reverted
let originalPresets: ChartThemePreset[];

beforeEach(() => {
  // Restore the array to its original contents before each test
  if (originalPresets) {
    CHART_THEME_PRESETS.length = 0;
    originalPresets.forEach((p) => CHART_THEME_PRESETS.push(p));
  } else {
    originalPresets = [...CHART_THEME_PRESETS];
  }
});

describe('CHART_THEME_PRESETS', () => {
  it('has at least 9 built-in presets', () => {
    expect(CHART_THEME_PRESETS.length).toBeGreaterThanOrEqual(9);
  });

  it('each preset has id, name, description, and colors object', () => {
    for (const preset of CHART_THEME_PRESETS) {
      expect(preset.id).toBeTypeOf('string');
      expect(preset.id.length).toBeGreaterThan(0);
      expect(preset.name).toBeTypeOf('string');
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description).toBeTypeOf('string');
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.colors).toBeTypeOf('object');
    }
  });

  it('each preset colors has all required fields', () => {
    for (const preset of CHART_THEME_PRESETS) {
      for (const field of REQUIRED_COLOR_FIELDS) {
        expect(preset.colors).toHaveProperty(field);
      }
    }
  });

  it('all color values are valid hex strings (start with #)', () => {
    const hexFields = ['cardFill', 'cardStroke', 'linkColor', 'icContainerFill'] as const;
    for (const preset of CHART_THEME_PRESETS) {
      for (const field of hexFields) {
        expect(preset.colors[field]).toMatch(HEX_COLOR_RE);
      }
    }
  });

  it('all preset IDs are unique', () => {
    const ids = CHART_THEME_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all presets have a valid textAlign value', () => {
    const validAligns = ['left', 'center', 'right'];
    for (const preset of CHART_THEME_PRESETS) {
      expect(validAligns).toContain(preset.colors.textAlign);
    }
  });

  it('all presets have cardBorderRadius defined', () => {
    for (const preset of CHART_THEME_PRESETS) {
      expect(preset.colors.cardBorderRadius).toBeTypeOf('number');
      expect(preset.colors.cardBorderRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it('all presets have fontFamily defined', () => {
    for (const preset of CHART_THEME_PRESETS) {
      expect(preset.colors.fontFamily).toBeTypeOf('string');
      expect(preset.colors.fontFamily!.length).toBeGreaterThan(0);
    }
  });
});

describe('getPresetById', () => {
  it('returns the emerald preset', () => {
    const emerald = getPresetById('emerald');
    expect(emerald).toBeDefined();
    expect(emerald!.id).toBe('emerald');
    expect(emerald!.name).toBe('Emerald');
  });

  it('returns the ocean-teal preset', () => {
    const teal = getPresetById('ocean-teal');
    expect(teal).toBeDefined();
    expect(teal!.id).toBe('ocean-teal');
    expect(teal!.name).toBe('Ocean Teal');
    expect(teal!.colors.cardStroke).toBe('#14b8a6');
    expect(teal!.colors.textAlign).toBe('left');
    expect(teal!.colors.cardBorderRadius).toBe(6);
    expect(teal!.colors.fontFamily).toBe('Segoe UI');
  });

  it('returns undefined for nonexistent id', () => {
    expect(getPresetById('nonexistent')).toBeUndefined();
  });
});

describe('getPresetNames', () => {
  it('returns array of {id, name} objects', () => {
    const names = getPresetNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBe(CHART_THEME_PRESETS.length);
    for (const entry of names) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('name');
      expect(Object.keys(entry)).toHaveLength(2);
    }
  });
});

describe('addCustomPreset', () => {
  const customPreset: ChartThemePreset = {
    id: 'custom-test',
    name: 'Custom Test',
    description: 'A test preset',
    colors: {
      cardFill: '#aabbcc',
      cardStroke: '#112233',
      cardStrokeWidth: 2,
      linkColor: '#445566',
      linkWidth: 1,
      icContainerFill: '#778899',
      nameColor: '#1e293b',
      titleColor: '#64748b',
    },
  };

  it('adds a new preset', () => {
    const before = CHART_THEME_PRESETS.length;
    addCustomPreset(customPreset);
    expect(CHART_THEME_PRESETS.length).toBe(before + 1);
    expect(getPresetById('custom-test')).toEqual(customPreset);
  });

  it('replaces a preset with an existing id', () => {
    addCustomPreset(customPreset);
    const replacement: ChartThemePreset = {
      ...customPreset,
      name: 'Replaced',
      description: 'Replaced preset',
    };
    const lengthAfterFirst = CHART_THEME_PRESETS.length;
    addCustomPreset(replacement);
    expect(CHART_THEME_PRESETS.length).toBe(lengthAfterFirst);
    expect(getPresetById('custom-test')!.name).toBe('Replaced');
  });
});
