import type { OrgNode, ColorCategory, ChartRecord, VersionRecord } from '../../src/types';

/**
 * Create a standard org tree with optional overrides on the root node.
 *
 * Default structure (3 levels):
 *   Alice (CEO)
 *   ├── Bob (CTO)
 *   │   ├── Diana (Engineer)
 *   │   └── Eve (Engineer)
 *   └── Carol (CFO)
 */
export function makeTree(overrides?: Partial<OrgNode>): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'b',
        name: 'Bob',
        title: 'CTO',
        children: [
          { id: 'd', name: 'Diana', title: 'Engineer' },
          { id: 'e', name: 'Eve', title: 'Engineer' },
        ],
      },
      {
        id: 'c',
        name: 'Carol',
        title: 'CFO',
      },
    ],
    ...overrides,
  };
}

/**
 * Create a flat root with two direct children (no grandchildren).
 *
 * Structure:
 *   Alice (CEO)
 *   ├── Bob (CTO)
 *   └── Carol (CFO)
 */
export function makeShallowTree(overrides?: Partial<OrgNode>): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
    ...overrides,
  };
}

/**
 * Create an M1 (first-line manager) tree where ALL children are leaf nodes.
 *
 * Structure:
 *   Alice (Manager)
 *   ├── Bob (Engineer)
 *   ├── Carol (Engineer)
 *   └── Diana (Engineer)
 */
export function makeM1Tree(overrides?: Partial<OrgNode>): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'Manager',
    children: [
      { id: 'm1-a', name: 'Bob', title: 'Engineer' },
      { id: 'm1-b', name: 'Carol', title: 'Engineer' },
      { id: 'm1-c', name: 'Diana', title: 'Engineer' },
    ],
    ...overrides,
  };
}

/**
 * Create a tree with advisor-style children (leaf nodes under a non-M1 manager).
 *
 * Structure:
 *   Alice (CEO)
 *   ├── Bob (CTO)          ← has children → not a leaf → parent is not M1
 *   │   └── Diana (Engineer)
 *   └── Carol (Advisor)     ← leaf under non-M1 → rendered as advisor
 */
export function makeAdvisorTree(overrides?: Partial<OrgNode>): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'adv-mgr',
        name: 'Bob',
        title: 'CTO',
        children: [{ id: 'adv-ic', name: 'Diana', title: 'Engineer' }],
      },
      { id: 'adv-leaf', name: 'Carol', title: 'Advisor' },
    ],
    ...overrides,
  };
}

/**
 * Create a linear chain of nodes with the specified depth.
 * Each level has exactly one child, producing a single-branch tree.
 */
export function makeDeepTree(depth: number, overrides?: Partial<OrgNode>): OrgNode {
  if (depth < 1) {
    return { id: 'deep-0', name: 'Node 0', title: 'Level 0', ...overrides };
  }

  let current: OrgNode = { id: `deep-${depth - 1}`, name: `Node ${depth - 1}`, title: `Level ${depth - 1}` };
  for (let i = depth - 2; i >= 0; i--) {
    current = { id: `deep-${i}`, name: `Node ${i}`, title: `Level ${i}`, children: [current] };
  }
  return { ...current, ...overrides };
}

/**
 * Create a tree where the root has `childCount` direct children (all leaves).
 */
export function makeWideTree(childCount: number, overrides?: Partial<OrgNode>): OrgNode {
  const children: OrgNode[] = Array.from({ length: childCount }, (_, i) => ({
    id: `wide-${i}`,
    name: `Person ${i}`,
    title: `Title ${i}`,
  }));
  return { id: 'root', name: 'Alice', title: 'CEO', children, ...overrides };
}

/**
 * Create a standard set of color categories.
 */
export function makeCategories(): ColorCategory[] {
  return [
    { id: 'cat-1', label: 'Open Position', color: '#fbbf24' },
    { id: 'cat-2', label: 'Contractor', color: '#60a5fa', nameColor: '#ffffff', titleColor: '#e0e0e0' },
  ];
}

/**
 * Create a ChartRecord with sensible defaults.
 */
export function makeChart(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    id: 'chart-id-1',
    name: 'My Org Chart',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    workingTree: makeTree(),
    categories: makeCategories(),
    ...overrides,
  };
}

/**
 * Create a VersionRecord with sensible defaults.
 */
export function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: 'version-id-1',
    chartId: 'chart-id-1',
    name: 'Q1 Snapshot',
    createdAt: '2024-03-01T00:00:00.000Z',
    tree: makeTree({ name: 'Alice (Q1)' }),
    ...overrides,
  };
}
