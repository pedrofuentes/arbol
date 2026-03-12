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
  if (node.categoryId !== undefined) clone.categoryId = node.categoryId;
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

  function cloneBase(n: OrgNode): OrgNode {
    const c: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (n.categoryId !== undefined) c.categoryId = n.categoryId;
    return c;
  }

  function walk(n: OrgNode): OrgNode {
    const clone = cloneBase(n);
    if (!n.children || n.children.length === 0) {
      return clone;
    }
    if (isM1(n)) {
      icMap.set(n.id, n.children.map(cloneBase));
      return clone;
    }
    // Non-M1 manager: separate PALs (leaf children) from manager children
    const pals = n.children.filter(isLeaf);
    const managers = n.children.filter((c) => !isLeaf(c));
    if (pals.length > 0) {
      palMap.set(n.id, pals.map(cloneBase));
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

/** Computes the manager level of a node (bottom-up): M1 = only ICs, M2 = has M1s, etc. Returns 0 for leaves. */
export function managerLevel(node: OrgNode): number {
  if (isLeaf(node)) return 0;
  let maxChildLevel = 0;
  for (const child of node.children!) {
    maxChildLevel = Math.max(maxChildLevel, managerLevel(child));
  }
  return maxChildLevel + 1;
}

/** Returns a map of manager level → count (e.g., M1→3, M2→2). Excludes leaves (level 0). */
export function countManagersByLevel(root: OrgNode): Map<number, number> {
  const map = new Map<number, number>();
  function walk(node: OrgNode): void {
    const level = managerLevel(node);
    if (level > 0) {
      map.set(level, (map.get(level) ?? 0) + 1);
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  walk(root);
  return map;
}
