import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

function simpleTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'b',
        name: 'Bob',
        title: 'CTO',
        children: [{ id: 'd', name: 'Diana', title: 'Engineer' }],
      },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

function singleNode(): OrgNode {
  return { id: 'root', name: 'Solo', title: 'Boss' };
}

function m1WithICs(): OrgNode {
  return {
    id: 'root',
    name: 'Manager',
    title: 'M1',
    children: [
      { id: 'ic1', name: 'IC One', title: 'Engineer' },
      { id: 'ic2', name: 'IC Two', title: 'Engineer' },
    ],
  };
}

function managerWithPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'Advisor One', title: 'Advisor' },
      {
        id: 'mgr1',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'ic1', name: 'IC One', title: 'Engineer' },
          { id: 'ic2', name: 'IC Two', title: 'Engineer' },
        ],
      },
    ],
  };
}

describe('ARIA tree semantics', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  function allCards(): Element[] {
    return Array.from(
      container.querySelectorAll(
        'g.node[data-id], g.ic-node[data-id], g.pal-node[data-id]',
      ),
    );
  }

  function cardById(id: string): Element | null {
    return container.querySelector(
      `g.node[data-id="${id}"], g.ic-node[data-id="${id}"], g.pal-node[data-id="${id}"]`,
    );
  }

  describe('SVG element', () => {
    it('has role="tree"', () => {
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('tree');
    });

    it('has aria-label="Organization chart"', () => {
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('aria-label')).toBe('Organization chart');
    });

    it('contains a <title> element', () => {
      const title = container.querySelector('svg > title');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('Organization chart');
    });
  });

  describe('card treeitem attributes', () => {
    it('all cards have role="treeitem"', () => {
      renderer.render(simpleTree());
      for (const card of allCards()) {
        expect(card.getAttribute('role')).toBe('treeitem');
      }
    });

    it('cards have aria-label with name and title', () => {
      renderer.render(simpleTree());
      expect(cardById('root')!.getAttribute('aria-label')).toBe('Alice, CEO');
      expect(cardById('b')!.getAttribute('aria-label')).toBe('Bob, CTO');
      expect(cardById('c')!.getAttribute('aria-label')).toBe('Carol, CFO');
      expect(cardById('d')!.getAttribute('aria-label')).toBe('Diana, Engineer');
    });

    it('cards have correct aria-level (root=1, children=2, grandchildren=3)', () => {
      renderer.render(simpleTree());
      expect(cardById('root')!.getAttribute('aria-level')).toBe('1');
      expect(cardById('b')!.getAttribute('aria-level')).toBe('2');
      expect(cardById('c')!.getAttribute('aria-level')).toBe('2');
      expect(cardById('d')!.getAttribute('aria-level')).toBe('3');
    });

    it('non-leaf nodes have aria-expanded="true"', () => {
      renderer.render(simpleTree());
      expect(cardById('root')!.getAttribute('aria-expanded')).toBe('true');
      expect(cardById('b')!.getAttribute('aria-expanded')).toBe('true');
    });

    it('leaf nodes do not have aria-expanded', () => {
      renderer.render(simpleTree());
      expect(cardById('c')!.hasAttribute('aria-expanded')).toBe(false);
      expect(cardById('d')!.hasAttribute('aria-expanded')).toBe(false);
    });

    it('single node has no aria-expanded (leaf root)', () => {
      renderer.render(singleNode());
      expect(cardById('root')!.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('tabindex (roving)', () => {
    it('root card has tabindex="0"', () => {
      renderer.render(simpleTree());
      expect(cardById('root')!.getAttribute('tabindex')).toBe('0');
    });

    it('non-root cards have tabindex="-1"', () => {
      renderer.render(simpleTree());
      expect(cardById('b')!.getAttribute('tabindex')).toBe('-1');
      expect(cardById('c')!.getAttribute('tabindex')).toBe('-1');
      expect(cardById('d')!.getAttribute('tabindex')).toBe('-1');
    });

    it('single-node root has tabindex="0"', () => {
      renderer.render(singleNode());
      expect(cardById('root')!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('IC and Advisor cards', () => {
    it('IC nodes have role="treeitem" and aria-level', () => {
      renderer.render(m1WithICs());
      const ic1 = cardById('ic1')!;
      expect(ic1.getAttribute('role')).toBe('treeitem');
      expect(ic1.getAttribute('aria-level')).toBe('2');
      expect(ic1.getAttribute('aria-label')).toBe('IC One, Engineer');
    });

    it('Advisor nodes have role="treeitem" and aria-level', () => {
      renderer.render(managerWithPALs());
      const pal = cardById('pal1')!;
      expect(pal.getAttribute('role')).toBe('treeitem');
      expect(pal.getAttribute('aria-level')).toBe('2');
      expect(pal.getAttribute('aria-label')).toBe('Advisor One, Advisor');
    });

    it('IC nodes have tabindex="-1"', () => {
      renderer.render(m1WithICs());
      expect(cardById('ic1')!.getAttribute('tabindex')).toBe('-1');
      expect(cardById('ic2')!.getAttribute('tabindex')).toBe('-1');
    });

    it('Advisor nodes have tabindex="-1"', () => {
      renderer.render(managerWithPALs());
      expect(cardById('pal1')!.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('group containers', () => {
    it('ic-stacks group has role="group"', () => {
      renderer.render(m1WithICs());
      const icGroup = container.querySelector('.ic-stacks');
      expect(icGroup!.getAttribute('role')).toBe('group');
    });

    it('pal-stacks group has role="group"', () => {
      renderer.render(managerWithPALs());
      const palGroup = container.querySelector('.pal-stacks');
      expect(palGroup!.getAttribute('role')).toBe('group');
    });
  });

  describe('re-render preserves ARIA', () => {
    it('ARIA attributes persist after re-render', () => {
      renderer.render(simpleTree());
      renderer.render(simpleTree());
      expect(cardById('root')!.getAttribute('role')).toBe('treeitem');
      expect(cardById('root')!.getAttribute('tabindex')).toBe('0');
      expect(cardById('b')!.getAttribute('aria-level')).toBe('2');
    });
  });

  describe('keyboard navigation via renderer', () => {
    function pressKey(target: Element, key: string, opts: KeyboardEventInit = {}) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...opts,
      });
      target.dispatchEvent(event);
      return event;
    }

    it('getKeyboardNav() returns the KeyboardNav instance', () => {
      expect(renderer.getKeyboardNav()).toBeDefined();
    });

    it('keyboard nav tree is updated on render', () => {
      renderer.render(simpleTree());
      const nav = renderer.getKeyboardNav();
      nav.focusNode('root');
      const svg = container.querySelector('svg')!;
      pressKey(svg, 'ArrowDown');
      expect(nav.getFocusedNodeId()).toBe('b');
    });

    it('ArrowUp navigates to parent', () => {
      renderer.render(simpleTree());
      const nav = renderer.getKeyboardNav();
      nav.focusNode('b');
      pressKey(container.querySelector('svg')!, 'ArrowUp');
      expect(nav.getFocusedNodeId()).toBe('root');
    });

    it('ArrowRight navigates to next sibling', () => {
      renderer.render(simpleTree());
      const nav = renderer.getKeyboardNav();
      nav.focusNode('b');
      pressKey(container.querySelector('svg')!, 'ArrowRight');
      expect(nav.getFocusedNodeId()).toBe('c');
    });

    it('Home navigates to root', () => {
      renderer.render(simpleTree());
      const nav = renderer.getKeyboardNav();
      nav.focusNode('d');
      pressKey(container.querySelector('svg')!, 'Home');
      expect(nav.getFocusedNodeId()).toBe('root');
    });
  });
});
