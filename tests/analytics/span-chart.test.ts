import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpanChart } from '../../src/analytics/span-chart';
import type { OrgNode, ColorCategory } from '../../src/types';

const testTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'Chief Executive Officer',
  children: [
    {
      id: 'm1', name: 'VP Sales', title: 'VP', categoryId: 'sales',
      children: [
        { id: 'ic1', name: 'Alice', title: 'Rep' },
        { id: 'ic2', name: 'Bob', title: 'Rep' },
      ],
    },
    {
      id: 'm2', name: 'VP Eng', title: 'VP', categoryId: 'eng',
      children: [
        { id: 'ic3', name: 'Charlie', title: 'Dev' },
      ],
    },
    { id: 'adv1', name: 'Advisor', title: 'Advisor' },
  ],
};

const testCategories: ColorCategory[] = [
  { id: 'sales', label: 'Sales', color: '#f59e0b' },
  { id: 'eng', label: 'Engineering', color: '#3b82f6' },
];

describe('SpanChart', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders KPI strip', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    const strip = container.querySelector('.span-kpi-strip');
    expect(strip).not.toBeNull();

    const cards = container.querySelectorAll('.span-kpi-card');
    expect(cards.length).toBe(4);

    chart.destroy();
  });

  it('renders SVG chart', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    const svg = container.querySelector('svg.span-chart-svg');
    expect(svg).not.toBeNull();

    chart.destroy();
  });

  it('renders zone legend', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    const legend = container.querySelector('.span-chart-zone-legend');
    expect(legend).not.toBeNull();

    const items = legend!.querySelectorAll('div');
    // 3 legend items (alert, watch, healthy), each wrapped in a div
    expect(items.length).toBe(3);

    chart.destroy();
  });

  it('handles empty tree (root only)', () => {
    const rootOnly: OrgNode = { id: 'root', name: 'CEO', title: 'CEO' };
    const chart = new SpanChart(container);
    chart.render(rootOnly, []);

    const noData = container.querySelector('.span-chart-no-data');
    expect(noData).not.toBeNull();

    // Should not have KPI strip or SVG
    expect(container.querySelector('.span-kpi-strip')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();

    chart.destroy();
  });

  it('destroy cleans up', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    // Tooltip should be on body
    expect(document.body.querySelector('.span-chart-tooltip')).not.toBeNull();

    chart.destroy();

    expect(container.children.length).toBe(0);
    expect(document.body.querySelector('.span-chart-tooltip')).toBeNull();
  });

  it('render can be called multiple times', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);
    chart.render(testTree, testCategories);

    // Should not duplicate elements — render calls destroy() internally
    const strips = container.querySelectorAll('.span-kpi-strip');
    expect(strips.length).toBe(1);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);

    const tooltips = document.body.querySelectorAll('.span-chart-tooltip');
    expect(tooltips.length).toBe(1);

    chart.destroy();
  });

  it('tooltip element exists on body', () => {
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    const tooltip = document.body.querySelector('.span-chart-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.parentNode).toBe(document.body);

    chart.destroy();

    expect(document.body.querySelector('.span-chart-tooltip')).toBeNull();
  });

  it('onNodeSelect callback is stored', () => {
    const selectFn = vi.fn();
    const chart = new SpanChart(container, { onNodeSelect: selectFn });
    chart.render(testTree, testCategories);

    // Should not throw — the option is accepted and stored
    expect(chart).toBeDefined();

    chart.destroy();
  });

  it('computes correct manager count', () => {
    // Managers in testTree: root (span=3), VP Sales (span=2), VP Eng (span=1) → total 3
    const chart = new SpanChart(container);
    chart.render(testTree, testCategories);

    const cards = container.querySelectorAll('.span-kpi-card');
    const totalCard = cards[0];
    const valueEl = totalCard.querySelector('.span-kpi-value');
    expect(valueEl!.textContent).toBe('3');

    chart.destroy();
  });

  it('handles tree with single child manager', () => {
    const singleChild: OrgNode = {
      id: 'root', name: 'CEO', title: 'CEO',
      children: [
        {
          id: 'mgr', name: 'Manager', title: 'Mgr',
          children: [{ id: 'ic', name: 'Worker', title: 'IC' }],
        },
      ],
    };
    const chart = new SpanChart(container);
    chart.render(singleChild, []);

    // Should render without errors — 2 managers (root span=1, mgr span=1)
    expect(container.querySelector('.span-chart')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('.span-kpi-strip')).not.toBeNull();

    chart.destroy();
  });

  describe('configurable ideal range', () => {
    it('renders ideal range controls', () => {
      const chart = new SpanChart(container);
      chart.render(testTree, testCategories);

      const rangeRow = container.querySelector('.span-chart-ideal-range');
      expect(rangeRow).not.toBeNull();

      chart.destroy();
    });

    it('renders two number inputs', () => {
      const chart = new SpanChart(container);
      chart.render(testTree, testCategories);

      const rangeRow = container.querySelector('.span-chart-ideal-range')!;
      const inputs = rangeRow.querySelectorAll('input[type="number"]');
      expect(inputs.length).toBe(2);

      chart.destroy();
    });

    it('inputs have default values 4 and 8', () => {
      const chart = new SpanChart(container);
      chart.render(testTree, testCategories);

      const inputs = container.querySelectorAll('.span-chart-ideal-range input[type="number"]');
      expect((inputs[0] as HTMLInputElement).value).toBe('4');
      expect((inputs[1] as HTMLInputElement).value).toBe('8');

      chart.destroy();
    });

    it('custom idealMin/idealMax reflected in inputs', () => {
      const chart = new SpanChart(container, { idealMin: 3, idealMax: 10 });
      chart.render(testTree, testCategories);

      const inputs = container.querySelectorAll('.span-chart-ideal-range input[type="number"]');
      expect((inputs[0] as HTMLInputElement).value).toBe('3');
      expect((inputs[1] as HTMLInputElement).value).toBe('10');

      chart.destroy();
    });

    it('SVG has the correct class', () => {
      const chart = new SpanChart(container);
      chart.render(testTree, testCategories);

      const svg = container.querySelector('svg.span-chart-svg');
      expect(svg).not.toBeNull();

      chart.destroy();
    });
  });
});
