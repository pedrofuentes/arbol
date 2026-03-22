# Arbol — Agent Instructions

> Guidelines for AI agents and copilots working on this codebase.

## ⚠️ Non-Negotiable Rules

These rules are **absolute requirements**. Violating any one will break the project or the workflow.

1. **TDD is mandatory.** Write a failing test FIRST, then implement. Red → Green → Refactor. No exceptions.
2. **Never commit to `main`.** All work happens on feature branches (`feat/`, `fix/`, `refactor/`, etc.).
3. **All 2,798 tests must pass** (`npm run test`) before any commit.
4. **Merge only with explicit user approval.** Never auto-merge, rebase, or push to `main` without the user saying yes.
5. **No hardcoded values.** All spacing, sizing, color, and style values go through options/parameters — zero magic numbers.
6. **No `innerHTML` with dynamic data.** Use `textContent`, `createElement`, `appendChild` only.
7. **No UI frameworks.** Vanilla TypeScript only. D3 owns SVG; plain DOM for everything else.
8. **All user-facing strings use `t('key')`** from `src/i18n/index.ts`. Add new keys to `src/i18n/en.ts`.
9. **Version bump + CHANGELOG + docs update** as the final commit before merge.
10. **Deploy via GitHub Pages only.** Never use Netlify, Vercel, or any other platform.

## Project Summary

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
```

**Data flow is unidirectional:** editors and on-canvas interactions mutate `OrgStore`, which emits `"change"` events, and the renderer re-draws the SVG. Settings flow through `SettingsStore` → `ChartRenderer.updateOptions()`.

## Project Structure

98 TypeScript source files in `src/`, organized by concern:

```
src/
├── analytics/       # D3 visualization charts: sunburst-chart, span-chart, treemap-chart
├── controllers/     # focus-mode, search-controller, selection-manager
├── i18n/            # i18n system (t(), tp(), setLocale()) + en.ts (900+ translation keys)
├── editor/          # Sidebar tabs: chart-editor, form-editor, import-editor, json-editor, settings-editor, tab-switcher, utilities-editor
├── export/          # chart-exporter (orchestration), pptx-exporter (PowerPoint generation)
├── renderer/        # chart-renderer (D3 SVG), layout-engine, keyboard-nav, preview-renderer (vanilla DOM, no D3), side-by-side-renderer, zoom-manager
├── store/           # org-store, chart-store, chart-db, category-store, category-preset-store, level-store, level-preset-store, settings-store, mapping-store, backup-manager, theme-manager, theme-presets
├── ui/              # 32 components: context-menu, inline-editor, command-palette, property-panel, preset-toolbar, create-chart-dialog, settings-modal, import-wizard, confirm-dialog, manager-picker, toast, loading-overlay, etc.
├── utils/           # tree helpers (find/flatten/clone/isM1), csv-parser, contrast, shortcuts, event-emitter, filename, file-type, id, search, storage, text-normalize, tree-diff
├── types.ts         # All interfaces: OrgNode, ColumnMapping, ColorCategory, ChartRecord, VersionRecord, DiffStatus, CategoryPreset, LevelMappingPreset
├── main.ts          # App entry — wires stores, renderer, editors, menus, shortcuts
├── version.ts       # App version (injected from package.json at build time)
└── style.css        # Global styles, CSS custom properties, dark/light themes
```

## Coding Standards

These are **mandatory** for all changes — violations will be caught in review:

1. **No hardcoded numbers.** All spacing, sizing, color, and style values must be configurable via options/parameters. Never bury magic numbers in implementation code.

2. **Modular and reusable.** Shared rendering logic (cards, links, stacks) must be in single reusable methods. No copy-paste across node types.

3. **Single source of truth.** Each value is defined in exactly one place (the options interface) and referenced everywhere else.

4. **Vanilla TypeScript.** No UI frameworks. D3 owns the SVG; DOM helpers build the sidebar/panels. Avoid ownership conflicts.

5. **Safe DOM APIs.** Never use `innerHTML` with dynamic data. Use `textContent`, `createElement`, `appendChild`, etc.

6. **Minimize `as any`.** Use proper D3 generics and TypeScript types. Only cast when D3's type system makes it unavoidable, and add a comment explaining why.

7. **i18n-ready strings.** All user-facing text must use `t('key')` from `src/i18n/index.ts`. New strings must be added to `src/i18n/en.ts` (850+ keys, flat dot-notation like `'menu.edit'`, `'dialog.remove.message'`).

## Key Concepts

### Node Types

Node types are determined automatically by tree position — there is no explicit "type" field:

- **Manager** — has children who are also managers. Connected by standard tree lines.
- **M1 (First-line manager)** — manager where ALL children are leaf nodes (ICs). Detected automatically via `isM1()` in `src/utils/tree.ts`.
- **IC (Individual Contributor)** — leaf node under an M1. Rendered as vertical stack in a grey container, no connecting lines.
- **Advisor** — leaf node under a non-M1 manager. Rendered in alternating left/right columns with side-entry elbow connectors.

### Data Format

The core data type is `OrgNode` (defined in `src/types.ts`). All other interfaces are also in `src/types.ts` — refer to that file for full definitions.

```typescript
interface OrgNode {
  id: string;            // UUID via crypto.randomUUID()
  name: string;          // Person's name (max 500 chars)
  title: string;         // Job title (max 500 chars)
  categoryId?: string;   // Optional color category reference
  dottedLine?: boolean;  // When true, parent link renders as dotted line
  children?: OrgNode[];  // Omit for leaf nodes
}
```

**Other key interfaces in `src/types.ts`:** `ColorCategory` (id, label, color, auto-computed nameColor/titleColor), `ChartRecord` (id, name, timestamps, workingTree, categories), `VersionRecord` (id, chartId, name, createdAt, tree), `ColumnMapping` (CSV column mappings with parentRefType 'id'|'name', optional normalization), `MappingPreset`, `DiffStatus`.

**CSV imports** support `id,name,title,parent_id` or `name,title,manager_name` (auto-detected). Custom column names via column mapper UI. HR system exports with trailing metadata handled automatically. Max 10,000 nodes per import.

### Spacing Model

All spacing is configurable via `RendererOptions` — **never hardcode these values**:
- **Card:** `nodeWidth`, `nodeHeight`, `cardFill`, `cardStroke`, `cardStrokeWidth`, `cardBorderRadius`
- **Layout:** `horizontalSpacing`, `branchSpacing`, `topVerticalSpacing`, `bottomVerticalSpacing`
- **Advisors:** `palTopGap`, `palBottomGap`, `palRowGap`, `palCenterGap`
- **ICs:** `icGap`, `icContainerPadding`, `icNodeWidth`, `icContainerFill`, `icContainerBorderRadius`
- **Typography:** `nameFontSize`, `titleFontSize`, `textPaddingTop`, `textGap`, `fontFamily` (7 PowerPoint-safe options), `textAlign` (left/center/right), `textPaddingHorizontal`
- **Links:** `linkColor`, `linkWidth`

### OrgStore API (`src/store/org-store.ts`)

All mutating methods call `snapshot()` (saves undo state) then `emit()` (notifies listeners).

| Method | Signature |
|--------|-----------|
| `getTree()` | `(): OrgNode` |
| `addChild()` | `(parentId, {name, title}): OrgNode` |
| `removeNode()` | `(id): void` — must be leaf; errors on root |
| `removeNodeWithReassign()` | `(nodeId, newParentId): void` — moves children, then deletes |
| `updateNode()` | `(id, {name?, title?}): void` |
| `moveNode()` | `(nodeId, newParentId): void` — validates no circular ancestry |
| `bulkMoveNodes()` | `(ids[], newParentId): void` — single undo step |
| `bulkRemoveNodes()` | `(ids[]): void` — leaf nodes only, single undo step |
| `undo()` / `redo()` | `(): boolean` — max 50 entries |
| `canUndo()` / `canRedo()` | `(): boolean` |
| `getUndoStackSize()` / `getRedoStackSize()` | `(): number` |
| `toJSON()` / `fromJSON()` | Serialize/deserialize tree |
| `onChange()` | `(listener): () => void` — returns unsubscribe fn |
| `getDescendantCount()` | `(nodeId): number` |
| `isDescendant()` | `(ancestorId, nodeId): boolean` |
| `setNodeCategory()` | `(nodeId, categoryId \| null): void` |
| `bulkSetCategory()` | `(ids[], categoryId \| null): void` — single undo step |

### Charts & Versions

Charts are independent org trees stored in IndexedDB (`arbol-db`), each with their own `ColorCategory[]`. Versions are named immutable snapshots.

- **Storage:** Charts + versions in IndexedDB. Settings, theme, CSV mapping presets remain in localStorage.
- **Auto-migration:** Legacy localStorage trees migrated to IndexedDB on first load.
- **Dirty tracking:** ChartStore tracks unsaved changes. Header shows dirty indicator (●).
- **Per-chart categories:** Switching charts loads that chart's categories into `CategoryStore`.

### ChartStore API (`src/store/chart-store.ts`)

| Method | Signature |
|--------|-----------|
| `init()` | `(): Promise<void>` — opens IndexedDB, migrates, loads last-used chart |
| `getCharts()` | `(): ChartRecord[]` — sorted by updatedAt desc |
| `getActiveChart()` | `(): ChartRecord \| null` |
| `createChart()` | `(name, tree?, categories?): Promise<ChartRecord>` |
| `switchChart()` | `(chartId): Promise<void>` — saves current, loads target |
| `deleteChart()` | `(chartId): Promise<void>` — cascades to versions |
| `renameChart()` | `(chartId, name): Promise<void>` |
| `saveWorkingTree()` | `(): Promise<void>` — persists to IndexedDB |
| `isDirty()` | `(): boolean` |
| `createVersion()` | `(name): Promise<VersionRecord>` — snapshots tree, clears dirty |
| `getVersions()` | `(chartId): Promise<VersionRecord[]>` |
| `deleteVersion()` | `(versionId): Promise<void>` |
| `restoreVersion()` | `(versionId): Promise<void>` — replaces working tree |
| `onChange()` | `(listener): () => void` |

### LevelStore API (`src/store/level-store.ts`)

| Method | Signature |
|--------|-----------|
| `getMappings()` | `(): LevelMapping[]` |
| `getMapping()` | `(rawLevel): LevelMapping \| undefined` |
| `addMapping()` | `(rawLevel, displayTitle, managerDisplayTitle?): void` |
| `updateMapping()` | `(rawLevel, displayTitle, managerDisplayTitle?): void` |
| `removeMapping()` | `(rawLevel): void` |
| `replaceAll()` | `(mappings): void` |
| `getDisplayMode()` | `(): LevelDisplayMode` |
| `setDisplayMode()` | `(mode): void` |
| `resolveTitle()` | `(rawLevel, isManager?): string \| undefined` — returns mapped title based on track |
| `resolve()` | `(rawLevel): string` — deprecated, kept for backward compat |
| `importFromCsv()` | `(csvText): number` — 3-column CSV (backward compat with 2-col) |
| `exportToCsv()` | `(): string` — 3-column format |
| `loadFromChart()` | `(chart): void` |
| `toChartData()` | `(): { levelMappings, levelDisplayMode }` |

### CategoryPresetStore / LevelPresetStore

Preset stores for reusing categories and level mappings across charts. Both follow the `MappingStore` pattern with localStorage persistence.

| Method | Signature |
|--------|-----------|
| `getPresets()` | `(): Preset[]` |
| `getPreset()` | `(name): Preset \| undefined` |
| `savePreset()` | `(preset): void` — upserts by name |
| `deletePreset()` | `(name): void` |

### Interactions

| Input | Target | Behavior |
|-------|--------|----------|
| **Click** | Card | Highlights card; shows property panel; clears multi-selection |
| **Click** | Chart name in header | Opens inline editor for chart name |
| **Double-click** | Card | No action (use right-click → Edit for inline editing) |
| **Right-click** | Card | Shows context menu (see below) |
| **Shift+click** | Card | Toggles multi-select; root excluded |
| **Drag** | Canvas | Pan chart (d3-zoom) |
| **Scroll wheel** | Canvas | Zoom in/out (0.1x–4.0x via d3-zoom) |
| **Type** | Search bar | Highlights matching nodes; dims non-matches |

### Context Menu

**Single-card menu** (right-click on unselected card): Edit (inline editor), Add (child popover), Focus (disabled on leaves), Category (submenu), Dotted/Solid toggle, Move (disabled on root, opens manager picker), Remove (disabled on root; managers require child reassignment).

**Multi-select menu** (right-click on one of N selected cards): Category (N people) → `bulkSetCategory()`, Move all (N people) → `bulkMoveNodes()`, Remove all (N people) → managers reassign first, then `bulkRemoveNodes()`.

### Focus Mode

Right-click a non-leaf node → "Focus" renders only that subtree. **Focus is a rendering-only filter** — `OrgStore` always holds the full tree. `main.ts` passes `findNodeById(fullTree, focusedNodeId)` to `renderer.render()` instead of the full tree.

- Banner: "🔎 Viewing [Name]'s org" + "Show full org" button; exit via button or `Escape`
- PPTX export automatically exports only the focused sub-org
- If the focused node is deleted (e.g., via undo), falls back to full org
- **NEVER modify OrgStore to implement focus** — only change what is passed to the renderer

### Keyboard Shortcuts

Registered in `main.ts` via `ShortcutManager`:

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+E` | Export to PPTX |
| `Ctrl+F` | Focus search input |
| `Ctrl+K` | Command Palette |
| `Escape` | Priority chain: (1) dismiss version viewer → (2) clear search → (3) exit focus mode → (4) clear multi-selection → (5) deselect node |

### Internationalization (i18n)

Lightweight i18n system in `src/i18n/`:

- `t(key, params?)` — translate with optional `{param}` interpolation
- `tp(key, count, params?)` — pluralization (`key.one` or `key.other`)
- `setLocale(locale, messages)` — switch locale, sets `document.dir` and `document.lang`
- `getLocale()` / `getDirection()` — current locale and text direction (ltr/rtl)

English strings in `src/i18n/en.ts`: 850+ keys using flat dot-notation. To add a locale, create a new file exporting `Record<string, string>` and call `setLocale()`. **Every user-facing string must use `t('key')` — no hardcoded text.**

### Accessibility

WCAG 2.1 AA compliance is mandatory:

- **SVG chart:** `role="tree"` container, `role="treeitem"` cards with `aria-label`, `aria-level`, `aria-expanded`; keyboard nav via `KeyboardNav` class
- **Screen reader:** Global `aria-live` announcer (`src/ui/announcer.ts`)
- **Focus management:** Focus trapping in all dialogs/modals, focus restoration on dismiss, `aria-modal`
- **Forms:** All labels linked via `htmlFor`/`id`; `aria-label` on unlabeled controls
- **ARIA patterns:** Tab pattern (`aria-controls`, `role="tabpanel"`), `aria-disabled`, `aria-keyshortcuts`, `role="list"`/`role="listitem"`
- **Color contrast:** WCAG AA via `contrastingTextColor()` in `src/utils/contrast.ts`
- **Responsive:** 44px touch targets, CSS logical properties for RTL, `prefers-reduced-motion`, `forced-colors`

## Common Pitfalls

These are the non-obvious gotchas that cause the most bugs. **Read before touching related code:**

1. **Advisor rendering is complex.** Single Advisors go left-only. Boundary calculations must account for Advisor width to prevent sibling overlap. Always run spacing regression tests after touching Advisor code.

2. **D3 tree separation.** We override D3's `separation()` to return 1 for all nodes. Our `enforceSpacing` handles gap logic — don't fight D3's layout.

3. **localStorage persistence.** Imported settings override defaults. If things look wrong after testing imports, clear `localStorage.removeItem('arbol-settings')`.

4. **IC detection is automatic.** A manager is M1 if ALL children are leaf nodes. Adding a grandchild under an IC converts the parent from M1 to regular manager — this changes rendering. Test both states.

5. **Settings editor wiring.** `SettingsStore` must be passed to `SettingsEditor` for export/import to work. Check `main.ts` wiring if buttons silently fail.

6. **Focus mode is rendering-only.** `OrgStore` always holds the full tree. Never modify the store to implement focus — only change what is passed to `renderer.render()`.

7. **Context menu styling.** Uses `setAttribute('style', ...)` (not `style.cssText`) for CSS variables to work in jsdom tests.

8. **IndexedDB in tests.** Tests use `fake-indexeddb`. ChartStore is async — always `await init()` before interacting. Seed localStorage before `init()` when testing migration.

9. **Test setup.** Node.js v22+ has broken native localStorage. Tests use `tests/setup.ts` (Map-backed localStorage). `vi.spyOn(localStorage, ...)` must go in `beforeAll()`, not module top-level.

## Agent Workflow (Mandatory)

Every code change **must** follow this exact sequence — no exceptions.

### 1. Feature Branch

```bash
git checkout main && git pull
git checkout -b <type>/<short-description>   # feat/, fix/, refactor/, test/, docs/, chore/
```

**Never commit directly to `main`.** All work on feature branches with kebab-case names.

### 2. Test-Driven Development

For every change, follow Red → Green → Refactor:

1. **Red** — Write a failing test describing expected behavior
2. **Green** — Write minimum implementation to pass
3. **Refactor** — Clean up while keeping all tests green

Write tests **before** implementation. Bug fixes require a regression test first. Tests live in `tests/` mirroring `src/` structure.

### 3. Commit and Verify

- `npm run test` must pass before every commit (2,798 tests)
- `npm run build` must succeed before the branch is ready
- Conventional commit format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

### 4. Version & Docs Update (Final Commit)

Before requesting merge:

1. **Bump `version` in `package.json`** — patch (bug fix), minor (new feature), major (breaking change)
2. **Update `CHANGELOG.md`** — new `## [x.y.z]` section with Added/Changed/Fixed/Removed
3. **Update `docs/roadmap.md`** — mark completed items `[x]`
4. **Update other docs if affected** — `README.md`, `docs/contributing.md`, `AGENTS.md`
5. **Commit:** `chore: bump version to x.y.z`

The version in `package.json` is the single source of truth — injected into the app at build time and displayed in the footer.

### 5. Merge Only With User Approval

**NEVER merge, rebase, or push to `main` without the user saying yes.** Present a summary of changes and wait for explicit approval.

### Git Rules Summary

| Rule | Enforcement |
|---|---|
| Work on feature branch | **Always** — never commit to `main` directly |
| TDD (tests first) | **Always** — Red → Green → Refactor |
| Tests pass before commit | **Always** — `npm run test` must exit 0 |
| Version bump before merge | **Always** — package.json + CHANGELOG + roadmap + docs |
| Merge to `main` | **Only** with explicit user approval |
| Conventional commits | **Always** — `feat:`, `fix:`, etc. |

## Testing

- **Framework:** Vitest with jsdom environment
- **2,798 tests across 112 files** — all must pass before committing
- **Run:** `npm run test` (one-shot) or `npm run test:watch` (watch mode)
- **TDD is mandatory** — Red → Green → Refactor for every change
- Tests live in `tests/` mirroring `src/` structure exactly (e.g., `src/store/org-store.ts` → `tests/store/org-store.test.ts`)
- Test setup: `tests/setup.ts` provides Map-backed localStorage (Node.js v22+ has broken native localStorage)
- IndexedDB tests use `fake-indexeddb`; `vi.spyOn(localStorage, ...)` must go in `beforeAll()`, not module top-level

## Development & Deployment

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite HMR)
npm run test         # Run all tests (2,798 across 112 files)
npm run test:watch   # Watch mode
npm run build        # Production build (tsc + vite build)
```

**Deployment:** GitHub Pages only, triggered by pushing to `main`. Do **NOT** use Netlify, Vercel, or any other platform.

```bash
git push origin main --tags   # Push to GitHub — Actions handles the rest
```
