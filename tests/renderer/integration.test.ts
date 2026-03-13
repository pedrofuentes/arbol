import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode, ColorCategory } from '../../src/types';
import { findNodeById } from '../../src/utils/tree';

function makeRoot(): OrgNode {
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

describe('Renderer-Store Integration', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let renderer: ChartRenderer;

  function countRenderedNodes(): number {
    return container.querySelectorAll('.node').length;
  }

  function getNodeText(nodeId: string): string {
    const node = container.querySelector(`.node[data-id="${nodeId}"]`);
    return node?.textContent ?? '';
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeRoot());
    renderer = new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
    // Wire store → renderer
    store.onChange(() => renderer.render(store.getTree()));
    renderer.render(store.getTree());
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('store adds a child → renderer shows updated node count', () => {
    const before = countRenderedNodes();
    store.addChild('root', { name: 'Dan', title: 'VP' });
    const after = countRenderedNodes();
    expect(after).toBe(before + 1);
  });

  it('store removes a node → renderer shows updated node count', () => {
    const before = countRenderedNodes();
    store.removeNode('b');
    const after = countRenderedNodes();
    expect(after).toBe(before - 1);
  });

  it('store updates a node → renderer shows updated text', () => {
    store.updateNode('b', { name: 'Robert', title: 'VP Engineering' });
    const text = getNodeText('b');
    expect(text).toContain('Robert');
    expect(text).toContain('VP Engineering');
  });

  it('store fromJSON replaces tree → renderer shows new tree', () => {
    const newTree: OrgNode = {
      id: 'new-root',
      name: 'Zara',
      title: 'Founder',
      children: [{ id: 'x', name: 'Xavier', title: 'CTO' }],
    };
    store.fromJSON(JSON.stringify(newTree));

    // Old nodes should not exist
    expect(container.querySelector('.node[data-id="root"]')).toBeNull();
    expect(container.querySelector('.node[data-id="b"]')).toBeNull();

    // New nodes should exist
    const text = getNodeText('new-root');
    expect(text).toContain('Zara');
    expect(getNodeText('x')).toContain('Xavier');
  });

  describe('category assignment → card color', () => {
    const testCategory: ColorCategory = {
      id: 'cat-red',
      label: 'Urgent',
      color: '#ef4444',
      nameColor: '#ffffff',
      titleColor: '#fecaca',
    };

    it('node with category renders with category fill color', () => {
      store.setNodeCategory('b', 'cat-red');

      // Re-render with categories provided
      renderer.updateOptions({ categories: [testCategory] });
      renderer.render(store.getTree());

      const rect = container.querySelector('.node[data-id="b"] rect');
      expect(rect).not.toBeNull();
      expect(rect!.getAttribute('fill')).toBe('#ef4444');
    });

    it('node without category renders with default fill', () => {
      renderer.updateOptions({ categories: [testCategory] });
      renderer.render(store.getTree());

      const catRect = container.querySelector('.node[data-id="b"] rect');
      const defaultRect = container.querySelector('.node[data-id="c"] rect');
      // Both have no category, should use default fill
      expect(catRect!.getAttribute('fill')).toBe(defaultRect!.getAttribute('fill'));
    });

    it('removing category restores default fill', () => {
      store.setNodeCategory('b', 'cat-red');
      renderer.updateOptions({ categories: [testCategory] });
      renderer.render(store.getTree());

      const coloredFill = container.querySelector('.node[data-id="b"] rect')!.getAttribute('fill');
      expect(coloredFill).toBe('#ef4444');

      store.setNodeCategory('b', null);
      renderer.render(store.getTree());

      const restoredFill = container.querySelector('.node[data-id="b"] rect')!.getAttribute('fill');
      expect(restoredFill).not.toBe('#ef4444');
    });
  });

  describe('focus mode → subtree rendering', () => {
    function makeDeepTree(): OrgNode {
      return {
        id: 'root',
        name: 'Alice',
        title: 'CEO',
        children: [
          {
            id: 'eng',
            name: 'Bob',
            title: 'VP Eng',
            children: [
              { id: 'ic1', name: 'Carol', title: 'Engineer' },
              { id: 'ic2', name: 'Dan', title: 'Engineer' },
            ],
          },
          { id: 'sales', name: 'Eve', title: 'VP Sales' },
        ],
      };
    }

    it('rendering a subtree shows only those nodes', () => {
      const deepTree = makeDeepTree();
      const deepStore = new OrgStore(deepTree);
      renderer.render(deepStore.getTree());

      // Full tree: root, eng, ic1, ic2, sales = 5 nodes total
      // (ic1 and ic2 may render as .ic-node under an M1)
      const fullNodeCount = container.querySelectorAll('.node, .ic-node').length;

      // Simulate focus: render only the 'eng' subtree
      const subtree = findNodeById(deepStore.getTree(), 'eng')!;
      renderer.render(subtree);

      const focusedNodeCount = container.querySelectorAll('.node, .ic-node').length;
      expect(focusedNodeCount).toBeLessThan(fullNodeCount);

      // 'sales' should not be rendered
      expect(container.querySelector('[data-id="sales"]')).toBeNull();
      // 'root' should not be rendered
      expect(container.querySelector('[data-id="root"]')).toBeNull();
      // 'eng' should be rendered (it's the root of the subtree)
      expect(container.querySelector('[data-id="eng"]')).not.toBeNull();
    });

    it('re-rendering full tree after subtree restores all nodes', () => {
      const deepTree = makeDeepTree();
      const deepStore = new OrgStore(deepTree);

      // Render subtree first
      const subtree = findNodeById(deepStore.getTree(), 'eng')!;
      renderer.render(subtree);
      expect(container.querySelector('[data-id="sales"]')).toBeNull();

      // Render full tree
      renderer.render(deepStore.getTree());
      expect(container.querySelector('[data-id="sales"]')).not.toBeNull();
      expect(container.querySelector('[data-id="root"]')).not.toBeNull();
      expect(container.querySelector('[data-id="eng"]')).not.toBeNull();
    });
  });
});
