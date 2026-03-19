import type { OrgNode } from '../../src/types';

/**
 * Generate a deterministic tree with the specified number of nodes.
 * Uses a counter-based pattern for child counts to ensure reproducibility.
 */
export function generateTree(nodeCount: number): OrgNode {
  let counter = 0;
  const root: OrgNode = {
    id: `node-${counter++}`,
    name: 'CEO',
    title: 'Chief Executive Officer',
    children: [],
  };

  const queue: OrgNode[] = [root];
  while (counter < nodeCount && queue.length > 0) {
    const parent = queue.shift()!;
    const childCount = Math.min((counter % 3) + 3, nodeCount - counter);
    parent.children = [];
    for (let i = 0; i < childCount && counter < nodeCount; i++) {
      const child: OrgNode = {
        id: `node-${counter}`,
        name: `Person ${counter}`,
        title: `Title ${counter}`,
        children: [],
      };
      counter++;
      parent.children.push(child);
      queue.push(child);
    }
  }
  return root;
}
