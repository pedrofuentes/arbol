# Architecture

> Extended architectural context for AI agents. Referenced from AGENTS.md.

---

## Project Overview

**Arbol** is an interactive org chart editor running entirely in the browser. Stack: TypeScript, D3.js (tree layout + SVG), Vite (bundler), pptxgenjs (PowerPoint export). No backend — all state lives in memory + IndexedDB + localStorage.

## Architecture

```
Editor (People / Import / Charts) → OrgStore (data + events) → Renderer (D3 + SVG)
                                           ↕                            ↑
                                     SettingsStore  ← localStorage       Right-click / Inline edit / Multi-select
                                     ThemeManager   ← dark/light toggle
                                     MappingStore   ← CSV column presets
                                     CategoryStore  ← per-chart (via ChartStore)
                                     ChartStore     ← IndexedDB (charts + versions)
                                     ChartDB        ← IndexedDB wrapper
                                     AppConfig      ← /arbol.config.json (enterprise deploy-time config)
```

**Data flow is unidirectional:** editors and on-canvas interactions mutate `OrgStore`, which emits `"change"` events, and the renderer re-draws the SVG. Settings flow through `SettingsStore` → `ChartRenderer.updateOptions()`.

## Project Structure

100 TypeScript source files in `src/`, organized by concern:

```
arbol/
├── src/
│   ├── analytics/       # D3 visualization charts: sunburst-chart, span-chart, treemap-chart
│   ├── config/          # app-config: enterprise config loader (arbol.config.json → AppConfig)
│   ├── controllers/     # focus-mode, search-controller, selection-manager
│   ├── i18n/            # i18n system (t(), tp(), setLocale()) + en.ts (900+ translation keys)
│   ├── editor/          # Sidebar tabs: chart-editor, form-editor, import-editor, json-editor, settings-editor, tab-switcher, utilities-editor
│   ├── export/          # chart-exporter (orchestration), pptx-exporter (PowerPoint generation)
│   ├── renderer/        # chart-renderer (D3 SVG), layout-engine, keyboard-nav, preview-renderer (vanilla DOM, no D3), side-by-side-renderer, zoom-manager
│   ├── store/           # org-store, chart-store, chart-db, category-store, category-preset-store, level-store, level-preset-store, settings-store, mapping-store, backup-manager, theme-manager, theme-presets
│   ├── ui/              # 32 components: context-menu, inline-editor, command-palette, property-panel, preset-toolbar, create-chart-dialog, settings-modal, import-wizard, confirm-dialog, manager-picker, toast, loading-overlay, etc.
│   ├── utils/           # tree helpers (find/flatten/clone/isM1), csv-parser, markdown (safe DOM-building renderer), contrast, shortcuts, event-emitter, filename, file-type, id, search, storage, text-normalize, tree-diff
│   ├── types.ts         # All interfaces: OrgNode, ColumnMapping, ColorCategory, ChartRecord, VersionRecord, DiffStatus, CategoryPreset, LevelMappingPreset, AppConfig
│   ├── main.ts          # App entry — wires stores, renderer, editors, menus, shortcuts
│   ├── version.ts       # App version (injected from package.json at build time)
│   └── style.css        # Global styles, CSS custom properties, dark/light themes
├── tests/               # Mirrors src/ structure exactly
├── docs/                # Associated documentation
├── AGENTS.md            # Agent instructions (MUST rules)
├── CHANGELOG.md         # Release history
├── ROADMAP.md           # Agent-facing project phases
├── LEARNINGS.md         # Discovered knowledge
├── DECISIONS.md         # Architecture decision records
├── package.json         # npm scripts, dependencies
└── tsconfig.json        # TypeScript strict mode, ES2022 target
```

## Key Technical Decisions

| Decision                 | Choice                                   | Rationale                                                           |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| No backend               | Client-only (IndexedDB + localStorage)   | Simplicity, privacy — all data stays in the user's browser          |
| D3.js for rendering      | D3 tree layout + SVG                     | Mature tree layout algorithms, full SVG control                     |
| No UI frameworks         | Vanilla TypeScript + DOM APIs            | Avoids ownership conflicts with D3's SVG control; smaller bundle    |
| pptxgenjs for export     | PowerPoint generation in-browser         | No server needed; direct PPTX creation                              |
| Unidirectional data flow | OrgStore → events → Renderer             | Predictable state management without a framework                    |
| IndexedDB for charts     | Per-chart storage with versions          | Handles larger datasets than localStorage; supports multiple charts |
| i18n from day one        | `t('key')` system with flat dot-notation | RTL support, future locale additions                                |

## Module Boundaries

- `store/` — All state management. OrgStore holds the tree, ChartStore handles persistence, SettingsStore manages user preferences. No rendering logic.
- `renderer/` — D3-powered SVG rendering. Reads from stores, never mutates them directly.
- `editor/` — Sidebar UI panels. Interact with stores via their public APIs.
- `ui/` — Standalone UI components (dialogs, menus, toasts). Framework-free DOM manipulation.
- `utils/` — Pure utility functions. No side effects, no store dependencies.
- `export/` — PPTX/PNG/SVG export. Reads current state, produces output files.
- `controllers/` — Cross-cutting concerns (focus mode, search, selection) that bridge stores and renderer.

## Data Flow

1. User interacts (click, right-click, form input, keyboard shortcut)
2. Handler calls OrgStore mutation (e.g., `addChild()`, `updateNode()`)
3. OrgStore calls `snapshot()` (saves undo state) then `emit()` (notifies listeners)
4. ChartRenderer's `onChange` listener triggers `render()` with updated tree
5. D3 re-computes layout and updates SVG

Settings flow: `SettingsStore` → `ChartRenderer.updateOptions()` → re-render.

## Node Types

Node types are determined automatically by tree position — there is no explicit `"type"` field:

- **Manager** — has children who are also managers. Connected by standard tree lines.
- **M1 (First-line manager)** — manager where ALL children are leaf nodes (ICs). Detected via `isM1()` in `src/utils/tree.ts`.
- **IC (Individual Contributor)** — leaf node under an M1. Rendered as vertical stack in a grey container, no connecting lines.
- **Advisor** — leaf node under a non-M1 manager. Rendered in alternating left/right columns with side-entry elbow connectors.

## Core Data Types

The core data type is `OrgNode` (defined in `src/types.ts`):

```typescript
interface OrgNode {
  id: string; // UUID via crypto.randomUUID()
  name: string; // Person's name (max 500 chars)
  title: string; // Job title (max 500 chars)
  categoryId?: string; // Optional color category reference
  dottedLine?: boolean; // When true, parent link renders as dotted line
  children?: OrgNode[]; // Omit for leaf nodes
}
```

**Other key interfaces in `src/types.ts`:** `ColorCategory`, `ChartRecord`, `VersionRecord`, `ColumnMapping`, `MappingPreset`, `DiffStatus`, `CategoryPreset`, `LevelMappingPreset`.

## Spacing Model

All spacing is configurable via `RendererOptions` — **never hardcode these values**:

- **Card:** `nodeWidth`, `nodeHeight`, `cardFill`, `cardStroke`, `cardStrokeWidth`, `cardBorderRadius`
- **Layout:** `horizontalSpacing`, `branchSpacing`, `topVerticalSpacing`, `bottomVerticalSpacing`
- **Advisors:** `palTopGap`, `palBottomGap`, `palRowGap`, `palCenterGap`
- **ICs:** `icGap`, `icContainerPadding`, `icNodeWidth`, `icContainerFill`, `icContainerBorderRadius`
- **Typography:** `nameFontSize`, `titleFontSize`, `textPaddingTop`, `textGap`, `fontFamily`, `textAlign`, `textPaddingHorizontal`
- **Links:** `linkColor`, `linkWidth`

## Key APIs

### OrgStore (`src/store/org-store.ts`)

All mutating methods call `snapshot()` (saves undo state) then `emit()` (notifies listeners).

| Method                     | Signature                                                      |
| -------------------------- | -------------------------------------------------------------- |
| `getTree()`                | `(): OrgNode`                                                  |
| `addChild()`               | `(parentId, {name, title}): OrgNode`                           |
| `removeNode()`             | `(id): void` — must be leaf; errors on root                    |
| `removeNodeWithReassign()` | `(nodeId, newParentId): void` — moves children, then deletes   |
| `updateNode()`             | `(id, {name?, title?}): void`                                  |
| `moveNode()`               | `(nodeId, newParentId): void` — validates no circular ancestry |
| `bulkMoveNodes()`          | `(ids[], newParentId): void` — single undo step                |
| `bulkRemoveNodes()`        | `(ids[]): void` — leaf nodes only, single undo step            |
| `undo()` / `redo()`        | `(): boolean` — max 50 entries                                 |
| `canUndo()` / `canRedo()`  | `(): boolean`                                                  |
| `toJSON()` / `fromJSON()`  | Serialize/deserialize tree                                     |
| `onChange()`               | `(listener): () => void` — returns unsubscribe fn              |
| `getDescendantCount()`     | `(nodeId): number`                                             |
| `isDescendant()`           | `(ancestorId, nodeId): boolean`                                |
| `setNodeCategory()`        | `(nodeId, categoryId \| null): void`                           |
| `bulkSetCategory()`        | `(ids[], categoryId \| null): void` — single undo step         |

### ChartStore (`src/store/chart-store.ts`)

| Method              | Signature                                                                      |
| ------------------- | ------------------------------------------------------------------------------ |
| `init()`            | `(): Promise<void>` — opens IndexedDB, migrates, loads last-used chart         |
| `getCharts()`       | `(): ChartRecord[]` — sorted by updatedAt desc                                 |
| `getActiveChart()`  | `(): ChartRecord \| null`                                                      |
| `createChart()`     | `(name, categories?, levelMappings?, levelDisplayMode?): Promise<ChartRecord>` |
| `switchChart()`     | `(chartId): Promise<void>` — saves current, loads target                       |
| `deleteChart()`     | `(chartId): Promise<void>` — cascades to versions                              |
| `renameChart()`     | `(chartId, name): Promise<void>`                                               |
| `saveWorkingTree()` | `(): Promise<void>` — persists to IndexedDB                                    |
| `isDirty()`         | `(): boolean`                                                                  |
| `createVersion()`   | `(name): Promise<VersionRecord>` — snapshots tree, clears dirty                |
| `getVersions()`     | `(chartId): Promise<VersionRecord[]>`                                          |
| `deleteVersion()`   | `(versionId): Promise<void>`                                                   |
| `restoreVersion()`  | `(versionId): Promise<void>` — replaces working tree                           |
| `onChange()`        | `(listener): () => void`                                                       |

### LevelStore (`src/store/level-store.ts`)

| Method             | Signature                                              |
| ------------------ | ------------------------------------------------------ |
| `getMappings()`    | `(): LevelMapping[]`                                   |
| `getMapping()`     | `(rawLevel): LevelMapping \| undefined`                |
| `addMapping()`     | `(rawLevel, displayTitle, managerDisplayTitle?): void` |
| `updateMapping()`  | `(rawLevel, displayTitle, managerDisplayTitle?): void` |
| `removeMapping()`  | `(rawLevel): void`                                     |
| `replaceAll()`     | `(mappings): void`                                     |
| `getDisplayMode()` | `(): LevelDisplayMode`                                 |
| `setDisplayMode()` | `(mode): void`                                         |
| `resolveTitle()`   | `(rawLevel, isManager?): string \| undefined`          |
| `importFromCsv()`  | `(csvText): number`                                    |
| `exportToCsv()`    | `(): string`                                           |
| `loadFromChart()`  | `(chart): void`                                        |
| `toChartData()`    | `(): { levelMappings, levelDisplayMode }`              |

## Interactions

| Input            | Target               | Behavior                                                      |
| ---------------- | -------------------- | ------------------------------------------------------------- |
| **Click**        | Card                 | Highlights card; shows property panel; clears multi-selection |
| **Click**        | Chart name in header | Opens inline editor for chart name                            |
| **Right-click**  | Card                 | Shows context menu                                            |
| **Shift+click**  | Card                 | Toggles multi-select; root excluded                           |
| **Drag**         | Canvas               | Pan chart (d3-zoom)                                           |
| **Scroll wheel** | Canvas               | Zoom in/out (0.1x–4.0x via d3-zoom)                           |
| **Type**         | Search bar           | Highlights matching nodes; dims non-matches                   |

### Context Menu

**Single-card menu**: Edit (inline editor), Add (child popover), Focus (disabled on leaves), Category (submenu), Dotted/Solid toggle, Move (disabled on root), Remove (disabled on root; managers require child reassignment).

**Multi-select menu**: Category (N people) → `bulkSetCategory()`, Move all (N people) → `bulkMoveNodes()`, Remove all (N people) → managers reassign first, then `bulkRemoveNodes()`.

### Focus Mode

Right-click a non-leaf node → `"Focus"` renders only that subtree. **Focus is a rendering-only filter** — `OrgStore` always holds the full tree. `main.ts` passes `findNodeById(fullTree, focusedNodeId)` to `renderer.render()` instead of the full tree.

### Keyboard Shortcuts

| Key                       | Action                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Ctrl+Z`                  | Undo                                                                                                                                |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo                                                                                                                                |
| `Ctrl+E`                  | Export to PPTX                                                                                                                      |
| `Ctrl+F`                  | Focus search input                                                                                                                  |
| `Ctrl+K`                  | Command Palette                                                                                                                     |
| `Escape`                  | Priority chain: (1) dismiss version viewer → (2) clear search → (3) exit focus mode → (4) clear multi-selection → (5) deselect node |

## i18n

Lightweight i18n system in `src/i18n/`:

- `t(key, params?)` — translate with optional `{param}` interpolation
- `tp(key, count, params?)` — pluralization (`key.one` or `key.other`)
- `setLocale(locale, messages)` — switch locale, sets `document.dir` and `document.lang`
- English strings in `src/i18n/en.ts`: 900+ keys using flat dot-notation

## Accessibility

WCAG 2.1 AA compliance is mandatory:

- SVG chart: `role="tree"` container, `role="treeitem"` cards with `aria-label`, `aria-level`, `aria-expanded`
- Screen reader: Global `aria-live` announcer (`src/ui/announcer.ts`)
- Focus trapping in all dialogs/modals, focus restoration on dismiss
- Color contrast: WCAG AA via `contrastingTextColor()` in `src/utils/contrast.ts`
- 44px touch targets, CSS logical properties for RTL, `prefers-reduced-motion`, `forced-colors`

## Code Patterns

### ✅ Good — Safe DOM, i18n, configurable values

```typescript
// UI component using safe DOM APIs + i18n
const label = document.createElement('span');
label.textContent = t('dialog.remove.message', { name: node.name });
container.appendChild(label);

// Renderer using options — no hardcoded values
const x = d.x - options.nodeWidth / 2;
const rect = group
  .append('rect')
  .attr('width', options.nodeWidth)
  .attr('height', options.nodeHeight)
  .attr('rx', options.cardBorderRadius);
```

### ❌ Bad — innerHTML, hardcoded values, missing i18n

```typescript
// NEVER: innerHTML with dynamic data
container.innerHTML = `<span>${node.name}</span>`;

// NEVER: hardcoded values
const x = d.x - 120; // magic number
rect.attr('rx', 8); // should be options.cardBorderRadius

// NEVER: hardcoded strings
label.textContent = 'Remove this person?'; // should be t('dialog.remove.message')
```

## Key Files

| File                             | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `src/main.ts`                    | App entry — wires stores, renderer, editors, menus, shortcuts |
| `src/types.ts`                   | All TypeScript interfaces                                     |
| `src/store/org-store.ts`         | Core tree data + mutations + undo/redo                        |
| `src/store/chart-store.ts`       | Chart persistence in IndexedDB                                |
| `src/store/settings-store.ts`    | User preferences in localStorage                              |
| `src/renderer/chart-renderer.ts` | D3 SVG rendering                                              |
| `src/renderer/layout-engine.ts`  | Custom tree layout with advisor/IC handling                   |
| `src/i18n/en.ts`                 | English translation strings (900+ keys)                       |
| `src/style.css`                  | Global styles, CSS custom properties                          |
| `tests/setup.ts`                 | Test setup — Map-backed localStorage                          |
