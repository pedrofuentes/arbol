import { hierarchy, tree } from 'd3';
import type { HierarchyPointNode } from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree, stripM1Children } from '../utils/tree';
import type { ResolvedOptions } from './chart-renderer';

/** Number of advisor (pal) nodes displayed per row in the layout. */
export const ADVISORS_PER_ROW = 2;

/** Pre-computes descendant counts for every node in a single O(n) bottom-up pass. */
export function precomputeDescendantCounts(root: OrgNode): Map<string, number> {
  const counts = new Map<string, number>();
  function walk(node: OrgNode): number {
    let count = 0;
    if (node.children) {
      for (const child of node.children) {
        count += 1 + walk(child);
      }
    }
    counts.set(node.id, count);
    return count;
  }
  walk(root);
  return counts;
}

export interface LayoutNode {
  id: string;
  name: string;
  title: string;
  x: number; // center X in pixels
  y: number; // top Y in pixels
  width: number;
  height: number;
  type: 'manager' | 'ic' | 'pal';
  collapsible?: boolean;
  categoryId?: string;
  descendantCount?: number;
  level?: string;
  pinnedTitle?: boolean;
}

export interface LayoutLink {
  path: string; // SVG path d attribute "M... L..."
  layer: 'tree' | 'pal';
  dottedLine?: boolean;
}

export interface LayoutICContainer {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  icContainers: LayoutICContainer[];
  boundingBox: { minX: number; minY: number; width: number; height: number };
}

export function computeLayout(root: OrgNode, opts: ResolvedOptions): LayoutResult {
  // Pre-compute descendant counts in a single O(n) pass (avoids O(n²) flattenTree per node)
  const descendantCounts = precomputeDescendantCounts(root);

  const visibleTree = filterVisibleTree(root);
  const { layoutTree, icMap, palMap } = stripM1Children(visibleTree);

  const {
    nodeWidth,
    nodeHeight,
    horizontalSpacing,
    topVerticalSpacing,
    bottomVerticalSpacing,
    palCenterGap,
    palTopGap,
    palBottomGap,
    palRowGap,
    branchSpacing,
    icNodeWidth,
    icGap,
    icContainerPadding,
  } = opts;

  const totalVerticalSpacing = topVerticalSpacing + bottomVerticalSpacing;

  const hier = hierarchy(layoutTree, (d) => d.children);
  const palTotalWidth = nodeWidth * ADVISORS_PER_ROW + palCenterGap;

  const treeLayout = tree<OrgNode>()
    .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + totalVerticalSpacing])
    .separation((a, b) => {
      const aHasPals = palMap.has(a.data.id);
      const bHasPals = palMap.has(b.data.id);
      const base = a.parent === b.parent ? 1 : 2;
      if (aHasPals || bHasPals) {
        return Math.max(base, palTotalWidth / (nodeWidth + horizontalSpacing) + 0.3);
      }
      return base;
    });

  const treeData = treeLayout(hier);

  // Compute Advisor stack height for a given node
  const getPalStackHeight = (nodeId: string): number => {
    const pals = palMap.get(nodeId);
    if (!pals || pals.length === 0) return 0;
    const rows = Math.ceil(pals.length / ADVISORS_PER_ROW);
    return palTopGap + palRowGap + rows * nodeHeight + (rows - 1) * palRowGap + palBottomGap;
  };

  // Shift a subtree vertically
  const shiftSubtree = (node: HierarchyPointNode<OrgNode>, extraY: number): void => {
    node.y += extraY;
    for (const child of node.children ?? []) {
      shiftSubtree(child, extraY);
    }
  };

  // Apply vertical shifts for Advisor stacks, single-child, and multi-child nodes
  const extraNonPalShift = bottomVerticalSpacing - topVerticalSpacing;
  for (const node of treeData.descendants()) {
    const palHeight = getPalStackHeight(node.data.id);
    if (palHeight > 0 && node.children) {
      for (const child of node.children) {
        shiftSubtree(child, palHeight);
      }
    } else if (node.children && node.children.length === 1) {
      for (const child of node.children) {
        shiftSubtree(child, -topVerticalSpacing);
      }
    } else if (extraNonPalShift > 0 && node.children && node.children.length > 1) {
      for (const child of node.children) {
        shiftSubtree(child, extraNonPalShift);
      }
    }
  }

  // Enforce branchSpacing: ensure subtree bounding boxes don't overlap.
  // boundsCache is a local variable — recreated each computeLayout() call
  // and not captured by any returned closure, so it's GC'd after the call returns.
  const boundsCache = new Map<HierarchyPointNode<OrgNode>, [number, number]>();

  const getSubtreeXBounds = (node: HierarchyPointNode<OrgNode>): [number, number] => {
    const cached = boundsCache.get(node);
    if (cached) return cached;

    let minX = node.x - nodeWidth / 2;
    let maxX = node.x + nodeWidth / 2;

    if (palMap.has(node.data.id)) {
      const pals = palMap.get(node.data.id)!;
      const palLeft = node.x - palCenterGap / 2 - nodeWidth;
      const palRight = node.x + palCenterGap / 2 + nodeWidth;
      minX = Math.min(minX, palLeft);
      if (pals.length > 1) {
        maxX = Math.max(maxX, palRight);
      }
    }

    if (icMap.has(node.data.id)) {
      const icTotalWidth = icNodeWidth + icContainerPadding * 2;
      minX = Math.min(minX, node.x - icTotalWidth / 2);
      maxX = Math.max(maxX, node.x + icTotalWidth / 2);
    }

    for (const child of node.children ?? []) {
      const [childMin, childMax] = getSubtreeXBounds(child);
      minX = Math.min(minX, childMin);
      maxX = Math.max(maxX, childMax);
    }
    const result: [number, number] = [minX, maxX];
    boundsCache.set(node, result);
    return result;
  };

  const invalidateBoundsUp = (node: HierarchyPointNode<OrgNode>): void => {
    let current: HierarchyPointNode<OrgNode> | null = node;
    while (current) {
      boundsCache.delete(current);
      current = current.parent;
    }
  };

  const shiftSubtreeX = (node: HierarchyPointNode<OrgNode>, dx: number): void => {
    node.x += dx;
    // Shift cached bounds directly for this node and all descendants
    const cached = boundsCache.get(node);
    if (cached) {
      cached[0] += dx;
      cached[1] += dx;
    }
    for (const child of node.children ?? []) {
      shiftSubtreeX(child, dx);
    }
  };

  const enforceSpacing = (node: HierarchyPointNode<OrgNode>): void => {
    if (!node.children || node.children.length < 2) {
      for (const child of node.children ?? []) {
        enforceSpacing(child);
      }
      // Single child: align subtree vertically under parent
      if (node.children && node.children.length === 1) {
        const dx = node.x - node.children[0].x;
        if (dx !== 0) {
          shiftSubtreeX(node.children[0], dx);
          invalidateBoundsUp(node);
        }
      }
      return;
    }

    for (const child of node.children) {
      enforceSpacing(child);
    }

    for (let i = 1; i < node.children.length; i++) {
      const left = node.children[i - 1];
      const right = node.children[i];
      const [, leftMax] = getSubtreeXBounds(left);
      const [rightMin] = getSubtreeXBounds(right);
      const gap = rightMin - leftMax;
      const shift = branchSpacing - gap;
      if (shift !== 0) {
        shiftSubtreeX(right, shift);
      }
    }

    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    const childrenCenter = (firstChild.x + lastChild.x) / 2;
    node.x = childrenCenter;
    boundsCache.delete(node);
  };

  enforceSpacing(treeData);

  // --- Collect layout result ---
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  const icContainers: LayoutICContainer[] = [];

  // Tree links (elbow paths)
  for (const link of treeData.links()) {
    const sx = link.source.x;
    const palOffset = getPalStackHeight(link.source.data.id);
    const sy = link.source.y + nodeHeight + palOffset;
    const tx = link.target.x;
    const ty = link.target.y;
    const isSingleChild = (link.source.children?.length ?? 0) === 1;
    let path: string;
    if (isSingleChild) {
      path = `M${sx},${sy} L${tx},${ty}`;
    } else {
      const stubHeight = palOffset > 0 ? topVerticalSpacing : bottomVerticalSpacing;
      const horizontalY = sy + stubHeight;
      path = `M${sx},${sy} L${sx},${horizontalY} L${tx},${horizontalY} L${tx},${ty}`;
    }
    const isDottedLine = link.target.data.dottedLine === true;
    links.push({ path, layer: 'tree', ...(isDottedLine && { dottedLine: true }) });
  }

  // Vertical connectors through Advisor area
  for (const node of treeData.descendants()) {
    const palOffset = getPalStackHeight(node.data.id);
    if (palOffset > 0 && node.children && node.children.length > 0) {
      links.push({
        path: `M${node.x},${node.y + nodeHeight} L${node.x},${node.y + nodeHeight + palOffset}`,
        layer: 'tree',
      });
    }
  }

  // IC stacks
  for (const treeNode of treeData.descendants()) {
    const ics = icMap.get(treeNode.data.id);
    if (ics && ics.length > 0) {
      const nodesStartY = treeNode.y + nodeHeight;
      const containerTop = treeNode.y + nodeHeight / 2;
      const contentHeight =
        ics.length * nodeHeight + (ics.length - 1) * icGap + icContainerPadding * 2;
      const totalWidth = icNodeWidth + icContainerPadding * 2;

      icContainers.push({
        x: treeNode.x - totalWidth / 2,
        y: containerTop,
        width: totalWidth,
        height: contentHeight + (nodesStartY - containerTop),
      });

      ics.forEach((ic, i) => {
        const y = nodesStartY + icContainerPadding + i * (nodeHeight + icGap);
        nodes.push({
          id: ic.id,
          name: ic.name,
          title: ic.title,
          x: treeNode.x,
          y,
          width: icNodeWidth,
          height: nodeHeight,
          type: 'ic',
          categoryId: ic.categoryId,
          level: ic.level,
          pinnedTitle: ic.pinnedTitle,
        });
      });
    }
  }

  // Advisor stacks
  for (const treeNode of treeData.descendants()) {
    const pals = palMap.get(treeNode.data.id);
    if (pals && pals.length > 0) {
      const startY = treeNode.y + nodeHeight + palTopGap;

      pals.forEach((pal, i) => {
        const row = Math.floor(i / ADVISORS_PER_ROW);
        const isLeft = i % ADVISORS_PER_ROW === 0;
        const x = isLeft
          ? treeNode.x - palCenterGap / 2 - nodeWidth
          : treeNode.x + palCenterGap / 2;
        const y = startY + palRowGap + row * (nodeHeight + palRowGap);

        const palConnectX = isLeft ? x + nodeWidth : x;
        const palConnectY = y + nodeHeight / 2;
        links.push({
          path: `M${treeNode.x},${treeNode.y + nodeHeight} L${treeNode.x},${palConnectY} L${palConnectX},${palConnectY}`,
          layer: 'pal',
        });

        nodes.push({
          id: pal.id,
          name: pal.name,
          title: pal.title,
          x: x + nodeWidth / 2,
          y,
          width: nodeWidth,
          height: nodeHeight,
          type: 'pal',
          categoryId: pal.categoryId,
          level: pal.level,
          pinnedTitle: pal.pinnedTitle,
        });
      });
    }
  }

  // Manager nodes
  for (const treeNode of treeData.descendants()) {
    const hasTreeChildren = !!(treeNode.data.children && treeNode.data.children.length > 0);
    const hasICs = icMap.has(treeNode.data.id);

    const descCount = descendantCounts.get(treeNode.data.id) ?? 0;

    nodes.push({
      id: treeNode.data.id,
      name: treeNode.data.name,
      title: treeNode.data.title,
      x: treeNode.x,
      y: treeNode.y,
      width: nodeWidth,
      height: nodeHeight,
      type: 'manager',
      collapsible: hasTreeChildren || hasICs,
      categoryId: treeNode.data.categoryId,
      descendantCount: descCount,
      level: treeNode.data.level,
      pinnedTitle: treeNode.data.pinnedTitle,
    });
  }

  // Bounding box
  let bbMinX = Infinity,
    bbMinY = Infinity,
    bbMaxX = -Infinity,
    bbMaxY = -Infinity;

  for (const node of nodes) {
    const left = node.x - node.width / 2;
    const right = node.x + node.width / 2;
    bbMinX = Math.min(bbMinX, left);
    bbMaxX = Math.max(bbMaxX, right);
    bbMinY = Math.min(bbMinY, node.y);
    bbMaxY = Math.max(bbMaxY, node.y + node.height);
  }

  for (const container of icContainers) {
    bbMinX = Math.min(bbMinX, container.x);
    bbMaxX = Math.max(bbMaxX, container.x + container.width);
    bbMinY = Math.min(bbMinY, container.y);
    bbMaxY = Math.max(bbMaxY, container.y + container.height);
  }

  if (!isFinite(bbMinX)) {
    bbMinX = 0;
    bbMinY = 0;
    bbMaxX = 0;
    bbMaxY = 0;
  }

  return {
    nodes,
    links,
    icContainers,
    boundingBox: { minX: bbMinX, minY: bbMinY, width: bbMaxX - bbMinX, height: bbMaxY - bbMinY },
  };
}
