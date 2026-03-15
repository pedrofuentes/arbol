import { OrgNode } from '../types';
import { findNodeById, findParent, cloneTree, flattenTree, isLeaf, isM1 } from '../utils/tree';
import { generateId } from '../utils/id';
import { EventEmitter } from '../utils/event-emitter';

export class OrgStore extends EventEmitter {
  private root: OrgNode;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private static MAX_HISTORY = 50;

  constructor(root: OrgNode) {
    super();
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
    while (this.undoStack.length > 0) {
      const snapshot = this.undoStack.pop()!;
      try {
        const parsed = JSON.parse(snapshot);
        this.redoStack.push(JSON.stringify(this.root));
        this.root = parsed;
        this.emit();
        return true;
      } catch (e) {
        console.error('Failed to parse undo snapshot, skipping:', e);
        continue;
      }
    }
    return false;
  }

  redo(): boolean {
    while (this.redoStack.length > 0) {
      const snapshot = this.redoStack.pop()!;
      try {
        const parsed = JSON.parse(snapshot);
        this.undoStack.push(JSON.stringify(this.root));
        this.root = parsed;
        this.emit();
        return true;
      } catch (e) {
        console.error('Failed to parse redo snapshot, skipping:', e);
        continue;
      }
    }
    return false;
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

  removeNodeWithReassign(nodeId: string, newParentId: string): void {
    if (this.root.id === nodeId) throw new Error('Cannot remove root node');
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    const newParent = findNodeById(this.root, newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);
    if (nodeId === newParentId)
      throw new Error('Cannot reassign children to the node being removed');
    if (this.isDescendant(nodeId, newParentId))
      throw new Error('Cannot reassign children to a descendant of the node being removed');

    this.snapshot();

    // Move children to new parent
    if (node.children && node.children.length > 0) {
      if (!newParent.children) newParent.children = [];
      newParent.children.push(...node.children);
      node.children = undefined;
    }

    // Remove the now-childless node
    const parent = findParent(this.root, nodeId);
    if (parent) {
      parent.children = parent.children?.filter((c) => c.id !== nodeId);
      if (parent.children?.length === 0) parent.children = undefined;
    }

    this.emit();
  }

  updateNode(id: string, fields: { name?: string; title?: string }): OrgNode {
    this.snapshot();
    const node = findNodeById(this.root, id);
    if (!node) throw new Error(`Node "${id}" not found`);
    if (fields.name !== undefined) node.name = fields.name;
    if (fields.title !== undefined) node.title = fields.title;
    this.emit();
    return node;
  }

  setNodeCategory(nodeId: string, categoryId: string | null): OrgNode {
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    this.snapshot();
    if (categoryId === null) {
      delete node.categoryId;
    } else {
      node.categoryId = categoryId;
    }
    this.emit();
    return node;
  }

  bulkSetCategory(nodeIds: string[], categoryId: string | null): void {
    const validNodes = nodeIds
      .map((id) => findNodeById(this.root, id))
      .filter((n): n is OrgNode => n !== null);
    if (validNodes.length === 0) return;
    this.snapshot();
    for (const node of validNodes) {
      if (categoryId === null) {
        delete node.categoryId;
      } else {
        node.categoryId = categoryId;
      }
    }
    this.emit();
  }

  toJSON(): string {
    return JSON.stringify(this.root, null, 2);
  }

  setDottedLine(nodeId: string, isDotted: boolean): OrgNode {
    if (this.root.id === nodeId) throw new Error('Cannot set dotted line on root node');
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    if (isLeaf(node)) {
      const parent = findParent(this.root, nodeId);
      if (parent && isM1(parent)) {
        throw new Error('Cannot set dotted line on an IC (Individual Contributor) node');
      }
    }
    this.snapshot();
    if (isDotted) {
      node.dottedLine = true;
    } else {
      delete node.dottedLine;
    }
    this.emit();
    return node;
  }

  moveNode(nodeId: string, newParentId: string, dottedLine?: boolean): OrgNode {
    if (this.root.id === nodeId) throw new Error('Cannot move root node');
    const node = findNodeById(this.root, nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    const newParent = findNodeById(this.root, newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);
    if (nodeId === newParentId) throw new Error('Cannot move a node under itself');
    if (this.isDescendant(nodeId, newParentId))
      throw new Error('Cannot move a node under its own descendant');

    const currentParent = findParent(this.root, nodeId);
    if (currentParent && currentParent.id === newParentId) return node;

    this.snapshot();
    if (currentParent) {
      currentParent.children = currentParent.children?.filter((c) => c.id !== nodeId);
      if (currentParent.children?.length === 0) currentParent.children = undefined;
    }
    if (!newParent.children) newParent.children = [];
    newParent.children.push(node);
    if (dottedLine !== undefined) {
      if (dottedLine) {
        node.dottedLine = true;
      } else {
        delete node.dottedLine;
      }
    }
    this.emit();
    return node;
  }

  bulkMoveNodes(nodeIds: string[], newParentId: string): void {
    const newParent = findNodeById(this.root, newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);

    // Filter out root and nodes already under target, validate all exist
    const validIds = nodeIds.filter((id) => {
      if (this.root.id === id) return false;
      const node = findNodeById(this.root, id);
      if (!node) return false;
      if (this.isDescendant(id, newParentId)) return false;
      const currentParent = findParent(this.root, id);
      return !(currentParent && currentParent.id === newParentId);
    });

    if (validIds.length === 0) return;

    this.snapshot();
    for (const id of validIds) {
      const node = findNodeById(this.root, id);
      if (!node) continue;
      const currentParent = findParent(this.root, id);
      if (currentParent) {
        currentParent.children = currentParent.children?.filter((c) => c.id !== id);
        if (currentParent.children?.length === 0) currentParent.children = undefined;
      }
      if (!newParent.children) newParent.children = [];
      newParent.children.push(node);
    }
    this.emit();
  }

  bulkRemoveNodes(ids: string[]): void {
    const validIds = ids.filter((id) => {
      if (this.root.id === id) return false;
      return findNodeById(this.root, id) !== null;
    });

    if (validIds.length === 0) return;

    this.snapshot();
    for (const id of validIds) {
      const parent = findParent(this.root, id);
      if (!parent) continue;
      parent.children = parent.children?.filter((c) => c.id !== id);
      if (parent.children?.length === 0) parent.children = undefined;
    }
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

  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  replaceTree(tree: OrgNode): void {
    this.root = cloneTree(tree);
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.emit();
  }

  private validateTree(node: unknown, depth = 0, count = { value: 0 }): asserts node is OrgNode {
    if (depth > 100) throw new Error('Tree exceeds maximum depth of 100 levels');
    if (++count.value > 50000) throw new Error('Tree exceeds maximum of 50,000 nodes');
    if (!node || typeof node !== 'object') throw new Error('Invalid node: expected an object');
    const obj = node as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !obj.id.trim())
      throw new Error('Each node must have a non-empty string id');
    if (typeof obj.name !== 'string') throw new Error('Each node must have a string name');
    if (typeof obj.title !== 'string') throw new Error('Each node must have a string title');
    if (obj.name.length > 500) throw new Error(`Name too long (max 500 chars) on node "${obj.id}"`);
    if (obj.title.length > 500)
      throw new Error(`Title too long (max 500 chars) on node "${obj.id}"`);
    if (obj.categoryId !== undefined) {
      if (typeof obj.categoryId !== 'string')
        throw new Error(`Invalid categoryId on node "${obj.id}": expected a string`);
      if (obj.categoryId.length > 100)
        throw new Error(`categoryId too long (max 100 chars) on node "${obj.id}"`);
    }
    if (obj.dottedLine !== undefined) {
      if (typeof obj.dottedLine !== 'boolean')
        throw new Error(`Invalid dottedLine on node "${obj.id}": expected a boolean`);
    }
    if (obj.children !== undefined) {
      if (!Array.isArray(obj.children))
        throw new Error(`Invalid children on node "${obj.id}": expected an array`);
      for (const child of obj.children) {
        this.validateTree(child, depth + 1, count);
      }
    }
  }

}
