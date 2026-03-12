# Arbol — Agent Instructions

> Guidelines for AI agents and copilots working on this codebase.

## Project Summary

**Arbol** is an interactive org chart editor that runs entirely in the browser. It uses TypeScript, D3.js (for tree layout and SVG rendering), Vite (bundler), and pptxgenjs (PowerPoint export). There is no backend — all state lives in the browser (memory + localStorage).

## Architecture

```
Editor (Add / Load / Edit) → OrgStore (data + events) → Renderer (D3 + SVG)
                                    ↕                            ↑
                              SettingsStore  ← localStorage       Right-click / Inline edit / Multi-select
                              ThemeManager   ← dark/light toggle
                              MappingStore   ← CSV column presets
                              CategoryStore  ← localStorage (color categories)
```

**Data flow is unidirectional:** editors and on-canvas interactions (right-click context menu, inline editing, Shift+click multi-select) mutate `OrgStore`, which emits `"change"` events, and the renderer re-draws the SVG. Settings flow through `SettingsStore` → `ChartRenderer.updateOptions()`.

## Project Structure

33 TypeScript source files in `src/`, organized by concern:

```
src/
├── data/
│   └── sample-org.ts          # Sample org data (52 employees, used as default)
├── editor/
│   ├── form-editor.ts         # Add/edit people via form UI (parent dropdown, name/title inputs)
│   ├── json-editor.ts         # Raw JSON tree editor with Apply/validate
│   ├── import-editor.ts       # File import (JSON/CSV) + paste + column mapping + presets
│   ├── settings-editor.ts     # Visual settings panel (sliders, color pickers, presets)
│   └── tab-switcher.ts        # Sidebar tab management (Add / Load / Edit / Settings)
├── export/
│   └── pptx-exporter.ts       # PowerPoint export — takes LayoutResult, writes .pptx file
├── renderer/
│   ├── chart-renderer.ts      # Main D3 SVG renderer — draws cards, links, IC/PAL stacks
│   ├── layout-engine.ts       # Computes x/y positions, bounding box, IC containers, PAL assignments
│   └── zoom-manager.ts        # d3-zoom integration, fitToContent(), resetZoom(), transform persistence
├── store/
│   ├── category-store.ts      # ColorCategory CRUD, defaults (Open Position, Offer Pending, Future Start), localStorage
│   ├── org-store.ts           # OrgNode CRUD, undo/redo (50-entry stack), event emitter, validation
│   ├── settings-store.ts      # Persist/load renderer settings from localStorage
│   ├── theme-manager.ts       # Dark/light toggle — applies class to <html>, persists to localStorage
│   ├── theme-presets.ts       # Color + layout preset definitions (Emerald, Corporate Blue, etc.)
│   └── mapping-store.ts       # CSV column mapping preset storage (localStorage)
├── ui/
│   ├── column-mapper.ts       # Interactive UI for mapping CSV columns to OrgNode fields
│   ├── confirm-dialog.ts      # Modal confirmation dialog (title, message, danger flag)
│   ├── context-menu.ts        # Right-click context menu with keyboard nav (↑↓ Enter Esc)
│   ├── inline-editor.ts       # Inline card editing — text inputs overlaid on SVG card
│   ├── add-popover.ts         # Fixed-position popover for adding child nodes (name/title)
│   ├── manager-picker.ts      # Modal for selecting target node (Move/Reassign operations)
│   ├── focus-banner.ts        # Focus mode banner — "Viewing [Name]'s org" + "Show full org" exit
│   ├── help-dialog.ts         # Help/about overlay (sections on interactions, shortcuts, imports)
│   └── preset-creator.ts      # Modal form for creating/naming CSV column mapping presets
├── utils/
│   ├── tree.ts                # Tree traversal: findNodeById, findParent, flattenTree, cloneTree, isLeaf, isM1, stripM1Children, countLeaves, managerLevel, countManagersByLevel
│   ├── search.ts              # Case-insensitive substring search on name/title, returns matching IDs
│   ├── csv-parser.ts          # CSV parsing (RFC 4180 multi-line quotes, escapes) + tree building from flat CSV, duplicate/cycle/limit validation
│   ├── shortcuts.ts           # Keyboard shortcut manager (register combos, prevent defaults)
│   └── id.ts                  # UUID generation via crypto.randomUUID()
├── types.ts                   # Interfaces: OrgNode, ColumnMapping, MappingPreset
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

## Key Concepts

### Node Types
- **Manager** — has children who are also managers. Connected by tree lines.
- **M1 (First-line manager)** — manager where ALL children are leaf nodes (ICs). Detected automatically via `isM1()`.
- **IC (Individual Contributor)** — leaf node under an M1. Rendered as vertical stack in a grey container, no connecting lines.
- **PAL (Personal Advisor)** — leaf node under a non-M1 manager. Rendered in alternating left/right columns with side-entry elbow connectors.

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
- `palTopGap`, `palBottomGap`, `palRowGap`, `palCenterGap` — PAL stack spacing
- `icGap`, `icContainerPadding`, `icNodeWidth` — IC stack spacing and sizing
- `nameFontSize`, `titleFontSize`, `textPaddingTop`, `textGap` — typography
- `linkColor`, `linkWidth` — connector lines
- `cardFill`, `cardStroke`, `cardStrokeWidth` — card appearance
- `icContainerFill` — IC group background

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

### Interactions

| Input | Target | Behavior |
|-------|--------|----------|
| **Click** | Card | Highlights card (visual only); clears multi-selection |
| **Double-click** | Card | Opens inline editor for name/title directly on the card |
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
| `Escape` | Priority chain: (1) clear search if focused → (2) exit focus mode → (3) clear multi-selection → (4) deselect node |

## Testing

- **Framework:** Vitest with jsdom environment
- **569 tests across 27 files** — all must pass before committing
- **Run:** `npm run test` (one-shot) or `npm run test:watch` (watch mode)
- **TDD is mandatory** — Red → Green → Refactor for every change
- Tests live in `tests/` mirroring `src/` structure

### Test Files (all 27)

| File | Scope |
|------|-------|
| `tests/utils/tree.test.ts` | findNodeById, findParent, flattenTree, cloneTree, isLeaf, isM1, stripM1Children, countLeaves, managerLevel |
| `tests/utils/search.test.ts` | Name/title substring matching, case insensitivity |
| `tests/utils/id.test.ts` | UUID generation format |
| `tests/utils/csv-parser.test.ts` | CSV parsing (quotes, escapes, multi-line), tree building, duplicate detection, node limit, cycle path, trailing metadata |
| `tests/utils/shortcuts.test.ts` | Shortcut registration, key combos, prevent defaults |
| `tests/store/category-store.test.ts` | ColorCategory CRUD, defaults, localStorage persistence, validation, events |
| `tests/store/org-store.test.ts` | Node CRUD, events, undo/redo, serialization, validation, bulk ops |
| `tests/store/settings-store.test.ts` | Settings save/load from localStorage |
| `tests/store/mapping-store.test.ts` | CSV mapping preset CRUD in localStorage |
| `tests/store/theme-manager.test.ts` | Dark/light toggle, class application, persistence |
| `tests/store/theme-presets.test.ts` | Preset definitions, color tuple validation |
| `tests/renderer/chart-renderer.test.ts` | SVG output, IC/PAL stacks, card rendering, spacing regression |
| `tests/renderer/layout-engine.test.ts` | Position computation, bounding box, IC containers, PAL assignments |
| `tests/renderer/integration.test.ts` | End-to-end renderer + layout integration |
| `tests/renderer/zoom-manager.test.ts` | Zoom/pan, fitToContent, resetZoom |
| `tests/export/pptx-exporter.test.ts` | PowerPoint slide generation, shapes, positioning |
| `tests/editor/form-editor.test.ts` | Form inputs, parent dropdown, add/edit workflow |
| `tests/editor/import-editor.test.ts` | JSON/CSV import, paste, column mapping, file parsing |
| `tests/editor/json-editor.test.ts` | JSON validation, apply, error display |
| `tests/editor/settings-editor.test.ts` | Category section rendering, color/label editing, add/delete categories |
| `tests/editor/tab-switcher.test.ts` | Tab activation, content switching, aria-selected |
| `tests/ui/context-menu.test.ts` | Menu rendering, item actions, keyboard nav, dismiss, viewport clamping |
| `tests/ui/focus-banner.test.ts` | Banner rendering, exit action, dismiss, singleton, theme styling |
| `tests/ui/inline-editor.test.ts` | Inline editing, save/cancel, validation |
| `tests/ui/add-popover.test.ts` | Add-child popover, parent pre-selection, form validation |
| `tests/ui/manager-picker.test.ts` | Manager search, selection, move target filtering |
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

1. **PAL rendering is complex.** Single PALs go left-only. The boundary calculations must account for PAL width to prevent overlap with siblings. Always run spacing regression tests after touching PAL code.

2. **D3 tree separation.** We override D3's default `separation()` to return 1 for all nodes. Our `enforceSpacing` handles gap logic — don't fight D3's layout.

3. **localStorage persistence.** Imported settings override defaults. If things look wrong after testing imports, clear `localStorage.removeItem('arbol-settings')`.

4. **IC detection is automatic.** A manager is an M1 if ALL children are leaf nodes. Adding a grandchild under an IC converts the parent from M1 to regular manager — this changes rendering. Test both states.

5. **Settings editor wiring.** `SettingsStore` must be passed to `SettingsEditor` for export/import to work. Check `main.ts` wiring if buttons silently fail.

6. **Focus mode is rendering-only.** The `OrgStore` always holds the full tree. Focus mode filters at render time by passing a subtree to `renderer.render()`. Never modify the store to implement focus — only change what is passed to the renderer.

7. **Context menu styling.** Uses `setAttribute('style', ...)` (not `style.cssText`) for CSS variables to work in jsdom tests. Follow this pattern for new UI components.
