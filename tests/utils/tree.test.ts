import { describe, it, expect } from 'vitest';
import { OrgNode } from '../../src/types';
import {
  findNodeById,
  findParent,
  cloneTree,
  filterVisibleTree,
  flattenTree,
  isLeaf,
  isM1,
  stripM1Children,
  countLeaves,
  countDescendants,
  managerLevel,
  countManagersByLevel,
  avgSpanOfControl,
} from '../../src/utils/tree';

function makeTree(): OrgNode {
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
          { id: 'e', name: 'Eve', title: 'Engineer' },
        ],
      },
      {
        id: 'c',
        name: 'Carol',
        title: 'CFO',
      },
    ],
  };
}

describe('findNodeById', () => {
  it('finds the root node', () => {
    const tree = makeTree();
    expect(findNodeById(tree, 'root')).toBe(tree);
  });

  it('finds a deeply nested node', () => {
    const tree = makeTree();
    const found = findNodeById(tree, 'e');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Eve');
  });

  it('returns null for non-existent id', () => {
    const tree = makeTree();
    expect(findNodeById(tree, 'zzz')).toBeNull();
  });
});

describe('findParent', () => {
  it('returns null for the root node', () => {
    const tree = makeTree();
    expect(findParent(tree, 'root')).toBeNull();
  });

  it('finds the parent of a direct child', () => {
    const tree = makeTree();
    const parent = findParent(tree, 'b');
    expect(parent).not.toBeNull();
    expect(parent!.id).toBe('root');
  });

  it('finds the parent of a deep node', () => {
    const tree = makeTree();
    const parent = findParent(tree, 'e');
    expect(parent).not.toBeNull();
    expect(parent!.id).toBe('b');
  });

  it('returns null for non-existent id', () => {
    const tree = makeTree();
    expect(findParent(tree, 'zzz')).toBeNull();
  });
});

describe('cloneTree', () => {
  it('creates a deep copy', () => {
    const tree = makeTree();
    const clone = cloneTree(tree);
    expect(clone).toEqual(tree);
    expect(clone).not.toBe(tree);
  });

  it('mutations to clone do not affect original', () => {
    const tree = makeTree();
    const clone = cloneTree(tree);
    clone.name = 'CHANGED';
    expect(tree.name).toBe('Alice');
  });
});

describe('filterVisibleTree', () => {
  it('returns a clone of the full tree', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree);
    expect(flattenTree(filtered)).toHaveLength(5);
  });

  it('does not mutate the original tree', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree);
    filtered.name = 'CHANGED';
    expect(tree.name).toBe('Alice');
  });
});

describe('flattenTree', () => {
  it('flattens all nodes in pre-order', () => {
    const tree = makeTree();
    const flat = flattenTree(tree);
    expect(flat.map((n) => n.id)).toEqual(['root', 'b', 'd', 'e', 'c']);
  });

  it('handles a single node', () => {
    const node: OrgNode = { id: '1', name: 'Solo', title: 'Only' };
    expect(flattenTree(node)).toHaveLength(1);
  });
});

describe('isLeaf', () => {
  it('returns true for a node with no children', () => {
    expect(isLeaf({ id: '1', name: 'A', title: 'T' })).toBe(true);
  });

  it('returns true for a node with empty children array', () => {
    expect(isLeaf({ id: '1', name: 'A', title: 'T', children: [] })).toBe(true);
  });

  it('returns false for a node with children', () => {
    const tree = makeTree();
    expect(isLeaf(tree)).toBe(false);
  });
});

describe('isM1', () => {
  it('returns true when all children are leaf nodes', () => {
    const m1: OrgNode = {
      id: 'm1',
      name: 'M',
      title: 'Manager',
      children: [
        { id: 'ic1', name: 'IC1', title: 'Eng' },
        { id: 'ic2', name: 'IC2', title: 'Eng' },
      ],
    };
    expect(isM1(m1)).toBe(true);
  });

  it('returns false when a child has children', () => {
    const tree = makeTree();
    expect(isM1(tree)).toBe(false);
  });

  it('returns false for a leaf node', () => {
    expect(isM1({ id: '1', name: 'A', title: 'T' })).toBe(false);
  });

  it('returns true for manager with exactly 1 leaf child', () => {
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Mgr',
      children: [{ id: 'ic', name: 'IC', title: 'Eng' }],
    };
    expect(isM1(node)).toBe(true);
  });

  it('returns false for manager with exactly 1 non-leaf child', () => {
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Mgr',
      children: [
        {
          id: 'sub',
          name: 'Sub',
          title: 'Sub',
          children: [{ id: 'ic', name: 'IC', title: 'Eng' }],
        },
      ],
    };
    expect(isM1(node)).toBe(false);
  });

  it('returns false for node with no children (undefined)', () => {
    expect(isM1({ id: '1', name: 'A', title: 'T' })).toBe(false);
  });

  it('returns false for node with empty children array', () => {
    expect(isM1({ id: '1', name: 'A', title: 'T', children: [] })).toBe(false);
  });

  it('returns false when one child among many has children', () => {
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Mgr',
      children: [
        { id: 'ic1', name: 'IC1', title: 'Eng' },
        { id: 'ic2', name: 'IC2', title: 'Eng' },
        {
          id: 'sub',
          name: 'Sub',
          title: 'Sub',
          children: [{ id: 'ic3', name: 'IC3', title: 'Eng' }],
        },
      ],
    };
    expect(isM1(node)).toBe(false);
  });

  it('converts from M1 to regular when a grandchild is added', () => {
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Mgr',
      children: [
        { id: 'ic1', name: 'IC1', title: 'Eng' },
        { id: 'ic2', name: 'IC2', title: 'Eng' },
      ],
    };
    expect(isM1(node)).toBe(true);
    // Add a grandchild under ic1 → ic1 is no longer a leaf
    node.children![0].children = [{ id: 'gc', name: 'GC', title: 'Jr' }];
    expect(isM1(node)).toBe(false);
  });

  it('converts from regular to M1 when all grandchildren are removed', () => {
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Mgr',
      children: [
        {
          id: 'sub',
          name: 'Sub',
          title: 'Sub',
          children: [{ id: 'gc', name: 'GC', title: 'Jr' }],
        },
        { id: 'ic', name: 'IC', title: 'Eng' },
      ],
    };
    expect(isM1(node)).toBe(false);
    // Remove grandchild → sub becomes a leaf
    node.children![0].children = [];
    expect(isM1(node)).toBe(true);
  });

  it('returns true for root node with only leaf children', () => {
    const root: OrgNode = {
      id: 'root',
      name: 'CEO',
      title: 'CEO',
      children: [
        { id: 'a', name: 'A', title: 'IC' },
        { id: 'b', name: 'B', title: 'IC' },
        { id: 'c', name: 'C', title: 'IC' },
      ],
    };
    expect(isM1(root)).toBe(true);
  });

  it('checks only direct children, not deeper descendants', () => {
    // m has 2 children that are both non-leaf (managers), so m is not M1
    // Even though the grandchildren (ic1, ic2) are leaves
    const node: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'VP',
      children: [
        {
          id: 'sub1',
          name: 'Sub1',
          title: 'Dir',
          children: [{ id: 'ic1', name: 'IC1', title: 'Eng' }],
        },
        {
          id: 'sub2',
          name: 'Sub2',
          title: 'Dir',
          children: [{ id: 'ic2', name: 'IC2', title: 'Eng' }],
        },
      ],
    };
    expect(isM1(node)).toBe(false);
    // But the direct children (sub1, sub2) ARE M1
    expect(isM1(node.children![0])).toBe(true);
    expect(isM1(node.children![1])).toBe(true);
  });
});

describe('manager counting via flattenTree + isLeaf', () => {
  it('counts managers in a mixed tree', () => {
    const tree = makeTree();
    const all = flattenTree(tree);
    const managers = all.filter((n) => !isLeaf(n));
    expect(all).toHaveLength(5);
    expect(managers).toHaveLength(2); // root (Alice) and Bob
    expect(managers.map((n) => n.id)).toEqual(['root', 'b']);
  });

  it('returns zero managers for a single leaf node', () => {
    const node: OrgNode = { id: '1', name: 'Solo', title: 'Only' };
    const managers = flattenTree(node).filter((n) => !isLeaf(n));
    expect(managers).toHaveLength(0);
  });

  it('counts root as a manager when it has children', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'Boss',
      title: 'CEO',
      children: [{ id: 'a', name: 'A', title: 'IC' }],
    };
    const managers = flattenTree(tree).filter((n) => !isLeaf(n));
    expect(managers).toHaveLength(1);
    expect(managers[0].id).toBe('root');
  });
});

describe('stripM1Children', () => {
  it('removes IC children from M1 nodes and puts them in icMap', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'CEO',
      title: 'CEO',
      children: [
        {
          id: 'm1',
          name: 'Mgr',
          title: 'M1',
          children: [
            { id: 'ic1', name: 'IC1', title: 'Eng' },
            { id: 'ic2', name: 'IC2', title: 'Eng' },
          ],
        },
        { id: 'dir', name: 'Dir', title: 'Director' },
      ],
    };
    const { layoutTree, icMap, palMap } = stripM1Children(tree);
    expect(flattenTree(layoutTree).map((n) => n.id)).toEqual(['root', 'm1']);
    expect(icMap.has('m1')).toBe(true);
    expect(icMap.get('m1')!.map((n) => n.id)).toEqual(['ic1', 'ic2']);
    // dir is an Advisor (leaf under non-M1 root)
    expect(palMap.has('root')).toBe(true);
    expect(palMap.get('root')!.map((n) => n.id)).toEqual(['dir']);
  });

  it('strips children from M1 nodes in complex tree', () => {
    const tree = makeTree();
    const { layoutTree, icMap } = stripM1Children(tree);
    const bob = findNodeById(layoutTree, 'b')!;
    expect(bob.children).toBeUndefined();
    expect(icMap.has('b')).toBe(true);
    expect(icMap.get('b')!.map((n) => n.id)).toEqual(['d', 'e']);
  });

  it('separates Advisors from manager children', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'CEO',
      title: 'CEO',
      children: [
        { id: 'pal1', name: 'Advisor1', title: 'Advisor' },
        { id: 'pal2', name: 'Advisor2', title: 'Advisor' },
        {
          id: 'm1',
          name: 'Mgr',
          title: 'M1',
          children: [{ id: 'ic1', name: 'IC1', title: 'Eng' }],
        },
      ],
    };
    const { layoutTree, icMap, palMap } = stripM1Children(tree);
    expect(flattenTree(layoutTree).map((n) => n.id)).toEqual(['root', 'm1']);
    expect(palMap.get('root')!.map((n) => n.id)).toEqual(['pal1', 'pal2']);
    expect(icMap.get('m1')!.map((n) => n.id)).toEqual(['ic1']);
  });
});

describe('countLeaves', () => {
  it('counts leaf nodes in a mixed tree', () => {
    const tree = makeTree(); // root→[Bob→[Diana,Eve], Carol]
    expect(countLeaves(tree)).toBe(3); // Diana, Eve, Carol
  });

  it('returns 1 for a single leaf node', () => {
    expect(countLeaves({ id: '1', name: 'Solo', title: 'Only' })).toBe(1);
  });

  it('returns 0 leaves for a tree where every node has children', () => {
    const tree: OrgNode = {
      id: 'a',
      name: 'A',
      title: 'A',
      children: [
        { id: 'b', name: 'B', title: 'B', children: [{ id: 'c', name: 'C', title: 'C' }] },
      ],
    };
    expect(countLeaves(tree)).toBe(1); // only C is a leaf
  });
});

describe('managerLevel', () => {
  it('returns 0 for a leaf node', () => {
    expect(managerLevel({ id: '1', name: 'A', title: 'IC' })).toBe(0);
  });

  it('returns 1 (M1) for a manager with only IC children', () => {
    const m1: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'M',
      children: [
        { id: 'a', name: 'A', title: 'IC' },
        { id: 'b', name: 'B', title: 'IC' },
      ],
    };
    expect(managerLevel(m1)).toBe(1);
  });

  it('returns 2 (M2) for a manager with M1 children', () => {
    const tree = makeTree(); // root→[Bob(M1)→[Diana,Eve], Carol(leaf)]
    expect(managerLevel(tree)).toBe(2); // root is M2 (has Bob who is M1)
  });

  it('returns 3 (M3) for a manager with M2 children', () => {
    const tree: OrgNode = {
      id: 'ceo',
      name: 'CEO',
      title: 'CEO',
      children: [
        {
          id: 'vp',
          name: 'VP',
          title: 'VP',
          children: [
            {
              id: 'dir',
              name: 'Dir',
              title: 'Dir',
              children: [{ id: 'ic', name: 'IC', title: 'Eng' }],
            },
          ],
        },
      ],
    };
    expect(managerLevel(tree)).toBe(3); // CEO→VP(M2)→Dir(M1)→IC
  });
});

describe('countManagersByLevel', () => {
  it('counts M1 and M2 in a mixed tree', () => {
    const tree = makeTree(); // root(M2)→[Bob(M1)→[Diana,Eve], Carol(leaf)]
    const levels = countManagersByLevel(tree);
    expect(levels.get(1)).toBe(1); // Bob is M1
    expect(levels.get(2)).toBe(1); // root is M2
  });

  it('returns empty map for a single node', () => {
    const node: OrgNode = { id: '1', name: 'Solo', title: 'Only' };
    const levels = countManagersByLevel(node);
    expect(levels.size).toBe(0);
  });

  it('counts multiple levels in a deep tree', () => {
    const tree: OrgNode = {
      id: 'ceo',
      name: 'CEO',
      title: 'CEO',
      children: [
        {
          id: 'vp1',
          name: 'VP1',
          title: 'VP',
          children: [
            {
              id: 'dir1',
              name: 'Dir1',
              title: 'Dir',
              children: [{ id: 'ic1', name: 'IC1', title: 'Eng' }],
            },
            {
              id: 'dir2',
              name: 'Dir2',
              title: 'Dir',
              children: [{ id: 'ic2', name: 'IC2', title: 'Eng' }],
            },
          ],
        },
        {
          id: 'vp2',
          name: 'VP2',
          title: 'VP',
          children: [{ id: 'ic3', name: 'IC3', title: 'Eng' }],
        },
        { id: 'pal', name: 'Advisor', title: 'Advisor' },
      ],
    };
    const levels = countManagersByLevel(tree);
    // dir1, dir2 are M1 (only ICs); vp2 is M1 (only ICs)
    expect(levels.get(1)).toBe(3); // dir1, dir2, vp2
    // vp1 is M2 (has M1 children)
    expect(levels.get(2)).toBe(1); // vp1
    // ceo is M3 (has M2 child vp1)
    expect(levels.get(3)).toBe(1); // ceo
  });

  it('returns only M1 when root has only leaf children', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'R',
      title: 'R',
      children: [
        { id: 'a', name: 'A', title: 'IC' },
        { id: 'b', name: 'B', title: 'IC' },
      ],
    };
    const levels = countManagersByLevel(tree);
    expect(levels.get(1)).toBe(1); // root is M1
    expect(levels.size).toBe(1);
  });
});

describe('countDescendants', () => {
  it('returns 0 for a leaf node', () => {
    expect(countDescendants({ id: '1', name: 'Solo', title: 'Only' })).toBe(0);
  });

  it('returns 0 for a node with empty children array', () => {
    expect(countDescendants({ id: '1', name: 'A', title: 'T', children: [] })).toBe(0);
  });

  it('counts all descendants in a mixed tree', () => {
    const tree = makeTree(); // root→[Bob→[Diana,Eve], Carol] = 4 descendants
    expect(countDescendants(tree)).toBe(4);
  });

  it('counts direct children for an M1 manager', () => {
    const m1: OrgNode = {
      id: 'm',
      name: 'M',
      title: 'Manager',
      children: [
        { id: 'a', name: 'A', title: 'IC' },
        { id: 'b', name: 'B', title: 'IC' },
      ],
    };
    expect(countDescendants(m1)).toBe(2);
  });

  it('counts all levels in a deep chain', () => {
    const tree: OrgNode = {
      id: 'a',
      name: 'A',
      title: 'A',
      children: [
        {
          id: 'b',
          name: 'B',
          title: 'B',
          children: [
            {
              id: 'c',
              name: 'C',
              title: 'C',
              children: [{ id: 'd', name: 'D', title: 'D' }],
            },
          ],
        },
      ],
    };
    expect(countDescendants(tree)).toBe(3);
  });
});

describe('avgSpanOfControl', () => {
  it('returns 0 for a leaf node', () => {
    const leaf: OrgNode = { id: '1', name: 'A', title: 'T' };
    expect(avgSpanOfControl(leaf)).toBe(0);
  });

  it('returns direct reports count for a single manager', () => {
    const root: OrgNode = {
      id: '1', name: 'A', title: 'T',
      children: [
        { id: '2', name: 'B', title: 'T' },
        { id: '3', name: 'C', title: 'T' },
        { id: '4', name: 'D', title: 'T' },
      ],
    };
    expect(avgSpanOfControl(root)).toBe(3);
  });

  it('returns average across multiple managers', () => {
    const root: OrgNode = {
      id: '1', name: 'CEO', title: 'T',
      children: [
        {
          id: '2', name: 'VP1', title: 'T',
          children: [
            { id: '4', name: 'IC1', title: 'T' },
            { id: '5', name: 'IC2', title: 'T' },
          ],
        },
        {
          id: '3', name: 'VP2', title: 'T',
          children: [
            { id: '6', name: 'IC3', title: 'T' },
            { id: '7', name: 'IC4', title: 'T' },
            { id: '8', name: 'IC5', title: 'T' },
            { id: '9', name: 'IC6', title: 'T' },
          ],
        },
      ],
    };
    // CEO has 2 reports, VP1 has 2, VP2 has 4 → total 8 / 3 managers ≈ 2.667
    expect(avgSpanOfControl(root)).toBeCloseTo(2.667, 2);
  });
});
