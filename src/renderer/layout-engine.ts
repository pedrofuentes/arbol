import * as d3 from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree, stripM1Children } from '../utils/tree';
import type { ResolvedOptions } from './chart-renderer';

export interface LayoutNode {
  id: string;
  name: string;
  title: string;
  x: number;       // center X in pixels
  y: number;       // top Y in pixels
  width: number;
  height: number;
  type: 'manager' | 'ic' | 'pal';
  collapsible?: boolean;
}

export interface LayoutLink {
  path: string;    // SVG path d attribute "M... L..."
  layer: 'tree' | 'pal';
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

export function computeLayout(
  root: OrgNode,
  opts: ResolvedOptions,
): LayoutResult {
  const visibleTree = filterVisibleTree(root);
  const { layoutTree, icMap, palMap } = stripM1Children(visibleTree);

  const {
    nodeWidth, nodeHeight, horizontalSpacing,
    topVerticalSpacing, bottomVerticalSpacing,
    palCenterGap, palTopGap, palBottomGap, palRowGap,
    branchSpacing, icNodeWidth, icGap, icContainerPadding,
  } = opts;

  const totalVerticalSpacing = topVerticalSpacing + bottomVerticalSpacing;

  const hierarchy = d3.hierarchy(layoutTree, (d) => d.children);
  const palTotalWidth = nodeWidth * 2 + palCenterGap;

  const treeLayout = d3
    .tree<OrgNode>()
    .nodeSize([
      nodeWidth + horizontalSpacing,
      nodeHeight + totalVerticalSpacing,
    ])
    .separation((a, b) => {
      const aHasPals = palMap.has(a.data.id);
      const bHasPals = palMap.has(b.data.id);
      const base = a.parent === b.parent ? 1 : 2;
      if (aHasPals || bHasPals) {
        return Math.max(base, palTotalWidth / (nodeWidth + horizontalSpacing) + 0.3);
      }
      return base;
    });

  const treeData = treeLayout(hierarchy);

  // Compute PAL stack height for a given node
  const getPalStackHeight = (nodeId: string): number => {
    const pals = palMap.get(nodeId);
    if (!pals || pals.length === 0) return 0;
    const rows = Math.ceil(pals.length / 2);
    return palTopGap + palRowGap + rows * nodeHeight + (rows - 1) * palRowGap + palBottomGap;
  };

  // Shift a subtree vertically
  const shiftSubtree = (node: d3.HierarchyPointNode<OrgNode>, extraY: number): void => {
    node.y += extraY;
    for (const child of node.children ?? []) {
      shiftSubtree(child, extraY);
    }
  };

  // Apply vertical shifts for PAL stacks, single-child, and multi-child nodes
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

  // Enforce branchSpacing: ensure subtree bounding boxes don't overlap
  const getSubtreeXBounds = (node: d3.HierarchyPointNode<OrgNode>): [number, number] => {
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
    return [minX, maxX];
  };

  const shiftSubtreeX = (node: d3.HierarchyPointNode<OrgNode>, dx: number): void => {
    node.x += dx;
    for (const child of node.children ?? []) {
      shiftSubtreeX(child, dx);
    }
  };

  const enforceSpacing = (node: d3.HierarchyPointNode<OrgNode>): void => {
    if (!node.children || node.children.length < 2) {
      for (const child of node.children ?? []) {
        enforceSpacing(child);
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
    links.push({ path, layer: 'tree' });
  }

  // Vertical connectors through PAL area
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
      const startY = treeNode.y + nodeHeight;
      const totalHeight = ics.length * nodeHeight + (ics.length - 1) * icGap + icContainerPadding * 2;
      const totalWidth = icNodeWidth + icContainerPadding * 2;

      icContainers.push({
        x: treeNode.x - totalWidth / 2,
        y: startY,
        width: totalWidth,
        height: totalHeight,
      });

      ics.forEach((ic, i) => {
        const y = startY + icContainerPadding + i * (nodeHeight + icGap);
        nodes.push({
          id: ic.id,
          name: ic.name,
          title: ic.title,
          x: treeNode.x,
          y,
          width: icNodeWidth,
          height: nodeHeight,
          type: 'ic',
        });
      });
    }
  }

  // PAL stacks
  for (const treeNode of treeData.descendants()) {
    const pals = palMap.get(treeNode.data.id);
    if (pals && pals.length > 0) {
      const startY = treeNode.y + nodeHeight + palTopGap;

      pals.forEach((pal, i) => {
        const row = Math.floor(i / 2);
        const isLeft = i % 2 === 0;
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
        });
      });
    }
  }

  // Manager nodes
  for (const treeNode of treeData.descendants()) {
    const hasTreeChildren = !!(treeNode.data.children && treeNode.data.children.length > 0);
    const hasICs = icMap.has(treeNode.data.id);

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
    });
  }

  // Bounding box
  let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;

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
    bbMinX = 0; bbMinY = 0; bbMaxX = 0; bbMaxY = 0;
  }

  return {
    nodes,
    links,
    icContainers,
    boundingBox: { minX: bbMinX, minY: bbMinY, width: bbMaxX - bbMinX, height: bbMaxY - bbMinY },
  };
}
