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
): OrgNode {
  const clone: OrgNode = { id: node.id, name: node.name, title: node.title };
  if (node.children && node.children.length > 0) {
    clone.children = node.children.map((child) =>
      filterVisibleTree(child),
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

export function isLeaf(node: OrgNode): boolean {
  return !node.children || node.children.length === 0;
}

export function isM1(node: OrgNode): boolean {
  if (!node.children || node.children.length === 0) return false;
  return node.children.every(isLeaf);
}

export function stripM1Children(
  node: OrgNode,
): { layoutTree: OrgNode; icMap: Map<string, OrgNode[]>; palMap: Map<string, OrgNode[]> } {
  const icMap = new Map<string, OrgNode[]>();
  const palMap = new Map<string, OrgNode[]>();

  function walk(n: OrgNode): OrgNode {
    const clone: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (!n.children || n.children.length === 0) {
      return clone;
    }
    if (isM1(n)) {
      icMap.set(n.id, n.children.map((c) => ({ id: c.id, name: c.name, title: c.title })));
      return clone;
    }
    // Non-M1 manager: separate PALs (leaf children) from manager children
    const pals = n.children.filter(isLeaf);
    const managers = n.children.filter((c) => !isLeaf(c));
    if (pals.length > 0) {
      palMap.set(n.id, pals.map((c) => ({ id: c.id, name: c.name, title: c.title })));
    }
    if (managers.length > 0) {
      clone.children = managers.map(walk);
    }
    return clone;
  }

  return { layoutTree: walk(node), icMap, palMap };
}

export function countLeaves(root: OrgNode): number {
  return flattenTree(root).filter(isLeaf).length;
}

/** Returns a map of depth → number of managers at that depth (excludes root at depth 0). */
export function countManagersByLevel(root: OrgNode): Map<number, number> {
  const map = new Map<number, number>();
  function walk(node: OrgNode, depth: number): void {
    if (depth > 0 && !isLeaf(node)) {
      map.set(depth, (map.get(depth) ?? 0) + 1);
    }
    for (const child of node.children ?? []) {
      walk(child, depth + 1);
    }
  }
  walk(root, 0);
  return map;
}
