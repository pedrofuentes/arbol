import { describe, it, expect, vi } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';
import { flattenTree } from '../../src/utils/tree';

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
      expect(() =>
        store.addChild('zzz', { name: 'X', title: 'X' }),
      ).toThrow('Parent node "zzz" not found');
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
      root.children![0].children = [
        { id: 'd', name: 'Dan', title: 'Eng' },
      ];
      const store = new OrgStore(root);
      store.removeNode('b');
      const allNodes = flattenTree(store.getTree());
      expect(allNodes.map(n => n.id)).not.toContain('d');
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
      expect(() => store.updateNode('zzz', { name: 'X' })).toThrow(
        'Node "zzz" not found',
      );
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
});
