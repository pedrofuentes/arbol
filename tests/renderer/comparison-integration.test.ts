import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compareTrees, buildMergedTree, getDiffStats } from '../../src/utils/tree-diff';
import { ChartRenderer, RendererOptions } from '../../src/renderer/chart-renderer';
import { SideBySideRenderer } from '../../src/renderer/side-by-side-renderer';
import { OrgNode, DiffEntry } from '../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, name: string, title: string, children?: OrgNode[]): OrgNode {
  const node: OrgNode = { id, name, title };
  if (children && children.length > 0) node.children = children;
  return node;
}

function minimalOpts(container: HTMLElement): RendererOptions {
  return {
    container,
    nodeWidth: 150,
    nodeHeight: 50,
    horizontalSpacing: 30,
  };
}

function badgeTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.diff-badge text'))
    .map(el => (el.textContent ?? '').trim());
}

function badgeTextForNode(container: HTMLElement, nodeId: string): string | null {
  const nodeGroup = container.querySelector(`.node[data-id="${nodeId}"], .ic-node[data-id="${nodeId}"], .pal-node[data-id="${nodeId}"]`);
  if (!nodeGroup) return null;
  const badge = nodeGroup.querySelector('.diff-badge text');
  return badge ? (badge.textContent ?? '').trim() : null;
}

function nodeOpacity(container: HTMLElement, nodeId: string): string | null {
  const el = container.querySelector(`.node[data-id="${nodeId}"], .ic-node[data-id="${nodeId}"], .pal-node[data-id="${nodeId}"]`);
  if (!el) return null;
  return (el as SVGElement).style.opacity || null;
}

function nodeRectFill(container: HTMLElement, nodeId: string): string | null {
  const el = container.querySelector(`[data-id="${nodeId}"] rect`);
  if (!el) return null;
  return el.getAttribute('fill');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('comparison integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // -----------------------------------------------------------------------
  // full diff → render pipeline
  // -----------------------------------------------------------------------
  describe('full diff → render pipeline', () => {
    it('computes diff and renders merged tree with badges', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('charlie', 'Charlie', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);
      const merged = buildMergedTree(oldTree, newTree, diff);

      expect(diff.get('bob')!.status).toBe('removed');
      expect(diff.get('charlie')!.status).toBe('added');
      expect(diff.get('alice')!.status).toBe('unchanged');

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(merged);

      expect(badgeTextForNode(container, 'alice')).toBeNull();
      expect(badgeTextForNode(container, 'bob')?.toLowerCase()).toBe('removed');
      expect(badgeTextForNode(container, 'charlie')?.toLowerCase()).toBe('added');

      renderer.destroy();
    });

    it('correctly identifies and renders moved nodes', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('mgr1', 'Manager 1', 'Dir', [
          makeNode('alice', 'Alice', 'Eng'),
        ]),
        makeNode('mgr2', 'Manager 2', 'Dir'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('mgr1', 'Manager 1', 'Dir'),
        makeNode('mgr2', 'Manager 2', 'Dir', [
          makeNode('alice', 'Alice', 'Eng'),
        ]),
      ]);

      const diff = compareTrees(oldTree, newTree);

      expect(diff.get('alice')!.status).toBe('moved');
      expect(diff.get('alice')!.oldParentId).toBe('mgr1');
      expect(diff.get('alice')!.newParentId).toBe('mgr2');

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(newTree);

      expect(badgeTextForNode(container, 'alice')?.toLowerCase()).toBe('moved');

      renderer.destroy();
    });

    it('correctly identifies and renders modified nodes', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'Engineer'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'Senior Engineer'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      expect(diff.get('alice')!.status).toBe('modified');
      expect(diff.get('alice')!.oldTitle).toBe('Engineer');

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(newTree);

      expect(badgeTextForNode(container, 'alice')?.toLowerCase()).toBe('modified');

      renderer.destroy();
    });

    it('getDiffStats returns correct summary', () => {
      // Old: root + A + B + C + D + E + F + G + H (9 nodes)
      // We want: 2 added, 1 removed, 1 moved, 1 modified, 4 unchanged (root + the rest)
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('a', 'A', 'T'),       // will be unchanged
        makeNode('b', 'B', 'T'),       // will be removed
        makeNode('mgr', 'Mgr', 'D', [ // will be unchanged
          makeNode('c', 'C', 'T'),     // will be moved to root
          makeNode('d', 'D', 'T'),     // will be modified
        ]),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('a', 'A', 'T'),       // unchanged
        makeNode('c', 'C', 'T'),       // moved (was under mgr)
        makeNode('mgr', 'Mgr', 'D', [ // unchanged
          makeNode('d', 'D', 'Senior'),// modified title
        ]),
        makeNode('e', 'E', 'T'),       // added
        makeNode('f', 'F', 'T'),       // added
      ]);

      const diff = compareTrees(oldTree, newTree);
      const stats = getDiffStats(diff);

      expect(stats.added).toBe(2);
      expect(stats.removed).toBe(1);
      expect(stats.moved).toBe(1);
      expect(stats.modified).toBe(1);
      expect(stats.unchanged).toBe(3); // root, a, mgr
    });

    it('merged tree includes removed nodes as ghost cards', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);
      const merged = buildMergedTree(oldTree, newTree, diff);

      // Merged tree should still contain bob
      const bobInMerged = merged.children?.find(c => c.id === 'bob');
      expect(bobInMerged).toBeDefined();
      expect(bobInMerged!.name).toBe('Bob');

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(merged);

      // Bob should exist in SVG with a removed badge
      const bobNode = container.querySelector('[data-id="bob"]');
      expect(bobNode).not.toBeNull();
      expect(badgeTextForNode(container, 'bob')?.toLowerCase()).toBe('removed');

      renderer.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // diff dimming
  // -----------------------------------------------------------------------
  describe('diff dimming', () => {
    it('unchanged nodes are dimmed in diff mode', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(newTree);

      // root and alice are unchanged → dimmed via fill color override
      expect(nodeRectFill(container, 'root')).toContain('#d1d5db');
      expect(nodeRectFill(container, 'alice')).toContain('#d1d5db');

      renderer.destroy();
    });

    it('changed nodes are not dimmed', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(newTree);

      // bob is added → retains original fill (not dimmed)
      expect(nodeRectFill(container, 'bob')).not.toContain('#d1d5db');

      renderer.destroy();
    });

    it('removed nodes have reduced opacity', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);
      const merged = buildMergedTree(oldTree, newTree, diff);

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(merged);

      expect(nodeOpacity(container, 'bob')).toBe('0.55');

      renderer.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // diff legend
  // -----------------------------------------------------------------------
  describe('diff legend', () => {
    it('renders diff legend with status counts', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'SVP'),    // modified
        makeNode('charlie', 'Charlie', 'VP'), // added (bob removed)
      ]);

      const diff = compareTrees(oldTree, newTree);
      const merged = buildMergedTree(oldTree, newTree, diff);

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(merged);

      const legend = container.querySelector('.diff-legend');
      expect(legend).not.toBeNull();

      const items = container.querySelectorAll('.diff-legend-item');
      expect(items.length).toBeGreaterThan(0);

      // Collect legend text content
      const legendTexts = Array.from(items).map(
        item => (item.querySelector('text')?.textContent ?? '').toLowerCase()
      );

      expect(legendTexts.some(t => t.includes('added'))).toBe(true);
      expect(legendTexts.some(t => t.includes('removed'))).toBe(true);
      expect(legendTexts.some(t => t.includes('modified'))).toBe(true);

      renderer.destroy();
    });

    it('diff legend only includes non-zero statuses', () => {
      const oldTree = makeNode('root', 'Root', 'CEO');
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const renderer = new ChartRenderer(minimalOpts(container));
      renderer.setDiffMap(diff);
      renderer.render(newTree);

      const legend = container.querySelector('.diff-legend');
      expect(legend).not.toBeNull();

      const legendTexts = Array.from(container.querySelectorAll('.diff-legend-item'))
        .map(item => (item.querySelector('text')?.textContent ?? '').toLowerCase());

      expect(legendTexts.some(t => t.includes('added'))).toBe(true);
      // No removed, moved, or modified nodes exist
      expect(legendTexts.some(t => t.includes('removed'))).toBe(false);
      expect(legendTexts.some(t => t.includes('moved'))).toBe(false);
      expect(legendTexts.some(t => t.includes('modified'))).toBe(false);

      renderer.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // side-by-side rendering
  // -----------------------------------------------------------------------
  describe('side-by-side rendering', () => {
    it('creates side-by-side view with both trees', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const sbsRenderer = new SideBySideRenderer({
        container,
        rendererOptions: minimalOpts(container),
        oldLabel: 'Version 1',
        newLabel: 'Current',
      });

      sbsRenderer.render(oldTree, newTree, diff);

      const wrapper = container.querySelector('[data-testid="side-by-side-wrapper"]');
      expect(wrapper).not.toBeNull();

      const leftPane = container.querySelector('[data-testid="side-by-side-left"]');
      const rightPane = container.querySelector('[data-testid="side-by-side-right"]');
      expect(leftPane).not.toBeNull();
      expect(rightPane).not.toBeNull();

      // Both panes have chart containers with SVG content
      const leftChart = container.querySelector('[data-testid="side-by-side-left-chart"]');
      const rightChart = container.querySelector('[data-testid="side-by-side-right-chart"]');
      expect(leftChart?.querySelector('svg')).not.toBeNull();
      expect(rightChart?.querySelector('svg')).not.toBeNull();

      // Labels are rendered
      const leftLabel = container.querySelector('[data-testid="side-by-side-left-label"]');
      const rightLabel = container.querySelector('[data-testid="side-by-side-right-label"]');
      expect(leftLabel?.textContent).toBe('Version 1');
      expect(rightLabel?.textContent).toBe('Current');

      sbsRenderer.destroy();
    });

    it('both panes show diff badges', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('charlie', 'Charlie', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const sbsRenderer = new SideBySideRenderer({
        container,
        rendererOptions: minimalOpts(container),
        oldLabel: 'Old',
        newLabel: 'New',
      });

      sbsRenderer.render(oldTree, newTree, diff);

      const leftChart = container.querySelector('[data-testid="side-by-side-left-chart"]');
      const rightChart = container.querySelector('[data-testid="side-by-side-right-chart"]');

      // Left pane shows old tree → bob exists with 'removed' badge
      const leftBadges = Array.from(leftChart!.querySelectorAll('.diff-badge text'))
        .map(el => (el.textContent ?? '').toLowerCase());
      expect(leftBadges.some(t => t === 'removed')).toBe(true);

      // Right pane shows new tree → charlie exists with 'added' badge
      const rightBadges = Array.from(rightChart!.querySelectorAll('.diff-badge text'))
        .map(el => (el.textContent ?? '').toLowerCase());
      expect(rightBadges.some(t => t === 'added')).toBe(true);

      sbsRenderer.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // setDiffMap lifecycle
  // -----------------------------------------------------------------------
  describe('setDiffMap lifecycle', () => {
    it('setDiffMap(null) restores normal rendering', () => {
      const oldTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
      ]);
      const newTree = makeNode('root', 'Root', 'CEO', [
        makeNode('alice', 'Alice', 'VP'),
        makeNode('bob', 'Bob', 'VP'),
      ]);

      const diff = compareTrees(oldTree, newTree);

      const renderer = new ChartRenderer(minimalOpts(container));

      // Render with diff → badges visible
      renderer.setDiffMap(diff);
      renderer.render(newTree);
      expect(container.querySelectorAll('.diff-badge').length).toBeGreaterThan(0);
      expect(container.querySelector('.diff-legend')).not.toBeNull();

      // Clear diff and re-render → no badges
      renderer.setDiffMap(null);
      renderer.render(newTree);
      expect(container.querySelectorAll('.diff-badge').length).toBe(0);
      expect(container.querySelector('.diff-legend')).toBeNull();

      // Verify no dimming remains
      const aliceOpacity = nodeOpacity(container, 'alice');
      expect(aliceOpacity === null || aliceOpacity === '' || aliceOpacity === '1').toBe(true);

      renderer.destroy();
    });
  });
});
