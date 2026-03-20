import type { OrgNode, ColorCategory } from '../types';
import { flattenTree, isLeaf, isM1 } from './tree';

export interface SpanOfControlStats {
  avg: number;
  min: number;
  max: number;
  median: number;
  distribution: Map<number, number>;
}

export interface ManagerAlert {
  id: string;
  name: string;
  title: string;
  directReports: number;
}

export interface OrgMetrics {
  totalHeadcount: number;
  managerCount: number;
  icCount: number;
  advisorCount: number;
  managerToIcRatio: number;

  orgDepth: number;
  avgDepth: number;
  layerCounts: number[];

  spanOfControl: SpanOfControlStats;
  wideSpanManagers: ManagerAlert[];
  narrowSpanManagers: ManagerAlert[];
  singleChildManagers: ManagerAlert[];

  levelDistribution: Map<string, number>;
  nodesWithoutLevel: number;

  categoryDistribution: Map<string, number>;
  uncategorizedCount: number;
}

export interface MetricsOptions {
  resolveLevel?: (raw: string) => string;
  wideSpanThreshold?: number;
  narrowSpanThreshold?: number;
  categories?: ColorCategory[];
}

function computeDepth(node: OrgNode, depth: number): number {
  if (isLeaf(node)) return depth;
  let max = depth;
  for (const child of node.children!) {
    const d = computeDepth(child, depth + 1);
    if (d > max) max = d;
  }
  return max;
}

function collectLeafDepths(node: OrgNode, depth: number, result: number[]): void {
  if (isLeaf(node)) {
    result.push(depth);
    return;
  }
  for (const child of node.children!) {
    collectLeafDepths(child, depth + 1, result);
  }
}

function buildLayerCounts(node: OrgNode): number[] {
  const counts: number[] = [];
  const queue: { node: OrgNode; depth: number }[] = [{ node, depth: 0 }];
  while (queue.length > 0) {
    const { node: n, depth } = queue.shift()!;
    while (counts.length <= depth) counts.push(0);
    counts[depth]++;
    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }
  }
  return counts;
}

function median(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = Math.floor(len / 2);
  if (len % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toAlert(node: OrgNode, span: number): ManagerAlert {
  return { id: node.id, name: node.name, title: node.title, directReports: span };
}

export function computeMetrics(tree: OrgNode, options?: MetricsOptions): OrgMetrics {
  const wideThreshold = options?.wideSpanThreshold ?? 10;
  const narrowThreshold = options?.narrowSpanThreshold ?? 3;

  const all = flattenTree(tree);
  const totalHeadcount = all.length;

  let managerCount = 0;
  let icCount = 0;
  let advisorCount = 0;

  // Classify nodes via recursive walk
  const classify = (node: OrgNode): void => {
    if (isLeaf(node)) return;
    managerCount++;
    const m1 = isM1(node);
    for (const child of node.children!) {
      if (isLeaf(child)) {
        if (m1) icCount++;
        else advisorCount++;
      } else {
        classify(child);
      }
    }
  };
  classify(tree);

  const nonManagerLeaves = icCount + advisorCount;
  const managerToIcRatio = nonManagerLeaves === 0 ? 0 : managerCount / nonManagerLeaves;

  // Structure shape
  const orgDepth = computeDepth(tree, 0);
  const leafDepths: number[] = [];
  collectLeafDepths(tree, 0, leafDepths);
  const avgDepth = leafDepths.length === 0 ? 0 : round1(leafDepths.reduce((a, b) => a + b, 0) / leafDepths.length);
  const layerCounts = buildLayerCounts(tree);

  // Span of control
  const spans: number[] = [];
  const managers: { node: OrgNode; span: number }[] = [];
  const collectSpans = (node: OrgNode): void => {
    if (isLeaf(node)) return;
    const span = node.children!.length;
    spans.push(span);
    managers.push({ node, span });
    for (const child of node.children!) collectSpans(child);
  };
  collectSpans(tree);

  const sortedSpans = [...spans].sort((a, b) => a - b);
  const spanOfControl: SpanOfControlStats = {
    avg: sortedSpans.length === 0 ? 0 : round1(sortedSpans.reduce((a, b) => a + b, 0) / sortedSpans.length),
    min: sortedSpans.length === 0 ? 0 : sortedSpans[0],
    max: sortedSpans.length === 0 ? 0 : sortedSpans[sortedSpans.length - 1],
    median: median(sortedSpans),
    distribution: new Map<number, number>(),
  };
  for (const s of spans) {
    spanOfControl.distribution.set(s, (spanOfControl.distribution.get(s) ?? 0) + 1);
  }

  const wideSpanManagers = managers
    .filter(m => m.span > wideThreshold)
    .map(m => toAlert(m.node, m.span));
  const narrowSpanManagers = managers
    .filter(m => m.span < narrowThreshold)
    .map(m => toAlert(m.node, m.span));
  const singleChildManagers = managers
    .filter(m => m.span === 1)
    .map(m => toAlert(m.node, m.span));

  // Level distribution
  const levelDistribution = new Map<string, number>();
  let nodesWithoutLevel = 0;
  for (const node of all) {
    if (node.level) {
      const key = node.level;
      levelDistribution.set(key, (levelDistribution.get(key) ?? 0) + 1);
    } else {
      nodesWithoutLevel++;
    }
  }

  // Category distribution
  const categoryDistribution = new Map<string, number>();
  let uncategorizedCount = 0;
  for (const node of all) {
    if (node.categoryId) {
      categoryDistribution.set(node.categoryId, (categoryDistribution.get(node.categoryId) ?? 0) + 1);
    } else {
      uncategorizedCount++;
    }
  }

  return {
    totalHeadcount,
    managerCount,
    icCount,
    advisorCount,
    managerToIcRatio,
    orgDepth,
    avgDepth,
    layerCounts,
    spanOfControl,
    wideSpanManagers,
    narrowSpanManagers,
    singleChildManagers,
    levelDistribution,
    nodesWithoutLevel,
    categoryDistribution,
    uncategorizedCount,
  };
}
