import { describe, it, expect } from 'vitest';
import type { OrgNode } from '../../src/types';
import { computeMetrics } from '../../src/utils/analytics';

// ── Fixtures ─────────────────────────────────────────────────────────

const singleNode: OrgNode = { id: '1', name: 'CEO', title: 'CEO' };

const simpleTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'CEO', level: 'L1',
  children: [
    { id: 'm1', name: 'VP Sales', title: 'VP', level: 'L2', children: [
      { id: 'ic1', name: 'Alice', title: 'Rep', level: 'L5' },
      { id: 'ic2', name: 'Bob', title: 'Rep', level: 'L5' },
    ]},
    { id: 'm2', name: 'VP Eng', title: 'VP', level: 'L2', children: [
      { id: 'ic3', name: 'Charlie', title: 'Dev', level: 'L4' },
      { id: 'ic4', name: 'Diana', title: 'Dev', level: 'L5' },
    ]},
    { id: 'm3', name: 'VP Ops', title: 'VP', level: 'L2', children: [
      { id: 'ic5', name: 'Eve', title: 'Analyst', level: 'L5' },
      { id: 'ic6', name: 'Frank', title: 'Analyst' },
    ]},
  ],
};

const deepTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'CEO',
  children: [
    { id: 'advisor', name: 'CoS', title: 'Chief of Staff' },
    { id: 'd1', name: 'Director', title: 'Dir', children: [
      { id: 'mgr1', name: 'Manager', title: 'Mgr', children: [
        { id: 'lead1', name: 'Lead', title: 'Lead', children: [
          { id: 'ic1', name: 'Dev', title: 'Dev' },
        ]},
      ]},
    ]},
  ],
};

const wideTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'CEO',
  children: Array.from({ length: 15 }, (_, i) => ({
    id: `ic${i}`, name: `Person ${i}`, title: 'IC',
  })),
};

const categorizedTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'CEO', categoryId: 'cat-exec',
  children: [
    { id: 'a', name: 'A', title: 'A', categoryId: 'cat-eng', children: [
      { id: 'a1', name: 'A1', title: 'A1', categoryId: 'cat-eng' },
      { id: 'a2', name: 'A2', title: 'A2', categoryId: 'cat-design' },
    ]},
    { id: 'b', name: 'B', title: 'B' },
  ],
};

const emptyChildrenTree: OrgNode = {
  id: 'root', name: 'Boss', title: 'Boss',
  children: [],
};

// ── Section 1: Headcount Overview ────────────────────────────────────

describe('computeMetrics – Headcount Overview', () => {
  it('single node: headcount = 1, managers = 0, ICs = 0, advisors = 0', () => {
    const m = computeMetrics(singleNode);
    expect(m.totalHeadcount).toBe(1);
    expect(m.managerCount).toBe(0);
    expect(m.icCount).toBe(0);
    expect(m.advisorCount).toBe(0);
  });

  it('simpleTree: headcount = 10, managers = 4, ICs = 6, advisors = 0', () => {
    const m = computeMetrics(simpleTree);
    expect(m.totalHeadcount).toBe(10);
    expect(m.managerCount).toBe(4);
    expect(m.icCount).toBe(6);
    expect(m.advisorCount).toBe(0);
  });

  it('deepTree: counts advisor correctly', () => {
    const m = computeMetrics(deepTree);
    expect(m.totalHeadcount).toBe(6);
    expect(m.advisorCount).toBe(1);
  });

  it('deepTree: managers include CEO, Director, Manager, Lead', () => {
    const m = computeMetrics(deepTree);
    expect(m.managerCount).toBe(4);
  });

  it('deepTree: 1 IC (leaf under M1 Lead)', () => {
    const m = computeMetrics(deepTree);
    expect(m.icCount).toBe(1);
  });

  it('manager-to-IC ratio: simpleTree = 4/6 ≈ 0.67', () => {
    const m = computeMetrics(simpleTree);
    expect(m.managerToIcRatio).toBeCloseTo(4 / 6, 2);
  });

  it('manager-to-IC ratio: single node = 0', () => {
    const m = computeMetrics(singleNode);
    expect(m.managerToIcRatio).toBe(0);
  });

  it('manager-to-IC ratio: deepTree = 4 / (1+1) = 2', () => {
    const m = computeMetrics(deepTree);
    expect(m.managerToIcRatio).toBe(2);
  });

  it('wideTree: CEO is only manager, 15 ICs, 0 advisors', () => {
    const m = computeMetrics(wideTree);
    expect(m.managerCount).toBe(1);
    expect(m.icCount).toBe(15);
    expect(m.advisorCount).toBe(0);
  });

  it('empty children array treated as leaf (headcount = 1)', () => {
    const m = computeMetrics(emptyChildrenTree);
    expect(m.totalHeadcount).toBe(1);
    expect(m.managerCount).toBe(0);
  });
});

// ── Section 2: Structure Shape ───────────────────────────────────────

describe('computeMetrics – Structure Shape', () => {
  it('single node depth = 0', () => {
    const m = computeMetrics(singleNode);
    expect(m.orgDepth).toBe(0);
  });

  it('simpleTree depth = 2', () => {
    const m = computeMetrics(simpleTree);
    expect(m.orgDepth).toBe(2);
  });

  it('deepTree depth = 4', () => {
    const m = computeMetrics(deepTree);
    expect(m.orgDepth).toBe(4);
  });

  it('wideTree depth = 1', () => {
    const m = computeMetrics(wideTree);
    expect(m.orgDepth).toBe(1);
  });

  it('simpleTree avgDepth: all leaves at depth 2, so avgDepth = 2.0', () => {
    const m = computeMetrics(simpleTree);
    expect(m.avgDepth).toBe(2.0);
  });

  it('deepTree avgDepth: advisor at 1, IC at 4 → avgDepth = 2.5', () => {
    const m = computeMetrics(deepTree);
    expect(m.avgDepth).toBe(2.5);
  });

  it('single node avgDepth = 0', () => {
    const m = computeMetrics(singleNode);
    expect(m.avgDepth).toBe(0);
  });

  it('layerCounts for simpleTree: [1, 3, 6]', () => {
    const m = computeMetrics(simpleTree);
    expect(m.layerCounts).toEqual([1, 3, 6]);
  });

  it('layerCounts for deepTree: [1, 2, 1, 1, 1]', () => {
    const m = computeMetrics(deepTree);
    expect(m.layerCounts).toEqual([1, 2, 1, 1, 1]);
  });

  it('layerCounts for singleNode: [1]', () => {
    const m = computeMetrics(singleNode);
    expect(m.layerCounts).toEqual([1]);
  });

  it('layerCounts for wideTree: [1, 15]', () => {
    const m = computeMetrics(wideTree);
    expect(m.layerCounts).toEqual([1, 15]);
  });
});

// ── Section 3: Span of Control ───────────────────────────────────────

describe('computeMetrics – Span of Control', () => {
  it('simpleTree span avg = (3+2+2+2)/4 = 2.3', () => {
    const m = computeMetrics(simpleTree);
    expect(m.spanOfControl.avg).toBeCloseTo(2.25, 1);
  });

  it('simpleTree span min = 2, max = 3', () => {
    const m = computeMetrics(simpleTree);
    expect(m.spanOfControl.min).toBe(2);
    expect(m.spanOfControl.max).toBe(3);
  });

  it('simpleTree span median: sorted [2,2,2,3] → median = 2', () => {
    const m = computeMetrics(simpleTree);
    expect(m.spanOfControl.median).toBe(2);
  });

  it('wideTree span: 1 manager with 15 → avg=15, min=max=median=15', () => {
    const m = computeMetrics(wideTree);
    expect(m.spanOfControl.avg).toBe(15);
    expect(m.spanOfControl.min).toBe(15);
    expect(m.spanOfControl.max).toBe(15);
    expect(m.spanOfControl.median).toBe(15);
  });

  it('single node: span all zeros', () => {
    const m = computeMetrics(singleNode);
    expect(m.spanOfControl.avg).toBe(0);
    expect(m.spanOfControl.min).toBe(0);
    expect(m.spanOfControl.max).toBe(0);
    expect(m.spanOfControl.median).toBe(0);
  });

  it('span distribution: simpleTree has {2: 3, 3: 1}', () => {
    const m = computeMetrics(simpleTree);
    expect(m.spanOfControl.distribution).toEqual(new Map([[2, 3], [3, 1]]));
  });

  it('span distribution: wideTree has {15: 1}', () => {
    const m = computeMetrics(wideTree);
    expect(m.spanOfControl.distribution).toEqual(new Map([[15, 1]]));
  });

  it('span distribution: singleNode is empty map', () => {
    const m = computeMetrics(singleNode);
    expect(m.spanOfControl.distribution).toEqual(new Map());
  });

  it('deepTree span: 4 managers each with span of 1 or 2', () => {
    const m = computeMetrics(deepTree);
    // CEO: 2 children, Director: 1, Manager: 1, Lead: 1
    expect(m.spanOfControl.min).toBe(1);
    expect(m.spanOfControl.max).toBe(2);
  });

  it('wideSpanManagers with default threshold 10: wideTree CEO flagged', () => {
    const m = computeMetrics(wideTree);
    expect(m.wideSpanManagers).toHaveLength(1);
    expect(m.wideSpanManagers[0].id).toBe('root');
    expect(m.wideSpanManagers[0].directReports).toBe(15);
  });

  it('wideSpanManagers: simpleTree has none (max span = 3)', () => {
    const m = computeMetrics(simpleTree);
    expect(m.wideSpanManagers).toHaveLength(0);
  });

  it('narrowSpanManagers with default threshold 3: simpleTree VPs flagged', () => {
    const m = computeMetrics(simpleTree);
    expect(m.narrowSpanManagers).toHaveLength(3);
    const ids = m.narrowSpanManagers.map(a => a.id).sort();
    expect(ids).toEqual(['m1', 'm2', 'm3']);
  });

  it('narrowSpanManagers: wideTree has none (span = 15)', () => {
    const m = computeMetrics(wideTree);
    expect(m.narrowSpanManagers).toHaveLength(0);
  });

  it('singleChildManagers: deepTree has Director, Manager, Lead', () => {
    const m = computeMetrics(deepTree);
    expect(m.singleChildManagers).toHaveLength(3);
    const ids = m.singleChildManagers.map(a => a.id).sort();
    expect(ids).toEqual(['d1', 'lead1', 'mgr1']);
  });

  it('singleChildManagers: simpleTree has none', () => {
    const m = computeMetrics(simpleTree);
    expect(m.singleChildManagers).toHaveLength(0);
  });

  it('custom wideSpanThreshold = 5 flags managers with > 5', () => {
    const m = computeMetrics(wideTree, { wideSpanThreshold: 5 });
    expect(m.wideSpanManagers).toHaveLength(1);
    expect(m.wideSpanManagers[0].directReports).toBe(15);
  });

  it('custom narrowSpanThreshold = 4 flags simpleTree CEO (3 reports)', () => {
    const m = computeMetrics(simpleTree, { narrowSpanThreshold: 4 });
    const ids = m.narrowSpanManagers.map(a => a.id).sort();
    expect(ids).toEqual(['m1', 'm2', 'm3', 'root']);
  });

  it('median with even count: sorted [1,1,1,2] → median = 1', () => {
    const m = computeMetrics(deepTree);
    // CEO:2, Director:1, Manager:1, Lead:1 → sorted [1,1,1,2]
    expect(m.spanOfControl.median).toBe(1);
  });

  it('span avg is rounded to 1 decimal', () => {
    const m = computeMetrics(simpleTree);
    // 2.25 → 2.3 rounded to 1 decimal
    const str = m.spanOfControl.avg.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});

// ── Section 4: Level Distribution ────────────────────────────────────

describe('computeMetrics – Level Distribution', () => {
  it('simpleTree: L1=1, L2=3, L4=1, L5=4, nodesWithoutLevel=1', () => {
    const m = computeMetrics(simpleTree);
    expect(m.levelDistribution).toEqual(new Map([
      ['L1', 1], ['L2', 3], ['L4', 1], ['L5', 4],
    ]));
    expect(m.nodesWithoutLevel).toBe(1);
  });

  it('deepTree: no levels → all nodesWithoutLevel', () => {
    const m = computeMetrics(deepTree);
    expect(m.levelDistribution.size).toBe(0);
    expect(m.nodesWithoutLevel).toBe(6);
  });

  it('singleNode without level: nodesWithoutLevel = 1', () => {
    const m = computeMetrics(singleNode);
    expect(m.nodesWithoutLevel).toBe(1);
  });

  it('all nodes with levels: nodesWithoutLevel = 0', () => {
    const tree: OrgNode = {
      id: '1', name: 'A', title: 'A', level: 'L1',
      children: [
        { id: '2', name: 'B', title: 'B', level: 'L2' },
      ],
    };
    const m = computeMetrics(tree);
    expect(m.nodesWithoutLevel).toBe(0);
    expect(m.levelDistribution).toEqual(new Map([['L1', 1], ['L2', 1]]));
  });
});

// ── Section 5: Category Distribution ─────────────────────────────────

describe('computeMetrics – Category Distribution', () => {
  it('categorizedTree: correct counts per categoryId', () => {
    const m = computeMetrics(categorizedTree);
    expect(m.categoryDistribution).toEqual(new Map([
      ['cat-exec', 1],
      ['cat-eng', 2],
      ['cat-design', 1],
    ]));
  });

  it('categorizedTree: uncategorized count = 1 (node B)', () => {
    const m = computeMetrics(categorizedTree);
    expect(m.uncategorizedCount).toBe(1);
  });

  it('tree without categories: all uncategorized', () => {
    const m = computeMetrics(deepTree);
    expect(m.categoryDistribution.size).toBe(0);
    expect(m.uncategorizedCount).toBe(6);
  });

  it('single node without category: uncategorized = 1', () => {
    const m = computeMetrics(singleNode);
    expect(m.uncategorizedCount).toBe(1);
    expect(m.categoryDistribution.size).toBe(0);
  });

  it('single node with category: categorized = 1, uncategorized = 0', () => {
    const node: OrgNode = { id: '1', name: 'CEO', title: 'CEO', categoryId: 'cat-a' };
    const m = computeMetrics(node);
    expect(m.categoryDistribution).toEqual(new Map([['cat-a', 1]]));
    expect(m.uncategorizedCount).toBe(0);
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────

describe('computeMetrics – Edge Cases', () => {
  it('empty children array treated as leaf', () => {
    const m = computeMetrics(emptyChildrenTree);
    expect(m.totalHeadcount).toBe(1);
    expect(m.managerCount).toBe(0);
    expect(m.icCount).toBe(0);
    expect(m.orgDepth).toBe(0);
    expect(m.layerCounts).toEqual([1]);
  });

  it('two-level tree: root + 1 child', () => {
    const tree: OrgNode = {
      id: 'r', name: 'Root', title: 'R',
      children: [{ id: 'c', name: 'Child', title: 'C' }],
    };
    const m = computeMetrics(tree);
    expect(m.totalHeadcount).toBe(2);
    expect(m.managerCount).toBe(1);
    expect(m.icCount).toBe(1);
    expect(m.orgDepth).toBe(1);
    expect(m.singleChildManagers).toHaveLength(1);
  });

  it('manager alert includes correct name and title', () => {
    const m = computeMetrics(wideTree);
    const alert = m.wideSpanManagers[0];
    expect(alert.name).toBe('CEO');
    expect(alert.title).toBe('CEO');
    expect(alert.directReports).toBe(15);
  });

  it('span avg rounded: deepTree avg = (2+1+1+1)/4 = 1.3', () => {
    const m = computeMetrics(deepTree);
    expect(m.spanOfControl.avg).toBe(1.3);
  });

  it('avgDepth rounded to 1 decimal', () => {
    // Tree with leaves at different depths
    const tree: OrgNode = {
      id: 'r', name: 'R', title: 'R',
      children: [
        { id: 'a', name: 'A', title: 'A' },
        { id: 'b', name: 'B', title: 'B', children: [
          { id: 'c', name: 'C', title: 'C' },
        ]},
      ],
    };
    const m = computeMetrics(tree);
    // Leaves: A at depth 1, C at depth 2 → avg = 1.5
    expect(m.avgDepth).toBe(1.5);
  });

  it('median with odd count of managers', () => {
    // 3 managers: CEO(3), VP1(2), VP2(1) → sorted [1,2,3] → median = 2
    const tree: OrgNode = {
      id: 'r', name: 'R', title: 'R',
      children: [
        { id: 'v1', name: 'V1', title: 'V1', children: [
          { id: 'a', name: 'A', title: 'A' },
          { id: 'b', name: 'B', title: 'B' },
        ]},
        { id: 'v2', name: 'V2', title: 'V2', children: [
          { id: 'c', name: 'C', title: 'C' },
        ]},
      ],
    };
    const m = computeMetrics(tree);
    expect(m.spanOfControl.median).toBe(2);
  });
});
