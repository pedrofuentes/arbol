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
  return structuredClone(node);
}

export function filterVisibleTree(node: OrgNode): OrgNode {
  const clone: OrgNode = { id: node.id, name: node.name, title: node.title };
  if (node.categoryId !== undefined) clone.categoryId = node.categoryId;
  if (node.dottedLine !== undefined) clone.dottedLine = node.dottedLine;
  if (node.level !== undefined) clone.level = node.level;
  if (node.pinnedTitle !== undefined) clone.pinnedTitle = node.pinnedTitle;
  if (node.children && node.children.length > 0) {
    clone.children = node.children.map((child) => filterVisibleTree(child));
  }
  return clone;
}

export function flattenTree(node: OrgNode): OrgNode[] {
  const result: OrgNode[] = [];
  const stack: OrgNode[] = [node];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    const children = current.children;
    if (children) {
      // Push in reverse to maintain left-to-right order
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }
  return result;
}

export function isLeaf(node: OrgNode): boolean {
  return !node.children || node.children.length === 0;
}

/**
 * A manager is M1 (first-line manager) if ALL children are leaf nodes.
 *
 * Note: This means node types are determined solely by tree structure —
 * there is no explicit role field. If a manager has a mix of "IC-like"
 * and "advisor-like" leaf children, they will ALL be treated as ICs.
 * Adding a non-leaf child converts the node from M1 to regular manager,
 * changing the rendering mode for all its children.
 *
 * @see stripM1Children() for how M1 detection affects layout
 * @see isLeaf() for the leaf node check
 */
export function isM1(node: OrgNode): boolean {
  if (!node.children || node.children.length === 0) return false;
  return node.children.every(isLeaf);
}

/**
 * Clones the tree, stripping children from M1 nodes and leaf children from
 * non-M1 managers. Returns the pruned layout tree plus two side-maps:
 *
 * - **icMap**: M1 node id → its IC children (rendered as vertical stacks).
 * - **palMap**: non-M1 manager id → its Advisor (leaf) children (rendered
 *   as alternating left/right elbow connectors).
 *
 * The layout tree only contains non-leaf manager nodes so that D3's tree
 * layout computes positions for managers only. ICs and Advisors are then
 * positioned by the renderer using the side-maps.
 *
 * @see isM1() for the M1 classification rule
 */
export function stripM1Children(node: OrgNode): {
  layoutTree: OrgNode;
  icMap: Map<string, OrgNode[]>;
  palMap: Map<string, OrgNode[]>;
}{
  const icMap = new Map<string, OrgNode[]>();
  const palMap = new Map<string, OrgNode[]>();

  function cloneBase(n: OrgNode): OrgNode {
    const c: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (n.categoryId !== undefined) c.categoryId = n.categoryId;
    if (n.dottedLine !== undefined) c.dottedLine = n.dottedLine;
    if (n.level !== undefined) c.level = n.level;
    if (n.pinnedTitle !== undefined) c.pinnedTitle = n.pinnedTitle;
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
    // Non-M1 manager: separate Advisors (leaf children) from manager children
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

/** Counts all descendants of a node (children, grandchildren, etc.). Returns 0 for leaf nodes. */
export function countDescendants(node: OrgNode): number {
  return flattenTree(node).length - 1;
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
  // Single-pass bottom-up computation avoids O(n²) repeated managerLevel() calls
  function walk(node: OrgNode): number {
    if (isLeaf(node)) return 0;
    let maxChildLevel = 0;
    for (const child of node.children!) {
      maxChildLevel = Math.max(maxChildLevel, walk(child));
    }
    const level = maxChildLevel + 1;
    map.set(level, (map.get(level) ?? 0) + 1);
    return level;
  }
  walk(root);
  return map;
}

/** Average span of control (direct reports per manager) within a subtree. */
export function avgSpanOfControl(root: OrgNode): number {
  let managerCount = 0;
  let totalDirectReports = 0;
  function walk(node: OrgNode): void {
    if (!isLeaf(node)) {
      managerCount++;
      totalDirectReports += node.children!.length;
      for (const child of node.children!) walk(child);
    }
  }
  walk(root);
  return managerCount === 0 ? 0 : totalDirectReports / managerCount;
}
