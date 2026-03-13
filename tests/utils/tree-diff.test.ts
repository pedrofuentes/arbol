import { describe, it, expect } from 'vitest';
import { compareTrees, buildMergedTree, getDiffStats } from '../../src/utils/tree-diff';
import { OrgNode } from '../../src/types';
import { flattenTree, findNodeById } from '../../src/utils/tree';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'mgr-a',
        name: 'Bob',
        title: 'VP Engineering',
        children: [
          { id: 'ic-1', name: 'Diana', title: 'Engineer' },
          { id: 'ic-2', name: 'Eve', title: 'Engineer' },
        ],
      },
      {
        id: 'mgr-b',
        name: 'Carol',
        title: 'VP Sales',
        children: [
          { id: 'ic-3', name: 'Frank', title: 'Sales Rep' },
        ],
      },
    ],
  };
}

describe('compareTrees', () => {
  it('marks all nodes as unchanged for identical trees', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    const diff = compareTrees(oldTree, newTree);

    expect(diff.size).toBe(6);
    for (const entry of diff.values()) {
      expect(entry.status).toBe('unchanged');
    }
  });

  it('detects an added child node', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![1].children!.push({ id: 'ic-4', name: 'Grace', title: 'Sales Rep' });

    const diff = compareTrees(oldTree, newTree);

    expect(diff.size).toBe(7);
    expect(diff.get('ic-4')!.status).toBe('added');
    expect(diff.get('ic-4')!.newParentId).toBe('mgr-b');
  });

  it('detects a removed leaf node', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-2');

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('ic-2')!.status).toBe('removed');
    expect(diff.get('ic-2')!.oldParentId).toBe('mgr-a');
  });

  it('detects a node moved to a different parent', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    // Move ic-1 from mgr-a to mgr-b
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-1');
    newTree.children![1].children!.push({ id: 'ic-1', name: 'Diana', title: 'Engineer' });

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('ic-1')!.status).toBe('moved');
    expect(diff.get('ic-1')!.oldParentId).toBe('mgr-a');
    expect(diff.get('ic-1')!.newParentId).toBe('mgr-b');
  });

  it('detects a node name change as modified', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].name = 'Robert';

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-a')!.status).toBe('modified');
    expect(diff.get('mgr-a')!.oldName).toBe('Bob');
    expect(diff.get('mgr-a')!.oldTitle).toBeUndefined();
  });

  it('detects a node title change as modified', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].title = 'CTO';

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-a')!.status).toBe('modified');
    expect(diff.get('mgr-a')!.oldTitle).toBe('VP Engineering');
    expect(diff.get('mgr-a')!.oldName).toBeUndefined();
  });

  it('detects a categoryId change as modified', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    oldTree.children![0].categoryId = 'cat-old';
    newTree.children![0].categoryId = 'cat-new';

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-a')!.status).toBe('modified');
    expect(diff.get('mgr-a')!.oldCategoryId).toBe('cat-old');
  });

  it('marks moved node with field changes as moved and records old fields', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    // Move ic-1 from mgr-a to mgr-b AND change name + title
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-1');
    newTree.children![1].children!.push({ id: 'ic-1', name: 'Diana Updated', title: 'Senior Engineer' });

    const diff = compareTrees(oldTree, newTree);

    const entry = diff.get('ic-1')!;
    expect(entry.status).toBe('moved');
    expect(entry.oldParentId).toBe('mgr-a');
    expect(entry.newParentId).toBe('mgr-b');
    expect(entry.oldName).toBe('Diana');
    expect(entry.oldTitle).toBe('Engineer');
  });

  it('handles multiple simultaneous changes', () => {
    const oldTree = makeTree();
    const newTree = makeTree();

    // Add a new node
    newTree.children![1].children!.push({ id: 'ic-new', name: 'New Person', title: 'Intern' });
    // Remove a node
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-2');
    // Modify a node
    newTree.children![0].name = 'Robert';
    // Move a node
    const movedNode = newTree.children![1].children!.find(c => c.id === 'ic-3')!;
    newTree.children![1].children = newTree.children![1].children!.filter(c => c.id !== 'ic-3');
    newTree.children![0].children!.push(movedNode);

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('ic-new')!.status).toBe('added');
    expect(diff.get('ic-2')!.status).toBe('removed');
    expect(diff.get('mgr-a')!.status).toBe('modified');
    expect(diff.get('ic-3')!.status).toBe('moved');
    expect(diff.get('ic-3')!.oldParentId).toBe('mgr-b');
    expect(diff.get('ic-3')!.newParentId).toBe('mgr-a');
  });

  it('detects root node name/title changes as modified', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.name = 'Alice Smith';
    newTree.title = 'Chairperson';

    const diff = compareTrees(oldTree, newTree);

    const entry = diff.get('root')!;
    expect(entry.status).toBe('modified');
    expect(entry.oldName).toBe('Alice');
    expect(entry.oldTitle).toBe('CEO');
    expect(entry.oldParentId).toBeUndefined();
    expect(entry.newParentId).toBeUndefined();
  });

  it('detects deep nested changes (3+ levels)', () => {
    const oldTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'l1',
          name: 'Level 1',
          title: 'VP',
          children: [
            {
              id: 'l2',
              name: 'Level 2',
              title: 'Director',
              children: [
                { id: 'l3', name: 'Level 3', title: 'Manager' },
              ],
            },
          ],
        },
      ],
    };
    const newTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'l1',
          name: 'Level 1',
          title: 'VP',
          children: [
            {
              id: 'l2',
              name: 'Level 2',
              title: 'Director',
              children: [
                { id: 'l3', name: 'Level 3 Updated', title: 'Senior Manager' },
              ],
            },
          ],
        },
      ],
    };

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('l3')!.status).toBe('modified');
    expect(diff.get('l3')!.oldName).toBe('Level 3');
    expect(diff.get('l3')!.oldTitle).toBe('Manager');
    expect(diff.get('root')!.status).toBe('unchanged');
    expect(diff.get('l1')!.status).toBe('unchanged');
    expect(diff.get('l2')!.status).toBe('unchanged');
  });

  it('detects an entire added subtree', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children!.push({
      id: 'mgr-c',
      name: 'Hank',
      title: 'VP Marketing',
      children: [
        { id: 'ic-5', name: 'Ivy', title: 'Designer' },
        { id: 'ic-6', name: 'Jake', title: 'Writer' },
      ],
    });

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-c')!.status).toBe('added');
    expect(diff.get('mgr-c')!.newParentId).toBe('root');
    expect(diff.get('ic-5')!.status).toBe('added');
    expect(diff.get('ic-5')!.newParentId).toBe('mgr-c');
    expect(diff.get('ic-6')!.status).toBe('added');
    expect(diff.get('ic-6')!.newParentId).toBe('mgr-c');
  });

  it('detects an entire removed subtree', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children = newTree.children!.filter(c => c.id !== 'mgr-a');

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-a')!.status).toBe('removed');
    expect(diff.get('mgr-a')!.oldParentId).toBe('root');
    expect(diff.get('ic-1')!.status).toBe('removed');
    expect(diff.get('ic-1')!.oldParentId).toBe('mgr-a');
    expect(diff.get('ic-2')!.status).toBe('removed');
    expect(diff.get('ic-2')!.oldParentId).toBe('mgr-a');
  });

  it('handles single-node trees (root only)', () => {
    const oldTree: OrgNode = { id: 'root', name: 'Solo', title: 'CEO' };
    const newTree: OrgNode = { id: 'root', name: 'Solo', title: 'CEO' };

    const diff = compareTrees(oldTree, newTree);

    expect(diff.size).toBe(1);
    expect(diff.get('root')!.status).toBe('unchanged');
  });

  it('detects parent unchanged when only its children change', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].children![0].name = 'Diana Updated';

    const diff = compareTrees(oldTree, newTree);

    expect(diff.get('mgr-a')!.status).toBe('unchanged');
    expect(diff.get('ic-1')!.status).toBe('modified');
    expect(diff.get('ic-1')!.oldName).toBe('Diana');
  });
});

describe('buildMergedTree', () => {
  it('returns new tree clone when no nodes were removed', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].name = 'Robert';
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    expect(merged.children![0].name).toBe('Robert');
    expect(flattenTree(merged).length).toBe(flattenTree(newTree).length);
    // Must be a separate clone, not the same reference
    expect(merged).not.toBe(newTree);
  });

  it('injects a removed leaf node under its old parent', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-2');
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    const mgrA = findNodeById(merged, 'mgr-a')!;
    expect(mgrA.children!.some(c => c.id === 'ic-2')).toBe(true);
    expect(findNodeById(merged, 'ic-2')!.name).toBe('Eve');
  });

  it('injects removed node correctly when parent still exists', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![1].children = [];
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    const mgrB = findNodeById(merged, 'mgr-b')!;
    expect(mgrB.children!.length).toBe(1);
    expect(mgrB.children![0].id).toBe('ic-3');
  });

  it('injects removed node under nearest surviving ancestor when parent also removed', () => {
    const oldTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'mgr',
          name: 'Manager',
          title: 'VP',
          children: [
            { id: 'ic', name: 'IC', title: 'Engineer' },
          ],
        },
      ],
    };
    const newTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
    };
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    // mgr injected under root (parent exists), then ic injected under mgr (just injected)
    expect(merged.children!.some(c => c.id === 'mgr')).toBe(true);
    const mgr = findNodeById(merged, 'mgr')!;
    expect(mgr.children!.some(c => c.id === 'ic')).toBe(true);
  });

  it('injects multiple removed nodes under the same parent', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].children = [];
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    const mgrA = findNodeById(merged, 'mgr-a')!;
    expect(mgrA.children!.length).toBe(2);
    const childIds = mgrA.children!.map(c => c.id);
    expect(childIds).toContain('ic-1');
    expect(childIds).toContain('ic-2');
  });

  it('handles chain of removed nodes with correct nesting', () => {
    const oldTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'l1',
          name: 'L1',
          title: 'VP',
          children: [
            {
              id: 'l2',
              name: 'L2',
              title: 'Dir',
              children: [
                { id: 'l3', name: 'L3', title: 'Mgr' },
              ],
            },
          ],
        },
        { id: 'other', name: 'Other', title: 'VP2' },
      ],
    };
    const newTree: OrgNode = {
      id: 'root',
      name: 'Root',
      title: 'CEO',
      children: [
        { id: 'other', name: 'Other', title: 'VP2' },
      ],
    };
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    // l1 → under root, l2 → under l1, l3 → under l2
    expect(merged.children!.some(c => c.id === 'l1')).toBe(true);
    const l1 = findNodeById(merged, 'l1')!;
    expect(l1.children!.some(c => c.id === 'l2')).toBe(true);
    const l2 = findNodeById(merged, 'l2')!;
    expect(l2.children!.some(c => c.id === 'l3')).toBe(true);
  });

  it('does not duplicate nodes that exist in the new tree', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-2');
    const diff = compareTrees(oldTree, newTree);

    const merged = buildMergedTree(oldTree, newTree, diff);

    const allNodes = flattenTree(merged);
    const ic1Count = allNodes.filter(n => n.id === 'ic-1').length;
    expect(ic1Count).toBe(1);
    // 5 from new tree + 1 re-injected removed node
    expect(allNodes.length).toBe(6);
  });
});

describe('getDiffStats', () => {
  it('returns correct counts for each status', () => {
    const oldTree = makeTree();
    const newTree = makeTree();
    // Add one
    newTree.children![1].children!.push({ id: 'new-1', name: 'New', title: 'New' });
    // Remove one
    newTree.children![0].children = newTree.children![0].children!.filter(c => c.id !== 'ic-2');
    // Modify one
    newTree.children![0].name = 'Robert';

    const diff = compareTrees(oldTree, newTree);
    const stats = getDiffStats(diff);

    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
    expect(stats.modified).toBe(1);
    expect(stats.unchanged).toBe(4);
    expect(stats.moved).toBe(0);
  });

  it('returns all zeros for empty diff', () => {
    const diff = new Map();
    const stats = getDiffStats(diff);

    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
    expect(stats.moved).toBe(0);
    expect(stats.modified).toBe(0);
    expect(stats.unchanged).toBe(0);
  });

  it('counts only unchanged for identical trees', () => {
    const tree = makeTree();
    const diff = compareTrees(tree, makeTree());
    const stats = getDiffStats(diff);

    expect(stats.unchanged).toBe(6);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
    expect(stats.moved).toBe(0);
    expect(stats.modified).toBe(0);
  });
});
