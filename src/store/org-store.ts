import { OrgNode } from '../types';
import { findNodeById, findParent, cloneTree, flattenTree } from '../utils/tree';
import { generateId } from '../utils/id';

type ChangeListener = () => void;

export class OrgStore {
  private root: OrgNode;
  private listeners: Set<ChangeListener> = new Set();
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private static MAX_HISTORY = 50;

  constructor(root: OrgNode) {
    this.root = cloneTree(root);
  }

  getTree(): OrgNode {
    return this.root;
  }

  private snapshot(): void {
    this.undoStack.push(JSON.stringify(this.root));
    this.redoStack.length = 0;
    if (this.undoStack.length > OrgStore.MAX_HISTORY) {
      this.undoStack.splice(0, this.undoStack.length - OrgStore.MAX_HISTORY);
    }
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.stringify(this.root));
    this.root = JSON.parse(this.undoStack.pop()!);
    this.emit();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.stringify(this.root));
    this.root = JSON.parse(this.redoStack.pop()!);
    this.emit();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  addChild(parentId: string, data: { name: string; title: string }): OrgNode {
    this.snapshot();
    const parent = findNodeById(this.root, parentId);
    if (!parent) throw new Error(`Parent node "${parentId}" not found`);
    const node: OrgNode = {
      id: generateId(),
      name: data.name,
      title: data.title,
    };
    if (!parent.children) parent.children = [];
    parent.children.push(node);
    this.emit();
    return node;
  }

  removeNode(id: string): void {
    if (this.root.id === id) throw new Error('Cannot remove root node');
    this.snapshot();
    const parent = findParent(this.root, id);
    if (!parent) throw new Error(`Node "${id}" not found`);
    parent.children = parent.children?.filter((c) => c.id !== id);
    if (parent.children?.length === 0) parent.children = undefined;
    this.emit();
  }

  updateNode(id: string, fields: { name?: string; title?: string }): void {
    this.snapshot();
    const node = findNodeById(this.root, id);
    if (!node) throw new Error(`Node "${id}" not found`);
    if (fields.name !== undefined) node.name = fields.name;
    if (fields.title !== undefined) node.title = fields.title;
    this.emit();
  }

  toJSON(): string {
    return JSON.stringify(this.root, null, 2);
  }

  moveNode(nodeId: string, newParentId: string): void {
    if (this.root.id === nodeId) throw new Error('Cannot move root node');
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    const newParent = findNodeById(this.root, newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);
    if (nodeId === newParentId) throw new Error('Cannot move a node under itself');
    if (this.isDescendant(nodeId, newParentId))
      throw new Error('Cannot move a node under its own descendant');

    const currentParent = findParent(this.root, nodeId);
    if (currentParent && currentParent.id === newParentId) return;

    this.snapshot();
    if (currentParent) {
      currentParent.children = currentParent.children?.filter((c) => c.id !== nodeId);
      if (currentParent.children?.length === 0) currentParent.children = undefined;
    }
    if (!newParent.children) newParent.children = [];
    newParent.children.push(node);
    this.emit();
  }

  private isDescendant(ancestorId: string, nodeId: string): boolean {
    const ancestor = findNodeById(this.root, ancestorId);
    if (!ancestor) return false;
    const allDescendants = flattenTree(ancestor);
    return allDescendants.some((n) => n.id === nodeId && n.id !== ancestorId);
  }

  getDescendantCount(nodeId: string): number {
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    return flattenTree(node).length - 1;
  }

  fromJSON(json: string): void {
    this.snapshot();
    const parsed = JSON.parse(json);
    this.validateTree(parsed);
    this.root = parsed;
    this.emit();
  }

  private validateTree(node: unknown, depth = 0, count = { value: 0 }): asserts node is OrgNode {
    if (depth > 100) throw new Error('Tree exceeds maximum depth of 100 levels');
    if (++count.value > 50000) throw new Error('Tree exceeds maximum of 50,000 nodes');
    if (!node || typeof node !== 'object') throw new Error('Invalid node: expected an object');
    const obj = node as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !obj.id.trim()) throw new Error('Each node must have a non-empty string id');
    if (typeof obj.name !== 'string') throw new Error('Each node must have a string name');
    if (typeof obj.title !== 'string') throw new Error('Each node must have a string title');
    if (obj.name.length > 500) throw new Error(`Name too long (max 500 chars) on node "${obj.id}"`);
    if (obj.title.length > 500) throw new Error(`Title too long (max 500 chars) on node "${obj.id}"`);
    if (obj.children !== undefined) {
      if (!Array.isArray(obj.children)) throw new Error(`Invalid children on node "${obj.id}": expected an array`);
      for (const child of obj.children) {
        this.validateTree(child, depth + 1, count);
      }
    }
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
