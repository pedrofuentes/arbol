# ChartIt — Org Chart Viewer/Editor Design

**Date**: 2026-03-11
**Status**: Approved

## Problem

Build a browser-based org chart application that renders an organizational hierarchy from a nested JSON structure. As people are added/removed, the chart re-renders with proper layout positioning. Must handle 1000+ people with collapsible subtrees.

## Tech Stack

- **Vite** — bundler with HMR
- **TypeScript** — strict mode
- **D3.js** — `d3-hierarchy` (tree layout), `d3-selection` (DOM), `d3-zoom` (pan/zoom)
- **Vitest** — testing (TDD)
- **Vanilla TS** — no framework, avoids DOM ownership conflicts with D3

## Architecture

Three layers with unidirectional data flow:

```
Editor (Form / JSON) → OrgStore (data + events) → Renderer (D3 + SVG)
```

### Data Layer (OrgStore)

Single source of truth for the org tree.

```typescript
interface OrgNode {
  id: string;        // auto-generated UUID
  name: string;
  title: string;
  children?: OrgNode[];
}
```

**OrgStore API:**
- `addChild(parentId, node)` — add a person under a parent
- `removeNode(id)` — remove a person (and their subtree)
- `updateNode(id, fields)` — edit name/title
- `getTree()` — return the root node
- `toJSON()` / `fromJSON(json)` — serialization
- Emits `"change"` event on every mutation

**Validations:** no duplicate IDs, can't remove root, parent must exist.

### Render Layer (D3 + SVG)

- `d3.tree()` computes (x, y) positions for visible nodes
- Collapse state is a `Set<string>` in the renderer (view-only concern)
- Collapsed nodes' children are excluded before layout computation
- Nodes: SVG `<g>` with `<rect>` + `<text>` (name, title) + expand/collapse indicator
- Links: SVG `<path>` with vertical elbow connectors
- Instant re-render on data change (no animation)
- Preserves current zoom/pan transform across re-renders

### Pan/Zoom

- `d3.zoom()` on the SVG container
- Auto-fit on initial render (center + scale to bounding box)
- Manual pan/zoom available at all times
- "Fit to screen" button resets view

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Header: "ChartIt"                               │
├────────────────────┬─────────────────────────────┤
│  Left Panel (30%)  │  Chart Area (70%)           │
│  - Tab: Form       │  - SVG org chart            │
│  - Tab: JSON       │                             │
├────────────────────┴─────────────────────────────┤
│  Footer: Zoom controls, Fit-to-screen            │
└──────────────────────────────────────────────────┘
```

**Form tab:** Parent dropdown + name/title fields + Add button. Click a chart node to edit/delete.

**JSON tab:** Textarea with full JSON tree + Apply button + error feedback.

Both sync through OrgStore.

## Rendering Strategy

1. OrgStore emits `"change"`
2. Renderer filters tree → only expanded nodes
3. `d3.tree()` computes layout with `nodeSize([width, height])`
4. Clear SVG content, redraw all nodes and links
5. Preserve zoom/pan transform

## Testing Strategy (TDD)

**Unit tests:**
- OrgStore: CRUD operations, events, validation, serialization
- Layout/tree utilities: position computation, visible tree filtering, ID generation

**Integration tests (jsdom):**
- Renderer: verify SVG output matches tree state
- Editor sync: mutations → SVG updates, JSON parse → store state

No E2E tests for v1.

## Git Strategy (GitHub Flow)

- `main` branch — always deployable
- Feature branches off `main`, merged back when complete

**Feature branches (in order):**
1. `feature/project-setup` — Vite + TS + Vitest + D3 scaffold
2. `feature/data-model` — OrgStore + tree utilities
3. `feature/renderer` — D3 tree layout + SVG rendering
4. `feature/editor-panels` — Form UI + JSON editor
5. `feature/pan-zoom` — d3-zoom + auto-fit
6. `feature/collapse-expand` — subtree collapse/expand

## Deferred (post-v1)

- Search/filter by name or title
- Animation transitions
- Drag-and-drop reorganization
- Export (PNG/PDF/PPT)
