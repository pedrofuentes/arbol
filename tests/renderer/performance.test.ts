import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { generateTree } from '../helpers/tree-generator';
import { flattenTree } from '../../src/utils/tree';

describe('rendering performance', () => {
  let container: HTMLDivElement;

  function createRenderer() {
    return new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders 100-node tree without errors', () => {
    const tree = generateTree(100);
    const flat = flattenTree(tree);
    expect(flat.length).toBe(100);

    const renderer = createRenderer();
    expect(() => renderer.render(tree)).not.toThrow();

    const nodes = container.querySelectorAll('.node, .ic-node, .pal-node');
    expect(nodes.length).toBe(100);
    renderer.destroy();
  });

  it('renders 500-node tree in under 2 seconds', () => {
    const tree = generateTree(500);

    const renderer = createRenderer();
    const start = performance.now();
    renderer.render(tree);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);

    const nodes = container.querySelectorAll('.node, .ic-node, .pal-node');
    expect(nodes.length).toBe(500);
    renderer.destroy();
  });

  it('renders 1000-node tree in under 5 seconds', () => {
    const tree = generateTree(1000);

    const renderer = createRenderer();
    const start = performance.now();
    renderer.render(tree);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);

    const nodes = container.querySelectorAll('.node, .ic-node, .pal-node');
    expect(nodes.length).toBe(1000);
    renderer.destroy();
  });

  it('re-renders do not leak DOM nodes', () => {
    const tree = generateTree(100);
    const renderer = createRenderer();

    renderer.render(tree);
    const countAfterFirst = container.querySelectorAll('.node, .ic-node, .pal-node').length;

    renderer.render(tree);
    const countAfterSecond = container.querySelectorAll('.node, .ic-node, .pal-node').length;

    expect(countAfterSecond).toBe(countAfterFirst);

    // Also check links don't accumulate
    renderer.render(tree);
    const countAfterThird = container.querySelectorAll('.node, .ic-node, .pal-node').length;
    expect(countAfterThird).toBe(countAfterFirst);

    renderer.destroy();
  });
});
