import { describe, it, expect } from 'vitest';
import { computeLayout, LayoutResult, LayoutNode } from '../../src/renderer/layout-engine';
import { ResolvedOptions } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

// --- Default options matching the test renderer ---

function defaultOpts(): ResolvedOptions {
  const nodeWidth = 110;
  return {
    container: document.createElement('div'),
    nodeWidth,
    nodeHeight: 22,
    horizontalSpacing: 30,
    branchSpacing: 10,
    topVerticalSpacing: 5,
    bottomVerticalSpacing: 12,
    icNodeWidth: Math.round(nodeWidth * 0.77),
    icGap: 4,
    icContainerPadding: 6,
    palTopGap: 7,
    palBottomGap: 7,
    palRowGap: 4,
    palCenterGap: 50,
    nameFontSize: 8,
    titleFontSize: 7,
    textPaddingTop: 4,
    textGap: 1,
    linkColor: '#94a3b8',
    linkWidth: 1.5,
    cardFill: '#ffffff',
    cardStroke: '#22c55e',
    cardStrokeWidth: 1,
    icContainerFill: '#e5e7eb',
    categories: [],
  };
}

// --- Test fixtures ---

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
      { id: 'ic3', name: 'IC Three', title: 'Engineer' },
    ],
  };
}

function managerWithPALsAndM1(): OrgNode {
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

function mixedTree(): OrgNode {
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
    ],
  };
}

// --- Helpers ---

function nodesByType(result: LayoutResult, type: LayoutNode['type']): LayoutNode[] {
  return result.nodes.filter((n) => n.type === type);
}

// --- Tests ---

describe('computeLayout', () => {
  describe('single node', () => {
    it('returns 1 manager node, 0 links, 0 IC containers', () => {
      const result = computeLayout(singleNode(), defaultOpts());
      const managers = nodesByType(result, 'manager');
      expect(managers.length).toBe(1);
      expect(managers[0].id).toBe('root');
      expect(managers[0].name).toBe('Solo');
      expect(managers[0].title).toBe('Boss');
      expect(result.links.length).toBe(0);
      expect(result.icContainers.length).toBe(0);
    });

    it('node has correct dimensions from options', () => {
      const opts = defaultOpts();
      const result = computeLayout(singleNode(), opts);
      const node = nodesByType(result, 'manager')[0];
      expect(node.width).toBe(opts.nodeWidth);
      expect(node.height).toBe(opts.nodeHeight);
    });
  });

  describe('M1 with 3 ICs', () => {
    it('returns 1 manager + 3 IC nodes', () => {
      const result = computeLayout(m1WithICs(), defaultOpts());
      expect(nodesByType(result, 'manager').length).toBe(1);
      expect(nodesByType(result, 'ic').length).toBe(3);
    });

    it('returns 0 tree links (ICs are stacked, not linked)', () => {
      const result = computeLayout(m1WithICs(), defaultOpts());
      expect(result.links.filter((l) => l.layer === 'tree').length).toBe(0);
    });

    it('returns 1 IC container', () => {
      const result = computeLayout(m1WithICs(), defaultOpts());
      expect(result.icContainers.length).toBe(1);
    });

    it('IC nodes use icNodeWidth from options', () => {
      const opts = defaultOpts();
      const result = computeLayout(m1WithICs(), opts);
      for (const ic of nodesByType(result, 'ic')) {
        expect(ic.width).toBe(opts.icNodeWidth);
      }
    });

    it('IC nodes are positioned below the manager', () => {
      const opts = defaultOpts();
      const result = computeLayout(m1WithICs(), opts);
      const mgr = nodesByType(result, 'manager')[0];
      for (const ic of nodesByType(result, 'ic')) {
        expect(ic.y).toBeGreaterThan(mgr.y + mgr.height);
      }
    });

    it('manager node is marked collapsible', () => {
      const result = computeLayout(m1WithICs(), defaultOpts());
      const mgr = nodesByType(result, 'manager')[0];
      expect(mgr.collapsible).toBe(true);
    });
  });

  describe('manager with 2 Advisors + 1 M1', () => {
    it('returns manager + 2 Advisor + M1 + 2 IC nodes', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      expect(nodesByType(result, 'manager').length).toBe(2); // root + mgr1
      expect(nodesByType(result, 'pal').length).toBe(2);
      expect(nodesByType(result, 'ic').length).toBe(2);
    });

    it('returns Advisor links and tree links', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      const palLinks = result.links.filter((l) => l.layer === 'pal');
      const treeLinks = result.links.filter((l) => l.layer === 'tree');
      expect(palLinks.length).toBe(2); // one per Advisor
      expect(treeLinks.length).toBeGreaterThanOrEqual(2); // tree link + vertical connector
    });

    it('returns 1 IC container (for the M1 child)', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      expect(result.icContainers.length).toBe(1);
    });

    it('Advisor nodes are positioned below the manager card', () => {
      const opts = defaultOpts();
      const result = computeLayout(managerWithPALsAndM1(), opts);
      const root = nodesByType(result, 'manager').find((n) => n.id === 'root')!;
      for (const pal of nodesByType(result, 'pal')) {
        expect(pal.y).toBeGreaterThan(root.y + root.height);
      }
    });

    it('first Advisor is to the left, second Advisor is to the right', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      const pals = nodesByType(result, 'pal');
      expect(pals[0].x).toBeLessThan(pals[1].x);
    });
  });

  describe('mixed tree', () => {
    it('returns correct node types', () => {
      const result = computeLayout(mixedTree(), defaultOpts());
      const managers = nodesByType(result, 'manager');
      const pals = nodesByType(result, 'pal');
      const ics = nodesByType(result, 'ic');
      // Managers: root, cto, cfo, vp
      expect(managers.length).toBe(4);
      // Advisors: pal1 (under root), pal-cto (under cto)
      expect(pals.length).toBe(2);
      // ICs: ic1, ic2 (under vp), ic3, ic4 (under cfo)
      expect(ics.length).toBe(4);
    });

    it('returns correct link count', () => {
      const result = computeLayout(mixedTree(), defaultOpts());
      // Advisor links: 1 (pal1 under root) + 1 (pal-cto under cto) = 2
      const palLinks = result.links.filter((l) => l.layer === 'pal');
      expect(palLinks.length).toBe(2);
      // Tree links exist (elbow paths + vertical connectors)
      const treeLinks = result.links.filter((l) => l.layer === 'tree');
      expect(treeLinks.length).toBeGreaterThanOrEqual(3);
    });

    it('all link paths are valid SVG path strings', () => {
      const result = computeLayout(mixedTree(), defaultOpts());
      for (const link of result.links) {
        expect(link.path).toMatch(/^M[\d.\-e]+,[\d.\-e]+ L/);
      }
    });
  });

  describe('bounding box', () => {
    it('minX < 0 for a centered tree (root centered at x=0)', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      expect(result.boundingBox.minX).toBeLessThan(0);
    });

    it('minY = 0 for root at top', () => {
      const result = computeLayout(singleNode(), defaultOpts());
      expect(result.boundingBox.minY).toBe(0);
    });

    it('width > 0 and height > 0', () => {
      const result = computeLayout(managerWithPALsAndM1(), defaultOpts());
      expect(result.boundingBox.width).toBeGreaterThan(0);
      expect(result.boundingBox.height).toBeGreaterThan(0);
    });

    it('encompasses all nodes', () => {
      const result = computeLayout(mixedTree(), defaultOpts());
      const bb = result.boundingBox;
      for (const node of result.nodes) {
        const left = node.x - node.width / 2;
        const right = node.x + node.width / 2;
        expect(left).toBeGreaterThanOrEqual(bb.minX - 0.001);
        expect(right).toBeLessThanOrEqual(bb.minX + bb.width + 0.001);
        expect(node.y).toBeGreaterThanOrEqual(bb.minY - 0.001);
        expect(node.y + node.height).toBeLessThanOrEqual(bb.minY + bb.height + 0.001);
      }
    });
  });

  describe('collapsible marking', () => {
    it('leaf node without children is not collapsible', () => {
      const result = computeLayout(singleNode(), defaultOpts());
      const mgr = nodesByType(result, 'manager')[0];
      expect(mgr.collapsible).toBe(false);
    });
  });

  describe('categoryId propagation', () => {
    it('passes categoryId from OrgNode to manager LayoutNode', () => {
      const tree: OrgNode = {
        id: 'root', name: 'CEO', title: 'CEO', categoryId: 'cat-exec',
        children: [
          { id: 'mgr1', name: 'CTO', title: 'CTO', categoryId: 'cat-tech',
            children: [
              { id: 'ic1', name: 'IC', title: 'Eng' },
            ],
          },
        ],
      };
      const result = computeLayout(tree, defaultOpts());
      const root = result.nodes.find((n) => n.id === 'root')!;
      const mgr = result.nodes.find((n) => n.id === 'mgr1')!;
      expect(root.categoryId).toBe('cat-exec');
      expect(mgr.categoryId).toBe('cat-tech');
    });

    it('passes categoryId from OrgNode to IC LayoutNode', () => {
      const tree: OrgNode = {
        id: 'root', name: 'Manager', title: 'M1',
        children: [
          { id: 'ic1', name: 'IC One', title: 'Eng', categoryId: 'cat-eng' },
          { id: 'ic2', name: 'IC Two', title: 'Eng', categoryId: 'cat-design' },
        ],
      };
      const result = computeLayout(tree, defaultOpts());
      const ics = nodesByType(result, 'ic');
      const ic1 = ics.find((n) => n.id === 'ic1')!;
      const ic2 = ics.find((n) => n.id === 'ic2')!;
      expect(ic1.categoryId).toBe('cat-eng');
      expect(ic2.categoryId).toBe('cat-design');
    });

    it('passes categoryId from OrgNode to Advisor LayoutNode', () => {
      const tree: OrgNode = {
        id: 'root', name: 'CEO', title: 'CEO',
        children: [
          { id: 'pal1', name: 'Advisor One', title: 'Advisor', categoryId: 'cat-advisor' },
          {
            id: 'mgr1', name: 'CTO', title: 'CTO',
            children: [
              { id: 'ic1', name: 'IC', title: 'Eng' },
            ],
          },
        ],
      };
      const result = computeLayout(tree, defaultOpts());
      const pals = nodesByType(result, 'pal');
      expect(pals.length).toBe(1);
      expect(pals[0].categoryId).toBe('cat-advisor');
    });

    it('leaves categoryId undefined when not set on OrgNode', () => {
      const result = computeLayout(m1WithICs(), defaultOpts());
      for (const node of result.nodes) {
        expect(node.categoryId).toBeUndefined();
      }
    });
  });

  describe('getLastLayout integration', () => {
    it('ChartRenderer exposes layout after render', async () => {
      const { ChartRenderer } = await import('../../src/renderer/chart-renderer');
      const container = document.createElement('div');
      document.body.appendChild(container);
      const renderer = new ChartRenderer({
        container,
        nodeWidth: 110,
        nodeHeight: 22,
        horizontalSpacing: 30,
      });
      expect(renderer.getLastLayout()).toBeNull();
      renderer.render(m1WithICs());
      const layout = renderer.getLastLayout();
      expect(layout).not.toBeNull();
      expect(layout!.nodes.length).toBeGreaterThan(0);
      renderer.destroy();
      document.body.removeChild(container);
    });
  });
});
