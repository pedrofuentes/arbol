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
  textPaddingTop: 6,
  textGap: 2,
  linkWidth: 1,
  linkColor: '#888888',
  dottedLineDash: '6,4',
  cardStrokeWidth: 1,
  cardStroke: '#cccccc',
  cardFill: '#ffffff',
  icContainerFill: '#f0f0f0',
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
    // presets + 7 groups + settings-io = 9 (no categories without store)
    expect(sections.length).toBe(9);
  });

  it('setting group accordions have reset buttons', () => {
    new SettingsEditor(container, renderer, rerenderCb);
    const resetBtns = container.querySelectorAll('.accordion-reset');
    // 7 setting groups have reset buttons
    expect(resetBtns.length).toBe(7);
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
});
