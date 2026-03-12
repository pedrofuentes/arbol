import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsEditor } from '../../src/editor/settings-editor';
import { CategoryStore } from '../../src/store/category-store';
import type { ChartRenderer, RendererOptions, ResolvedOptions } from '../../src/renderer/chart-renderer';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const DEFAULT_OPTS: ResolvedOptions = {
  container: document.createElement('div'),
  nodeWidth: 110,
  nodeHeight: 22,
  horizontalSpacing: 30,
  branchSpacing: 10,
  topVerticalSpacing: 5,
  bottomVerticalSpacing: 12,
  icNodeWidth: 99,
  icGap: 4,
  icContainerPadding: 6,
  palTopGap: 7,
  palBottomGap: 7,
  palRowGap: 4,
  palCenterGap: 50,
  nameFontSize: 8,
  titleFontSize: 7,
  textPaddingTop: 4,
  textGap: 1,
  linkWidth: 1,
  linkColor: '#888888',
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
    expect(titles).toContain('Theme Presets');
    expect(titles).toContain('Layout Presets');
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
    // presets + layout-presets + 7 groups + settings-io = 10 (no categories without store)
    expect(sections.length).toBe(10);
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
    expect((renderer.updateOptions as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
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
      (h) => h.querySelector('.accordion-title')?.textContent === 'Theme Presets',
    )!;
    // Collapse the presets section (starts expanded)
    presetsHeader.click();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'arbol-accordion-state',
      expect.any(String),
    );
    const saved = JSON.parse(
      localStorageMock.setItem.mock.calls.at(-1)![1] as string,
    );
    expect(saved.presets).toBe(false);
  });

  it('loads accordion state from localStorage', () => {
    localStorageMock.setItem('arbol-accordion-state', JSON.stringify({ presets: false, 'card-dimensions': true }));
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
      const colorInputs = container.querySelectorAll<HTMLInputElement>('input[type="color"][aria-label^="Color for"]');
      expect(colorInputs.length).toBe(categories.length);
    });

    it('renders color picker and label input for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      for (const cat of categories) {
        const colorInput = container.querySelector<HTMLInputElement>(`input[aria-label="Color for ${cat.label}"]`);
        expect(colorInput).not.toBeNull();
        expect(colorInput!.type).toBe('color');
        expect(colorInput!.value).toBe(cat.color);
      }
      const labelInputs = container.querySelectorAll<HTMLInputElement>('input[aria-label="Category label"]');
      expect(labelInputs.length).toBe(categories.length);
    });

    it('renders delete button for each category', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const categories = catStore.getAll();
      for (const cat of categories) {
        const btn = container.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${cat.label}"]`);
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
      const labelInputs = container.querySelectorAll<HTMLInputElement>('input[aria-label="Category label"]');
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
      const labelInputs = container.querySelectorAll<HTMLInputElement>('input[aria-label="Category label"]');
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

    it('places categories section between Theme Presets and Layout Presets', () => {
      const catStore = new CategoryStore();
      new SettingsEditor(container, renderer, rerenderCb, undefined, catStore);
      const titles = getAccordionTitles(container);
      const themeIdx = titles.indexOf('Theme Presets');
      const catIdx = titles.indexOf('Node Categories');
      const layoutIdx = titles.indexOf('Layout Presets');
      expect(themeIdx).toBeLessThan(catIdx);
      expect(catIdx).toBeLessThan(layoutIdx);
    });
  });
});
