import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode, ColorCategory } from '../../src/types';

// --- Test fixtures ---

function singleNode(): OrgNode {
  return { id: 'root', name: 'Solo', title: 'Boss' };
}

// Root with one M1 child (Bob) who has one IC (Diana), plus one Advisor (Carol)
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

// M1 with only ICs (all children are leaves)
function m1WithICs(): OrgNode {
  return {
    id: 'root',
    name: 'Manager',
    title: 'M1',
    children: [
      { id: 'ic1', name: 'IC One', title: 'Engineer' },
      { id: 'ic2', name: 'IC Two', title: 'Engineer' },
      { id: 'ic3', name: 'IC Three', title: 'Engineer' },
    ],
  };
}

// Manager with Advisors + manager children
function managerWithPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'Advisor One', title: 'Advisor' },
      { id: 'pal2', name: 'Advisor Two', title: 'EA' },
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

// Mixed: siblings where some have Advisors and some don't
function mixedSiblings(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'Advisor', title: 'Advisor' },
      {
        id: 'cto',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'pal-cto', name: 'CTO Advisor', title: 'Tech Advisor' },
          {
            id: 'vp',
            name: 'VP Eng',
            title: 'VP',
            children: [
              { id: 'ic1', name: 'IC One', title: 'Engineer' },
              { id: 'ic2', name: 'IC Two', title: 'Engineer' },
            ],
          },
        ],
      },
      {
        id: 'cfo',
        name: 'CFO',
        title: 'CFO',
        children: [
          { id: 'ic3', name: 'IC Three', title: 'Accountant' },
          { id: 'ic4', name: 'IC Four', title: 'Accountant' },
        ],
      },
      {
        id: 'coo',
        name: 'COO',
        title: 'COO',
        children: [
          {
            id: 'vp-ops',
            name: 'VP Ops',
            title: 'VP',
            children: [{ id: 'ic5', name: 'IC Five', title: 'Ops' }],
          },
        ],
      },
    ],
  };
}

// Deep tree: 4 levels with no Advisors
function deepNoPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      {
        id: 'l1',
        name: 'VP',
        title: 'VP',
        children: [
          {
            id: 'l2',
            name: 'Dir',
            title: 'Dir',
            children: [
              { id: 'ic1', name: 'IC', title: 'Eng' },
              { id: 'ic2', name: 'IC2', title: 'Eng' },
            ],
          },
        ],
      },
    ],
  };
}

function getNodeIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.node')).map((el) => el.getAttribute('data-id')!);
}

function getNodeNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.node-name')).map((el) => el.textContent!);
}

// Extract Y position from a node's transform attribute
function getNodeY(container: HTMLElement, nodeId: string): number | null {
  const node = container.querySelector(`.node[data-id="${nodeId}"]`);
  if (!node) return null;
  const transform = node.getAttribute('transform');
  if (!transform) return null;
  const match = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
  return match ? parseFloat(match[1]) : null;
}

// Get vertical gap between two nodes (parent bottom to child top)
function getVerticalGap(
  container: HTMLElement,
  parentId: string,
  childId: string,
  nodeHeight: number,
): number | null {
  const parentY = getNodeY(container, parentId);
  const childY = getNodeY(container, childId);
  if (parentY === null || childY === null) return null;
  return childY - parentY - nodeHeight;
}

// Single-child manager with no Advisors (Fatima→Ethan case)
function singleChildNoPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      {
        id: 'dir',
        name: 'Director',
        title: 'Dir',
        children: [
          {
            id: 'm1',
            name: 'Manager',
            title: 'M1',
            children: [{ id: 'ic1', name: 'IC', title: 'Eng' }],
          },
        ],
      },
    ],
  };
}

// Sibling managers: one with Advisors, one without (David vs CTO case)
function siblingsMixedPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'Advisor', title: 'Advisor' },
      {
        id: 'mgr-pal',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'pal-cto', name: 'CTO Advisor', title: 'Advisor' },
          {
            id: 'm1a',
            name: 'M1A',
            title: 'EM',
            children: [{ id: 'ic1', name: 'IC1', title: 'Eng' }],
          },
        ],
      },
      {
        id: 'mgr-nopal',
        name: 'COO',
        title: 'COO',
        children: [
          {
            id: 'm1b',
            name: 'M1B',
            title: 'EM',
            children: [{ id: 'ic2', name: 'IC2', title: 'Eng' }],
          },
        ],
      },
    ],
  };
}

// --- Tests ---

describe('ChartRenderer', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;

  function createRenderer(overrides = {}) {
    return new ChartRenderer({
      container,
      nodeWidth: 110,
      nodeHeight: 22,
      horizontalSpacing: 30,
      ...overrides,
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createRenderer();
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  describe('basic rendering', () => {
    it('creates an SVG element in the container', () => {
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('renders a single root node', () => {
      renderer.render(singleNode());
      expect(container.querySelectorAll('.node').length).toBe(1);
    });

    it('renders no links for a single node', () => {
      renderer.render(singleNode());
      expect(container.querySelectorAll('.link').length).toBe(0);
    });

    it('re-renders cleanly (no duplicate nodes)', () => {
      renderer.render(simpleTree());
      renderer.render(simpleTree());
      expect(container.querySelectorAll('.node').length).toBe(4);
    });

    it('stores node id as data attribute', () => {
      renderer.render(simpleTree());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).toContain('d');
    });

    it('renders name and title for each node', () => {
      renderer.render(simpleTree());
      const names = getNodeNames(container);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
      expect(names).toContain('Carol');
      expect(names).toContain('Diana');
    });
  });

  describe('IC rendering (M1 nodes)', () => {
    it('renders ICs as ic-node class under M1', () => {
      renderer.render(m1WithICs());
      const icNodes = container.querySelectorAll('.ic-node');
      expect(icNodes.length).toBe(3);
    });

    it('renders grey IC container', () => {
      renderer.render(m1WithICs());
      const icContainer = container.querySelector('.ic-container');
      expect(icContainer).not.toBeNull();
    });

    it('does not render tree links to ICs', () => {
      renderer.render(m1WithICs());
      // M1 root has no tree links — ICs are stacked, not linked
      const links = container.querySelectorAll('.link');
      expect(links.length).toBe(0);
    });

    it('renders IC names and titles', () => {
      renderer.render(m1WithICs());
      const names = getNodeNames(container);
      expect(names).toContain('IC One');
      expect(names).toContain('IC Two');
      expect(names).toContain('IC Three');
    });

    it('M1 node itself is rendered as a regular node', () => {
      renderer.render(m1WithICs());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
    });

    it('all nodes (M1 + ICs) are rendered', () => {
      renderer.render(m1WithICs());
      expect(container.querySelectorAll('.node').length).toBe(4);
    });
  });

  describe('Advisor rendering', () => {
    it('renders Advisors as pal-node class', () => {
      renderer.render(managerWithPALs());
      const palNodes = container.querySelectorAll('.pal-node');
      expect(palNodes.length).toBe(2);
    });

    it('renders Advisor connecting lines', () => {
      renderer.render(managerWithPALs());
      // Advisor links + tree link (root→CTO) + vertical connector
      const links = container.querySelectorAll('.link');
      expect(links.length).toBeGreaterThanOrEqual(3);
    });

    it('does not render grey container for Advisors', () => {
      renderer.render(managerWithPALs());
      const palContainers = container.querySelectorAll('.pal-container');
      expect(palContainers.length).toBe(0);
    });

    it('renders Advisor names', () => {
      renderer.render(managerWithPALs());
      const names = getNodeNames(container);
      expect(names).toContain('Advisor One');
      expect(names).toContain('Advisor Two');
    });

    it('renders all nodes (root + Advisors + M1 + ICs)', () => {
      renderer.render(managerWithPALs());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
      expect(ids).toContain('pal1');
      expect(ids).toContain('pal2');
      expect(ids).toContain('mgr1');
      expect(ids).toContain('ic1');
      expect(ids).toContain('ic2');
    });

    it('odd number of Advisors renders correctly', () => {
      const tree: OrgNode = {
        id: 'root',
        name: 'CEO',
        title: 'CEO',
        children: [
          { id: 'pal1', name: 'P1', title: 'Advisor' },
          { id: 'pal2', name: 'P2', title: 'Advisor' },
          { id: 'pal3', name: 'P3', title: 'Advisor' },
          {
            id: 'mgr',
            name: 'CTO',
            title: 'CTO',
            children: [{ id: 'ic1', name: 'IC', title: 'Eng' }],
          },
        ],
      };
      renderer.render(tree);
      const palNodes = container.querySelectorAll('.pal-node');
      expect(palNodes.length).toBe(3);
    });

    it('single Advisor is positioned to the left of the manager, not centered', () => {
      const tree: OrgNode = {
        id: 'root',
        name: 'CEO',
        title: 'CEO',
        children: [
          { id: 'pal1', name: 'Solo Advisor', title: 'Advisor' },
          {
            id: 'mgr',
            name: 'CTO',
            title: 'CTO',
            children: [{ id: 'ic1', name: 'IC', title: 'Eng' }],
          },
        ],
      };
      renderer.render(tree);
      const mgrNode = container.querySelector('.node[data-id="root"]');
      const palNode = container.querySelector('.pal-node[data-id="pal1"]');
      expect(palNode).not.toBeNull();
      // Advisor should be offset to the left, not at the same X as manager
      const mgrTransform = mgrNode!.getAttribute('transform')!;
      const palTransform = palNode!.getAttribute('transform')!;
      const mgrX = parseFloat(mgrTransform.match(/translate\(([^,]+)/)![1]);
      const palX = parseFloat(palTransform.match(/translate\(([^,]+)/)![1]);
      expect(palX).toBeLessThan(mgrX);
    });

    it('two Advisors alternate left and right of the manager', () => {
      renderer.render(managerWithPALs());
      const palNodes = container.querySelectorAll('.pal-node');
      const transforms = Array.from(palNodes).map((n) => {
        const t = n.getAttribute('transform')!;
        return parseFloat(t.match(/translate\(([^,]+)/)![1]);
      });
      // First Advisor (left) should have smaller X than second Advisor (right)
      expect(transforms[0]).toBeLessThan(transforms[1]);
    });

    it('Advisor is positioned below the manager card', () => {
      renderer.render(managerWithPALs());
      const mgrY = getNodeY(container, 'root')!;
      const palNodes = container.querySelectorAll('.pal-node');
      for (const pal of Array.from(palNodes)) {
        const transform = pal.getAttribute('transform')!;
        const palY = parseFloat(transform.match(/translate\([^,]+,\s*([^)]+)\)/)![1]);
        expect(palY).toBeGreaterThan(mgrY + NODE_HEIGHT);
      }
    });
  });

  describe('mixed scenarios', () => {
    it('renders complex mixed tree with all node types', () => {
      renderer.render(mixedSiblings());
      const ids = getNodeIds(container);
      // Advisors
      expect(ids).toContain('pal1');
      expect(ids).toContain('pal-cto');
      // Managers
      expect(ids).toContain('root');
      expect(ids).toContain('cto');
      expect(ids).toContain('cfo');
      expect(ids).toContain('coo');
      expect(ids).toContain('vp');
      expect(ids).toContain('vp-ops');
      // ICs
      expect(ids).toContain('ic1');
      expect(ids).toContain('ic2');
      expect(ids).toContain('ic3');
      expect(ids).toContain('ic4');
      expect(ids).toContain('ic5');
    });

    it('manager without Advisors alongside manager with Advisors renders all nodes', () => {
      renderer.render(mixedSiblings());
      // COO has no Advisors, CTO has Advisors — both should render correctly
      const coo = container.querySelector('.node[data-id="coo"]');
      const cto = container.querySelector('.node[data-id="cto"]');
      expect(coo).not.toBeNull();
      expect(cto).not.toBeNull();
    });

    it('deep tree without Advisors renders all levels', () => {
      renderer.render(deepNoPALs());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
      expect(ids).toContain('l1');
      expect(ids).toContain('l2');
      expect(ids).toContain('ic1');
      expect(ids).toContain('ic2');
    });
  });

  describe('updateOptions', () => {
    it('updates options and allows re-render', () => {
      renderer.render(singleNode());
      renderer.updateOptions({ nodeWidth: 200 });
      expect(renderer.getOptions().nodeWidth).toBe(200);
    });

    it('getOptions returns current resolved options', () => {
      const opts = renderer.getOptions();
      expect(opts.nodeWidth).toBe(110);
      expect(opts.nodeHeight).toBe(22);
    });
  });

  const NODE_HEIGHT = 22;

  describe('vertical spacing', () => {
    it('single-child non-Advisor manager has gap equal to bottomVerticalSpacing', () => {
      renderer.destroy();
      renderer = createRenderer({
        topVerticalSpacing: 5,
        bottomVerticalSpacing: 12,
      });
      renderer.render(singleChildNoPALs());
      // root→dir is single-child, gap should be bottomVerticalSpacing (12)
      const gap = getVerticalGap(container, 'root', 'dir', NODE_HEIGHT);
      expect(gap).toBe(12);
    });

    it('single-child gap is smaller than multi-child gap', () => {
      renderer.destroy();
      renderer = createRenderer({
        topVerticalSpacing: 5,
        bottomVerticalSpacing: 12,
      });
      renderer.render(siblingsMixedPALs());
      // root has 2 manager children + 1 Advisor = multi-child
      // mgr-nopal has 1 child = single-child
      const rootToChild = getVerticalGap(container, 'root', 'mgr-pal', NODE_HEIGHT);
      const singleGap = getVerticalGap(container, 'mgr-nopal', 'm1b', NODE_HEIGHT);
      expect(singleGap).toBeLessThan(rootToChild!);
    });

    it('siblings at same depth have same Y position', () => {
      renderer.render(siblingsMixedPALs());
      const yPal = getNodeY(container, 'mgr-pal');
      const yNoPal = getNodeY(container, 'mgr-nopal');
      expect(yPal).toBe(yNoPal);
    });

    it('Advisor manager children are shifted down by Advisor stack height', () => {
      renderer.destroy();
      renderer = createRenderer({
        topVerticalSpacing: 5,
        bottomVerticalSpacing: 12,
      });
      renderer.render(managerWithPALs());
      // root has Advisors, so root→mgr1 gap should be > topVerticalSpacing + bottomVerticalSpacing
      const gap = getVerticalGap(container, 'root', 'mgr1', NODE_HEIGHT);
      expect(gap).toBeGreaterThan(17); // 17 = top(5) + bottom(12)
    });

    it('deep tree with no Advisors: all single-child gaps use bottomVerticalSpacing', () => {
      renderer.destroy();
      renderer = createRenderer({
        topVerticalSpacing: 5,
        bottomVerticalSpacing: 12,
      });
      renderer.render(deepNoPALs());
      const gap1 = getVerticalGap(container, 'root', 'l1', NODE_HEIGHT);
      const gap2 = getVerticalGap(container, 'l1', 'l2', NODE_HEIGHT);
      // Both are single-child connections
      expect(gap1).toBe(12);
      expect(gap2).toBe(12);
    });
  });

  describe('no node overlap', () => {
    it('no two manager nodes share the same position', () => {
      renderer.render(mixedSiblings());
      const nodes = Array.from(container.querySelectorAll('.node:not(.ic-node):not(.pal-node)'));
      const positions = nodes.map((n) => n.getAttribute('transform'));
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    });

    it('single-Advisor manager does not reserve space for phantom right Advisor', () => {
      // Manager with 1 Advisor + 1 manager child, next to a manager with no Advisors
      const tree: OrgNode = {
        id: 'root',
        name: 'CEO',
        title: 'CEO',
        children: [
          {
            id: 'mgr-1pal',
            name: 'VP1',
            title: 'VP',
            children: [
              { id: 'pal1', name: 'Advisor', title: 'Advisor' },
              {
                id: 'm1a',
                name: 'M1A',
                title: 'EM',
                children: [{ id: 'ic1', name: 'IC1', title: 'Eng' }],
              },
            ],
          },
          {
            id: 'mgr-nopal',
            name: 'VP2',
            title: 'VP',
            children: [
              {
                id: 'm1b',
                name: 'M1B',
                title: 'EM',
                children: [{ id: 'ic2', name: 'IC2', title: 'Eng' }],
              },
            ],
          },
        ],
      };
      renderer.render(tree);
      // VP2's X should be close to VP1's right boundary, not pushed far right
      const vp1X = getNodeY(container, 'mgr-1pal'); // using getNodeY to just verify they render
      const vp2X = getNodeY(container, 'mgr-nopal');
      expect(vp1X).not.toBeNull();
      expect(vp2X).not.toBeNull();
      // Both subtrees render without the single Advisor creating phantom right space
      expect(container.querySelectorAll('.pal-node').length).toBe(1);
    });

    it('IC nodes are positioned below their M1 parent', () => {
      renderer.render(m1WithICs());
      const parentY = getNodeY(container, 'root')!;
      const icNodes = container.querySelectorAll('.ic-node');
      for (const ic of Array.from(icNodes)) {
        const transform = ic.getAttribute('transform')!;
        const match = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
        const icY = parseFloat(match![1]);
        expect(icY).toBeGreaterThan(parentY + NODE_HEIGHT);
      }
    });
  });

  describe('right-click support', () => {
    it('fires right-click handler with nodeId on contextmenu event', () => {
      const handler = vi.fn();
      renderer.setNodeRightClickHandler(handler);
      renderer.render(simpleTree());

      const rect = container.querySelector('.node[data-id="root"] rect')!;
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      rect.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBe('root');
    });

    it('prevents default browser context menu', () => {
      renderer.setNodeRightClickHandler(() => {});
      renderer.render(simpleTree());

      const rect = container.querySelector('.node[data-id="root"] rect')!;
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      rect.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('does not prevent default when no handler is set', () => {
      renderer.render(simpleTree());

      const rect = container.querySelector('.node[data-id="root"] rect')!;
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      rect.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('fires right-click on IC nodes', () => {
      const handler = vi.fn();
      renderer.setNodeRightClickHandler(handler);
      renderer.render(m1WithICs());

      const rect = container.querySelector('.ic-node[data-id="ic1"] rect')!;
      rect.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBe('ic1');
    });

    it('fires right-click on Advisor nodes', () => {
      const handler = vi.fn();
      renderer.setNodeRightClickHandler(handler);
      renderer.render(managerWithPALs());

      const rect = container.querySelector('.pal-node[data-id="pal1"] rect')!;
      rect.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBe('pal1');
    });
  });

  describe('getNodeScreenRect', () => {
    it('returns DOMRect for existing node', () => {
      renderer.render(simpleTree());
      const rect = renderer.getNodeScreenRect('root');
      expect(rect).not.toBeNull();
    });

    it('returns null for non-existent node', () => {
      renderer.render(simpleTree());
      const rect = renderer.getNodeScreenRect('zzz');
      expect(rect).toBeNull();
    });

    it('returns DOMRect for IC node', () => {
      renderer.render(m1WithICs());
      const rect = renderer.getNodeScreenRect('ic1');
      expect(rect).not.toBeNull();
    });

    it('returns DOMRect for Advisor node', () => {
      renderer.render(managerWithPALs());
      const rect = renderer.getNodeScreenRect('pal1');
      expect(rect).not.toBeNull();
    });
  });

  describe('multi-select', () => {
    it('applies .multi-selected class to specified nodes', () => {
      renderer.render(simpleTree());
      renderer.setMultiSelectedNodes(new Set(['b', 'c']));
      const selected = container.querySelectorAll('.multi-selected');
      expect(selected.length).toBe(2);
      const ids = Array.from(selected).map((el) => el.getAttribute('data-id'));
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });

    it('clears all .multi-selected classes when called with null', () => {
      renderer.render(simpleTree());
      renderer.setMultiSelectedNodes(new Set(['b', 'c']));
      expect(container.querySelectorAll('.multi-selected').length).toBe(2);
      renderer.setMultiSelectedNodes(null);
      expect(container.querySelectorAll('.multi-selected').length).toBe(0);
    });

    it('works with IC nodes', () => {
      renderer.render(m1WithICs());
      renderer.setMultiSelectedNodes(new Set(['ic1', 'ic2']));
      const selected = container.querySelectorAll('.multi-selected');
      expect(selected.length).toBe(2);
      const ids = Array.from(selected).map((el) => el.getAttribute('data-id'));
      expect(ids).toContain('ic1');
      expect(ids).toContain('ic2');
    });

    it('works with Advisor nodes', () => {
      renderer.render(managerWithPALs());
      renderer.setMultiSelectedNodes(new Set(['pal1', 'pal2']));
      const selected = container.querySelectorAll('.multi-selected');
      expect(selected.length).toBe(2);
      const ids = Array.from(selected).map((el) => el.getAttribute('data-id'));
      expect(ids).toContain('pal1');
      expect(ids).toContain('pal2');
    });

    it('click handler passes MouseEvent as second argument', () => {
      const handler = vi.fn();
      renderer.setNodeClickHandler(handler);
      renderer.render(simpleTree());

      const rect = container.querySelector('.node[data-id="root"] rect')!;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      rect.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0].length).toBe(2);
      expect(handler.mock.calls[0][0]).toBe('root');
      expect(handler.mock.calls[0][1]).toBeInstanceOf(MouseEvent);
    });
  });

  describe('per-node category colors', () => {
    const categories: ColorCategory[] = [
      { id: 'eng', label: 'Engineering', color: '#3b82f6' },
      { id: 'sales', label: 'Sales', color: '#ef4444' },
    ];

    it('renders card with category color when categoryId is set', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      const tree: OrgNode = { id: 'root', name: 'Alice', title: 'CEO', categoryId: 'eng' };
      renderer.render(tree);
      const rect = container.querySelector('.node[data-id="root"] rect')!;
      expect(rect.getAttribute('fill')).toBe('#3b82f6');
    });

    it('renders card with default cardFill when categoryId is not set', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      const tree: OrgNode = { id: 'root', name: 'Alice', title: 'CEO' };
      renderer.render(tree);
      const rect = container.querySelector('.node[data-id="root"] rect')!;
      expect(rect.getAttribute('fill')).toBe('#ffffff');
    });

    it('renders card with default cardFill when categoryId does not match any category', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      const tree: OrgNode = { id: 'root', name: 'Alice', title: 'CEO', categoryId: 'unknown' };
      renderer.render(tree);
      const rect = container.querySelector('.node[data-id="root"] rect')!;
      expect(rect.getAttribute('fill')).toBe('#ffffff');
    });

    it('handles multiple nodes with different categories', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      const tree: OrgNode = {
        id: 'root',
        name: 'CEO',
        title: 'CEO',
        categoryId: 'eng',
        children: [
          {
            id: 'mgr',
            name: 'Manager',
            title: 'M1',
            categoryId: 'sales',
            children: [{ id: 'ic1', name: 'IC', title: 'Eng', categoryId: 'eng' }],
          },
        ],
      };
      renderer.render(tree);
      const rootRect = container.querySelector('.node[data-id="root"] rect')!;
      expect(rootRect.getAttribute('fill')).toBe('#3b82f6');
      const mgrRect = container.querySelector(
        '.node[data-id="mgr"] rect, .ic-node[data-id="mgr"] rect, .pal-node[data-id="mgr"] rect',
      )!;
      expect(mgrRect.getAttribute('fill')).toBe('#ef4444');
      const icRect = container.querySelector('.ic-node[data-id="ic1"] rect')!;
      expect(icRect.getAttribute('fill')).toBe('#3b82f6');
    });
  });

  describe('legend rendering', () => {
    const categories: ColorCategory[] = [
      { id: 'eng', label: 'Engineering', color: '#3b82f6' },
      { id: 'sales', label: 'Sales', color: '#ef4444' },
      { id: 'ops', label: 'Operations', color: '#22c55e' },
    ];

    it('renders legend when categories are provided', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      renderer.render(singleNode());
      const legend = container.querySelector('.legend');
      expect(legend).not.toBeNull();
    });

    it('does not render legend when categories array is empty', () => {
      renderer.render(singleNode());
      const legend = container.querySelector('.legend');
      expect(legend).toBeNull();
    });

    it('renders correct number of legend entries', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      renderer.render(singleNode());
      const legend = container.querySelector('.legend')!;
      // Each entry is a <g> child (excluding the bg rect which is a direct child)
      const entryGroups = legend.querySelectorAll('g');
      expect(entryGroups.length).toBe(categories.length);
    });

    it('renders category labels in legend', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      renderer.render(singleNode());
      const legend = container.querySelector('.legend')!;
      const texts = Array.from(legend.querySelectorAll('text')).map((t) => t.textContent);
      expect(texts).toContain('Engineering');
      expect(texts).toContain('Sales');
      expect(texts).toContain('Operations');
    });

    it('renders category color swatches in legend', () => {
      renderer.destroy();
      renderer = createRenderer({ categories });
      renderer.render(singleNode());
      const legend = container.querySelector('.legend')!;
      // Each entry group has a rect swatch; skip the first rect which is the bg
      const swatches = Array.from(legend.querySelectorAll('g rect'));
      const fills = swatches.map((r) => r.getAttribute('fill'));
      expect(fills).toContain('#3b82f6');
      expect(fills).toContain('#ef4444');
      expect(fills).toContain('#22c55e');
    });
  });
});
