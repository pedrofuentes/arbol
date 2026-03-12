import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

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
});
