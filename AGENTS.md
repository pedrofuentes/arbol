# Arbol — Agent Instructions

> Guidelines for AI agents and copilots working on this codebase.

## Project Summary

**Arbol** is an interactive org chart editor that runs entirely in the browser. It uses TypeScript, D3.js (for tree layout and SVG rendering), Vite (bundler), and pptxgenjs (PowerPoint export). There is no backend — all state lives in the browser (memory + IndexedDB + localStorage).

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
```

**Data flow is unidirectional:** editors and on-canvas interactions (right-click context menu, inline editing, Shift+click multi-select) mutate `OrgStore`, which emits `"change"` events, and the renderer re-draws the SVG. Settings flow through `SettingsStore` → `ChartRenderer.updateOptions()`.

## Project Structure

65 TypeScript source files in `src/`, organized by concern:

```
src/
├── controllers/
│   ├── focus-mode.ts          # Focus mode state management (enter/exit/query focused subtree)
│   ├── search-controller.ts   # Search state and highlight coordination
│   └── selection-manager.ts   # Multi-select state (Shift+click toggle, bulk ops)
├── data/
│   └── sample-org.ts          # Sample org data (52 employees, used as default)
├── i18n/
│   ├── index.ts               # i18n system — t(), tp(), setLocale(), getLocale(), getDirection()
│   └── en.ts                  # English translations (400+ strings)
├── editor/
│   ├── chart-editor.ts        # Charts sidebar tab UI (chart list, version list, CRUD)
│   ├── form-editor.ts         # Add/edit people via form UI (parent dropdown, name/title inputs)
│   ├── json-editor.ts         # Raw JSON tree editor with Apply/validate
│   ├── import-editor.ts       # File import (JSON/CSV) + paste + column mapping + presets
│   ├── settings-editor.ts     # Visual settings panel (sliders, color pickers, presets)
│   ├── tab-switcher.ts        # Sidebar tab management (People / Import / Settings)
│   └── utilities-editor.ts    # Utilities sidebar section (text normalization, backup/restore)
├── export/
│   ├── chart-exporter.ts      # Chart export orchestration (PPTX + future formats)
│   └── pptx-exporter.ts       # PowerPoint export — takes LayoutResult, writes .pptx file
├── renderer/
│   ├── chart-renderer.ts      # Main D3 SVG renderer — draws cards, links, IC/Advisor stacks
│   ├── keyboard-nav.ts        # SVG chart keyboard navigation (arrow keys, Enter, Space, Shift+F10)
│   ├── layout-engine.ts       # Computes x/y positions, bounding box, IC containers, Advisor assignments
│   ├── side-by-side-renderer.ts # Side-by-side comparison renderer for version diffs
│   └── zoom-manager.ts        # d3-zoom integration, fitToContent(), resetZoom(), transform persistence
├── store/
│   ├── backup-manager.ts      # Full backup/restore — exports all charts, versions, settings to JSON
│   ├── category-store.ts      # ColorCategory CRUD, defaults (Open Position, Offer Pending, Future Start), localStorage
│   ├── chart-db.ts            # IndexedDB wrapper for charts and versions CRUD
│   ├── chart-store.ts         # High-level chart management, dirty tracking, version snapshots, events
│   ├── mapping-store.ts       # CSV column mapping preset storage (localStorage)
│   ├── org-store.ts           # OrgNode CRUD, undo/redo (50-entry stack), event emitter, validation
│   ├── settings-store.ts      # Persist/load renderer settings from localStorage
│   ├── theme-manager.ts       # Dark/light toggle — applies class to <html>, persists to localStorage
│   └── theme-presets.ts       # Color + layout preset definitions (Emerald, Corporate Blue, etc.)
├── ui/
│   ├── add-popover.ts         # Fixed-position popover for adding child nodes (name/title)
│   ├── announcer.ts           # Accessible live-region announcements for screen readers
│   ├── category-legend.ts     # SVG overlay legend showing active color categories
│   ├── chart-name-header.ts   # Header component: editable chart name, dirty indicator, save version button
│   ├── column-mapper.ts       # Interactive UI for mapping CSV columns to OrgNode fields
│   ├── comparison-banner.ts   # Banner for side-by-side version comparison mode
│   ├── confirm-dialog.ts      # Modal confirmation dialog (title, message, danger flag)
│   ├── context-menu.ts        # Right-click context menu with keyboard nav (↑↓ Enter Esc)
│   ├── dialog-utils.ts        # Shared dialog helpers (overlay creation, focus trapping)
│   ├── dismissible.ts         # Dismiss-on-click-outside and Escape key behavior mixin
│   ├── export-dialog.ts       # Export options dialog (format selection, settings)
│   ├── focus-banner.ts        # Focus mode banner — "Viewing [Name]'s org" + "Show full org" exit
│   ├── help-dialog.ts         # Help/about overlay (sections on interactions, shortcuts, imports)
│   ├── inline-editor.ts       # Inline card editing — text inputs overlaid on SVG card
│   ├── input-dialog.ts        # Custom text input dialog replacing native prompt()
│   ├── manager-picker.ts      # Modal for selecting target node (Move/Reassign operations)
│   ├── preset-creator.ts      # Modal form for creating/naming CSV column mapping presets
│   ├── restore-dialog.ts      # Backup restore dialog — replace vs merge strategy selection
│   ├── toast.ts               # Toast notification system (success/error/info with auto-dismiss)
│   ├── version-picker.ts      # Version selection dropdown/modal for comparison
│   ├── version-viewer.ts      # Read-only version preview overlay with Restore/Close banner
│   └── welcome-banner.ts      # First-time user welcome banner with localStorage persistence
├── utils/
│   ├── contrast.ts            # WCAG 2.1 luminance, auto-contrast text color helpers
│   ├── csv-parser.ts          # CSV parsing (RFC 4180 multi-line quotes, escapes) + tree building from flat CSV, duplicate/cycle/limit validation
│   ├── event-emitter.ts       # Typed event emitter base class
│   ├── filename.ts            # Safe filename generation for exports
│   ├── id.ts                  # UUID generation via crypto.randomUUID()
│   ├── search.ts              # Case-insensitive substring search on name/title, returns matching IDs
│   ├── shortcuts.ts           # Keyboard shortcut manager (register combos, prevent defaults)
│   ├── storage.ts             # Storage abstraction (localStorage wrapper + IStorage interface)
│   ├── text-normalize.ts      # Text normalization (titleCase, uppercase, lowercase) for names/titles
│   ├── tree-diff.ts           # Tree comparison — detects added, removed, moved, changed nodes
│   └── tree.ts                # Tree traversal: findNodeById, findParent, flattenTree, cloneTree, isLeaf, isM1, stripM1Children, countLeaves, managerLevel, countManagersByLevel
├── types.ts                   # Interfaces: OrgNode, ColumnMapping, MappingPreset, TextNormalization, ChartRecord, VersionRecord
├── version.ts                 # App version (injected from package.json at build time)
├── main.ts                    # App entry point — wires stores, renderer, editors, menus, shortcuts
└── style.css                  # Global styles, CSS custom properties, dark/light themes
```

## Coding Standards

These are **mandatory** for all changes:

1. **No hardcoded numbers.** All spacing, sizing, color, and style values must be configurable via options/parameters. Never bury magic numbers in implementation code.

2. **Modular and reusable.** Shared rendering logic (cards, links, stacks) must be in single reusable methods. No copy-paste across node types.

3. **Single source of truth.** Each value is defined in exactly one place (the options interface) and referenced everywhere else.

4. **Vanilla TypeScript.** No UI frameworks. D3 owns the SVG; DOM helpers build the sidebar/panels. Avoid ownership conflicts.

5. **Safe DOM APIs.** Never use `innerHTML` with dynamic data. Use `textContent`, `createElement`, `appendChild`, etc.

6. **Minimize `as any`.** Use proper D3 generics and TypeScript types. Only cast when D3's type system makes it unavoidable, and add a comment explaining why.

7. **i18n-ready strings.** All user-facing text should use `t('key')` from `src/i18n/index.ts`. New strings must be added to `src/i18n/en.ts`.

## Key Concepts

### Node Types
- **Manager** — has children who are also managers. Connected by tree lines.
- **M1 (First-line manager)** — manager where ALL children are leaf nodes (ICs). Detected automatically via `isM1()`.
- **IC (Individual Contributor)** — leaf node under an M1. Rendered as vertical stack in a grey container, no connecting lines.
- **Advisor** — leaf node under a non-M1 manager. Rendered in alternating left/right columns with side-entry elbow connectors.

### Data Format

```typescript
interface OrgNode {
  id: string;          // UUID (generated by crypto.randomUUID())
  name: string;        // Person's name
  title: string;       // Job title
  categoryId?: string; // Optional color category reference
  children?: OrgNode[];  // Omit for leaf nodes
}

interface ColumnMapping {
  name: string;              // CSV column header for name
  title: string;             // CSV column header for title
  parentRef: string;         // CSV column header for parent reference
  id?: string;               // CSV column header for node ID (optional)
  parentRefType: 'id' | 'name';  // Match parents by ID or name
  caseInsensitive?: boolean;     // Ignore case in parent matching
}

interface MappingPreset {
  name: string;              // Preset display name
  mapping: ColumnMapping;    // The column mapping configuration
}

interface ColorCategory {
  id: string;          // UUID or preset ID (e.g., 'open-position')
  label: string;       // Display name (e.g., "Open Position")
  color: string;       // Hex color (e.g., "#fbbf24")
  nameColor?: string;  // Text color for name (auto-computed from background for contrast)
  titleColor?: string; // Text color for title (auto-computed, slightly muted)
}

interface ChartRecord {
  id: string;          // UUID
  name: string;        // User-given chart name
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp — last working tree change
  workingTree: OrgNode; // Current live org tree
  categories: ColorCategory[]; // Per-chart categories
}

interface VersionRecord {
  id: string;          // UUID
  chartId: string;     // FK → ChartRecord.id
  name: string;        // User-given version name
  createdAt: string;   // ISO timestamp
  tree: OrgNode;       // Frozen snapshot of the tree
}
```

CSV imports support: `id,name,title,parent_id` or `name,title,manager_name` (auto-detected). Custom column names supported via column mapper UI. HR system exports with trailing metadata (e.g., "Applied filters:" blocks) are handled automatically. Max 10,000 nodes per import.

### Spacing Model

All spacing is configurable via `RendererOptions`:
- `nodeWidth`, `nodeHeight` — card dimensions
- `horizontalSpacing` — minimum space between adjacent cards
- `branchSpacing` — exact horizontal gap between sibling subtree boundaries
- `topVerticalSpacing` — manager bottom → horizontal connecting line
- `bottomVerticalSpacing` — horizontal line → child top
- `palTopGap`, `palBottomGap`, `palRowGap`, `palCenterGap` — Advisor stack spacing
- `icGap`, `icContainerPadding`, `icNodeWidth` — IC stack spacing and sizing
- `nameFontSize`, `titleFontSize`, `textPaddingTop`, `textGap` — typography
- `linkColor`, `linkWidth` — connector lines
- `cardFill`, `cardStroke`, `cardStrokeWidth` — card appearance
- `cardBorderRadius` — rounded corners on cards
- `icContainerFill` — IC group background
- `icContainerBorderRadius` — rounded corners on IC group containers
- `textAlign` — text alignment within cards (left / center / right)
- `textPaddingHorizontal` — horizontal padding for left/right-aligned text
- `fontFamily` — font for names/titles (7 PowerPoint-safe options)

### OrgStore API

All public methods on `OrgStore` (defined in `src/store/org-store.ts`):

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getTree()` | `(): OrgNode` | Returns current root node |
| `addChild()` | `(parentId, {name, title}): OrgNode` | Creates child under parent; snapshot + emit |
| `removeNode()` | `(id): void` | Deletes node (must be leaf; errors on root) |
| `removeNodeWithReassign()` | `(nodeId, newParentId): void` | Moves node's children to newParent, then deletes node |
| `updateNode()` | `(id, {name?, title?}): void` | Updates node name and/or title |
| `moveNode()` | `(nodeId, newParentId): void` | Re-parents node (validates no circular ancestry) |
| `bulkMoveNodes()` | `(ids[], newParentId): void` | Moves multiple nodes in one undo step |
| `bulkRemoveNodes()` | `(ids[]): void` | Removes multiple leaf nodes in one undo step |
| `undo()` / `redo()` | `(): boolean` | Pop undo/redo stack; max 50 entries |
| `canUndo()` / `canRedo()` | `(): boolean` | Check stack availability |
| `getUndoStackSize()` / `getRedoStackSize()` | `(): number` | Stack depths |
| `toJSON()` | `(): string` | Serialize tree (2-space indent) |
| `fromJSON()` | `(json): void` | Parse, validate, replace root; snapshot + emit |
| `onChange()` | `(listener): () => void` | Register change listener; returns unsubscribe fn |
| `getDescendantCount()` | `(nodeId): number` | Count all descendants of a node |
| `isDescendant()` | `(ancestorId, nodeId): boolean` | Ancestry check for move validation |
| `setNodeCategory()` | `(nodeId, categoryId \| null): void` | Sets/clears a node's color category; snapshot + emit |
| `bulkSetCategory()` | `(ids[], categoryId \| null): void` | Sets category on multiple nodes in one undo step |

All mutating methodscall `snapshot()` (saves undo state) then `emit()` (notifies listeners).

### Charts & Versions

Charts are independent org trees, each with their own color categories. Versions are named point-in-time snapshots of a chart's tree.

- **Storage:** Chart and version data is stored in IndexedDB (`arbol-db`), not localStorage. Settings, theme, and CSV mapping presets remain global in localStorage.
- **Auto-migration:** On first load, if no charts exist in IndexedDB but localStorage contains a legacy tree, ChartStore automatically migrates it into a new chart.
- **Dirty tracking:** ChartStore tracks whether the working tree has unsaved changes since the last version snapshot. The header shows a dirty indicator (●) when changes exist.
- **Version snapshots:** Users can save named snapshots at any time. Versions are immutable — restoring a version replaces the chart's working tree (and creates an undo point).
- **Per-chart categories:** Each chart stores its own `ColorCategory[]`. Switching charts loads that chart's categories into `CategoryStore`.

### ChartStore API

All public methods on `ChartStore` (defined in `src/store/chart-store.ts`):

| Method | Signature | Purpose |
|--------|-----------|---------|
| `init()` | `(): Promise<void>` | Opens IndexedDB, runs migration if needed, loads last-used chart |
| `getCharts()` | `(): ChartRecord[]` | Returns all charts (sorted by updatedAt descending) |
| `getActiveChart()` | `(): ChartRecord \| null` | Returns the currently active chart |
| `createChart()` | `(name, tree?, categories?): Promise<ChartRecord>` | Creates a new chart and switches to it |
| `switchChart()` | `(chartId): Promise<void>` | Saves current chart, loads target chart into OrgStore + CategoryStore |
| `deleteChart()` | `(chartId): Promise<void>` | Deletes chart and all its versions; switches to another chart if active |
| `renameChart()` | `(chartId, name): Promise<void>` | Updates chart name |
| `saveWorkingTree()` | `(): Promise<void>` | Persists current OrgStore tree + categories to the active chart in IndexedDB |
| `isDirty()` | `(): boolean` | Whether working tree differs from last saved/versioned state |
| `createVersion()` | `(name): Promise<VersionRecord>` | Snapshots active chart's tree as a named version; clears dirty flag |
| `getVersions()` | `(chartId): Promise<VersionRecord[]>` | Returns all versions for a chart (sorted by createdAt descending) |
| `deleteVersion()` | `(versionId): Promise<void>` | Deletes a single version |
| `restoreVersion()` | `(versionId): Promise<void>` | Replaces active chart's working tree with the version's tree |
| `onChange()` | `(listener): () => void` | Register change listener; returns unsubscribe fn |

### Interactions

| Input | Target | Behavior |
|-------|--------|----------|
| **Click** | Card | Highlights card (visual only); clears multi-selection |
| **Click** | Chart name in header | Opens inline editor for chart name |
| **Double-click** | Card | No action (use right-click → Edit for inline editing) |
| **Right-click** | Card | Shows context menu (see below) |
| **Shift+click** | Card | Toggles multi-select; root excluded |
| **Drag** | Canvas | Pan chart (d3-zoom) |
| **Scroll wheel** | Canvas | Zoom in/out (0.1x–4.0x via d3-zoom) |
| **Type** | Search bar | Highlights matching nodes; dims non-matches |

### Context Menu Items

**Single-card menu** (right-click on unselected card):

| Label | Icon | Disabled when | Action |
|-------|------|---------------|--------|
| Edit | ✏️ | Never | Opens inline editor overlay on the card |
| Add | ➕ | Never | Opens add-child popover |
| Focus on sub-org | 🔎 | Node is leaf, or already focused on this node | Enters focus mode — renders only this subtree |
| Set Category | 🏷️ | Never | Opens submenu listing categories + "None (default)"; calls `setNodeCategory()` |
| Set as dotted line / Remove dotted line | ┈ | Never | Toggles dotted-line rendering for the node's reporting line |
| Move | ↗️ | Node is root | Opens manager picker to select new parent |
| Remove | 🗑️ | Node is root | Leaf: confirm dialog → remove. Manager: picker for reassigning children → remove |

**Multi-select menu** (right-click on one of N selected cards):

| Label | Icon | Action |
|-------|------|--------|
| Set Category (N people) | 🏷️ | Opens submenu → `bulkSetCategory()` |
| Move all (N people) | ↗️ | Opens manager picker → `bulkMoveNodes()` |
| Remove all (N people) | 🗑️ | Managers: reassign children first; Leaves: confirm → `bulkRemoveNodes()` |

### Focus Mode

Right-click a non-leaf node → **"Focus on sub-org"** renders only that subtree as if it were the full org. Focus is a **rendering-only filter** — `OrgStore` is unchanged; `main.ts` passes `findNodeById(fullTree, focusedNodeId)` to `renderer.render()` instead of the full tree.

- **Banner**: Floating bar at chart top — `"🔎 Viewing [Name]'s org"` + `"Show full org"` button
- **Exit**: Click "Show full org" button, or press `Escape`
- **PPTX export**: Automatically exports only the focused sub-org (the exporter uses `renderer.getLastLayout()` which reflects the rendered subtree)
- **Status bar**: Shows stats for the focused subtree only
- **Fallback**: If the focused node is deleted (e.g., via undo), the view falls back to full org

### Keyboard Shortcuts

All shortcuts are registered in `main.ts` via `ShortcutManager`:

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Y` | Redo (alternative) |
| `Ctrl+E` | Export to PPTX |
| `Ctrl+F` | Focus search input |
| `Escape` | Priority chain: (1) dismiss version viewer → (2) clear search if focused → (3) exit focus mode → (4) clear multi-selection → (5) deselect node |

### Internationalization (i18n)

Arbol includes a lightweight i18n system in `src/i18n/`:

- `t(key, params?)` — translate a key with optional `{param}` interpolation
- `tp(key, count, params?)` — pluralization (looks up `key.one` or `key.other`)
- `setLocale(locale, messages)` — switch locale, sets `document.dir` and `document.lang`
- `getLocale()` / `getDirection()` — current locale and text direction (ltr/rtl)

English strings are in `src/i18n/en.ts` using flat dot-notation keys (e.g., `'menu.edit'`, `'dialog.remove.message'`). To add a locale, create a new file exporting `Record<string, string>` and call `setLocale()`.

### Accessibility

The app follows WCAG 2.1 AA guidelines:

- **SVG chart:** `role="tree"` container, `role="treeitem"` cards with `aria-label`, `aria-level`, `aria-expanded`, keyboard navigation via `KeyboardNav` class
- **Screen reader:** Global `aria-live` announcer (`src/ui/announcer.ts`) for search, undo, save, selection, theme, focus mode
- **Focus management:** Focus trapping in all dialogs/modals, focus restoration on dismiss, `aria-modal`
- **Forms:** All labels linked to inputs via `htmlFor`/`id`, `aria-label` on unlabeled controls
- **ARIA patterns:** Complete tab pattern (`aria-controls`, `role="tabpanel"`, arrow keys), `aria-disabled` on disabled items, `aria-keyshortcuts`, `role="list"`/`role="listitem"` on chart/version lists
- **Color contrast:** WCAG AA compliant; auto-contrast via `contrastingTextColor()` in `src/utils/contrast.ts`
- **Responsive:** Mobile-friendly touch targets (44px), CSS logical properties for RTL, `prefers-reduced-motion`, `forced-colors`

## Testing

- **Framework:** Vitest with jsdom environment
- **1,523 tests across 62 files** — all must pass before committing
- **Run:** `npm run test` (one-shot) or `npm run test:watch` (watch mode)
- **TDD is mandatory** — Red → Green → Refactor for every change
- Tests live in `tests/` mirroring `src/` structure

### Test Files (all 62)

| File | Scope |
|------|-------|
| `tests/controllers/focus-mode.test.ts` | Focus mode enter/exit, state queries, fallback on deletion |
| `tests/controllers/search-controller.test.ts` | Search state coordination, highlight triggers |
| `tests/controllers/selection-manager.test.ts` | Multi-select toggle, bulk selection state, root exclusion |
| `tests/utils/tree.test.ts` | findNodeById, findParent, flattenTree, cloneTree, isLeaf, isM1, stripM1Children, countLeaves, managerLevel |
| `tests/utils/search.test.ts` | Name/title substring matching, case insensitivity |
| `tests/utils/id.test.ts` | UUID generation format |
| `tests/utils/csv-parser.test.ts` | CSV parsing (quotes, escapes, multi-line), tree building, duplicate detection, node limit, cycle path, trailing metadata |
| `tests/utils/shortcuts.test.ts` | Shortcut registration, key combos, prevent defaults |
| `tests/utils/text-normalize.test.ts` | normalizeText (titleCase, uppercase, lowercase, none), normalizeTreeText (recursive, immutable) |
| `tests/utils/contrast.test.ts` | parseHex, relativeLuminance, contrastingTextColor, contrastingTitleColor |
| `tests/utils/filename.test.ts` | Safe filename generation, special character handling |
| `tests/utils/tree-diff.test.ts` | Tree comparison, added/removed/moved/changed node detection |
| `tests/store/backup-manager.test.ts` | Full backup creation, restore (replace/merge), data integrity |
| `tests/store/category-store.test.ts` | ColorCategory CRUD, defaults, localStorage persistence, validation, events, text color auto-contrast |
| `tests/store/chart-db.test.ts` | IndexedDB wrapper CRUD, cascade delete, name uniqueness |
| `tests/store/chart-store.test.ts` | Chart CRUD, migration, dirty tracking, versions, events |
| `tests/store/org-store.test.ts` | Node CRUD, events, undo/redo, serialization, validation, bulk ops |
| `tests/store/settings-store.test.ts` | Settings save/load from localStorage |
| `tests/store/mapping-store.test.ts` | CSV mapping preset CRUD in localStorage |
| `tests/store/theme-manager.test.ts` | Dark/light toggle, class application, persistence |
| `tests/store/theme-presets.test.ts` | Preset definitions, color tuple validation |
| `tests/renderer/chart-renderer.test.ts` | SVG output, IC/Advisor stacks, card rendering, spacing regression |
| `tests/renderer/layout-engine.test.ts` | Position computation, bounding box, IC containers, Advisor assignments |
| `tests/renderer/integration.test.ts` | End-to-end renderer + layout integration |
| `tests/renderer/accessibility.test.ts` | SVG ARIA attributes — role="tree", role="treeitem", aria-label, aria-level |
| `tests/renderer/comparison-integration.test.ts` | Side-by-side version comparison rendering |
| `tests/renderer/side-by-side-renderer.test.ts` | Dual-tree comparison renderer output |
| `tests/renderer/keyboard-nav.test.ts` | SVG keyboard navigation — arrow keys, Enter, Space, Home/End, Shift+F10 |
| `tests/renderer/zoom-manager.test.ts` | Zoom/pan, fitToContent, resetZoom |
| `tests/export/chart-exporter.test.ts` | Chart export orchestration, format selection |
| `tests/export/pptx-exporter.test.ts` | PowerPoint slide generation, shapes, positioning |
| `tests/editor/chart-editor.test.ts` | Chart list rendering, CRUD actions, version management UI |
| `tests/editor/form-editor.test.ts` | Form inputs, parent dropdown, add/edit workflow |
| `tests/editor/import-editor.test.ts` | JSON/CSV import, paste, column mapping, file parsing |
| `tests/editor/json-editor.test.ts` | JSON validation, apply, error display |
| `tests/editor/settings-editor.test.ts` | Category section rendering, color/label editing, add/delete categories |
| `tests/editor/tab-switcher.test.ts` | Tab activation, content switching, aria-selected |
| `tests/editor/utilities-editor.test.ts` | Text normalization UI, backup/restore buttons |
| `tests/i18n/i18n.test.ts` | i18n system — t(), tp(), setLocale(), getDirection(), interpolation, plurals |
| `tests/ui/add-popover.test.ts` | Add-child popover, parent pre-selection, form validation |
| `tests/ui/category-legend.test.ts` | SVG legend rendering, category color display |
| `tests/ui/chart-name-header.test.ts` | Header rendering, edit mode, dirty indicator |
| `tests/ui/column-mapper.test.ts` | Column mapping UI, field selection, preset integration |
| `tests/ui/comparison-banner.test.ts` | Comparison mode banner rendering and actions |
| `tests/ui/confirm-dialog.test.ts` | Confirmation dialog rendering, confirm/cancel actions |
| `tests/ui/context-menu.test.ts` | Menu rendering, item actions, keyboard nav, dismiss, viewport clamping |
| `tests/ui/dialog-utils.test.ts` | Overlay creation, focus trapping utilities |
| `tests/ui/dismissible.test.ts` | Click-outside dismiss, Escape key dismiss behavior |
| `tests/ui/export-dialog.test.ts` | Export dialog rendering, format options |
| `tests/ui/focus-banner.test.ts` | Banner rendering, exit action, dismiss, singleton, theme styling |
| `tests/ui/help-dialog.test.ts` | Help dialog sections, rendering, close behavior |
| `tests/ui/inline-editor.test.ts` | Inline editing, save/cancel, validation |
| `tests/ui/input-dialog.test.ts` | Custom input dialog — render, submit, cancel, focus, validation |
| `tests/ui/manager-picker.test.ts` | Manager search, selection, move target filtering |
| `tests/ui/preset-creator.test.ts` | Preset name input, create/cancel actions |
| `tests/ui/announcer.test.ts` | Screen reader announcer — region creation, message setting, priority, reuse |
| `tests/ui/restore-dialog.test.ts` | Backup restore strategy selection (replace/merge) |
| `tests/ui/toast.test.ts` | Toast notifications — creation, types, auto-dismiss, role="alert" |
| `tests/ui/version-picker.test.ts` | Version selection for comparison |
| `tests/ui/version-viewer.test.ts` | Version preview, restore/close actions |
| `tests/ui/welcome-banner.test.ts` | Welcome banner — show/dismiss, localStorage persistence, ARIA attributes |
| `tests/version.test.ts` | APP_VERSION export, semver format validation |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite HMR)
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run build        # Production build (tsc + vite build)
```

## Agent Workflow (Mandatory)

Every code change **must** follow this sequence — no exceptions:

### 1. Create a Feature Branch

```bash
git checkout main && git pull
git checkout -b <type>/<short-description>   # e.g. feat/csv-export, fix/pal-overlap
```

- **Never commit directly to `main`.** All work happens on a feature branch.
- Branch naming: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/` prefix + kebab-case description.

### 2. Test-Driven Development (TDD)

For every change, follow the Red → Green → Refactor cycle:

1. **Red** — Write a failing test that describes the expected behavior.
2. **Green** — Write the minimum implementation to make the test pass.
3. **Refactor** — Clean up the code while keeping all tests green.

- Write tests **before** implementation code — no exceptions.
- Run `npm run test` after every meaningful change to confirm nothing is broken.
- New features require new tests. Bug fixes require a regression test that reproduces the bug first.
- Tests live in `tests/` mirroring `src/` structure.

### 3. Commit and Verify

- All tests must pass (`npm run test`) before any commit.
- Build must succeed (`npm run build`) before considering the branch ready.
- Commit messages use conventional format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

### 4. Version & Docs Update (Pre-Merge)

Before requesting merge approval, complete these updates as the **final commit** on the feature branch:

1. **Bump `version` in `package.json`** using [Semantic Versioning](https://semver.org/):
   - **patch** (`0.0.x`) — bug fixes, small improvements, documentation-only changes
   - **minor** (`0.x.0`) — new features, non-breaking enhancements
   - **major** (`x.0.0`) — breaking changes (API changes, data format changes)

2. **Update `CHANGELOG.md`** — add a new `## [x.y.z]` section at the top with subsections (Added / Changed / Fixed / Removed) describing what changed.

3. **Update `docs/roadmap.md`** — mark completed items with `[x]`, add new items under the appropriate version section.

4. **Update other docs if affected** — if the change impacts `README.md`, `docs/contributing.md`, or `AGENTS.md`, update them too.

5. **Commit** with message: `chore: bump version to x.y.z`

> **Why this step exists:** The version in `package.json` is the single source of truth — it's injected into the app at build time and displayed in the footer. Every merge to `main` must represent a versioned release.

### 5. Merge Only With User Approval

- When work is complete on the feature branch, **ask the user for explicit approval** before merging into `main`.
- Present a summary of changes (files modified, tests added/changed, what the feature does).
- **Do NOT merge, rebase, or push to `main` without the user saying yes.**
- If the user declines, stay on the feature branch and address their feedback.

### Git Rules Summary

| Rule | Enforcement |
|---|---|
| Work on feature branch | **Always** — never commit to `main` directly |
| TDD (tests first) | **Always** — Red → Green → Refactor |
| Tests pass before commit | **Always** — `npm run test` must exit 0 |
| Version bump before merge | **Always** — bump `package.json`, update CHANGELOG + roadmap + docs |
| Merge to `main` | **Only** with explicit user approval |
| Conventional commits | **Always** — `feat:`, `fix:`, etc. |

## Common Pitfalls

1. **Advisor rendering is complex.** Single Advisors go left-only. The boundary calculations must account for Advisor width to prevent overlap with siblings. Always run spacing regression tests after touching Advisor code.

2. **D3 tree separation.** We override D3's default `separation()` to return 1 for all nodes. Our `enforceSpacing` handles gap logic — don't fight D3's layout.

3. **localStorage persistence.** Imported settings override defaults. If things look wrong after testing imports, clear `localStorage.removeItem('arbol-settings')`.

4. **IC detection is automatic.** A manager is an M1 if ALL children are leaf nodes. Adding a grandchild under an IC converts the parent from M1 to regular manager — this changes rendering. Test both states.

5. **Settings editor wiring.** `SettingsStore` must be passed to `SettingsEditor` for export/import to work. Check `main.ts` wiring if buttons silently fail.

6. **Focus mode is rendering-only.** The `OrgStore` always holds the full tree. Focus mode filters at render time by passing a subtree to `renderer.render()`. Never modify the store to implement focus — only change what is passed to the renderer.

7. **Context menu styling.** Uses `setAttribute('style', ...)` (not `style.cssText`) for CSS variables to work in jsdom tests. Follow this pattern for new UI components.

8. **IndexedDB in tests.** Tests use `fake-indexeddb` to simulate IndexedDB. ChartStore is async — always `await init()` before interacting. When testing migration, seed localStorage before calling `init()`.
