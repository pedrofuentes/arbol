# PowerPoint Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export the org chart as a native PowerPoint file with editable shapes, text, and lines using pptxgenjs.

**Architecture:** Extract layout computation from ChartRenderer into a shared `LayoutEngine` that returns position data. The PPTX exporter maps these positions (SVG pixels → PowerPoint inches) to native pptxgenjs shapes (rectangles, text, lines). An "Export PPTX" button in the footer triggers the export.

**Tech Stack:** pptxgenjs, TypeScript, existing D3 layout engine

---

## Task 1: Install pptxgenjs

**Step 1: Install the dependency**

```bash
npm install pptxgenjs
```

**Step 2: Verify build still works**

```bash
npx vite build
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: install pptxgenjs for PowerPoint export

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Extract layout computation from ChartRenderer

The renderer currently computes layout AND draws SVG in `render()`. We need to extract the layout computation into a public method that returns structured position data so both SVG rendering and PPTX export can use it.

**Files:**
- Create: `src/renderer/layout-engine.ts`
- Test: `tests/renderer/layout-engine.test.ts`
- Modify: `src/renderer/chart-renderer.ts` — use LayoutEngine internally

**Step 1: Define the layout output types in `src/renderer/layout-engine.ts`**

```typescript
import { OrgNode } from '../types';

export interface LayoutNode {
  id: string;
  name: string;
  title: string;
  x: number;      // center X in pixels
  y: number;      // top Y in pixels
  width: number;   // card width
  height: number;  // card height
  type: 'manager' | 'ic' | 'pal';
}

export interface LayoutLink {
  path: string;  // SVG path "M... L..."
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
```

**Step 2: Write failing tests for LayoutEngine**

Create `tests/renderer/layout-engine.test.ts`:

Test that `computeLayout()` returns the correct number of nodes, links, and types for:
- Single node
- M1 with ICs
- Manager with Advisors
- Mixed tree

**Step 3: Implement `computeLayout()` in `layout-engine.ts`**

Extract the layout computation from `ChartRenderer.render()` into a standalone function. It takes `(root: OrgNode, opts: ResolvedOptions, collapsed: Set<string>)` and returns `LayoutResult`.

**Step 4: Refactor ChartRenderer to use LayoutEngine**

`render()` calls `computeLayout()`, then draws SVG from the returned `LayoutResult`.

**Step 5: Run all tests**

```bash
npx vitest run
```

All existing tests must still pass (SVG output unchanged).

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract LayoutEngine from ChartRenderer

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: PPTX Exporter

**Files:**
- Create: `src/export/pptx-exporter.ts`
- Test: `tests/export/pptx-exporter.test.ts`

**Step 1: Write failing tests for PptxExporter**

Test that:
- `exportToPptx()` returns a Blob or calls `pptx.writeFile()`
- Manager nodes become rectangles with name/title text
- IC nodes become narrower rectangles
- Advisor nodes become rectangles with connecting lines
- IC containers become filled rectangles
- Links become line shapes

**Step 2: Implement `src/export/pptx-exporter.ts`**

```typescript
import pptxgen from 'pptxgenjs';
import { LayoutResult, LayoutNode, LayoutLink, LayoutICContainer } from '../renderer/layout-engine';

// Convert SVG pixels to PowerPoint inches
const PX_TO_INCHES = 1 / 96;

export interface PptxExportOptions {
  fileName?: string;
  slideWidth?: number;   // inches, default 13.33 (widescreen)
  slideHeight?: number;  // inches, default 7.5
  padding?: number;      // inches from edge
}

export async function exportToPptx(
  layout: LayoutResult,
  options: PptxExportOptions = {},
): Promise<void> {
  const {
    fileName = 'OrgChart.pptx',
    slideWidth = 13.33,
    slideHeight = 7.5,
    padding = 0.5,
  } = options;

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'CUSTOM', width: slideWidth, height: slideHeight });
  pptx.layout = 'CUSTOM';

  const slide = pptx.addSlide();

  // Compute scale: fit bounding box into slide with padding
  const { boundingBox } = layout;
  const availW = slideWidth - padding * 2;
  const availH = slideHeight - padding * 2;
  const scale = Math.min(
    availW / (boundingBox.width * PX_TO_INCHES),
    availH / (boundingBox.height * PX_TO_INCHES),
  );

  // Transform: pixel position → slide inches
  const toInchesX = (px: number) =>
    (px - boundingBox.minX) * PX_TO_INCHES * scale + padding;
  const toInchesY = (py: number) =>
    (py - boundingBox.minY) * PX_TO_INCHES * scale + padding;
  const toInchesW = (px: number) => px * PX_TO_INCHES * scale;
  const toInchesH = (px: number) => px * PX_TO_INCHES * scale;

  // Draw IC containers
  for (const ic of layout.icContainers) {
    slide.addShape('rect', {
      x: toInchesX(ic.x),
      y: toInchesY(ic.y),
      w: toInchesW(ic.width),
      h: toInchesH(ic.height),
      fill: { color: 'E5E7EB' },
    });
  }

  // Draw links as lines
  // Parse SVG path and draw as PowerPoint lines
  for (const link of layout.links) {
    drawLinkOnSlide(slide, link.path, toInchesX, toInchesY, scale);
  }

  // Draw nodes
  for (const node of layout.nodes) {
    const x = toInchesX(node.x - node.width / 2);
    const y = toInchesY(node.y);
    const w = toInchesW(node.width);
    const h = toInchesH(node.height);

    slide.addShape('rect', {
      x, y, w, h,
      fill: { color: 'FFFFFF' },
      line: { color: '22C55E', width: 0.75 },
    });

    // Name + Title as text
    slide.addText([
      { text: node.name, options: { bold: true, fontSize: 6 } },
      { text: '\n' + node.title, options: { fontSize: 5, color: '64748B' } },
    ], {
      x, y, w, h,
      align: 'center',
      valign: 'middle',
      fontFace: 'Calibri',
      margin: 0,
    });
  }

  await pptx.writeFile({ fileName });
}

// Parse SVG path "M x,y L x,y L x,y ..." and draw as PowerPoint line segments
function drawLinkOnSlide(
  slide: pptxgen.Slide,
  pathD: string,
  toX: (px: number) => number,
  toY: (py: number) => number,
  scale: number,
): void {
  const points = pathD.match(/[ML]\s*(-?[\d.]+),\s*(-?[\d.]+)/g);
  if (!points || points.length < 2) return;

  const coords = points.map(p => {
    const m = p.match(/(-?[\d.]+),\s*(-?[\d.]+)/);
    return { x: toX(parseFloat(m![1])), y: toY(parseFloat(m![2])) };
  });

  for (let i = 0; i < coords.length - 1; i++) {
    const from = coords[i];
    const to = coords[i + 1];
    slide.addShape('line', {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      w: Math.abs(to.x - from.x) || 0.001,
      h: Math.abs(to.y - from.y) || 0.001,
      line: { color: '94A3B8', width: 1 },
      flipV: from.y > to.y,
      flipH: from.x > to.x,
    });
  }
}
```

**Step 3: Run tests**

```bash
npx vitest run tests/export/pptx-exporter.test.ts
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PPTX exporter using pptxgenjs native shapes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Wire export button in UI

**Files:**
- Modify: `src/main.ts` — add Export PPTX button in footer
- Modify: `src/renderer/chart-renderer.ts` — expose `getLastLayout()` method

**Step 1: Add `getLastLayout()` to ChartRenderer**

Store the `LayoutResult` after each `render()` call and expose it via a getter.

**Step 2: Add Export button to footer in `src/main.ts`**

```typescript
const footer = document.getElementById('footer')!;
footer.innerHTML = `
  <button class="footer-btn" data-action="export-pptx">Export PPTX</button>
`;

footer.querySelector('[data-action="export-pptx"]')?.addEventListener('click', async () => {
  const layout = renderer.getLastLayout();
  if (layout) {
    await exportToPptx(layout);
  }
});
```

**Step 3: Run all tests and build**

```bash
npx vitest run && npx vite build
```

**Step 4: Test manually** — click Export PPTX, open in PowerPoint, verify shapes are editable.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Export PPTX button in footer

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Notes

- All positions come from the LayoutEngine (single source of truth)
- PX_TO_INCHES conversion (1/96) is standard screen DPI
- The slide auto-scales to fit the org chart with padding
- Font sizes in PPTX are in points, not pixels — may need tuning
- Colors strip the `#` prefix for pptxgenjs (e.g., `#22c55e` → `22C55E`)
- SVG path parsing handles M/L commands for elbow connectors
