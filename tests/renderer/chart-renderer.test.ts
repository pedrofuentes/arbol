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

  describe('collapse/expand', () => {
    it('hides children when node is collapsed', () => {
      renderer.toggleCollapse('b');
      renderer.render(simpleTree());
      const ids = getNodeIds(container);
      expect(ids).toContain('root');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).not.toContain('d');
    });

    it('shows children again when expanded', () => {
      renderer.toggleCollapse('b');
      renderer.render(simpleTree());
      expect(getNodeIds(container)).not.toContain('d');

      renderer.toggleCollapse('b');
      renderer.render(simpleTree());
      expect(getNodeIds(container)).toContain('d');
    });

    it('tracks collapsed state', () => {
      expect(renderer.isCollapsed('b')).toBe(false);
      renderer.toggleCollapse('b');
      expect(renderer.isCollapsed('b')).toBe(true);
      renderer.toggleCollapse('b');
      expect(renderer.isCollapsed('b')).toBe(false);
    });

    it('hides IC stack when M1 is collapsed', () => {
      renderer.toggleCollapse('root');
      renderer.render(m1WithICs());
      const icNodes = container.querySelectorAll('.ic-node');
      expect(icNodes.length).toBe(0);
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
});
