import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SunburstChart } from '../../src/analytics/sunburst-chart';
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

describe('SunburstChart', () => {
  let container: HTMLDivElement;
  let chart: SunburstChart;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
    document.body.appendChild(container);
    chart = new SunburstChart(container);
  });

  afterEach(() => {
    chart.destroy();
    container.remove();
  });

  it('renders SVG into container', () => {
    chart.render(testTree, testCategories);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders arcs for descendants', () => {
    chart.render(testTree, testCategories);
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders center label', () => {
    chart.render(testTree, testCategories);
    const label = container.querySelector('.sunburst-center-label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain('CEO');
  });

  it('renders breadcrumb', () => {
    chart.render(testTree, testCategories);
    const breadcrumb = container.querySelector('.sunburst-breadcrumb');
    expect(breadcrumb).not.toBeNull();
  });

  it('handles empty tree (root only)', () => {
    const rootOnly: OrgNode = { id: 'solo', name: 'Solo', title: 'Only' };
    chart.render(rootOnly, testCategories);
    const noData = container.querySelector('.sunburst-no-data');
    expect(noData).not.toBeNull();
    expect(noData!.textContent!.length).toBeGreaterThan(0);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('handles empty categories', () => {
    chart.render(testTree, []);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('destroy cleans up', () => {
    chart.render(testTree, testCategories);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(document.body.querySelector('.sunburst-tooltip')).not.toBeNull();

    chart.destroy();
    expect(container.innerHTML).toBe('');
    expect(document.body.querySelector('.sunburst-tooltip')).toBeNull();
  });

  it('render can be called multiple times', () => {
    chart.render(testTree, testCategories);
    chart.render(testTree, testCategories);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
  });

  it('tooltip element is appended to body', () => {
    chart.render(testTree, testCategories);
    const tooltip = document.body.querySelector('.sunburst-tooltip');
    expect(tooltip).not.toBeNull();

    chart.destroy();
    expect(document.body.querySelector('.sunburst-tooltip')).toBeNull();
  });

  it('breadcrumb shows root name', () => {
    chart.render(testTree, testCategories);
    const breadcrumb = container.querySelector('.sunburst-breadcrumb');
    expect(breadcrumb!.textContent).toContain('CEO');
  });
});
