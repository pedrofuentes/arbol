import { describe, it, expect } from 'vitest';
import {
  makeTree,
  makeShallowTree,
  makeM1Tree,
  makeAdvisorTree,
  makeDeepTree,
  makeWideTree,
  makeCategories,
  makeChart,
  makeVersion,
} from './factories';
import { isM1, isLeaf } from '../../src/utils/tree';

describe('makeTree', () => {
  it('returns a valid 3-level OrgNode', () => {
    const tree = makeTree();
    expect(tree.id).toBe('root');
    expect(tree.name).toBe('Alice');
    expect(tree.title).toBe('CEO');
    expect(tree.children).toHaveLength(2);
    expect(tree.children![0].children).toHaveLength(2);
  });

  it('applies overrides to the root', () => {
    const tree = makeTree({ name: 'Overridden', title: 'Boss' });
    expect(tree.name).toBe('Overridden');
    expect(tree.title).toBe('Boss');
    expect(tree.id).toBe('root');
    expect(tree.children).toHaveLength(2);
  });

  it('returns a fresh copy on each call', () => {
    const a = makeTree();
    const b = makeTree();
    expect(a).not.toBe(b);
    a.name = 'Modified';
    expect(b.name).toBe('Alice');
  });
});

describe('makeShallowTree', () => {
  it('returns a 2-level tree with no grandchildren', () => {
    const tree = makeShallowTree();
    expect(tree.children).toHaveLength(2);
    for (const child of tree.children!) {
      expect(child.children).toBeUndefined();
    }
  });

  it('applies overrides', () => {
    const tree = makeShallowTree({ name: 'Boss' });
    expect(tree.name).toBe('Boss');
  });
});

describe('makeM1Tree', () => {
  it('satisfies isM1() check', () => {
    const tree = makeM1Tree();
    expect(isM1(tree)).toBe(true);
  });

  it('has all leaf children', () => {
    const tree = makeM1Tree();
    for (const child of tree.children!) {
      expect(isLeaf(child)).toBe(true);
    }
  });

  it('applies overrides', () => {
    const tree = makeM1Tree({ name: 'Lead' });
    expect(tree.name).toBe('Lead');
    expect(isM1(tree)).toBe(true);
  });
});

describe('makeAdvisorTree', () => {
  it('is NOT an M1 (has a mix of leaf and non-leaf children)', () => {
    const tree = makeAdvisorTree();
    expect(isM1(tree)).toBe(false);
  });

  it('has at least one leaf and one non-leaf child', () => {
    const tree = makeAdvisorTree();
    const leaves = tree.children!.filter(isLeaf);
    const nonLeaves = tree.children!.filter((c) => !isLeaf(c));
    expect(leaves.length).toBeGreaterThanOrEqual(1);
    expect(nonLeaves.length).toBeGreaterThanOrEqual(1);
  });
});

describe('makeDeepTree', () => {
  it('creates a tree with the specified depth', () => {
    const tree = makeDeepTree(5);
    let depth = 0;
    let node = tree;
    while (node.children && node.children.length > 0) {
      depth++;
      node = node.children[0];
    }
    expect(depth).toBe(4); // 5 levels = 4 edges
  });

  it('handles depth of 1 (single node)', () => {
    const tree = makeDeepTree(1);
    expect(tree.children).toBeUndefined();
  });

  it('applies overrides to root', () => {
    const tree = makeDeepTree(3, { name: 'Top' });
    expect(tree.name).toBe('Top');
  });

  it('uses deterministic IDs', () => {
    const tree = makeDeepTree(3);
    expect(tree.id).toBe('deep-0');
    expect(tree.children![0].id).toBe('deep-1');
    expect(tree.children![0].children![0].id).toBe('deep-2');
  });
});

describe('makeWideTree', () => {
  it('creates a tree with the specified number of children', () => {
    const tree = makeWideTree(10);
    expect(tree.children).toHaveLength(10);
  });

  it('all children are leaves', () => {
    const tree = makeWideTree(5);
    for (const child of tree.children!) {
      expect(isLeaf(child)).toBe(true);
    }
  });

  it('is an M1 tree by definition', () => {
    const tree = makeWideTree(3);
    expect(isM1(tree)).toBe(true);
  });
});

describe('makeCategories', () => {
  it('returns an array of ColorCategory objects', () => {
    const cats = makeCategories();
    expect(cats).toHaveLength(2);
    for (const cat of cats) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('color');
    }
  });

  it('returns a fresh copy on each call', () => {
    const a = makeCategories();
    const b = makeCategories();
    expect(a).not.toBe(b);
  });
});

describe('makeChart', () => {
  it('returns a valid ChartRecord with all required fields', () => {
    const chart = makeChart();
    expect(chart.id).toBe('chart-id-1');
    expect(chart.name).toBe('My Org Chart');
    expect(chart.createdAt).toBeTruthy();
    expect(chart.updatedAt).toBeTruthy();
    expect(chart.workingTree).toBeDefined();
    expect(chart.categories).toBeDefined();
  });

  it('applies overrides', () => {
    const chart = makeChart({ name: 'Custom Chart', id: 'custom-1' });
    expect(chart.name).toBe('Custom Chart');
    expect(chart.id).toBe('custom-1');
    expect(chart.workingTree).toBeDefined();
  });

  it('embeds a tree from makeTree', () => {
    const chart = makeChart();
    expect(chart.workingTree.id).toBe('root');
    expect(chart.workingTree.children).toHaveLength(2);
  });
});

describe('makeVersion', () => {
  it('returns a valid VersionRecord', () => {
    const version = makeVersion();
    expect(version.id).toBe('version-id-1');
    expect(version.chartId).toBe('chart-id-1');
    expect(version.name).toBe('Q1 Snapshot');
    expect(version.createdAt).toBeTruthy();
    expect(version.tree).toBeDefined();
  });

  it('applies overrides', () => {
    const version = makeVersion({ name: 'v2', chartId: 'chart-2' });
    expect(version.name).toBe('v2');
    expect(version.chartId).toBe('chart-2');
  });
});
