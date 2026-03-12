import { OrgNode } from '../types';
import { flattenTree } from './tree';

export interface SearchResult {
  id: string;
  name: string;
  title: string;
  matchField: 'name' | 'title' | 'both';
}

let lastRootId = '';
let lastQuery = '';
let lastResults: SearchResult[] = [];

/**
 * Search the org tree for nodes matching the query string.
 * Performs case-insensitive substring matching on name and title.
 * Results are cached and invalidated when the tree root or query changes.
 */
export function searchTree(root: OrgNode, query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Simple cache: invalidate when tree root changes or query changes
  if (root.id === lastRootId && trimmed === lastQuery) {
    return lastResults;
  }

  const lower = trimmed.toLowerCase();
  const nodes = flattenTree(root);

  const results = nodes
    .map((node) => {
      const nameMatch = node.name.toLowerCase().includes(lower);
      const titleMatch = node.title.toLowerCase().includes(lower);
      if (!nameMatch && !titleMatch) return null;

      const matchField: SearchResult['matchField'] =
        nameMatch && titleMatch ? 'both' : nameMatch ? 'name' : 'title';

      return { id: node.id, name: node.name, title: node.title, matchField };
    })
    .filter((r): r is SearchResult => r !== null);

  lastRootId = root.id;
  lastQuery = trimmed;
  lastResults = results;

  return results;
}

export function clearSearchCache(): void {
  lastRootId = '';
  lastQuery = '';
  lastResults = [];
}

/**
 * Returns a Set of node IDs that match the query.
 * Convenience wrapper for use with the renderer highlighting.
 */
export function getMatchingNodeIds(root: OrgNode, query: string): Set<string> {
  return new Set(searchTree(root, query).map((r) => r.id));
}

/**
 * Returns a Set of node IDs that should be visible to show all matches.
 * This includes the matching nodes AND all their ancestors up to root.
 */
export function getVisibleNodesForMatches(
  root: OrgNode,
  matchIds: Set<string>,
): Set<string> {
  if (matchIds.size === 0) return new Set();

  const visible = new Set<string>();

  function walk(node: OrgNode): boolean {
    let dominated = matchIds.has(node.id);
    for (const child of node.children ?? []) {
      if (walk(child)) dominated = true;
    }
    if (dominated) visible.add(node.id);
    return dominated;
  }

  walk(root);
  return visible;
}
