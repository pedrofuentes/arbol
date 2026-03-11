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
  it('returns full tree when nothing is collapsed', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree, new Set());
    expect(flattenTree(filtered)).toHaveLength(5);
  });

  it('excludes children of collapsed nodes', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree, new Set(['b']));
    const nodes = flattenTree(filtered);
    expect(nodes.map(n => n.id)).toEqual(['root', 'b', 'c']);
  });

  it('does not mutate the original tree', () => {
    const tree = makeTree();
    filterVisibleTree(tree, new Set(['b']));
    expect(flattenTree(tree)).toHaveLength(5);
  });
});

describe('flattenTree', () => {
  it('flattens all nodes in pre-order', () => {
    const tree = makeTree();
    const flat = flattenTree(tree);
    expect(flat.map(n => n.id)).toEqual(['root', 'b', 'd', 'e', 'c']);
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
      id: 'm1', name: 'M', title: 'Manager', children: [
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
});

describe('stripM1Children', () => {
  it('removes IC children from M1 nodes and puts them in icMap', () => {
    const tree: OrgNode = {
      id: 'root', name: 'CEO', title: 'CEO', children: [
        { id: 'm1', name: 'Mgr', title: 'M1', children: [
          { id: 'ic1', name: 'IC1', title: 'Eng' },
          { id: 'ic2', name: 'IC2', title: 'Eng' },
        ]},
        { id: 'dir', name: 'Dir', title: 'Director' },
      ],
    };
    const { layoutTree, icMap, palMap } = stripM1Children(tree, new Set());
    expect(flattenTree(layoutTree).map(n => n.id)).toEqual(['root', 'm1']);
    expect(icMap.has('m1')).toBe(true);
    expect(icMap.get('m1')!.map(n => n.id)).toEqual(['ic1', 'ic2']);
    // dir is a PAL (leaf under non-M1 root)
    expect(palMap.has('root')).toBe(true);
    expect(palMap.get('root')!.map(n => n.id)).toEqual(['dir']);
  });

  it('strips children from M1 nodes in complex tree', () => {
    const tree = makeTree();
    const { layoutTree, icMap } = stripM1Children(tree, new Set());
    const bob = findNodeById(layoutTree, 'b')!;
    expect(bob.children).toBeUndefined();
    expect(icMap.has('b')).toBe(true);
    expect(icMap.get('b')!.map(n => n.id)).toEqual(['d', 'e']);
  });

  it('separates PALs from manager children', () => {
    const tree: OrgNode = {
      id: 'root', name: 'CEO', title: 'CEO', children: [
        { id: 'pal1', name: 'PAL1', title: 'PAL' },
        { id: 'pal2', name: 'PAL2', title: 'PAL' },
        { id: 'm1', name: 'Mgr', title: 'M1', children: [
          { id: 'ic1', name: 'IC1', title: 'Eng' },
        ]},
      ],
    };
    const { layoutTree, icMap, palMap } = stripM1Children(tree, new Set());
    expect(flattenTree(layoutTree).map(n => n.id)).toEqual(['root', 'm1']);
    expect(palMap.get('root')!.map(n => n.id)).toEqual(['pal1', 'pal2']);
    expect(icMap.get('m1')!.map(n => n.id)).toEqual(['ic1']);
  });

  it('respects collapsed nodes', () => {
    const tree: OrgNode = {
      id: 'root', name: 'CEO', title: 'CEO', children: [
        { id: 'm1', name: 'Mgr', title: 'M1', children: [
          { id: 'ic1', name: 'IC1', title: 'Eng' },
        ]},
      ],
    };
    const { layoutTree, icMap } = stripM1Children(tree, new Set(['m1']));
    expect(icMap.has('m1')).toBe(false);
    expect(findNodeById(layoutTree, 'm1')!.children).toBeUndefined();
  });
});
