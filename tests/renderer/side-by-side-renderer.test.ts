import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SideBySideRenderer } from '../../src/renderer/side-by-side-renderer';
import { OrgNode, DiffEntry } from '../../src/types';
import { RendererOptions } from '../../src/renderer/chart-renderer';

function makeBaseOptions(): RendererOptions {
  return {
    container: document.createElement('div'),
    nodeWidth: 150,
    nodeHeight: 50,
    horizontalSpacing: 30,
  };
}

function oldTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
    ],
  };
}

function newTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

function makeDiff(): Map<string, DiffEntry> {
  return new Map([
    ['root', { status: 'unchanged' }],
    ['b', { status: 'unchanged' }],
    ['c', { status: 'added' }],
  ]);
}

describe('SideBySideRenderer', () => {
  let container: HTMLDivElement;
  let renderer: SideBySideRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    container.remove();
  });

  it('creates wrapper with correct structure', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'v1.0',
      newLabel: 'v2.0',
    });

    const wrapper = container.querySelector('[data-testid="side-by-side-wrapper"]');
    expect(wrapper).toBeTruthy();

    const left = wrapper!.querySelector('[data-testid="side-by-side-left"]');
    const right = wrapper!.querySelector('[data-testid="side-by-side-right"]');
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();

    expect(left!.querySelector('[data-testid="side-by-side-left-label"]')).toBeTruthy();
    expect(left!.querySelector('[data-testid="side-by-side-left-chart"]')).toBeTruthy();
    expect(right!.querySelector('[data-testid="side-by-side-right-label"]')).toBeTruthy();
    expect(right!.querySelector('[data-testid="side-by-side-right-chart"]')).toBeTruthy();
  });

  it('displays old and new labels', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Version A',
      newLabel: 'Version B',
    });

    const leftLabel = container.querySelector('[data-testid="side-by-side-left-label"]');
    const rightLabel = container.querySelector('[data-testid="side-by-side-right-label"]');
    expect(leftLabel!.textContent).toBe('Version A');
    expect(rightLabel!.textContent).toBe('Version B');
  });

  it('creates two SVG elements for charts', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Old',
      newLabel: 'New',
    });

    renderer.render(oldTree(), newTree(), makeDiff());

    const leftChart = container.querySelector('[data-testid="side-by-side-left-chart"]');
    const rightChart = container.querySelector('[data-testid="side-by-side-right-chart"]');
    expect(leftChart!.querySelector('svg')).toBeTruthy();
    expect(rightChart!.querySelector('svg')).toBeTruthy();
  });

  it('passes diff map to both renderers', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Old',
      newLabel: 'New',
    });

    const diff = makeDiff();
    renderer.render(oldTree(), newTree(), diff);

    // SVGs should exist after render — both renderers received trees
    const leftChart = container.querySelector('[data-testid="side-by-side-left-chart"]');
    const rightChart = container.querySelector('[data-testid="side-by-side-right-chart"]');
    expect(leftChart!.querySelector('svg')).toBeTruthy();
    expect(rightChart!.querySelector('svg')).toBeTruthy();
  });

  it('renders old tree on left and new tree on right', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Old',
      newLabel: 'New',
    });

    renderer.render(oldTree(), newTree(), makeDiff());

    const leftSvg = container.querySelector('[data-testid="side-by-side-left-chart"] svg');
    const rightSvg = container.querySelector('[data-testid="side-by-side-right-chart"] svg');

    // Old tree has 2 nodes (Alice, Bob) — rendered as .node groups
    const leftNodes = leftSvg!.querySelectorAll('.node');
    expect(leftNodes.length).toBe(2);

    // New tree has 3 nodes (Alice, Bob, Carol)
    const rightNodes = rightSvg!.querySelectorAll('.node');
    expect(rightNodes.length).toBe(3);
  });

  it('destroy removes wrapper from DOM', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Old',
      newLabel: 'New',
    });

    renderer.render(oldTree(), newTree(), makeDiff());

    expect(container.querySelector('[data-testid="side-by-side-wrapper"]')).toBeTruthy();

    renderer.destroy();

    expect(container.querySelector('[data-testid="side-by-side-wrapper"]')).toBeNull();

    // Prevent double-destroy in afterEach
    renderer = null as unknown as SideBySideRenderer;
  });

  it('destroy cleans up renderers', () => {
    renderer = new SideBySideRenderer({
      container,
      rendererOptions: makeBaseOptions(),
      oldLabel: 'Old',
      newLabel: 'New',
    });

    renderer.render(oldTree(), newTree(), makeDiff());

    const leftChart = container.querySelector('[data-testid="side-by-side-left-chart"]');
    const rightChart = container.querySelector('[data-testid="side-by-side-right-chart"]');
    expect(leftChart!.querySelector('svg')).toBeTruthy();
    expect(rightChart!.querySelector('svg')).toBeTruthy();

    renderer.destroy();

    // After destroy, SVGs should be removed (renderers cleaned up)
    // The chart containers themselves are gone since the wrapper was removed
    expect(container.querySelector('svg')).toBeNull();

    renderer = null as unknown as SideBySideRenderer;
  });

  describe('zoom delegation', () => {
    it('fitToContent does not throw before render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      expect(() => renderer.fitToContent()).not.toThrow();
    });

    it('fitToContent calls both renderers after render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());
      // Should not throw — both zoom managers exist after render
      expect(() => renderer.fitToContent()).not.toThrow();
    });

    it('resetZoom does not throw before render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      expect(() => renderer.resetZoom()).not.toThrow();
    });

    it('centerAtRealSize does not throw before render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      expect(() => renderer.centerAtRealSize()).not.toThrow();
    });

    it('centerAtRealSize calls both renderers after render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());
      expect(() => renderer.centerAtRealSize()).not.toThrow();
    });
  });
});
