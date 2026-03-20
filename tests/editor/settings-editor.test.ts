import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsEditor, COMBINED_PRESETS } from '../../src/editor/settings-editor';
import { CategoryStore } from '../../src/store/category-store';
import type {
  ChartRenderer,
  RendererOptions,
  ResolvedOptions,
} from '../../src/renderer/chart-renderer';

const localStorageMock = (() => {
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
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const DEFAULT_OPTS: ResolvedOptions = {
  container: document.createElement('div'),
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
  linkWidth: 1,
  linkColor: '#888888',
  dottedLineDash: '6,4',
  cardStrokeWidth: 1,
  cardStroke: '#cccccc',
  cardFill: '#ffffff',
  icContainerFill: '#f0f0f0',
  nameColor: '#1e293b',
  titleColor: '#64748b',
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
  textAlign: 'center',
  textPaddingHorizontal: 8,
  fontFamily: 'Calibri',
  cardBorderRadius: 0,
  icContainerBorderRadius: 0,
  categories: [],
  preview: false,
  resolveLevel: (raw: string | undefined) => raw ?? '',
} as ResolvedOptions;

function createMockRenderer(): ChartRenderer {
  return {
    getOptions: vi.fn(() => ({ ...DEFAULT_OPTS })),
    updateOptions: vi.fn(),
  } as unknown as ChartRenderer;
}

/** Helper: get accordion section titles */
function getAccordionTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.accordion-title')).map(
    (el) => el.textContent ?? '',
  );
}

/** Helper: get all section titles (accordion + flat) */
function getSectionTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.accordion-title, .setting-section-title')).map(
    (el) => el.textContent ?? '',
  );
}

/** Helper: find a section (accordion or flat) by its title text */
function findSectionByTitle(container: HTMLElement, title: string): Element | undefined {
  return Array.from(container.querySelectorAll('[data-section-id]')).find((s) => {
    const titleEl = s.querySelector('.accordion-title') ?? s.querySelector('.setting-section-title');
    return titleEl?.textContent === title;
  });
}

describe('SettingsEditor', () => {
  let container: HTMLElement;
  let renderer: ChartRenderer;
  let rerenderCb: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createMockRenderer();
    rerenderCb = vi.fn<() => void>();
  });

  afterEach(() => {
    container.remove();
  });

  it('builds settings panel with sections', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const titles = getSectionTitles(container);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles).toContain('Presets');
    expect(titles).not.toContain('Theme Presets');
    expect(titles).not.toContain('Layout Presets');
  });

  it('renders setting groups as flat sections with data-section-id', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const allSections = container.querySelectorAll('[data-section-id]');
    // presets(accordion) + 10 flat groups + settings-io(accordion) = 12 (no categories without store)
    expect(allSections.length).toBe(12);
    // 10 flat setting sections
    const flatSections = container.querySelectorAll('.setting-section');
    expect(flatSections.length).toBe(10);
  });

  it('flat setting sections have setting-section-title', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const flatTitles = Array.from(container.querySelectorAll('.setting-section-title')).map(
      (el) => el.textContent ?? '',
    );
    expect(flatTitles).toContain('Card Dimensions');
    expect(flatTitles).toContain('Typography');
    expect(flatTitles).toContain('Card Style');
  });

  it('flat setting section IDs match expected tab mapping keys', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const sectionIds = Array.from(container.querySelectorAll('.setting-section'))
      .map((el) => el.getAttribute('data-section-id'));
    // These IDs must match the SECTION_TAB_MAP keys in main.ts
    const expectedIds = [
      'card-dimensions', 'tree-spacing', 'ic-options', 'advisor-options',
      'typography', 'link-style', 'card-style', 'headcount-badge', 'level-badge', 'categories-legend',
    ];
    expect(sectionIds).toEqual(expectedIds);
  });

  describe('Node Categories section', () => {
    it('renders categories section when categoryStore is provided', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const titles = getAccordionTitles(container);
      expect(titles).toContain('Color Categories');
    });

    it('does not render categories section when categoryStore is null', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const titles = getAccordionTitles(container);
      expect(titles).not.toContain('Node Categories');
    });

    it('renders a row for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const colorInputs = container.querySelectorAll<HTMLInputElement>(
        'input[type="color"][aria-label^="Color for"]',
      );
      expect(colorInputs.length).toBe(categories.length);
    });

    it('renders color picker and label input for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      for (const cat of categories) {
        const colorInput = container.querySelector<HTMLInputElement>(
          `input[aria-label="Color for ${cat.label}"]`,
        );
        expect(colorInput).not.toBeNull();
        expect(colorInput!.type).toBe('color');
        expect(colorInput!.value).toBe(cat.color);
      }
      const labelInputs = container.querySelectorAll<HTMLInputElement>(
        'input[aria-label="Category label"]',
      );
      expect(labelInputs.length).toBe(categories.length);
    });

    it('renders delete button for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      for (const cat of categories) {
        const btn = container.querySelector<HTMLButtonElement>(
          `button[aria-label="Remove ${cat.label}"]`,
        );
        expect(btn).not.toBeNull();
        expect(btn!.textContent).toBe('×');
      }
    });

    it('renders add category button', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const addBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === '+ Add Category',
      );
      expect(addBtn).not.toBeUndefined();
    });

    it('updates category color on color input change', () => {
      const catStore = new CategoryStore();
      const updateSpy = vi.spyOn(catStore, 'update');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const colorInput = container.querySelector<HTMLInputElement>(
        `input[aria-label="Color for ${categories[0].label}"]`,
      )!;
      colorInput.value = '#ff0000';
      colorInput.dispatchEvent(new Event('input'));
      expect(updateSpy).toHaveBeenCalledWith(categories[0].id, { color: '#ff0000' });
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('updates category label on label input change', () => {
      const catStore = new CategoryStore();
      const updateSpy = vi.spyOn(catStore, 'update');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const labelInputs = container.querySelectorAll<HTMLInputElement>(
        'input[aria-label="Category label"]',
      );
      const categories = catStore.getAll();
      labelInputs[0].value = 'Renamed';
      labelInputs[0].dispatchEvent(new Event('change'));
      expect(updateSpy).toHaveBeenCalledWith(categories[0].id, { label: 'Renamed' });
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('reverts label when set to empty string', () => {
      const catStore = new CategoryStore();
      const updateSpy = vi.spyOn(catStore, 'update');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const labelInputs = container.querySelectorAll<HTMLInputElement>(
        'input[aria-label="Category label"]',
      );
      labelInputs[0].value = '   ';
      labelInputs[0].dispatchEvent(new Event('change'));
      expect(updateSpy).not.toHaveBeenCalled();
      expect(labelInputs[0].value).toBe(categories[0].label);
    });

    it('removes category on delete button click', () => {
      const catStore = new CategoryStore();
      const removeSpy = vi.spyOn(catStore, 'remove');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const deleteBtn = container.querySelector<HTMLButtonElement>(
        `button[aria-label="Remove ${categories[0].label}"]`,
      )!;
      deleteBtn.click(); // first click enters confirm mode
      deleteBtn.click(); // second click confirms deletion
      expect(removeSpy).toHaveBeenCalledWith(categories[0].id);
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('adds new category on add button click', () => {
      const catStore = new CategoryStore();
      const addSpy = vi.spyOn(catStore, 'add');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const addBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === '+ Add Category',
      )!;
      addBtn.click();
      expect(addSpy).toHaveBeenCalledWith('New Category', '#94a3b8');
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('renders name and title color pickers for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      for (const cat of categories) {
        const nameInput = container.querySelector<HTMLInputElement>(
          `input[aria-label="Name color for ${cat.label}"]`,
        );
        expect(nameInput).not.toBeNull();
        expect(nameInput!.type).toBe('color');
        const titleInput = container.querySelector<HTMLInputElement>(
          `input[aria-label="Title color for ${cat.label}"]`,
        );
        expect(titleInput).not.toBeNull();
        expect(titleInput!.type).toBe('color');
      }
    });

    it('updates category nameColor on name color input change', () => {
      const catStore = new CategoryStore();
      const updateSpy = vi.spyOn(catStore, 'update');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const nameInput = container.querySelector<HTMLInputElement>(
        `input[aria-label="Name color for ${categories[0].label}"]`,
      )!;
      nameInput.value = '#aabbcc';
      nameInput.dispatchEvent(new Event('input'));
      expect(updateSpy).toHaveBeenCalledWith(categories[0].id, { nameColor: '#aabbcc' });
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('updates category titleColor on title color input change', () => {
      const catStore = new CategoryStore();
      const updateSpy = vi.spyOn(catStore, 'update');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const titleInput = container.querySelector<HTMLInputElement>(
        `input[aria-label="Title color for ${categories[0].label}"]`,
      )!;
      titleInput.value = '#ddeeff';
      titleInput.dispatchEvent(new Event('input'));
      expect(updateSpy).toHaveBeenCalledWith(categories[0].id, { titleColor: '#ddeeff' });
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('places categories section after Presets', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const titles = getAccordionTitles(container);
      const presetsIdx = titles.indexOf('Presets');
      const catIdx = titles.indexOf('Color Categories');
      expect(presetsIdx).toBeLessThan(catIdx);
    });
  });

  describe('Unified Presets section', () => {
    it('renders a single Presets section', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const titles = getAccordionTitles(container);
      expect(titles.filter((t) => t === 'Presets').length).toBe(1);
      expect(titles).not.toContain('Theme Presets');
      expect(titles).not.toContain('Layout Presets');
    });

    it('renders preset cards with swatches', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const cards = container.querySelectorAll('.preset-card');
      expect(cards.length).toBe(COMBINED_PRESETS.length);
      for (const card of Array.from(cards)) {
        const swatch = card.querySelector('.preset-swatch');
        expect(swatch).not.toBeNull();
      }
    });

    it('exposes saveCurrentAsPreset public method', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      expect(typeof editor.saveCurrentAsPreset).toBe('function');
    });

    it('clicking a preset applies both colors and layout', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const firstCard = container.querySelector<HTMLButtonElement>('.preset-card')!;
      firstCard.click();
      const calls = (renderer.updateOptions as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1][0] as Partial<RendererOptions>;
      // Should contain color keys
      expect(lastCall).toHaveProperty('cardFill');
      expect(lastCall).toHaveProperty('cardStroke');
      // Should contain size keys
      expect(lastCall).toHaveProperty('nodeWidth');
      expect(lastCall).toHaveProperty('nodeHeight');
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('renders layout preset buttons', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      // Layout buttons: Compact, Default, Spacious, Presentation
      const buttons = container.querySelectorAll('button');
      const layoutBtnTexts = Array.from(buttons)
        .map((b) => b.textContent)
        .filter(
          (t) => t && ['Compact', 'Default', 'Spacious', 'Presentation'].some((n) => t.includes(n)),
        );
      expect(layoutBtnTexts.length).toBe(4);
    });

    it('layout button applies only sizes', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const buttons = Array.from(container.querySelectorAll('button'));
      const compactBtn = buttons.find((b) => b.textContent?.includes('Compact'));
      expect(compactBtn).toBeDefined();
      compactBtn!.click();
      const calls = (renderer.updateOptions as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1][0] as Partial<RendererOptions>;
      expect(lastCall.nodeWidth).toBe(110);
      expect(lastCall).not.toHaveProperty('cardFill');
    });

    it('saveCurrentAsPreset saves to localStorage and rebuilds', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      editor.saveCurrentAsPreset('My Custom');
      // After save, preset grid should include the custom preset
      const cards = container.querySelectorAll('.preset-card');
      expect(cards.length).toBe(COMBINED_PRESETS.length + 1);
      const customCard = Array.from(cards).find((c) => c.textContent?.includes('⭐ My Custom'));
      expect(customCard).toBeDefined();
      // Verify localStorage was written
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arbol-custom-presets',
        expect.any(String),
      );
    });

    it('custom preset has delete button visible on hover', () => {
      // Pre-populate a custom preset
      localStorageMock.setItem(
        'arbol-custom-presets',
        JSON.stringify([
          {
            id: 'custom-test',
            name: 'Test',
            colors: {
              cardFill: '#fff',
              cardStroke: '#000',
              cardStrokeWidth: 1,
              linkColor: '#888',
              linkWidth: 1,
              icContainerFill: '#eee',
            },
            sizes: { nodeWidth: 110 },
          },
        ]),
      );
      new SettingsEditor(container, renderer, rerenderCb);
      const customCard = container.querySelector('[data-preset-id="custom-test"]')!;
      const deleteBtn = customCard.querySelector('.preset-delete') as HTMLElement;
      expect(deleteBtn).not.toBeNull();
      expect(deleteBtn.textContent).toBe('×');
    });

    it('deleting a custom preset removes it from grid and localStorage', () => {
      localStorageMock.setItem(
        'arbol-custom-presets',
        JSON.stringify([
          {
            id: 'custom-del',
            name: 'ToDelete',
            colors: {
              cardFill: '#fff',
              cardStroke: '#000',
              cardStrokeWidth: 1,
              linkColor: '#888',
              linkWidth: 1,
              icContainerFill: '#eee',
            },
            sizes: { nodeWidth: 110 },
          },
        ]),
      );
      new SettingsEditor(container, renderer, rerenderCb);
      let cards = container.querySelectorAll('.preset-card');
      expect(cards.length).toBe(COMBINED_PRESETS.length + 1);
      const deleteBtn = container.querySelector('.preset-delete') as HTMLElement;
      deleteBtn.click();
      cards = container.querySelectorAll('.preset-card');
      expect(cards.length).toBe(COMBINED_PRESETS.length);
    });
  });

  describe('headcount badge settings', () => {
    it('renders checkbox for showHeadcount', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const badgeSection = findSectionByTitle(container, 'Headcount Badge')!;
      expect(badgeSection).toBeDefined();
      const checkbox = badgeSection.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
      expect(checkbox!.checked).toBe(false);
    });

    it('toggling checkbox updates renderer', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const badgeSection = findSectionByTitle(container, 'Headcount Badge')!;
      const checkbox = badgeSection.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(renderer.updateOptions as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.objectContaining({ showHeadcount: true }),
      );
      expect(rerenderCb).toHaveBeenCalled();
    });

    it('renders badge styling controls', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const badgeSection = findSectionByTitle(container, 'Headcount Badge')!;
      const rangeInputs = badgeSection.querySelectorAll('input[type="range"]');
      const colorInputs = badgeSection.querySelectorAll('input[type="color"]');
      // 4 range inputs: font size, height, radius, padding
      expect(rangeInputs.length).toBe(4);
      // 2 color inputs: badge color, badge text color
      expect(colorInputs.length).toBe(2);
    });
  });

  describe('level badge settings', () => {
    it('renders level-badge settings group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const section = findSectionByTitle(container, 'Level Badge')!;
      expect(section).toBeDefined();
      expect(section.getAttribute('data-section-id')).toBe('level-badge');
    });

    it('level-badge group contains showLevel checkbox', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const section = findSectionByTitle(container, 'Level Badge')!;
      const checkbox = section.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
      expect(checkbox!.checked).toBe(false);
    });

    it('level-badge group contains range and color inputs', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const section = findSectionByTitle(container, 'Level Badge')!;
      const rangeInputs = section.querySelectorAll('input[type="range"]');
      const colorInputs = section.querySelectorAll('input[type="color"]');
      // 2 range inputs: font size, size
      expect(rangeInputs.length).toBe(2);
      // 2 color inputs: badge color, badge text color
      expect(colorInputs.length).toBe(2);
    });

    it('showLevel checkbox toggles setting value', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const section = findSectionByTitle(container, 'Level Badge')!;
      const checkbox = section.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(renderer.updateOptions as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.objectContaining({ showLevel: true }),
      );
      expect(rerenderCb).toHaveBeenCalled();
    });
  });

  describe('export settings', () => {
    it('renders Categories Legend section with Legend Rows control', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const exportSection = findSectionByTitle(container, 'Categories Legend')!;
      expect(exportSection).toBeDefined();
      const rangeInput = exportSection.querySelector<HTMLInputElement>('input[type="range"]');
      expect(rangeInput).not.toBeNull();
      expect(rangeInput!.min).toBe('0');
      expect(rangeInput!.max).toBe('20');
    });

    it('changing Legend Rows slider updates renderer', () => {
      vi.useFakeTimers();
      try {
        new SettingsEditor(container, renderer, rerenderCb);
        const exportSection = findSectionByTitle(container, 'Categories Legend')!;
        const rangeInput = exportSection.querySelector<HTMLInputElement>('input[type="range"]')!;
        rangeInput.value = '3';
        rangeInput.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(100);
        expect(renderer.updateOptions as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
          expect.objectContaining({ legendRows: 3 }),
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('backup & restore section', () => {
    function createMockChartDB() {
      return {
        open: vi.fn(),
        close: vi.fn(),
        getAllCharts: vi.fn(async () => []),
        getChart: vi.fn(),
        putChart: vi.fn(),
        deleteChart: vi.fn(),
        getVersionsByChart: vi.fn(async () => []),
        putVersion: vi.fn(),
        deleteVersion: vi.fn(),
        deleteVersionsByChart: vi.fn(),
        isChartNameTaken: vi.fn(),
      };
    }

    it('renders Backup & Restore section when chartDB is provided', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);
      const titles = getAccordionTitles(container);
      expect(titles).toContain('Backup & Restore');
    });

    it('does not render Backup & Restore section when chartDB is not provided', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const titles = getAccordionTitles(container);
      expect(titles).not.toContain('Backup & Restore');
    });

    it('section count increases by 1 when chartDB is provided', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const sectionsWithout = container.querySelectorAll('[data-section-id]').length;

      container.remove();
      container = document.createElement('div');
      document.body.appendChild(container);

      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);
      const sectionsWith = container.querySelectorAll('[data-section-id]').length;

      expect(sectionsWith).toBe(sectionsWithout + 1);
    });

    it('Backup & Restore section appears before Clear All Data button', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);

      const sections = Array.from(container.querySelectorAll('[data-section-id]'));
      const backupSection = sections.find((s) => {
        const titleEl = s.querySelector('.accordion-title') ?? s.querySelector('.setting-section-title');
        return titleEl?.textContent === 'Backup & Restore';
      });
      expect(backupSection).toBeDefined();

      const clearBtn = container.querySelector('button[aria-label="Clear all local data"]');
      expect(clearBtn).not.toBeNull();

      // Both are direct children of container — verify DOM order via compareDocumentPosition
      const position = backupSection!.compareDocumentPosition(clearBtn!);
      // eslint-disable-next-line no-bitwise
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Create Backup button exists', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);

      const backupSection = Array.from(container.querySelectorAll('.accordion-section')).find(
        (s) => s.querySelector('.accordion-title')?.textContent === 'Backup & Restore',
      )!;
      const btns = backupSection.querySelectorAll('button');
      const createBtn = Array.from(btns).find((b) => b.textContent?.includes('Create Backup'));
      expect(createBtn).toBeDefined();
    });

    it('Restore button exists', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);

      const backupSection = Array.from(container.querySelectorAll('.accordion-section')).find(
        (s) => s.querySelector('.accordion-title')?.textContent === 'Backup & Restore',
      )!;
      const btns = backupSection.querySelectorAll('button');
      const restoreBtn = Array.from(btns).find((b) => b.textContent?.includes('Restore'));
      expect(restoreBtn).toBeDefined();
    });

  });

  describe('text alignment select control', () => {
    it('renders a select element for textAlign in Typography group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = findSectionByTitle(container, 'Typography')!;
      expect(typoSection).toBeDefined();
      const selects = typoSection.querySelectorAll('select');
      expect(selects.length).toBeGreaterThanOrEqual(1);
      const textAlignSelect = Array.from(selects).find((s) => {
        const options = Array.from(s.querySelectorAll('option'));
        return options.some((o) => o.value === 'left') &&
               options.some((o) => o.value === 'center') &&
               options.some((o) => o.value === 'right');
      });
      expect(textAlignSelect).toBeDefined();
    });

    it('has center selected by default', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = findSectionByTitle(container, 'Typography')!;
      const selects = typoSection.querySelectorAll('select');
      const textAlignSelect = Array.from(selects).find((s) => {
        const options = Array.from(s.querySelectorAll('option'));
        return options.some((o) => o.value === 'left') &&
               options.some((o) => o.value === 'center') &&
               options.some((o) => o.value === 'right');
      });
      expect(textAlignSelect).toBeDefined();
      expect(textAlignSelect!.value).toBe('center');
    });

    it('renders textPaddingHorizontal range input', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = findSectionByTitle(container, 'Typography')!;
      const rangeInputs = typoSection.querySelectorAll('input[type="range"]');
      // Should have range inputs including textPaddingHorizontal
      expect(rangeInputs.length).toBeGreaterThanOrEqual(5);
    });

    it('renders fontFamily select in Typography group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = findSectionByTitle(container, 'Typography')!;
      const selects = typoSection.querySelectorAll('select');
      // Should have 2 selects: textAlign and fontFamily
      expect(selects.length).toBe(2);
      const fontSelect = Array.from(selects).find((s) => {
        const options = Array.from(s.querySelectorAll('option'));
        return options.some((o) => o.value === 'Calibri');
      });
      expect(fontSelect).toBeDefined();
      expect(fontSelect!.value).toBe('Calibri');
    });
  });

  describe('card border radius control', () => {
    it('renders cardBorderRadius range in Card Style group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const cardSection = findSectionByTitle(container, 'Card Style')!;
      expect(cardSection).toBeDefined();
      const rangeInputs = cardSection.querySelectorAll('input[type="range"]');
      // cardStrokeWidth + cardBorderRadius = 2 range inputs
      expect(rangeInputs.length).toBe(2);
    });
  });

  describe('preset delete button accessibility', () => {
    it('custom preset delete element is a button', () => {
      localStorageMock.setItem(
        'arbol-custom-presets',
        JSON.stringify([
          {
            id: 'custom-btn-test',
            name: 'BtnTest',
            colors: {
              cardFill: '#fff',
              cardStroke: '#000',
              cardStrokeWidth: 1,
              linkColor: '#888',
              linkWidth: 1,
              icContainerFill: '#eee',
            },
            sizes: { nodeWidth: 110 },
          },
        ]),
      );
      new SettingsEditor(container, renderer, rerenderCb);
      const customCard = container.querySelector('[data-preset-id="custom-btn-test"]')!;
      const deleteBtn = customCard.querySelector('.preset-delete')!;
      expect(deleteBtn.tagName).toBe('BUTTON');
    });

    it('custom preset delete button has aria-label', () => {
      localStorageMock.setItem(
        'arbol-custom-presets',
        JSON.stringify([
          {
            id: 'custom-aria-test',
            name: 'AriaTest',
            colors: {
              cardFill: '#fff',
              cardStroke: '#000',
              cardStrokeWidth: 1,
              linkColor: '#888',
              linkWidth: 1,
              icContainerFill: '#eee',
            },
            sizes: { nodeWidth: 110 },
          },
        ]),
      );
      new SettingsEditor(container, renderer, rerenderCb);
      const customCard = container.querySelector('[data-preset-id="custom-aria-test"]')!;
      const deleteBtn = customCard.querySelector('.preset-delete')!;
      expect(deleteBtn.getAttribute('aria-label')).toContain('Delete preset');
    });
  });

  describe('setting descriptions', () => {
    it('setting rows contain .setting-desc elements', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const descs = container.querySelectorAll('.setting-desc');
      expect(descs.length).toBeGreaterThan(0);
    });

    it('descriptions are non-empty text', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const descs = container.querySelectorAll('.setting-desc');
      for (const desc of Array.from(descs)) {
        expect(desc.textContent!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('value units', () => {
    it('range setting values contain .setting-unit span with "px" text', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const units = container.querySelectorAll('.setting-unit');
      expect(units.length).toBeGreaterThan(0);
      const pxUnits = Array.from(units).filter((u) => u.textContent === 'px');
      expect(pxUnits.length).toBeGreaterThan(0);
    });

    it('legendRows setting shows "rows" unit', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const legendSection = findSectionByTitle(container, 'Categories Legend')!;
      expect(legendSection).toBeDefined();
      const unit = legendSection.querySelector('.setting-unit');
      expect(unit).not.toBeNull();
      expect(unit!.textContent).toBe('rows');
    });
  });

  describe('modified indicators', () => {
    it('no .setting-modified-dot when all values match defaults', () => {
      // Create a renderer returning exact DEFAULT_SETTINGS values for fields
      // that differ between DEFAULT_OPTS and source DEFAULT_SETTINGS
      const exactDefaultRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          linkColor: '#94a3b8',
          linkWidth: 1.5,
          cardStroke: '#22c55e',
          icContainerFill: '#e5e7eb',
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, exactDefaultRenderer, rerenderCb);
      const dots = container.querySelectorAll('.setting-modified-dot');
      const visibleDots = Array.from(dots).filter(d => (d as HTMLElement).style.display !== 'none');
      expect(visibleDots.length).toBe(0);
    });

    it('.setting-modified-dot appears when renderer returns non-default value', () => {
      const modifiedRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          nodeWidth: 999,
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, modifiedRenderer, rerenderCb);
      const dots = container.querySelectorAll('.setting-modified-dot');
      expect(dots.length).toBeGreaterThan(0);
      // The dot should be inside a label
      const dot = dots[0];
      expect(dot.closest('.setting-label')).not.toBeNull();
    });
  });

  describe('per-setting reset buttons', () => {
    it('.setting-reset-btn exists on setting rows', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const resetBtns = container.querySelectorAll('.setting-reset-btn');
      expect(resetBtns.length).toBeGreaterThan(0);
    });

    it('reset button has .visible class when value differs from default', () => {
      const modifiedRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          nodeWidth: 999,
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, modifiedRenderer, rerenderCb);
      const visibleResets = container.querySelectorAll('.setting-reset-btn.visible');
      expect(visibleResets.length).toBeGreaterThan(0);
    });

    it('reset button does not have .visible class when all values match defaults', () => {
      const exactDefaultRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          linkColor: '#94a3b8',
          linkWidth: 1.5,
          cardStroke: '#22c55e',
          icContainerFill: '#e5e7eb',
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, exactDefaultRenderer, rerenderCb);
      const visibleResets = container.querySelectorAll('.setting-reset-btn.visible');
      expect(visibleResets.length).toBe(0);
    });

    it('clicking reset button calls renderer.updateOptions with default value and triggers rerender', () => {
      const modifiedRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          nodeWidth: 999,
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, modifiedRenderer, rerenderCb);
      const visibleReset = container.querySelector<HTMLButtonElement>('.setting-reset-btn.visible')!;
      expect(visibleReset).not.toBeNull();
      visibleReset.click();
      expect(modifiedRenderer.updateOptions).toHaveBeenCalled();
      expect(rerenderCb).toHaveBeenCalled();
    });
  });

  describe('section descriptions', () => {
    it('.section-intro elements exist for setting groups that have descriptions', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const intros = container.querySelectorAll('.section-intro');
      expect(intros.length).toBeGreaterThan(0);
    });

    it('section-intro text is non-empty', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const intros = container.querySelectorAll('.section-intro');
      for (const intro of Array.from(intros)) {
        expect(intro.textContent!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('category card preview', () => {
    it('.category-preview-card elements are rendered when categoryStore has categories', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const previews = container.querySelectorAll('.category-preview-card');
      expect(previews.length).toBe(catStore.getAll().length);
    });

    it('preview shows .cat-preview-name and .cat-preview-title spans', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const preview = container.querySelector('.category-preview-card')!;
      expect(preview).not.toBeNull();
      const nameSpan = preview.querySelector('.cat-preview-name');
      const titleSpan = preview.querySelector('.cat-preview-title');
      expect(nameSpan).not.toBeNull();
      expect(titleSpan).not.toBeNull();
      expect(nameSpan!.textContent!.length).toBeGreaterThan(0);
      expect(titleSpan!.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe('category delete confirmation', () => {
    it('first click on delete button changes its text/class to confirm state', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const deleteBtn = container.querySelector<HTMLButtonElement>(
        `button[aria-label="Remove ${categories[0].label}"]`,
      )!;
      expect(deleteBtn.textContent).toBe('×');
      deleteBtn.click();
      expect(deleteBtn.textContent).toBe('?');
      expect(deleteBtn.classList.contains('category-delete-confirm')).toBe(true);
    });

    it('second click within timeout actually removes the category', () => {
      const catStore = new CategoryStore();
      const removeSpy = vi.spyOn(catStore, 'remove');
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      const deleteBtn = container.querySelector<HTMLButtonElement>(
        `button[aria-label="Remove ${categories[0].label}"]`,
      )!;
      deleteBtn.click(); // first click — enters confirm state
      deleteBtn.click(); // second click — confirms deletion
      expect(removeSpy).toHaveBeenCalledWith(categories[0].id);
      expect(rerenderCb).toHaveBeenCalled();
    });
  });

  describe('layout preset descriptions', () => {
    it('layout preset buttons contain .layout-preset-dims elements with dimension text', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const dims = container.querySelectorAll('.layout-preset-dims');
      expect(dims.length).toBe(4); // Compact, Default, Spacious, Presentation
      for (const dim of Array.from(dims)) {
        expect(dim.textContent).toMatch(/\d+ × \d+/);
      }
    });

    it('layout preset buttons contain .layout-preset-desc elements', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const descs = container.querySelectorAll('.layout-preset-desc');
      expect(descs.length).toBe(4);
      for (const desc of Array.from(descs)) {
        expect(desc.textContent!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('active preset indicator', () => {
    it('preset card has .preset-active class when renderer options match preset colors', () => {
      // Default opts match the first preset if colors align — use a renderer
      // whose colors and sizes match the first combined preset
      const firstPreset = COMBINED_PRESETS[0];
      const matchingRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          cardFill: firstPreset.colors.cardFill,
          cardStroke: firstPreset.colors.cardStroke,
          linkColor: firstPreset.colors.linkColor,
          cardStrokeWidth: firstPreset.colors.cardStrokeWidth,
          icContainerFill: firstPreset.colors.icContainerFill,
          nodeWidth: firstPreset.sizes.nodeWidth,
          nodeHeight: firstPreset.sizes.nodeHeight,
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, matchingRenderer, rerenderCb);
      const activeCards = container.querySelectorAll('.preset-card.preset-active');
      expect(activeCards.length).toBeGreaterThan(0);
    });

    it('.preset-active-badge element exists on active preset', () => {
      const firstPreset = COMBINED_PRESETS[0];
      const matchingRenderer = {
        getOptions: vi.fn(() => ({
          ...DEFAULT_OPTS,
          cardFill: firstPreset.colors.cardFill,
          cardStroke: firstPreset.colors.cardStroke,
          linkColor: firstPreset.colors.linkColor,
          cardStrokeWidth: firstPreset.colors.cardStrokeWidth,
          icContainerFill: firstPreset.colors.icContainerFill,
          nodeWidth: firstPreset.sizes.nodeWidth,
          nodeHeight: firstPreset.sizes.nodeHeight,
        })),
        updateOptions: vi.fn(),
      } as unknown as ChartRenderer;
      new SettingsEditor(container, matchingRenderer, rerenderCb);
      const activeCard = container.querySelector('.preset-card.preset-active')!;
      expect(activeCard).not.toBeNull();
      const badge = activeCard.querySelector('.preset-active-badge');
      expect(badge).not.toBeNull();
      expect(badge!.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe('preview area wiring', () => {
    it('setPreviewArea renders SVG into the preview element', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      const svg = previewArea.querySelector('svg.preview-svg');
      expect(svg).not.toBeNull();
      previewArea.remove();
    });

    it('preview SVG contains expected nodes from sample tree', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      const textContent = previewArea.textContent ?? '';
      expect(textContent).toContain('Root');
      expect(textContent).toContain('Manager A');
      previewArea.remove();
    });

    it('preview persists same SVG on refresh (persistent renderer)', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      const firstSVG = previewArea.querySelector('svg');
      editor.refresh();
      const secondSVG = previewArea.querySelector('svg');
      expect(secondSVG).not.toBeNull();
      // Same SVG element (persistent renderer, not recreated)
      expect(secondSVG).toBe(firstSVG);
      previewArea.remove();
    });

    it('getZoomManager() returns non-null ZoomManager for preview', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      // Access the preview's zoom manager via wirePreviewControls behavior
      const fitBtn = document.createElement('button');
      const resetBtn = document.createElement('button');
      const zoomPct = document.createElement('span');
      // wirePreviewControls should not return early (zm is not null)
      editor.wirePreviewControls(fitBtn, resetBtn, zoomPct);
      // If wiring succeeded, zoom percentage should be set
      expect(zoomPct.textContent).toMatch(/\d+%/);
      previewArea.remove();
    });

    it('wirePreviewControls wires fit and reset buttons', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      const fitBtn = document.createElement('button');
      const resetBtn = document.createElement('button');
      const zoomPct = document.createElement('span');
      editor.wirePreviewControls(fitBtn, resetBtn, zoomPct);
      // Clicking fit should not throw
      expect(() => fitBtn.click()).not.toThrow();
      // Clicking reset should not throw
      expect(() => resetBtn.click()).not.toThrow();
      // Zoom percentage should be updated
      expect(zoomPct.textContent).toMatch(/\d+%/);
      previewArea.remove();
    });
  });

  describe('destroy', () => {
    it('destroy() cleans up preview renderer', () => {
      const editor = new SettingsEditor(container, renderer, rerenderCb);
      const previewArea = document.createElement('div');
      document.body.appendChild(previewArea);
      editor.setPreviewArea(previewArea);
      expect(previewArea.querySelector('svg')).not.toBeNull();
      expect(() => editor.destroy()).not.toThrow();
      previewArea.remove();
    });
  });

  describe('range slider debounce', () => {
    it('range slider debounces renderer updates', () => {
      vi.useFakeTimers();
      try {
        const editor = new SettingsEditor(container, renderer, rerenderCb);
        const cardSection = findSectionByTitle(container, 'Card Dimensions')!;
        expect(cardSection).toBeDefined();
        const rangeInput = cardSection.querySelector<HTMLInputElement>('input[type="range"]')!;
        expect(rangeInput).not.toBeNull();

        // Fire multiple rapid input events
        rerenderCb.mockClear();
        (renderer.updateOptions as ReturnType<typeof vi.fn>).mockClear();
        for (let i = 0; i < 5; i++) {
          rangeInput.value = String(100 + i);
          rangeInput.dispatchEvent(new Event('input'));
        }

        // Expensive calls should NOT have fired yet
        expect(rerenderCb).not.toHaveBeenCalled();
        expect(renderer.updateOptions).not.toHaveBeenCalled();

        // After the debounce window, they should fire exactly once
        vi.advanceTimersByTime(100);
        expect(rerenderCb).toHaveBeenCalledTimes(1);
        expect(renderer.updateOptions).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('range slider updates display immediately', () => {
      vi.useFakeTimers();
      try {
        const editor = new SettingsEditor(container, renderer, rerenderCb);
        const cardSection = findSectionByTitle(container, 'Card Dimensions')!;
        const rangeInput = cardSection.querySelector<HTMLInputElement>('input[type="range"]')!;
        const valueSpan = rangeInput.closest('.setting-control')!.querySelector('.setting-value')!;

        rangeInput.value = '200';
        rangeInput.dispatchEvent(new Event('input'));

        // Value display should update immediately (no debounce wait)
        expect(valueSpan.textContent).toContain('200');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('settings editor listener cleanup', () => {
    it('build clears pending debounce timers', () => {
      vi.useFakeTimers();
      try {
        const editor = new SettingsEditor(container, renderer, rerenderCb);
        const cardSection = findSectionByTitle(container, 'Card Dimensions')!;
        const rangeInput = cardSection.querySelector<HTMLInputElement>('input[type="range"]')!;

        // Fire input to create a pending debounce timer
        rerenderCb.mockClear();
        rangeInput.value = '200';
        rangeInput.dispatchEvent(new Event('input'));

        // Trigger a rebuild (simulates preset change)
        editor.refresh();

        // Advance timers past the debounce window
        vi.advanceTimersByTime(200);

        // The OLD debounce callback should NOT have fired
        expect(rerenderCb).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('destroy clears debounce timers', () => {
      vi.useFakeTimers();
      try {
        const editor = new SettingsEditor(container, renderer, rerenderCb);
        const cardSection = findSectionByTitle(container, 'Card Dimensions')!;
        const rangeInput = cardSection.querySelector<HTMLInputElement>('input[type="range"]')!;

        // Fire input to create a pending debounce timer
        rerenderCb.mockClear();
        rangeInput.value = '200';
        rangeInput.dispatchEvent(new Event('input'));

        // Destroy the editor
        editor.destroy();

        // Advance timers past the debounce window
        vi.advanceTimersByTime(200);

        // The debounce callback should NOT have fired
        expect(rerenderCb).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

});
