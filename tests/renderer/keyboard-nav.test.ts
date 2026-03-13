import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardNav } from '../../src/renderer/keyboard-nav';
import { OrgNode } from '../../src/types';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      {
        id: 'a',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'a1', name: 'Eng1', title: 'Engineer' },
          { id: 'a2', name: 'Eng2', title: 'Engineer' },
        ],
      },
      { id: 'b', name: 'CFO', title: 'CFO' },
    ],
  };
}

function buildSvg(tree: OrgNode): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  function walk(node: OrgNode) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('node');
    g.setAttribute('data-id', node.id);
    g.setAttribute('tabindex', node.id === tree.id ? '0' : '-1');
    svg.appendChild(g);
    for (const child of node.children ?? []) walk(child);
  }
  walk(tree);
  document.body.appendChild(svg);
  return svg;
}

describe('KeyboardNav', () => {
  let svg: SVGSVGElement;
  let nav: KeyboardNav;
  let tree: OrgNode;

  beforeEach(() => {
    tree = makeTree();
    svg = buildSvg(tree);
    nav = new KeyboardNav(svg);
    nav.setTree(tree);
  });

  afterEach(() => {
    nav.destroy();
    svg.remove();
  });

  function pressKey(key: string, opts: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    });
    svg.dispatchEvent(event);
    return event;
  }

  describe('focusNode', () => {
    it('sets tabindex="0" on target and "-1" on previous', () => {
      nav.focusNode('root');
      const rootG = svg.querySelector('[data-id="root"]')!;
      expect(rootG.getAttribute('tabindex')).toBe('0');

      nav.focusNode('a');
      expect(rootG.getAttribute('tabindex')).toBe('-1');
      const aG = svg.querySelector('[data-id="a"]')!;
      expect(aG.getAttribute('tabindex')).toBe('0');
    });

    it('calls focus() on the target element', () => {
      const el = svg.querySelector('[data-id="a"]') as SVGGElement;
      const spy = vi.spyOn(el, 'focus');
      nav.focusNode('a');
      expect(spy).toHaveBeenCalled();
    });

    it('tracks focused node ID', () => {
      nav.focusNode('b');
      expect(nav.getFocusedNodeId()).toBe('b');
    });

    it('ignores nonexistent node ID', () => {
      nav.focusNode('nonexistent');
      expect(nav.getFocusedNodeId()).toBeNull();
    });
  });

  describe('ArrowDown — first child', () => {
    it('moves focus to first child of current node', () => {
      nav.focusNode('root');
      pressKey('ArrowDown');
      expect(nav.getFocusedNodeId()).toBe('a');
    });

    it('does nothing on leaf node', () => {
      nav.focusNode('b');
      pressKey('ArrowDown');
      expect(nav.getFocusedNodeId()).toBe('b');
    });
  });

  describe('ArrowUp — parent', () => {
    it('moves focus to parent', () => {
      nav.focusNode('a');
      pressKey('ArrowUp');
      expect(nav.getFocusedNodeId()).toBe('root');
    });

    it('does nothing on root', () => {
      nav.focusNode('root');
      pressKey('ArrowUp');
      expect(nav.getFocusedNodeId()).toBe('root');
    });
  });

  describe('ArrowRight — next sibling', () => {
    it('moves to next sibling', () => {
      nav.focusNode('a');
      pressKey('ArrowRight');
      expect(nav.getFocusedNodeId()).toBe('b');
    });

    it('does nothing on last sibling', () => {
      nav.focusNode('b');
      pressKey('ArrowRight');
      expect(nav.getFocusedNodeId()).toBe('b');
    });

    it('moves between grandchild siblings', () => {
      nav.focusNode('a1');
      pressKey('ArrowRight');
      expect(nav.getFocusedNodeId()).toBe('a2');
    });
  });

  describe('ArrowLeft — previous sibling', () => {
    it('moves to previous sibling', () => {
      nav.focusNode('b');
      pressKey('ArrowLeft');
      expect(nav.getFocusedNodeId()).toBe('a');
    });

    it('does nothing on first sibling', () => {
      nav.focusNode('a');
      pressKey('ArrowLeft');
      expect(nav.getFocusedNodeId()).toBe('a');
    });
  });

  describe('Home — root', () => {
    it('moves focus to root from any node', () => {
      nav.focusNode('a1');
      pressKey('Home');
      expect(nav.getFocusedNodeId()).toBe('root');
    });

    it('stays at root when already there', () => {
      nav.focusNode('root');
      pressKey('Home');
      expect(nav.getFocusedNodeId()).toBe('root');
    });
  });

  describe('End — last visible node', () => {
    it('moves focus to last node in DFS order', () => {
      nav.focusNode('root');
      pressKey('End');
      // DFS order: root, a, a1, a2, b — last is b
      expect(nav.getFocusedNodeId()).toBe('b');
    });
  });

  describe('Enter — select', () => {
    it('calls onSelect handler with node ID', () => {
      const handler = vi.fn();
      nav.setSelectHandler(handler);
      nav.focusNode('root');
      pressKey('Enter');
      expect(handler).toHaveBeenCalledWith('root', expect.any(KeyboardEvent));
    });

    it('does nothing when no handler is set', () => {
      nav.focusNode('root');
      // Should not throw
      pressKey('Enter');
    });
  });

  describe('Space — multi-select', () => {
    it('calls onMultiSelect handler', () => {
      const handler = vi.fn();
      nav.setMultiSelectHandler(handler);
      nav.focusNode('a');
      pressKey(' ');
      expect(handler).toHaveBeenCalledWith('a', expect.any(KeyboardEvent));
    });
  });

  describe('Shift+F10 — context menu', () => {
    it('calls onContextMenu handler with node ID and element', () => {
      const handler = vi.fn();
      nav.setContextMenuHandler(handler);
      nav.focusNode('a');
      pressKey('F10', { shiftKey: true });
      expect(handler).toHaveBeenCalledWith('a', expect.any(SVGGElement));
    });
  });

  describe('event prevention', () => {
    it('prevents default on navigation keys', () => {
      nav.focusNode('root');
      const event = pressKey('ArrowDown');
      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Enter', () => {
      nav.focusNode('root');
      const event = pressKey('Enter');
      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Space', () => {
      nav.focusNode('root');
      const event = pressKey(' ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not prevent default on unrelated keys', () => {
      nav.focusNode('root');
      const event = pressKey('x');
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('no tree set', () => {
    it('does nothing when tree is null', () => {
      const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svg2);
      const nav2 = new KeyboardNav(svg2);
      // focusNode without tree - should not crash
      nav2.focusNode('root');
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      svg2.dispatchEvent(event);
      expect(nav2.getFocusedNodeId()).toBeNull();
      nav2.destroy();
      svg2.remove();
    });
  });

  describe('destroy', () => {
    it('removes keydown listener', () => {
      nav.focusNode('root');
      nav.destroy();
      pressKey('ArrowDown');
      // Focus should NOT have moved since listener was removed
      expect(nav.getFocusedNodeId()).toBe('root');
    });
  });
});
