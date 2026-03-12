import { describe, it, expect, vi } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';
import { findNodeById, flattenTree } from '../../src/utils/tree';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('OrgStore', () => {
  describe('constructor & getTree', () => {
    it('stores and returns the tree', () => {
      const store = new OrgStore(makeRoot());
      const tree = store.getTree();
      expect(tree.id).toBe('root');
      expect(tree.name).toBe('Alice');
    });

    it('does not store a reference to the input', () => {
      const input = makeRoot();
      const store = new OrgStore(input);
      input.name = 'CHANGED';
      expect(store.getTree().name).toBe('Alice');
    });
  });

  describe('addChild', () => {
    it('adds a child to the specified parent', () => {
      const store = new OrgStore(makeRoot());
      const added = store.addChild('root', { name: 'Dan', title: 'VP' });
      expect(added.name).toBe('Dan');
      expect(added.id).toBeTruthy();
      expect(store.getTree().children).toHaveLength(3);
    });

    it('adds a child to a leaf node', () => {
      const store = new OrgStore(makeRoot());
      store.addChild('b', { name: 'Eve', title: 'Engineer' });
      const bob = store.getTree().children![0];
      expect(bob.children).toHaveLength(1);
      expect(bob.children![0].name).toBe('Eve');
    });

    it('throws if parent does not exist', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.addChild('zzz', { name: 'X', title: 'X' })).toThrow(
        'Parent node "zzz" not found',
      );
    });
  });

  describe('removeNode', () => {
    it('removes a child node', () => {
      const store = new OrgStore(makeRoot());
      store.removeNode('b');
      expect(store.getTree().children).toHaveLength(1);
      expect(store.getTree().children![0].id).toBe('c');
    });

    it('throws if trying to remove root', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.removeNode('root')).toThrow('Cannot remove root node');
    });

    it('throws if node not found', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.removeNode('zzz')).toThrow('Node "zzz" not found');
    });

    it('removes the entire subtree', () => {
      const root = makeRoot();
      root.children![0].children = [{ id: 'd', name: 'Dan', title: 'Eng' }];
      const store = new OrgStore(root);
      store.removeNode('b');
      const allNodes = flattenTree(store.getTree());
      expect(allNodes.map((n) => n.id)).not.toContain('d');
    });
  });

  describe('updateNode', () => {
    it('updates name', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { name: 'Robert' });
      expect(store.getTree().children![0].name).toBe('Robert');
    });

    it('updates title', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { title: 'VP Engineering' });
      expect(store.getTree().children![0].title).toBe('VP Engineering');
    });

    it('updates both fields', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { name: 'Robert', title: 'VP' });
      const bob = store.getTree().children![0];
      expect(bob.name).toBe('Robert');
      expect(bob.title).toBe('VP');
    });

    it('throws if node not found', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.updateNode('zzz', { name: 'X' })).toThrow('Node "zzz" not found');
    });
  });

  describe('toJSON / fromJSON', () => {
    it('serializes to JSON and back', () => {
      const store = new OrgStore(makeRoot());
      const json = store.toJSON();
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('root');
      expect(parsed.children).toHaveLength(2);
    });

    it('replaces tree from JSON', () => {
      const store = new OrgStore(makeRoot());
      const newTree: OrgNode = {
        id: 'new-root',
        name: 'Zara',
        title: 'Founder',
      };
      store.fromJSON(JSON.stringify(newTree));
      expect(store.getTree().id).toBe('new-root');
      expect(store.getTree().name).toBe('Zara');
    });

    it('throws on invalid JSON structure', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.fromJSON('{"foo":"bar"}')).toThrow();
    });

    it('throws on invalid JSON syntax', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.fromJSON('not json')).toThrow();
    });
  });

  describe('onChange', () => {
    it('fires on addChild', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.addChild('root', { name: 'X', title: 'X' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on removeNode', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.removeNode('b');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on updateNode', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.updateNode('b', { name: 'X' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on fromJSON', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.fromJSON(JSON.stringify({ id: 'x', name: 'X', title: 'X' }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops events', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      const unsub = store.onChange(listener);
      unsub();
      store.addChild('root', { name: 'X', title: 'X' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('undo/redo', () => {
    it('canUndo returns false initially', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      expect(store.canUndo()).toBe(false);
    });

    it('canRedo returns false initially', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      expect(store.canRedo()).toBe(false);
    });

    it('undo restores previous state after addChild', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.addChild('r', { name: 'Child', title: 'VP' });
      expect(store.getTree().children).toHaveLength(1);

      store.undo();
      expect(store.getTree().children).toBeUndefined();
    });

    it('undo restores previous state after removeNode', () => {
      const root = {
        id: 'r',
        name: 'Root',
        title: 'CEO',
        children: [{ id: 'c1', name: 'Child', title: 'VP' }],
      };
      const store = new OrgStore(root);
      store.removeNode('c1');
      expect(store.getTree().children).toBeUndefined();

      store.undo();
      expect(store.getTree().children).toHaveLength(1);
      expect(store.getTree().children![0].name).toBe('Child');
    });

    it('undo restores previous state after updateNode', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.updateNode('r', { name: 'Updated' });
      expect(store.getTree().name).toBe('Updated');

      store.undo();
      expect(store.getTree().name).toBe('Root');
    });

    it('redo re-applies undone change', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.addChild('r', { name: 'Child', title: 'VP' });
      store.undo();
      expect(store.getTree().children).toBeUndefined();

      store.redo();
      expect(store.getTree().children).toHaveLength(1);
    });

    it('new mutation clears redo stack', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.addChild('r', { name: 'Child1', title: 'VP' });
      store.undo();
      expect(store.canRedo()).toBe(true);

      store.addChild('r', { name: 'Child2', title: 'Dir' });
      expect(store.canRedo()).toBe(false);
    });

    it('undo returns false when stack is empty', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      expect(store.undo()).toBe(false);
    });

    it('redo returns false when stack is empty', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      expect(store.redo()).toBe(false);
    });

    it('multiple undo steps work correctly', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.updateNode('r', { name: 'Step1' });
      store.updateNode('r', { name: 'Step2' });
      store.updateNode('r', { name: 'Step3' });

      expect(store.getTree().name).toBe('Step3');
      store.undo();
      expect(store.getTree().name).toBe('Step2');
      store.undo();
      expect(store.getTree().name).toBe('Step1');
      store.undo();
      expect(store.getTree().name).toBe('Root');
      expect(store.canUndo()).toBe(false);
    });

    it('emits change event on undo', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.addChild('r', { name: 'Child', title: 'VP' });

      let called = false;
      store.onChange(() => {
        called = true;
      });
      store.undo();
      expect(called).toBe(true);
    });

    it('emits change event on redo', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.addChild('r', { name: 'Child', title: 'VP' });
      store.undo();

      let called = false;
      store.onChange(() => {
        called = true;
      });
      store.redo();
      expect(called).toBe(true);
    });

    it('getUndoStackSize returns correct count', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      expect(store.getUndoStackSize()).toBe(0);
      store.addChild('r', { name: 'A', title: 'VP' });
      expect(store.getUndoStackSize()).toBe(1);
      store.addChild('r', { name: 'B', title: 'Dir' });
      expect(store.getUndoStackSize()).toBe(2);
    });

    it('respects max history limit', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      for (let i = 0; i < 60; i++) {
        store.updateNode('r', { name: `Step${i}` });
      }
      expect(store.getUndoStackSize()).toBeLessThanOrEqual(50);
    });

    it('fromJSON creates undo snapshot', () => {
      const store = new OrgStore({ id: 'r', name: 'Root', title: 'CEO' });
      store.fromJSON(JSON.stringify({ id: 'r', name: 'New', title: 'CEO' }));
      expect(store.getTree().name).toBe('New');

      store.undo();
      expect(store.getTree().name).toBe('Root');
    });
  });

  describe('moveNode', () => {
    const makeTree = (): OrgNode => ({
      id: 'r',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'a',
          name: 'A',
          title: 'VP',
          children: [
            { id: 'a1', name: 'A1', title: 'Dir' },
            { id: 'a2', name: 'A2', title: 'Dir' },
          ],
        },
        { id: 'b', name: 'B', title: 'VP', children: [{ id: 'b1', name: 'B1', title: 'Dir' }] },
      ],
    });

    it('moves a node to a new parent', () => {
      const store = new OrgStore(makeTree());
      store.moveNode('a1', 'b');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).toContain('a1');
    });

    it('removes node from original parent', () => {
      const store = new OrgStore(makeTree());
      store.moveNode('a1', 'b');
      const a = findNodeById(store.getTree(), 'a')!;
      expect(a.children!.map((c) => c.id)).not.toContain('a1');
    });

    it('throws when moving root', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.moveNode('r', 'a')).toThrow('Cannot move root node');
    });

    it('throws when moving to own descendant', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.moveNode('a', 'a1')).toThrow(
        'Cannot move a node under its own descendant',
      );
    });

    it('throws when newParentId does not exist', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.moveNode('a1', 'zzz')).toThrow('Target parent "zzz" not found');
    });

    it('is no-op when already under target parent', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.moveNode('a1', 'a');
      expect(listener).not.toHaveBeenCalled();
      expect(store.getUndoStackSize()).toBe(0);
    });

    it('creates undo snapshot', () => {
      const store = new OrgStore(makeTree());
      store.moveNode('a1', 'b');
      expect(store.canUndo()).toBe(true);
      store.undo();
      const a = findNodeById(store.getTree(), 'a')!;
      expect(a.children!.map((c) => c.id)).toContain('a1');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).not.toContain('a1');
    });

    it('emits change event', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.moveNode('a1', 'b');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDescendantCount', () => {
    it('returns 0 for leaf node', () => {
      const store = new OrgStore({
        id: 'r',
        name: 'Root',
        title: 'CEO',
        children: [{ id: 'a', name: 'A', title: 'VP' }],
      });
      expect(store.getDescendantCount('a')).toBe(0);
    });

    it('returns correct count for subtree', () => {
      const store = new OrgStore({
        id: 'r',
        name: 'Root',
        title: 'CEO',
        children: [
          {
            id: 'a',
            name: 'A',
            title: 'VP',
            children: [
              { id: 'a1', name: 'A1', title: 'Dir' },
              {
                id: 'a2',
                name: 'A2',
                title: 'Dir',
                children: [{ id: 'a2x', name: 'A2X', title: 'Eng' }],
              },
            ],
          },
        ],
      });
      expect(store.getDescendantCount('a')).toBe(3);
      expect(store.getDescendantCount('r')).toBe(4);
    });
  });

  describe('removeNodeWithReassign', () => {
    const makeTree = (): OrgNode => ({
      id: 'r',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'a',
          name: 'A',
          title: 'VP',
          children: [
            { id: 'a1', name: 'A1', title: 'Dir' },
            { id: 'a2', name: 'A2', title: 'Dir' },
          ],
        },
        { id: 'b', name: 'B', title: 'VP' },
      ],
    });

    it('moves children to new parent and removes the node', () => {
      const store = new OrgStore(makeTree());
      store.removeNodeWithReassign('a', 'b');
      const tree = store.getTree();
      const b = findNodeById(tree, 'b')!;
      expect(b.children).toHaveLength(2);
      expect(b.children!.map((c) => c.id)).toContain('a1');
      expect(b.children!.map((c) => c.id)).toContain('a2');
      expect(findNodeById(tree, 'a')).toBeNull();
    });

    it('removes leaf node without children (no reassignment needed)', () => {
      const store = new OrgStore(makeTree());
      store.removeNodeWithReassign('b', 'r');
      const tree = store.getTree();
      expect(findNodeById(tree, 'b')).toBeNull();
      expect(tree.children).toHaveLength(1);
    });

    it('is a single undo operation', () => {
      const store = new OrgStore(makeTree());
      store.removeNodeWithReassign('a', 'b');
      expect(store.getUndoStackSize()).toBe(1);
      store.undo();
      const tree = store.getTree();
      const a = findNodeById(tree, 'a')!;
      expect(a.children).toHaveLength(2);
      const b = findNodeById(tree, 'b')!;
      expect(b.children).toBeUndefined();
    });

    it('throws when removing root', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.removeNodeWithReassign('r', 'a')).toThrow('Cannot remove root node');
    });

    it('throws when node does not exist', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.removeNodeWithReassign('zzz', 'b')).toThrow('Node "zzz" not found');
    });

    it('throws when target parent does not exist', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.removeNodeWithReassign('a', 'zzz')).toThrow(
        'Target parent "zzz" not found',
      );
    });

    it('throws when reassigning to the node being removed', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.removeNodeWithReassign('a', 'a')).toThrow(
        'Cannot reassign children to the node being removed',
      );
    });

    it('throws when reassigning to a descendant', () => {
      const store = new OrgStore(makeTree());
      expect(() => store.removeNodeWithReassign('a', 'a1')).toThrow(
        'Cannot reassign children to a descendant',
      );
    });

    it('emits change event', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.removeNodeWithReassign('a', 'b');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('cleans up empty children array on original parent', () => {
      const tree: OrgNode = {
        id: 'r',
        name: 'Root',
        title: 'CEO',
        children: [
          { id: 'a', name: 'A', title: 'VP', children: [{ id: 'a1', name: 'A1', title: 'Dir' }] },
        ],
      };
      const store = new OrgStore(tree);
      store.removeNodeWithReassign('a', 'r');
      const root = store.getTree();
      // a1 should now be under root, and root should have children
      expect(root.children).toHaveLength(1);
      expect(root.children![0].id).toBe('a1');
    });
  });

  describe('bulkMoveNodes', () => {
    const makeTree = (): OrgNode => ({
      id: 'r',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'a',
          name: 'A',
          title: 'VP',
          children: [
            { id: 'a1', name: 'A1', title: 'Dir' },
            { id: 'a2', name: 'A2', title: 'Dir' },
          ],
        },
        { id: 'b', name: 'B', title: 'VP', children: [{ id: 'b1', name: 'B1', title: 'Dir' }] },
      ],
    });

    it('moves multiple nodes to a new parent', () => {
      const store = new OrgStore(makeTree());
      store.bulkMoveNodes(['a1', 'a2'], 'b');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).toContain('a1');
      expect(b.children!.map((c) => c.id)).toContain('a2');
      const a = findNodeById(store.getTree(), 'a')!;
      expect(a.children).toBeUndefined();
    });

    it('creates a single undo snapshot', () => {
      const store = new OrgStore(makeTree());
      store.bulkMoveNodes(['a1', 'a2'], 'b');
      expect(store.getUndoStackSize()).toBe(1);
    });

    it('skips root node silently', () => {
      const store = new OrgStore(makeTree());
      store.bulkMoveNodes(['r', 'a1'], 'b');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).toContain('a1');
      expect(b.children!.map((c) => c.id)).not.toContain('r');
    });

    it('skips nodes already under target parent', () => {
      const store = new OrgStore(makeTree());
      store.bulkMoveNodes(['b1', 'a1'], 'b');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).toContain('b1');
      expect(b.children!.map((c) => c.id)).toContain('a1');
      // b1 was already there so it should not be duplicated
      expect(b.children!.filter((c) => c.id === 'b1').length).toBe(1);
    });

    it('skips nodes that do not exist', () => {
      const store = new OrgStore(makeTree());
      store.bulkMoveNodes(['nonexistent', 'a1'], 'b');
      const b = findNodeById(store.getTree(), 'b')!;
      expect(b.children!.map((c) => c.id)).toContain('a1');
    });

    it('is no-op when no valid nodes to move', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkMoveNodes(['r', 'nonexistent'], 'b');
      expect(listener).not.toHaveBeenCalled();
      expect(store.getUndoStackSize()).toBe(0);
    });

    it('emits change event once', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkMoveNodes(['a1', 'a2'], 'b');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkRemoveNodes', () => {
    const makeTree = (): OrgNode => ({
      id: 'r',
      name: 'Root',
      title: 'CEO',
      children: [
        {
          id: 'a',
          name: 'A',
          title: 'VP',
          children: [
            { id: 'a1', name: 'A1', title: 'Dir' },
            { id: 'a2', name: 'A2', title: 'Dir' },
          ],
        },
        { id: 'b', name: 'B', title: 'VP' },
      ],
    });

    it('removes multiple leaf nodes', () => {
      const store = new OrgStore(makeTree());
      store.bulkRemoveNodes(['a1', 'a2']);
      const tree = store.getTree();
      expect(findNodeById(tree, 'a1')).toBeNull();
      expect(findNodeById(tree, 'a2')).toBeNull();
      const a = findNodeById(tree, 'a')!;
      expect(a.children).toBeUndefined();
    });

    it('creates a single undo snapshot', () => {
      const store = new OrgStore(makeTree());
      store.bulkRemoveNodes(['a1', 'a2']);
      expect(store.getUndoStackSize()).toBe(1);
    });

    it('skips root node silently', () => {
      const store = new OrgStore(makeTree());
      store.bulkRemoveNodes(['r', 'a1']);
      const tree = store.getTree();
      expect(tree.id).toBe('r');
      expect(findNodeById(tree, 'a1')).toBeNull();
    });

    it('skips nodes that do not exist', () => {
      const store = new OrgStore(makeTree());
      store.bulkRemoveNodes(['nonexistent', 'a1']);
      expect(findNodeById(store.getTree(), 'a1')).toBeNull();
      expect(findNodeById(store.getTree(), 'a2')).not.toBeNull();
    });

    it('is no-op when no valid nodes to remove', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkRemoveNodes(['r', 'nonexistent']);
      expect(listener).not.toHaveBeenCalled();
      expect(store.getUndoStackSize()).toBe(0);
    });

    it('emits change event once', () => {
      const store = new OrgStore(makeTree());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkRemoveNodes(['a1', 'a2']);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('setNodeCategory', () => {
    it('sets categoryId on a node', () => {
      const store = new OrgStore(makeRoot());
      store.setNodeCategory('b', 'cat-engineering');
      const bob = findNodeById(store.getTree(), 'b')!;
      expect(bob.categoryId).toBe('cat-engineering');
    });

    it('clears categoryId when null is passed', () => {
      const store = new OrgStore(makeRoot());
      store.setNodeCategory('b', 'cat-engineering');
      store.setNodeCategory('b', null);
      const bob = findNodeById(store.getTree(), 'b')!;
      expect(bob.categoryId).toBeUndefined();
    });

    it('throws for unknown node', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.setNodeCategory('nonexistent', 'cat-x')).toThrow(
        '"nonexistent" not found',
      );
    });

    it('creates undo snapshot', () => {
      const store = new OrgStore(makeRoot());
      store.setNodeCategory('b', 'cat-engineering');
      expect(store.getUndoStackSize()).toBe(1);
      store.undo();
      const bob = findNodeById(store.getTree(), 'b')!;
      expect(bob.categoryId).toBeUndefined();
    });

    it('emits change event', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.setNodeCategory('b', 'cat-engineering');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkSetCategory', () => {
    it('sets categoryId on multiple nodes', () => {
      const store = new OrgStore(makeRoot());
      store.bulkSetCategory(['b', 'c'], 'cat-exec');
      expect(findNodeById(store.getTree(), 'b')!.categoryId).toBe('cat-exec');
      expect(findNodeById(store.getTree(), 'c')!.categoryId).toBe('cat-exec');
    });

    it('clears categoryId on multiple nodes', () => {
      const store = new OrgStore(makeRoot());
      store.bulkSetCategory(['b', 'c'], 'cat-exec');
      store.bulkSetCategory(['b', 'c'], null);
      expect(findNodeById(store.getTree(), 'b')!.categoryId).toBeUndefined();
      expect(findNodeById(store.getTree(), 'c')!.categoryId).toBeUndefined();
    });

    it('skips non-existent nodes silently', () => {
      const store = new OrgStore(makeRoot());
      store.bulkSetCategory(['b', 'nonexistent'], 'cat-x');
      expect(findNodeById(store.getTree(), 'b')!.categoryId).toBe('cat-x');
    });

    it('does nothing and no snapshot when all nodes are invalid', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkSetCategory(['nonexistent', 'also-fake'], 'cat-x');
      expect(listener).not.toHaveBeenCalled();
      expect(store.getUndoStackSize()).toBe(0);
    });

    it('creates single undo snapshot', () => {
      const store = new OrgStore(makeRoot());
      store.bulkSetCategory(['b', 'c'], 'cat-exec');
      expect(store.getUndoStackSize()).toBe(1);
      store.undo();
      expect(findNodeById(store.getTree(), 'b')!.categoryId).toBeUndefined();
      expect(findNodeById(store.getTree(), 'c')!.categoryId).toBeUndefined();
    });

    it('emits change event once', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.bulkSetCategory(['b', 'c'], 'cat-exec');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateTree with categoryId', () => {
    it('accepts nodes with valid categoryId', () => {
      const store = new OrgStore(makeRoot());
      const json = JSON.stringify({
        id: 'r',
        name: 'Root',
        title: 'CEO',
        categoryId: 'cat-exec',
        children: [{ id: 'a', name: 'A', title: 'VP', categoryId: 'cat-eng' }],
      });
      store.fromJSON(json);
      expect(findNodeById(store.getTree(), 'r')!.categoryId).toBe('cat-exec');
      expect(findNodeById(store.getTree(), 'a')!.categoryId).toBe('cat-eng');
    });

    it('accepts nodes without categoryId', () => {
      const store = new OrgStore(makeRoot());
      const json = JSON.stringify({ id: 'r', name: 'Root', title: 'CEO' });
      store.fromJSON(json);
      expect(store.getTree().categoryId).toBeUndefined();
    });

    it('rejects non-string categoryId', () => {
      const store = new OrgStore(makeRoot());
      const json = JSON.stringify({ id: 'r', name: 'Root', title: 'CEO', categoryId: 42 });
      expect(() => store.fromJSON(json)).toThrow('Invalid categoryId');
    });

    it('rejects categoryId over 100 chars', () => {
      const store = new OrgStore(makeRoot());
      const json = JSON.stringify({
        id: 'r',
        name: 'Root',
        title: 'CEO',
        categoryId: 'x'.repeat(101),
      });
      expect(() => store.fromJSON(json)).toThrow('categoryId too long');
    });
  });
});
