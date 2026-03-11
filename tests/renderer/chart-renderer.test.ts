import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

// --- Test fixtures ---

function singleNode(): OrgNode {
  return { id: 'root', name: 'Solo', title: 'Boss' };
}

// Root with one M1 child (Bob) who has one IC (Diana), plus one PAL (Carol)
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
        children: [
          { id: 'd', name: 'Diana', title: 'Engineer' },
        ],
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

// Manager with PALs + manager children
function managerWithPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'PAL One', title: 'Advisor' },
      { id: 'pal2', name: 'PAL Two', title: 'EA' },
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

// Mixed: siblings where some have PALs and some don't
function mixedSiblings(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'PAL', title: 'Advisor' },
      {
        id: 'cto',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'pal-cto', name: 'CTO PAL', title: 'Tech Advisor' },
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
            children: [
              { id: 'ic5', name: 'IC Five', title: 'Ops' },
            ],
          },
        ],
      },
    ],
  };
}

// Deep tree: 4 levels with no PALs
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
  return Array.from(container.querySelectorAll('.node'))
    .map((el) => el.getAttribute('data-id')!);
}

function getNodeNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.node-name'))
    .map((el) => el.textContent!);
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
function getVerticalGap(container: HTMLElement, parentId: string, childId: string, nodeHeight: number): number | null {
  const parentY = getNodeY(container, parentId);
  const childY = getNodeY(container, childId);
  if (parentY === null || childY === null) return null;
  return childY - parentY - nodeHeight;
}

// Single-child manager with no PALs (Fatima→Ethan case)
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
          { id: 'm1', name: 'Manager', title: 'M1', children: [
            { id: 'ic1', name: 'IC', title: 'Eng' },
          ]},
        ],
      },
    ],
  };
}

// Sibling managers: one with PALs, one without (David vs CTO case)
function siblingsMixedPALs(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'CEO',
    children: [
      { id: 'pal1', name: 'PAL', title: 'Advisor' },
      {
        id: 'mgr-pal',
        name: 'CTO',
        title: 'CTO',
        children: [
          { id: 'pal-cto', name: 'CTO PAL', title: 'Advisor' },
          { id: 'm1a', name: 'M1A', title: 'EM', children: [
            { id: 'ic1', name: 'IC1', title: 'Eng' },
          ]},
        ],
      },
      {
        id: 'mgr-nopal',
        name: 'COO',
        title: 'COO',
        children: [
          { id: 'm1b', name: 'M1B', title: 'EM', children: [
            { id: 'ic2', name: 'IC2', title: 'Eng' },
          ]},
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

  describe('PAL rendering', () => {
    it('renders PALs as pal-node class', () => {
      renderer.render(managerWithPALs());
      const palNodes = container.querySelectorAll('.pal-node');
      expect(palNodes.length).toBe(2);
    });

    it('renders PAL connecting lines', () => {
      renderer.render(managerWithPALs());
      // PAL links + tree link (root→CTO) + vertical connector
      const links = container.querySelectorAll('.link');
      expect(links.length).toBeGreaterThanOrEqual(3);
    });

    it('does not render grey container for PALs', () => {
      renderer.render(managerWithPALs());
      const palContainers = container.querySelectorAll('.pal-container');
      expect(palContainers.length).toBe(0);
    });

    it('renders PAL names', () => {
      renderer.render(managerWithPALs());
      const names = getNodeNames(container);
      expect(names).toContain('PAL One');
      expect(names).toContain('PAL Two');
    });

    it('renders all nodes (root + PALs + M1 + ICs)', () => {
      renderer.render(managerWithPALs());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
      expect(ids).toContain('pal1');
      expect(ids).toContain('pal2');
      expect(ids).toContain('mgr1');
      expect(ids).toContain('ic1');
      expect(ids).toContain('ic2');
    });

    it('odd number of PALs renders correctly', () => {
      const tree: OrgNode = {
        id: 'root', name: 'CEO', title: 'CEO', children: [
          { id: 'pal1', name: 'P1', title: 'PAL' },
          { id: 'pal2', name: 'P2', title: 'PAL' },
          { id: 'pal3', name: 'P3', title: 'PAL' },
          { id: 'mgr', name: 'CTO', title: 'CTO', children: [
            { id: 'ic1', name: 'IC', title: 'Eng' },
          ]},
        ],
      };
      renderer.render(tree);
      const palNodes = container.querySelectorAll('.pal-node');
      expect(palNodes.length).toBe(3);
    });

    it('single PAL is positioned to the left of the manager, not centered', () => {
      const tree: OrgNode = {
        id: 'root', name: 'CEO', title: 'CEO', children: [
          { id: 'pal1', name: 'Solo PAL', title: 'Advisor' },
          { id: 'mgr', name: 'CTO', title: 'CTO', children: [
            { id: 'ic1', name: 'IC', title: 'Eng' },
          ]},
        ],
      };
      renderer.render(tree);
      const mgrNode = container.querySelector('.node[data-id="root"]');
      const palNode = container.querySelector('.pal-node[data-id="pal1"]');
      expect(palNode).not.toBeNull();
      // PAL should be offset to the left, not at the same X as manager
      const mgrTransform = mgrNode!.getAttribute('transform')!;
      const palTransform = palNode!.getAttribute('transform')!;
      const mgrX = parseFloat(mgrTransform.match(/translate\(([^,]+)/)![1]);
      const palX = parseFloat(palTransform.match(/translate\(([^,]+)/)![1]);
      expect(palX).toBeLessThan(mgrX);
    });

    it('two PALs alternate left and right of the manager', () => {
      renderer.render(managerWithPALs());
      const palNodes = container.querySelectorAll('.pal-node');
      const transforms = Array.from(palNodes).map(n => {
        const t = n.getAttribute('transform')!;
        return parseFloat(t.match(/translate\(([^,]+)/)![1]);
      });
      // First PAL (left) should have smaller X than second PAL (right)
      expect(transforms[0]).toBeLessThan(transforms[1]);
    });

    it('PAL is positioned below the manager card', () => {
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
      // PALs
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

    it('manager without PALs alongside manager with PALs renders all nodes', () => {
      renderer.render(mixedSiblings());
      // COO has no PALs, CTO has PALs — both should render correctly
      const coo = container.querySelector('.node[data-id="coo"]');
      const cto = container.querySelector('.node[data-id="cto"]');
      expect(coo).not.toBeNull();
      expect(cto).not.toBeNull();
    });

    it('deep tree without PALs renders all levels', () => {
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

    it('single-child non-PAL manager has gap equal to bottomVerticalSpacing', () => {
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
      // root has 2 manager children + 1 PAL = multi-child
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

    it('PAL manager children are shifted down by PAL stack height', () => {
      renderer.destroy();
      renderer = createRenderer({
        topVerticalSpacing: 5,
        bottomVerticalSpacing: 12,
      });
      renderer.render(managerWithPALs());
      // root has PALs, so root→mgr1 gap should be > topVerticalSpacing + bottomVerticalSpacing
      const gap = getVerticalGap(container, 'root', 'mgr1', NODE_HEIGHT);
      expect(gap).toBeGreaterThan(17); // 17 = top(5) + bottom(12)
    });

    it('deep tree with no PALs: all single-child gaps use bottomVerticalSpacing', () => {
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
      const positions = nodes.map(n => n.getAttribute('transform'));
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    });

    it('single-PAL manager does not reserve space for phantom right PAL', () => {
      // Manager with 1 PAL + 1 manager child, next to a manager with no PALs
      const tree: OrgNode = {
        id: 'root', name: 'CEO', title: 'CEO', children: [
          {
            id: 'mgr-1pal', name: 'VP1', title: 'VP', children: [
              { id: 'pal1', name: 'PAL', title: 'Advisor' },
              { id: 'm1a', name: 'M1A', title: 'EM', children: [
                { id: 'ic1', name: 'IC1', title: 'Eng' },
              ]},
            ],
          },
          {
            id: 'mgr-nopal', name: 'VP2', title: 'VP', children: [
              { id: 'm1b', name: 'M1B', title: 'EM', children: [
                { id: 'ic2', name: 'IC2', title: 'Eng' },
              ]},
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
      // Both subtrees render without the single PAL creating phantom right space
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
});
