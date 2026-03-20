import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TreemapChart } from '../../src/analytics/treemap-chart';
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

describe('TreemapChart', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.querySelectorAll('.treemap-tooltip').forEach(el => el.remove());
  });

  it('renders SVG into container', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    chart.destroy();
  });

  it('renders rectangles for tree nodes', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const rects = container.querySelectorAll('svg rect');
    expect(rects.length).toBeGreaterThan(0);
    chart.destroy();
  });

  it('renders breadcrumb', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const breadcrumb = container.querySelector('.treemap-breadcrumb');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb!.textContent).toContain('CEO');
    chart.destroy();
  });

  it('renders color mode controls', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const controls = container.querySelector('.treemap-controls');
    expect(controls).not.toBeNull();
    const buttons = controls!.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    chart.destroy();
  });

  it('handles empty tree (root only)', () => {
    const rootOnly: OrgNode = { id: 'root', name: 'CEO', title: 'CEO' };
    const chart = new TreemapChart(container);
    chart.render(rootOnly, testCategories);
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
    const wrapper = container.querySelector('.treemap-chart');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.textContent!.length).toBeGreaterThan(0);
    chart.destroy();
  });

  it('handles empty categories', () => {
    const chart = new TreemapChart(container);
    expect(() => chart.render(testTree, [])).not.toThrow();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    chart.destroy();
  });

  it('destroy cleans up', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(document.body.querySelector('.treemap-tooltip')).not.toBeNull();
    chart.destroy();
    expect(container.children.length).toBe(0);
    expect(document.body.querySelector('.treemap-tooltip')).toBeNull();
  });

  it('render can be called multiple times', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    chart.render(testTree, testCategories);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    const tooltips = document.body.querySelectorAll('.treemap-tooltip');
    expect(tooltips.length).toBe(1);
    chart.destroy();
  });

  it('tooltip element on body', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const tooltip = document.body.querySelector('.treemap-tooltip');
    expect(tooltip).not.toBeNull();
    expect((tooltip as HTMLElement).style.display).toBe('none');
    chart.destroy();
    expect(document.body.querySelector('.treemap-tooltip')).toBeNull();
  });

  it('renders legend', () => {
    const chart = new TreemapChart(container);
    chart.render(testTree, testCategories);
    const legend = container.querySelector('.treemap-legend');
    expect(legend).not.toBeNull();
    expect(legend!.children.length).toBeGreaterThan(0);
    chart.destroy();
  });
});
