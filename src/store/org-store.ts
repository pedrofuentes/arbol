import { OrgNode } from '../types';
import { findNodeById, findParent, cloneTree } from '../utils/tree';
import { generateId } from '../utils/id';

type ChangeListener = () => void;

export class OrgStore {
  private root: OrgNode;
  private listeners: Set<ChangeListener> = new Set();

  constructor(root: OrgNode) {
    this.root = cloneTree(root);
  }

  getTree(): OrgNode {
    return this.root;
  }

  addChild(parentId: string, data: { name: string; title: string }): OrgNode {
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
    const parent = findParent(this.root, id);
    if (!parent) throw new Error(`Node "${id}" not found`);
    parent.children = parent.children?.filter((c) => c.id !== id);
    if (parent.children?.length === 0) parent.children = undefined;
    this.emit();
  }

  updateNode(id: string, fields: { name?: string; title?: string }): void {
    const node = findNodeById(this.root, id);
    if (!node) throw new Error(`Node "${id}" not found`);
    if (fields.name !== undefined) node.name = fields.name;
    if (fields.title !== undefined) node.title = fields.title;
    this.emit();
  }

  toJSON(): string {
    return JSON.stringify(this.root, null, 2);
  }

  fromJSON(json: string): void {
    const parsed = JSON.parse(json);
    if (!parsed.id || !parsed.name || !parsed.title) {
      throw new Error('Invalid org tree: root must have id, name, and title');
    }
    this.root = parsed;
    this.emit();
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
