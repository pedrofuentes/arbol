import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { showCategoryLegend, dismissCategoryLegend } from '../../src/ui/category-legend';
import type { ColorCategory } from '../../src/types';

function getLegend(): HTMLDivElement | null {
  return document.querySelector('[data-testid="category-legend"]');
}

function getLegendItems(): NodeListOf<HTMLElement> {
  return document.querySelectorAll('[data-testid="category-legend-item"]');
}

function getToggleButton(): HTMLButtonElement | null {
  return document.querySelector('[data-testid="category-legend-toggle"]');
}

describe('CategoryLegend', () => {
  let container: HTMLDivElement;

  const sampleCategories: ColorCategory[] = [
    { id: 'open-position', label: 'Open Position', color: '#fbbf24' },
    { id: 'offer-pending', label: 'Offer Pending', color: '#60a5fa' },
    { id: 'future-start', label: 'Future Start', color: '#a78bfa' },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dismissCategoryLegend();
    container.remove();
  });

  describe('rendering', () => {
    it('renders legend with data-testid', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      expect(getLegend()).not.toBeNull();
    });

    it('renders a legend item for each category', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const items = getLegendItems();
      expect(items).toHaveLength(3);
    });

    it('shows category label text', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const items = getLegendItems();
      expect(items[0].textContent).toContain('Open Position');
      expect(items[1].textContent).toContain('Offer Pending');
      expect(items[2].textContent).toContain('Future Start');
    });

    it('renders color dots with the correct color', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const items = getLegendItems();
      const dot = items[0].querySelector('[data-testid="category-dot"]') as HTMLElement;
      expect(dot).not.toBeNull();
      expect(dot.style.backgroundColor).toBe('rgb(251, 191, 36)'); // #fbbf24
    });

    it('appends legend to the provided container', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      expect(container.querySelector('[data-testid="category-legend"]')).not.toBeNull();
    });

    it('does not render if categories is empty', () => {
      showCategoryLegend({ categories: [], container });
      expect(getLegend()).toBeNull();
    });
  });

  describe('toggle', () => {
    it('renders a collapse/expand toggle button', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      expect(getToggleButton()).not.toBeNull();
    });

    it('collapses legend items when toggle is clicked', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const toggle = getToggleButton()!;
      toggle.click();
      getLegendItems();
      // Items should be hidden (parent has data-collapsed="true")
      const legend = getLegend()!;
      expect(legend.getAttribute('data-collapsed')).toBe('true');
    });

    it('expands legend items when toggle is clicked again', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const toggle = getToggleButton()!;
      toggle.click();
      toggle.click();
      const legend = getLegend()!;
      expect(legend.getAttribute('data-collapsed')).toBe('false');
    });
  });

  describe('dismiss', () => {
    it('removes legend from DOM on dismissCategoryLegend()', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      expect(getLegend()).not.toBeNull();
      dismissCategoryLegend();
      expect(getLegend()).toBeNull();
    });

    it('is safe to call dismissCategoryLegend() when no legend exists', () => {
      expect(() => dismissCategoryLegend()).not.toThrow();
    });
  });

  describe('singleton', () => {
    it('replaces previous legend when showing a new one', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      showCategoryLegend({
        categories: [{ id: 'test', label: 'Test Only', color: '#ff0000' }],
        container,
      });
      const legends = container.querySelectorAll('[data-testid="category-legend"]');
      expect(legends).toHaveLength(1);
      const items = getLegendItems();
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Test Only');
    });
  });

  describe('update', () => {
    it('updates when called with different categories', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      expect(getLegendItems()).toHaveLength(3);

      showCategoryLegend({
        categories: [{ id: 'new', label: 'New Category', color: '#00ff00' }],
        container,
      });
      expect(getLegendItems()).toHaveLength(1);
      expect(getLegendItems()[0].textContent).toContain('New Category');
    });
  });

  describe('styling', () => {
    it('uses CSS variables for theming', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const legend = getLegend()!;
      const style = legend.getAttribute('style') ?? '';
      expect(style).toContain('var(--bg-surface)');
    });

    it('positions at bottom-left of container', () => {
      showCategoryLegend({ categories: sampleCategories, container });
      const legend = getLegend()!;
      const style = legend.getAttribute('style') ?? '';
      expect(style).toContain('bottom');
      expect(style).toContain('left');
    });
  });

  describe('legendRows layout', () => {
    const fourCategories: ColorCategory[] = [
      { id: 'a', label: 'Alpha', color: '#111111' },
      { id: 'b', label: 'Beta', color: '#222222' },
      { id: 'c', label: 'Gamma', color: '#333333' },
      { id: 'd', label: 'Delta', color: '#444444' },
    ];

    it('uses column layout by default (no legendRows)', () => {
      showCategoryLegend({ categories: fourCategories, container });
      const legend = getLegend()!;
      const itemsContainer = legend.querySelector('[data-testid="category-legend-items"]') as HTMLElement;
      expect(itemsContainer.style.cssText).toContain('flex-direction: column');
    });

    it('uses grid layout when legendRows is set', () => {
      showCategoryLegend({ categories: fourCategories, container, legendRows: 2 });
      const legend = getLegend()!;
      const itemsContainer = legend.querySelector('[data-testid="category-legend-items"]') as HTMLElement;
      expect(itemsContainer.style.cssText).toContain('grid');
      expect(itemsContainer.style.cssText).toContain('grid-template-columns');
    });

    it('calculates correct number of grid columns', () => {
      showCategoryLegend({ categories: fourCategories, container, legendRows: 2 });
      const legend = getLegend()!;
      const itemsContainer = legend.querySelector('[data-testid="category-legend-items"]') as HTMLElement;
      // 4 categories / 2 rows = 2 columns
      expect(itemsContainer.style.cssText).toContain('repeat(2, auto)');
    });

    it('removes max-width constraint for multi-column layout', () => {
      showCategoryLegend({ categories: fourCategories, container, legendRows: 2 });
      const legend = getLegend()!;
      const style = legend.getAttribute('style') ?? '';
      expect(style).toContain('max-width:none');
    });

    it('keeps max-width for single-column layout', () => {
      showCategoryLegend({ categories: fourCategories, container, legendRows: 0 });
      const legend = getLegend()!;
      const style = legend.getAttribute('style') ?? '';
      expect(style).toContain('max-width:200px');
    });
  });
});
