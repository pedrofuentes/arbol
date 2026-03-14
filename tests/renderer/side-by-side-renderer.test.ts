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

  describe('cross-highlight on hover', () => {
    function getNodeGroup(
      paneTestId: string,
      nodeId: string
    ): SVGGElement | null {
      const pane = container.querySelector(`[data-testid="${paneTestId}-chart"]`);
      if (!pane) return null;
      return pane.querySelector(`[data-id="${nodeId}"]`) as SVGGElement | null;
    }

    function dispatchMouseEvent(
      el: Element,
      type: 'mouseenter' | 'mouseleave'
    ): void {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
    }

    it('hovering a left-pane node highlights matching node in right pane', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      expect(leftRoot).toBeTruthy();

      dispatchMouseEvent(leftRoot, 'mouseenter');

      const rightRoot = getNodeGroup('side-by-side-right', 'root')!;
      expect(rightRoot.classList.contains('cross-highlight')).toBe(true);
    });

    it('hovering a right-pane node highlights matching node in left pane', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const rightBob = getNodeGroup('side-by-side-right', 'b')!;
      expect(rightBob).toBeTruthy();

      dispatchMouseEvent(rightBob, 'mouseenter');

      const leftBob = getNodeGroup('side-by-side-left', 'b')!;
      expect(leftBob.classList.contains('cross-highlight')).toBe(true);
    });

    it('hovering highlights the source node too', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      dispatchMouseEvent(leftRoot, 'mouseenter');

      expect(leftRoot.classList.contains('cross-highlight')).toBe(true);
    });

    it('mouseleave removes cross-highlight from all nodes', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      dispatchMouseEvent(leftRoot, 'mouseenter');

      // Verify highlight is on
      const rightRoot = getNodeGroup('side-by-side-right', 'root')!;
      expect(rightRoot.classList.contains('cross-highlight')).toBe(true);

      // Now mouse leave
      dispatchMouseEvent(leftRoot, 'mouseleave');

      expect(leftRoot.classList.contains('cross-highlight')).toBe(false);
      expect(rightRoot.classList.contains('cross-highlight')).toBe(false);
    });

    it('hovering a node that only exists on one side does not throw', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      // Carol (id: 'c') only exists in the right pane (added node)
      const rightCarol = getNodeGroup('side-by-side-right', 'c')!;
      expect(rightCarol).toBeTruthy();

      // Should not throw — no match on left side
      expect(() => {
        dispatchMouseEvent(rightCarol, 'mouseenter');
      }).not.toThrow();

      // Source node still gets highlighted
      expect(rightCarol.classList.contains('cross-highlight')).toBe(true);

      // No left-side node should have cross-highlight
      const leftNodes = container.querySelectorAll(
        '[data-testid="side-by-side-left-chart"] .cross-highlight'
      );
      expect(leftNodes.length).toBe(0);
    });

    it('destroy cleans up hover listeners without errors', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      // Grab a reference to a node before destroy
      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      expect(leftRoot).toBeTruthy();

      renderer.destroy();

      // After destroy, dispatching events on the orphaned node should not throw
      expect(() => {
        dispatchMouseEvent(leftRoot, 'mouseenter');
        dispatchMouseEvent(leftRoot, 'mouseleave');
      }).not.toThrow();

      // No cross-highlight classes should exist in the container
      expect(container.querySelectorAll('.cross-highlight').length).toBe(0);

      renderer = null as unknown as SideBySideRenderer;
    });

    it('switching hover between nodes clears previous highlight', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      const leftBob = getNodeGroup('side-by-side-left', 'b')!;

      // Hover root first
      dispatchMouseEvent(leftRoot, 'mouseenter');
      expect(
        getNodeGroup('side-by-side-right', 'root')!.classList.contains(
          'cross-highlight'
        )
      ).toBe(true);

      // Leave root, hover Bob
      dispatchMouseEvent(leftRoot, 'mouseleave');
      dispatchMouseEvent(leftBob, 'mouseenter');

      // Root highlight should be gone, Bob should be highlighted
      expect(
        getNodeGroup('side-by-side-right', 'root')!.classList.contains(
          'cross-highlight'
        )
      ).toBe(false);
      expect(
        getNodeGroup('side-by-side-right', 'b')!.classList.contains(
          'cross-highlight'
        )
      ).toBe(true);
    });
  });

  describe('cross-select on click', () => {
    function getNodeGroup(
      paneTestId: string,
      nodeId: string
    ): SVGGElement | null {
      const pane = container.querySelector(`[data-testid="${paneTestId}-chart"]`);
      if (!pane) return null;
      return pane.querySelector(`[data-id="${nodeId}"]`) as SVGGElement | null;
    }

    function clickNode(el: Element): void {
      el.querySelector('rect')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    }

    it('clicking a node selects it in both panes', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftBob = getNodeGroup('side-by-side-left', 'b')!;
      clickNode(leftBob);

      expect(leftBob.classList.contains('cross-selected')).toBe(true);
      const rightBob = getNodeGroup('side-by-side-right', 'b')!;
      expect(rightBob.classList.contains('cross-selected')).toBe(true);
    });

    it('clicking from right pane selects in both panes', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const rightRoot = getNodeGroup('side-by-side-right', 'root')!;
      clickNode(rightRoot);

      expect(rightRoot.classList.contains('cross-selected')).toBe(true);
      const leftRoot = getNodeGroup('side-by-side-left', 'root')!;
      expect(leftRoot.classList.contains('cross-selected')).toBe(true);
    });

    it('clicking again toggles selection off', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftBob = getNodeGroup('side-by-side-left', 'b')!;
      clickNode(leftBob);
      expect(leftBob.classList.contains('cross-selected')).toBe(true);

      // Click again to deselect
      clickNode(leftBob);
      expect(leftBob.classList.contains('cross-selected')).toBe(false);
      expect(
        getNodeGroup('side-by-side-right', 'b')!.classList.contains('cross-selected')
      ).toBe(false);
    });

    it('multiple clicks select multiple nodes', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      clickNode(getNodeGroup('side-by-side-left', 'root')!);
      clickNode(getNodeGroup('side-by-side-left', 'b')!);

      // Both nodes selected in both panes
      expect(
        getNodeGroup('side-by-side-left', 'root')!.classList.contains('cross-selected')
      ).toBe(true);
      expect(
        getNodeGroup('side-by-side-left', 'b')!.classList.contains('cross-selected')
      ).toBe(true);
      expect(
        getNodeGroup('side-by-side-right', 'root')!.classList.contains('cross-selected')
      ).toBe(true);
      expect(
        getNodeGroup('side-by-side-right', 'b')!.classList.contains('cross-selected')
      ).toBe(true);
    });

    it('clicking node only in one pane still selects the source', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      // Carol only exists in right pane
      const rightCarol = getNodeGroup('side-by-side-right', 'c')!;
      clickNode(rightCarol);

      expect(rightCarol.classList.contains('cross-selected')).toBe(true);
      // No matching node on left — no errors, no left highlights
      expect(
        container.querySelectorAll('[data-testid="side-by-side-left-chart"] .cross-selected').length
      ).toBe(0);
    });

    it('mouseleave does not clear click selections', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      const leftBob = getNodeGroup('side-by-side-left', 'b')!;
      clickNode(leftBob);
      expect(leftBob.classList.contains('cross-selected')).toBe(true);

      // Hover then leave — selection should persist
      leftBob.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      leftBob.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(leftBob.classList.contains('cross-selected')).toBe(true);
      expect(
        getNodeGroup('side-by-side-right', 'b')!.classList.contains('cross-selected')
      ).toBe(true);
    });

    it('destroy clears selections', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      clickNode(getNodeGroup('side-by-side-left', 'root')!);
      expect(container.querySelectorAll('.cross-selected').length).toBeGreaterThan(0);

      renderer.destroy();
      expect(container.querySelectorAll('.cross-selected').length).toBe(0);

      renderer = null as unknown as SideBySideRenderer;
    });
  });

  describe('dim unchanged toggle', () => {
    function getNodeRectFill(
      paneTestId: string,
      nodeId: string
    ): string | null {
      const pane = container.querySelector(`[data-testid="${paneTestId}-chart"]`);
      if (!pane) return null;
      const group = pane.querySelector(`[data-id="${nodeId}"]`);
      if (!group) return null;
      return group.querySelector('rect')?.getAttribute('fill') ?? null;
    }

    it('unchanged nodes are dimmed by default', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.render(oldTree(), newTree(), makeDiff());

      // Root is 'unchanged' — should be dimmed
      expect(getNodeRectFill('side-by-side-left', 'root')).toContain('#d1d5db');
      expect(getNodeRectFill('side-by-side-right', 'root')).toContain('#d1d5db');
    });

    it('setDimUnchanged(false) prevents dimming of unchanged nodes', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.setDimUnchanged(false);
      renderer.render(oldTree(), newTree(), makeDiff());

      // Root is 'unchanged' — should NOT be dimmed
      expect(getNodeRectFill('side-by-side-left', 'root')).not.toContain('#d1d5db');
      expect(getNodeRectFill('side-by-side-right', 'root')).not.toContain('#d1d5db');
    });

    it('setDimUnchanged toggles correctly after render', () => {
      renderer = new SideBySideRenderer({
        container,
        rendererOptions: makeBaseOptions(),
        oldLabel: 'Old',
        newLabel: 'New',
      });
      renderer.setDimUnchanged(false);
      renderer.render(oldTree(), newTree(), makeDiff());

      // Not dimmed
      expect(getNodeRectFill('side-by-side-left', 'root')).not.toContain('#d1d5db');

      // Now re-enable dimming and re-render
      renderer.setDimUnchanged(true);
      renderer.render(oldTree(), newTree(), makeDiff());

      expect(getNodeRectFill('side-by-side-left', 'root')).toContain('#d1d5db');
    });
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
