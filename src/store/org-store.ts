import { OrgNode } from '../types';
import { cloneTree, flattenTree, isLeaf, isM1 } from '../utils/tree';
import { generateId } from '../utils/id';
import { EventEmitter } from '../utils/event-emitter';

export class OrgStore extends EventEmitter {
  private root: OrgNode;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private static MAX_HISTORY = 50;
  private _mutationVersion = 0;
  private nodeIndex = new Map<string, OrgNode>();
  private parentIndex = new Map<string, OrgNode>();

  constructor(root: OrgNode) {
    super();
    this.root = cloneTree(root);
    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.nodeIndex.clear();
    this.parentIndex.clear();
    const walk = (node: OrgNode, parent?: OrgNode): void => {
      this.nodeIndex.set(node.id, node);
      if (parent) this.parentIndex.set(node.id, parent);
      if (node.children) {
        for (const child of node.children) {
          walk(child, node);
        }
      }
    };
    walk(this.root);
  }

  getNodeById(id: string): OrgNode | undefined {
    return this.nodeIndex.get(id);
  }

  getParentOf(id: string): OrgNode | undefined {
    return this.parentIndex.get(id);
  }

  getTree(): OrgNode {
    return this.root;
  }

  get mutationVersion(): number {
    return this._mutationVersion;
  }

  private snapshot(): void {
    this.undoStack.push(JSON.stringify(this.root));
    this.redoStack.length = 0;
    if (this.undoStack.length > OrgStore.MAX_HISTORY) {
      this.undoStack.splice(0, this.undoStack.length - OrgStore.MAX_HISTORY);
    }
    this._mutationVersion++;
  }

  undo(): boolean {
    while (this.undoStack.length > 0) {
      const snapshot = this.undoStack.pop()!;
      try {
        const parsed = JSON.parse(snapshot);
        this.redoStack.push(JSON.stringify(this.root));
        if (this.redoStack.length > OrgStore.MAX_HISTORY) {
          this.redoStack.splice(0, this.redoStack.length - OrgStore.MAX_HISTORY);
        }
        this.root = parsed;
        this._mutationVersion++;
        this.rebuildIndex();
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
        this._mutationVersion++;
        this.rebuildIndex();
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

  addChild(parentId: string, data: { name: string; title: string; level?: string }): OrgNode {
    const parent = this.nodeIndex.get(parentId);
    if (!parent) throw new Error(`Parent node "${parentId}" not found`);
    this.snapshot();
    const node: OrgNode = {
      id: generateId(),
      name: data.name,
      title: data.title,
      ...(data.level && { level: data.level }),
    };
    if (!parent.children) parent.children = [];
    parent.children.push(node);
    this.rebuildIndex();
    this.emit();
    return node;
  }

  removeNode(id: string): void {
    if (this.root.id === id) throw new Error('Cannot remove root node');
    const parent = this.parentIndex.get(id);
    if (!parent) throw new Error(`Node "${id}" not found`);
    this.snapshot();
    parent.children = parent.children?.filter((c) => c.id !== id);
    if (parent.children?.length === 0) parent.children = undefined;
    this.rebuildIndex();
    this.emit();
  }

  removeNodeWithReassign(nodeId: string, newParentId: string): void {
    if (this.root.id === nodeId) throw new Error('Cannot remove root node');
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    const newParent = this.nodeIndex.get(newParentId);
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
    const parent = this.parentIndex.get(nodeId);
    if (parent) {
      parent.children = parent.children?.filter((c) => c.id !== nodeId);
      if (parent.children?.length === 0) parent.children = undefined;
    }

    this.rebuildIndex();
    this.emit();
  }

  updateNode(id: string, fields: { name?: string; title?: string; level?: string | null }): OrgNode {
    const node = this.nodeIndex.get(id);
    if (!node) throw new Error(`Node "${id}" not found`);
    this.snapshot();
    if (fields.name !== undefined) node.name = fields.name;
    if (fields.title !== undefined) {
      node.title = fields.title;
      node.pinnedTitle = true;
    }
    if (fields.level !== undefined) {
      if (fields.level === null || fields.level === '') {
        delete node.level;
      } else {
        node.level = fields.level;
      }
    }
    this.emit();
    return node;
  }

  pinTitle(nodeId: string): OrgNode {
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    if (node.pinnedTitle) return node;
    this.snapshot();
    node.pinnedTitle = true;
    this.emit();
    return node;
  }

  unpinTitle(nodeId: string): OrgNode {
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    if (!node.pinnedTitle) return node;
    this.snapshot();
    delete node.pinnedTitle;
    this.emit();
    return node;
  }

  setNodeLevel(nodeId: string, level: string | null): OrgNode {
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    this.snapshot();
    if (level === null || level === '') {
      delete node.level;
    } else {
      node.level = level;
    }
    this.emit();
    return node;
  }

  bulkSetLevel(nodeIds: string[], level: string | null): void {
    const validNodes = nodeIds
      .map((id) => this.nodeIndex.get(id))
      .filter((n): n is OrgNode => n !== undefined);
    if (validNodes.length === 0) return;
    this.snapshot();
    for (const node of validNodes) {
      if (level === null || level === '') {
        delete node.level;
      } else {
        node.level = level;
      }
    }
    this.emit();
  }

  setNodeCategory(nodeId: string, categoryId: string | null): OrgNode {
    const node = this.nodeIndex.get(nodeId);
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
      .map((id) => this.nodeIndex.get(id))
      .filter((n): n is OrgNode => n !== undefined);
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
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    if (isLeaf(node)) {
      const parent = this.parentIndex.get(nodeId);
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
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    const newParent = this.nodeIndex.get(newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);
    if (nodeId === newParentId) throw new Error('Cannot move a node under itself');
    if (this.isDescendant(nodeId, newParentId))
      throw new Error('Cannot move a node under its own descendant');

    const currentParent = this.parentIndex.get(nodeId);
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
    this.rebuildIndex();
    this.emit();
    return node;
  }

  bulkMoveNodes(nodeIds: string[], newParentId: string): void {
    const newParent = this.nodeIndex.get(newParentId);
    if (!newParent) throw new Error(`Target parent "${newParentId}" not found`);

    // Filter out root and nodes already under target, validate all exist
    const validIds = nodeIds.filter((id) => {
      if (this.root.id === id) return false;
      const node = this.nodeIndex.get(id);
      if (!node) return false;
      // Check if newParent is a descendant of this node (would create cycle)
      const descendants = flattenTree(node);
      if (descendants.some((n) => n.id === newParentId && n.id !== id)) return false;
      const currentParent = this.parentIndex.get(id);
      return !(currentParent && currentParent.id === newParentId);
    });

    if (validIds.length === 0) return;

    this.snapshot();
    for (const id of validIds) {
      const node = this.nodeIndex.get(id);
      if (!node) continue;
      const currentParent = this.parentIndex.get(id);
      if (currentParent) {
        currentParent.children = currentParent.children?.filter((c) => c.id !== id);
        if (currentParent.children?.length === 0) currentParent.children = undefined;
      }
      if (!newParent.children) newParent.children = [];
      newParent.children.push(node);
    }
    this.rebuildIndex();
    this.emit();
  }

  bulkRemoveNodes(ids: string[]): void {
    const validIds = ids.filter((id) => {
      if (this.root.id === id) return false;
      return this.nodeIndex.has(id);
    });

    if (validIds.length === 0) return;

    this.snapshot();
    for (const id of validIds) {
      const parent = this.parentIndex.get(id);
      if (!parent) continue;
      parent.children = parent.children?.filter((c) => c.id !== id);
      if (parent.children?.length === 0) parent.children = undefined;
    }
    this.rebuildIndex();
    this.emit();
  }

  private isDescendant(ancestorId: string, nodeId: string): boolean {
    const ancestor = this.nodeIndex.get(ancestorId);
    if (!ancestor) return false;
    const allDescendants = flattenTree(ancestor);
    return allDescendants.some((n) => n.id === nodeId && n.id !== ancestorId);
  }

  getDescendantCount(nodeId: string): number {
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    return flattenTree(node).length - 1;
  }

  fromJSON(json: string): void {
    const parsed = JSON.parse(json);
    this.validateTree(parsed);
    this.snapshot();
    this.root = parsed;
    this.rebuildIndex();
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
    this._mutationVersion++;
    this.rebuildIndex();
    this.emit();
  }

  private validateTree(node: unknown, depth?: number, count?: { value: number }): asserts node is OrgNode {
    validateTree(node, depth, count);
  }
}

/** Standalone tree validator — reusable outside OrgStore (e.g. bundle imports). */
export function validateTree(node: unknown, depth = 0, count = { value: 0 }): asserts node is OrgNode {
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
  if (obj.pinnedTitle !== undefined) {
    if (typeof obj.pinnedTitle !== 'boolean')
      throw new Error(`Invalid pinnedTitle on node "${obj.id}": expected a boolean`);
  }
  if (obj.children !== undefined) {
    if (!Array.isArray(obj.children))
      throw new Error(`Invalid children on node "${obj.id}": expected an array`);
    for (const child of obj.children) {
      validateTree(child, depth + 1, count);
    }
  }
}
