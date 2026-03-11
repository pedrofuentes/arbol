import { OrgNode } from '../types';

export function findNodeById(root: OrgNode, id: string): OrgNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(root: OrgNode, id: string): OrgNode | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

export function cloneTree(node: OrgNode): OrgNode {
  return JSON.parse(JSON.stringify(node));
}

export function filterVisibleTree(
  node: OrgNode,
  collapsed: Set<string>,
): OrgNode {
  const clone: OrgNode = { id: node.id, name: node.name, title: node.title };
  if (!collapsed.has(node.id) && node.children && node.children.length > 0) {
    clone.children = node.children.map((child) =>
      filterVisibleTree(child, collapsed),
    );
  }
  return clone;
}

export function flattenTree(node: OrgNode): OrgNode[] {
  const result: OrgNode[] = [node];
  for (const child of node.children ?? []) {
    result.push(...flattenTree(child));
  }
  return result;
}
