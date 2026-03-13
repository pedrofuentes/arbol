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
  legendRows: 0,
  textAlign: 'center',
  textPaddingHorizontal: 8,
  fontFamily: 'Calibri',
  cardBorderRadius: 0,
  icContainerBorderRadius: 0,
  categories: [],
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

  it('builds settings panel with accordion sections', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const titles = getAccordionTitles(container);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles).toContain('Presets');
    expect(titles).not.toContain('Theme Presets');
    expect(titles).not.toContain('Layout Presets');
  });

  it('renders expand-all / collapse-all button', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const actionsRow = container.querySelector('.accordion-actions');
    expect(actionsRow).not.toBeNull();
    const btn = actionsRow!.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('Expand all');
  });

  it('wraps each setting group in an accordion section', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const sections = container.querySelectorAll('.accordion-section');
    // presets + 9 groups + settings-io = 11 (no categories without store)
    expect(sections.length).toBe(11);
  });

  it('setting group accordions have reset buttons', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const resetBtns = container.querySelectorAll('.accordion-reset');
    // 9 setting groups have reset buttons
    expect(resetBtns.length).toBe(9);
  });

  it('reset button calls updateOptions with defaults and rerenders', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const resetBtn = container.querySelector<HTMLButtonElement>('.accordion-reset');
    expect(resetBtn).not.toBeNull();
    resetBtn!.click();
    expect(renderer.updateOptions as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(rerenderCb).toHaveBeenCalled();
  });

  it('accordion header toggles expanded state', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    // Card Dimensions is collapsed by default (not in DEFAULT_EXPANDED)
    const headers = container.querySelectorAll<HTMLButtonElement>('.accordion-header');
    const cardDimHeader = Array.from(headers).find(
      (h) => h.querySelector('.accordion-title')?.textContent === 'Card Dimensions',
    )!;
    expect(cardDimHeader.getAttribute('aria-expanded')).toBe('false');

    cardDimHeader.click();
    expect(cardDimHeader.getAttribute('aria-expanded')).toBe('true');

    cardDimHeader.click();
    expect(cardDimHeader.getAttribute('aria-expanded')).toBe('false');
  });

  it('default-expanded sections start expanded', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const presetsContent = container.querySelector('#accordion-presets');
    expect(presetsContent).not.toBeNull();
    expect(presetsContent!.getAttribute('data-expanded')).toBe('true');
  });

  it('persists accordion state to localStorage', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const headers = container.querySelectorAll<HTMLButtonElement>('.accordion-header');
    const presetsHeader = Array.from(headers).find(
      (h) => h.querySelector('.accordion-title')?.textContent === 'Presets',
    )!;
    // Collapse the presets section (starts expanded)
    presetsHeader.click();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'arbol-accordion-state',
      expect.any(String),
    );
    const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1] as string);
    expect(saved.presets).toBe(false);
  });

  it('loads accordion state from localStorage', () => {
    localStorageMock.setItem(
      'arbol-accordion-state',
      JSON.stringify({ presets: false, 'card-dimensions': true }),
    );
    new SettingsEditor(container, renderer, rerenderCb);

    const presetsContent = container.querySelector('#accordion-presets');
    expect(presetsContent!.getAttribute('data-expanded')).toBe('false');

    const cardDimContent = container.querySelector('#accordion-card-dimensions');
    expect(cardDimContent!.getAttribute('data-expanded')).toBe('true');
  });

  describe('Node Categories section', () => {
    it('renders categories section when categoryStore is provided', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const titles = getAccordionTitles(container);
      expect(titles).toContain('Node Categories');
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
      deleteBtn.click();
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
      const catIdx = titles.indexOf('Node Categories');
      expect(presetsIdx).toBeLessThan(catIdx);
    });
  });

  describe('Unified Presets section', () => {
    it('renders a single Presets accordion section', () => {
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

    it('renders Save as Preset button', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const saveBtn = container.querySelector('.save-preset-btn');
      expect(saveBtn).not.toBeNull();
      expect(saveBtn!.textContent).toBe('💾 Save as Preset');
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

    it('shows name input when Save as Preset is clicked', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const saveBtn = container.querySelector<HTMLButtonElement>('.save-preset-btn')!;
      const nameInput = container.querySelector<HTMLInputElement>(
        'input[aria-label="Custom preset name"]',
      )!;
      // Initially hidden
      expect(nameInput.style.display).not.toBe('block');
      saveBtn.click();
      expect(nameInput.style.display).toBe('block');
    });

    it('saves custom preset to localStorage and renders it', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const saveBtn = container.querySelector<HTMLButtonElement>('.save-preset-btn')!;
      saveBtn.click();
      const nameInput = container.querySelector<HTMLInputElement>(
        'input[aria-label="Custom preset name"]',
      )!;
      nameInput.value = 'My Custom';
      const confirmBtn = container.querySelector<HTMLButtonElement>('.btn-primary')!;
      confirmBtn.click();
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

  describe('settings filter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function triggerFilter(input: HTMLInputElement, value: string): void {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(200);
    }

    it('renders filter input with placeholder', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      );
      expect(input).not.toBeNull();
      expect(input!.placeholder).toContain('Filter');
    });

    it('dims non-matching sections when filtering', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      triggerFilter(input, 'typography');

      const sections = container.querySelectorAll<HTMLElement>('.accordion-section');
      const nonMatching = Array.from(sections).filter(
        (s) =>
          !s.querySelector('.accordion-title')?.textContent?.toLowerCase().includes('typography'),
      );
      for (const section of nonMatching) {
        expect(section.style.opacity).toBe('0.3');
      }
    });

    it('shows matching sections with full opacity', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      triggerFilter(input, 'typography');

      const sections = container.querySelectorAll<HTMLElement>('.accordion-section');
      const matching = Array.from(sections).find((s) =>
        s.querySelector('.accordion-title')?.textContent?.toLowerCase().includes('typography'),
      );
      expect(matching).toBeDefined();
      expect(matching!.style.opacity).toBe('1');
    });

    it('restores all sections when filter is cleared', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;

      triggerFilter(input, 'typography');
      triggerFilter(input, '');

      const sections = container.querySelectorAll<HTMLElement>('.accordion-section');
      for (const section of sections) {
        expect(section.style.opacity).toBe('1');
      }
    });

    it('shows clear button when filter has text', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      const clearButton = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Clear filter"]',
      )!;

      expect(clearButton.style.display).toBe('none');

      triggerFilter(input, 'card');
      expect(clearButton.style.display).toBe('block');
    });

    it('clears filter when clear button is clicked', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      const clearButton = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Clear filter"]',
      )!;

      triggerFilter(input, 'card');
      clearButton.click();
      vi.advanceTimersByTime(200);

      expect(input.value).toBe('');
      expect(clearButton.style.display).toBe('none');

      const sections = container.querySelectorAll<HTMLElement>('.accordion-section');
      for (const section of sections) {
        expect(section.style.opacity).toBe('1');
      }
    });

    it('auto-expands matching sections during filter', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      triggerFilter(input, 'typography');

      const typoSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent?.toLowerCase().includes('typography'),
      )!;
      const content = typoSection.querySelector('.accordion-content')!;
      expect(content.getAttribute('data-expanded')).toBe('true');
    });

    it('matches on setting labels within sections', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      triggerFilter(input, 'node width');

      const cardDimSection = Array.from(
        container.querySelectorAll<HTMLElement>('.accordion-section'),
      ).find((s) => s.querySelector('.accordion-title')?.textContent === 'Card Dimensions');
      expect(cardDimSection).toBeDefined();
      expect(cardDimSection!.style.opacity).toBe('1');
    });

    it('disables pointer events on non-matching sections', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Filter settings"]',
      )!;
      triggerFilter(input, 'typography');

      const sections = container.querySelectorAll<HTMLElement>('.accordion-section');
      const nonMatching = Array.from(sections).filter(
        (s) =>
          !s.querySelector('.accordion-title')?.textContent?.toLowerCase().includes('typography'),
      );
      for (const section of nonMatching) {
        expect(section.style.pointerEvents).toBe('none');
      }
    });
  });

  describe('headcount badge settings', () => {
    it('renders checkbox for showHeadcount', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const badgeSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Headcount Badge',
      )!;
      expect(badgeSection).toBeDefined();
      const checkbox = badgeSection.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
      expect(checkbox!.checked).toBe(false);
    });

    it('toggling checkbox updates renderer', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const badgeSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Headcount Badge',
      )!;
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
      const badgeSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Headcount Badge',
      )!;
      const rangeInputs = badgeSection.querySelectorAll('input[type="range"]');
      const colorInputs = badgeSection.querySelectorAll('input[type="color"]');
      // 4 range inputs: font size, height, radius, padding
      expect(rangeInputs.length).toBe(4);
      // 2 color inputs: badge color, badge text color
      expect(colorInputs.length).toBe(2);
    });
  });

  describe('export settings', () => {
    it('renders Categories Legend accordion section with Legend Rows control', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const exportSection = Array.from(container.querySelectorAll('.accordion-section')).find(
        (s) => s.querySelector('.accordion-title')?.textContent === 'Categories Legend',
      )!;
      expect(exportSection).toBeDefined();
      const rangeInput = exportSection.querySelector<HTMLInputElement>('input[type="range"]');
      expect(rangeInput).not.toBeNull();
      expect(rangeInput!.min).toBe('0');
      expect(rangeInput!.max).toBe('20');
    });

    it('changing Legend Rows slider updates renderer', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const exportSection = Array.from(container.querySelectorAll('.accordion-section')).find(
        (s) => s.querySelector('.accordion-title')?.textContent === 'Categories Legend',
      )!;
      const rangeInput = exportSection.querySelector<HTMLInputElement>('input[type="range"]')!;
      rangeInput.value = '3';
      rangeInput.dispatchEvent(new Event('input'));
      expect(renderer.updateOptions as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.objectContaining({ legendRows: 3 }),
      );
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

    it('renders Backup & Restore accordion section when chartDB is provided', () => {
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
      const sectionsWithout = container.querySelectorAll('.accordion-section').length;

      container.remove();
      container = document.createElement('div');
      document.body.appendChild(container);

      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);
      const sectionsWith = container.querySelectorAll('.accordion-section').length;

      expect(sectionsWith).toBe(sectionsWithout + 1);
    });

    it('Backup & Restore section appears before Clear All Data button', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);

      const sections = Array.from(container.querySelectorAll('.accordion-section'));
      const backupSection = sections.find(
        (s) => s.querySelector('.accordion-title')?.textContent === 'Backup & Restore',
      );
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

    it('accordion state for backup-restore section persists', () => {
      const db = createMockChartDB();
      new SettingsEditor(container, renderer, rerenderCb, undefined, undefined, db as any);

      const headers = container.querySelectorAll<HTMLButtonElement>('.accordion-header');
      const backupHeader = Array.from(headers).find(
        (h) => h.querySelector('.accordion-title')?.textContent === 'Backup & Restore',
      )!;

      // Click to toggle
      backupHeader.click();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arbol-accordion-state',
        expect.any(String),
      );
    });
  });

  describe('text alignment select control', () => {
    it('renders a select element for textAlign in Typography group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Typography',
      )!;
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
      const typoSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Typography',
      )!;
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
      const typoSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Typography',
      )!;
      const rangeInputs = typoSection.querySelectorAll('input[type="range"]');
      // Should have range inputs including textPaddingHorizontal
      expect(rangeInputs.length).toBeGreaterThanOrEqual(5);
    });

    it('renders fontFamily select in Typography group', () => {
      new SettingsEditor(container, renderer, rerenderCb);
      const typoSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Typography',
      )!;
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
      const cardSection = Array.from(container.querySelectorAll('.accordion-section')).find((s) =>
        s.querySelector('.accordion-title')?.textContent === 'Card Style',
      )!;
      expect(cardSection).toBeDefined();
      const rangeInputs = cardSection.querySelectorAll('input[type="range"]');
      // cardStrokeWidth + cardBorderRadius + icContainerBorderRadius = 3 range inputs
      expect(rangeInputs.length).toBe(3);
    });
  });
});
