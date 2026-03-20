import { describe, it, expect, vi, beforeAll } from 'vitest';
import { setLocale } from '../../../src/i18n';
import en from '../../../src/i18n/en';
import {
  PresetPanel,
  COMBINED_PRESETS,
  type PresetPanelDeps,
} from '../../../src/editor/settings/preset-panel';
import type { ChartRenderer, ResolvedOptions } from '../../../src/renderer/chart-renderer';
import type { IStorage } from '../../../src/utils/storage';

beforeAll(() => {
  setLocale('en', en);
});

function createStorage(): IStorage {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

// Options that exactly match the first built-in preset (emerald) + default sizes
const EMERALD_MATCHING_OPTS: ResolvedOptions = {
  container: document.createElement('div'),
  // Colors matching emerald preset
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
  // Sizes matching DEFAULT_LAYOUT_SIZES
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
  // Other required fields
  dottedLineDash: '6,4',
  showHeadcount: false,
  headcountBadgeColor: '#9ca3af',
  headcountBadgeTextColor: '#1e293b',
  headcountBadgeFontSize: 11,
  headcountBadgeRadius: 4,
  headcountBadgePadding: 8,
  headcountBadgeHeight: 22,
  showLevel: false,
  levelBadgeColor: '#6366f1',
  levelBadgeTextColor: '#ffffff',
  levelBadgeFontSize: 11,
  levelBadgeSize: 22,
  legendRows: 0,
  textPaddingHorizontal: 8,
  categories: [],
  preview: false,
  resolveLevel: (raw: string | undefined) => raw ?? '',
} as ResolvedOptions;

function createPanel(optsOverride?: Partial<ResolvedOptions>): {
  panel: PresetPanel;
  storage: IStorage;
  getOptionsFn: ReturnType<typeof vi.fn>;
} {
  const opts = { ...EMERALD_MATCHING_OPTS, ...optsOverride };
  const getOptionsFn = vi.fn(() => ({ ...opts }));
  const renderer = {
    getOptions: getOptionsFn,
    updateOptions: vi.fn(),
  } as unknown as ChartRenderer;
  const storage = createStorage();
  const panel = new PresetPanel({
    renderer,
    storage,
    rerenderCallback: vi.fn(),
    rebuildCallback: vi.fn(),
  });
  return { panel, storage, getOptionsFn };
}

describe('PresetPanel', () => {
  describe('matchesExistingPreset()', () => {
    it('returns true when options exactly match a built-in preset', () => {
      const { panel } = createPanel();
      expect(panel.matchesExistingPreset()).toBe(true);
    });

    it('returns false when a color field is changed', () => {
      const { panel } = createPanel({ cardFill: '#ff0000' });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when nodeWidth is changed', () => {
      const { panel } = createPanel({ nodeWidth: 200 });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when horizontalSpacing is changed', () => {
      const { panel } = createPanel({ horizontalSpacing: 100 });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when fontFamily is changed', () => {
      const { panel } = createPanel({ fontFamily: 'Arial' });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when textAlign is changed', () => {
      const { panel } = createPanel({ textAlign: 'left' });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when nameFontSize is changed', () => {
      const { panel } = createPanel({ nameFontSize: 14 });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when cardBorderRadius is changed', () => {
      const { panel } = createPanel({ cardBorderRadius: 8 });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns false when branchSpacing is changed', () => {
      const { panel } = createPanel({ branchSpacing: 40 });
      expect(panel.matchesExistingPreset()).toBe(false);
    });

    it('returns true when matching a custom preset', () => {
      const { panel, storage } = createPanel({ cardFill: '#aabbcc', cardStroke: '#112233' });
      const customPresets = [
        {
          id: 'custom-test',
          name: 'Test Custom',
          colors: {
            ...COMBINED_PRESETS[0].colors,
            cardFill: '#aabbcc',
            cardStroke: '#112233',
          },
          sizes: { ...COMBINED_PRESETS[0].sizes },
        },
      ];
      (storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify(customPresets),
      );
      expect(panel.matchesExistingPreset()).toBe(true);
    });
  });
});
