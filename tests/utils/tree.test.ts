import { describe, it, expect } from 'vitest';
import { OrgNode } from '../../src/types';
import {
  findNodeById,
  findParent,
  cloneTree,
  filterVisibleTree,
  flattenTree,
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
