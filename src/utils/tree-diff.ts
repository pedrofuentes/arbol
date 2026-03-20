import { OrgNode, DiffEntry } from '../types';
import { flattenTree, findNodeById, cloneTree } from './tree';

function buildParentMap(root: OrgNode): Map<string, string | null> {
  const map = new Map<string, string | null>();
  map.set(root.id, null);
  function walk(node: OrgNode): void {
    for (const child of node.children ?? []) {
      map.set(child.id, node.id);
      walk(child);
    }
  }
  walk(root);
  return map;
}

export function compareTrees(oldTree: OrgNode, newTree: OrgNode): Map<string, DiffEntry> {
  const diff = new Map<string, DiffEntry>();

  const oldNodes = flattenTree(oldTree);
  const newNodes = flattenTree(newTree);

  const oldMap = new Map<string, OrgNode>();
  for (const n of oldNodes) oldMap.set(n.id, n);

  const newMap = new Map<string, OrgNode>();
  for (const n of newNodes) newMap.set(n.id, n);

  const oldParents = buildParentMap(oldTree);
  const newParents = buildParentMap(newTree);

  // Process old tree nodes: removed, moved, modified, or unchanged
  for (const node of oldNodes) {
    const id = node.id;

    if (!newMap.has(id)) {
      const oldParentId = oldParents.get(id) ?? undefined;
      diff.set(id, { status: 'removed', oldParentId });
      continue;
    }

    const newNode = newMap.get(id)!;
    const oldParentId = oldParents.get(id) ?? undefined;
    const newParentId = newParents.get(id) ?? undefined;
    const parentChanged = oldParentId !== newParentId;

    const nameChanged = node.name !== newNode.name;
    const titleChanged = node.title !== newNode.title;
    const categoryChanged = node.categoryId !== newNode.categoryId;
    const levelChanged = node.level !== newNode.level;

    if (parentChanged) {
      const entry: DiffEntry = { status: 'moved', oldParentId, newParentId };
      if (nameChanged) entry.oldName = node.name;
      if (titleChanged) entry.oldTitle = node.title;
      if (categoryChanged) entry.oldCategoryId = node.categoryId;
      if (levelChanged) entry.oldLevel = node.level;
      diff.set(id, entry);
    } else if (nameChanged || titleChanged || categoryChanged || levelChanged) {
      const entry: DiffEntry = { status: 'modified' };
      if (nameChanged) entry.oldName = node.name;
      if (titleChanged) entry.oldTitle = node.title;
      if (categoryChanged) entry.oldCategoryId = node.categoryId;
      if (levelChanged) entry.oldLevel = node.level;
      diff.set(id, entry);
    } else {
      diff.set(id, { status: 'unchanged' });
    }
  }

  // Process new tree nodes: added
  for (const node of newNodes) {
    if (!oldMap.has(node.id)) {
      const newParentId = newParents.get(node.id) ?? undefined;
      diff.set(node.id, { status: 'added', newParentId });
    }
  }

  return diff;
}

export function buildMergedTree(
  oldTree: OrgNode,
  newTree: OrgNode,
  diff: Map<string, DiffEntry>
): OrgNode {
  const merged = cloneTree(newTree);

  // Collect removed IDs
  const removedIds: string[] = [];
  for (const [id, entry] of diff) {
    if (entry.status === 'removed') {
      removedIds.push(id);
    }
  }

  if (removedIds.length === 0) return merged;

  // Compute depths in old tree for parent-before-child ordering
  const depthMap = new Map<string, number>();
  function computeDepths(node: OrgNode, depth: number): void {
    depthMap.set(node.id, depth);
    for (const child of node.children ?? []) {
      computeDepths(child, depth + 1);
    }
  }
  computeDepths(oldTree, 0);

  removedIds.sort((a, b) => (depthMap.get(a) ?? 0) - (depthMap.get(b) ?? 0));

  const oldParentMap = buildParentMap(oldTree);

  // Track nodes in merged tree (updated as we inject ghost nodes)
  const mergedNodeMap = new Map<string, OrgNode>();
  for (const node of flattenTree(merged)) {
    mergedNodeMap.set(node.id, node);
  }

  for (const id of removedIds) {
    const oldNode = findNodeById(oldTree, id);
    if (!oldNode) continue;

    // Ghost node (leaf — removed children are injected separately)
    const ghost: OrgNode = { id: oldNode.id, name: oldNode.name, title: oldNode.title };
    if (oldNode.categoryId !== undefined) ghost.categoryId = oldNode.categoryId;
    if (oldNode.dottedLine !== undefined) ghost.dottedLine = oldNode.dottedLine;
    if (oldNode.level !== undefined) ghost.level = oldNode.level;

    // Walk up old-tree ancestors to find one present in merged tree
    let ancestorId = oldParentMap.get(id) ?? null;
    let targetParent: OrgNode | null = null;

    while (ancestorId !== null) {
      if (mergedNodeMap.has(ancestorId)) {
        targetParent = mergedNodeMap.get(ancestorId)!;
        break;
      }
      ancestorId = oldParentMap.get(ancestorId) ?? null;
    }

    // Fallback: inject under merged root
    if (!targetParent) {
      targetParent = merged;
    }

    if (!targetParent.children) {
      targetParent.children = [];
    }
    targetParent.children.push(ghost);
    mergedNodeMap.set(ghost.id, ghost);
  }

  return merged;
}

export function getDiffStats(diff: Map<string, DiffEntry>): {
  added: number;
  removed: number;
  moved: number;
  modified: number;
  unchanged: number;
} {
  const stats = { added: 0, removed: 0, moved: 0, modified: 0, unchanged: 0 };
  for (const entry of diff.values()) {
    stats[entry.status]++;
  }
  return stats;
}
