# Arbol — Agent Instructions

> Guidelines for AI agents and copilots working on this codebase.

## Project Summary

**Arbol** is an interactive org chart editor that runs entirely in the browser. It uses TypeScript, D3.js (for tree layout and SVG rendering), Vite (bundler), and pptxgenjs (PowerPoint export). There is no backend — all state lives in the browser (memory + localStorage).

## Architecture

```
Editor (Add / Load / Edit) → OrgStore (data + events) → Renderer (D3 + SVG)
                                    ↕                            ↑
                              SettingsStore ← localStorage       Right-click / Inline edit / Multi-select
                              ThemeManager  ← dark/light toggle
                              MappingStore  ← CSV column presets
```

**Data flow is unidirectional:** editors and on-canvas interactions (right-click context menu, inline editing, Shift+click multi-select) mutate `OrgStore`, which emits `"change"` events, and the renderer re-draws the SVG. Settings flow through `SettingsStore` → `ChartRenderer.updateOptions()`.

## Project Structure

```
src/
├── editor/
│   ├── form-editor.ts        # Add people via form UI
│   ├── json-editor.ts        # Raw JSON tree editor with Apply button
│   ├── import-editor.ts      # File import (JSON/CSV) + paste + column mapping
│   ├── settings-editor.ts    # Visual settings panel with sliders, presets
│   └── tab-switcher.ts       # Sidebar tab management
├── export/
│   └── pptx-exporter.ts      # PowerPoint export (code-split, lazy loaded)
├── renderer/
│   ├── chart-renderer.ts     # Main D3 SVG renderer (~700 lines, core logic)
│   ├── layout-engine.ts      # Shared layout computation extracted from renderer
│   └── zoom-manager.ts       # d3-zoom integration, auto-fit, transform persistence
├── store/
│   ├── org-store.ts           # OrgNode CRUD, events, undo/redo, serialization
│   ├── settings-store.ts      # Persist/load settings from localStorage
│   ├── theme-manager.ts       # Dark/light toggle, theme class management
│   ├── theme-presets.ts       # Color + layout preset definitions
│   └── mapping-store.ts       # CSV column mapping preset storage
├── ui/
│   ├── column-mapper.ts       # UI for mapping CSV columns to OrgNode fields
│   ├── confirm-dialog.ts      # Modal confirmation dialog
│   ├── context-menu.ts        # Right-click context menu (Edit, Add Child, Move, Remove)
│   ├── inline-editor.ts       # Inline card editing (name/title on double-click)
│   ├── add-popover.ts         # Popover form for adding a child from context menu
│   ├── manager-picker.ts      # Manager selection UI for Move operations
│   ├── help-dialog.ts         # Help/about overlay
│   └── preset-creator.ts     # UI for creating/naming presets
├── utils/
│   ├── tree.ts                # Tree traversal (flatten, find, parent, depth)
│   ├── search.ts              # Name/title search with fuzzy matching
│   ├── csv-parser.ts          # CSV parsing with auto-format detection
│   ├── shortcuts.ts           # Keyboard shortcut manager
│   └── id.ts                  # UUID generation
├── types.ts                   # OrgNode, ColumnMapping, MappingPreset interfaces
├── main.ts                    # App entry point — wires everything together
└── style.css                  # Global styles, CSS custom properties, themes
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
- **M1 (First-line manager)** — manager where ALL children are leaf nodes (ICs). Detected automatically.
- **IC (Individual Contributor)** — leaf node under an M1. Rendered as vertical stack in a grey container, no connecting lines.
- **PAL (Personal Advisor)** — leaf node under a non-M1 manager. Rendered in alternating left/right columns with side-entry elbow connectors.

### Spacing Model
All spacing is configurable via `RendererOptions`:
- `topVerticalSpacing` — manager bottom → horizontal connecting line
- `bottomVerticalSpacing` — horizontal line → child top
- `branchSpacing` — exact horizontal gap between sibling subtree boundaries
- `palTopGap`, `palBottomGap`, `palRowGap`, `palCenterGap` — PAL stack spacing
- `icGap`, `icContainerPadding` — IC stack spacing

### Interactions
- **Click** — highlights the card (visual selection only; does not open sidebar editor).
- **Double-click** — opens inline editor on the card for name/title.
- **Right-click** — shows context menu with Edit, Add Child, Move to…, Remove.
- **Shift+click** — toggles multi-select; bulk operations (Move, Remove) appear when ≥1 node is selected.

### Store Bulk Methods
- `bulkMoveNodes(ids, newParentId)` — moves multiple nodes under a new parent in one undo step.
- `bulkRemoveNodes(ids)` — removes multiple nodes (re-parents their children) in one undo step.
- `removeNodeWithReassign(id)` — removes a node and re-assigns its children to the removed node's parent.

### Data Format
```typescript
interface OrgNode {
  id: string;
  name: string;
  title: string;
  children?: OrgNode[];
}
```

CSV imports support: `id,name,title,parent_id` or `name,title,manager_name` (auto-detected).

## Testing

- **Framework:** Vitest with jsdom environment
- **327 tests across 19 files** — all must pass before committing
- **Run tests:** `npm run test`
- **Watch mode:** `npm run test:watch`
- **TDD is mandatory** — see [Agent Workflow](#agent-workflow-mandatory) above
- Tests live in `tests/` mirroring `src/` structure

### Test Categories
| Category | Scope |
|---|---|
| `utils/tree.test.ts` | Tree traversal, flatten, find, parent |
| `utils/search.test.ts` | Name/title search matching |
| `utils/id.test.ts` | UUID generation |
| `store/org-store.test.ts` | CRUD, events, undo/redo, serialization |
| `store/settings-store.test.ts` | Settings persistence |
| `store/mapping-store.test.ts` | CSV mapping presets |
| `store/theme-manager.test.ts` | Dark/light toggle |
| `renderer/chart-renderer.test.ts` | SVG output, IC/PAL stacks, spacing regression |
| `export/pptx-exporter.test.ts` | PowerPoint export shapes |
| `editor/*.test.ts` | Import, tab switching, shortcuts |
| `ui/context-menu.test.ts` | Context menu show/hide, actions, positioning |
| `ui/inline-editor.test.ts` | Inline card editing, save/cancel, validation |
| `ui/add-popover.test.ts` | Add-child popover form, parent pre-selection |
| `ui/manager-picker.test.ts` | Manager picker search, selection, move targets |

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

### 4. Merge Only With User Approval

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
| Merge to `main` | **Only** with explicit user approval |
| Conventional commits | **Always** — `feat:`, `fix:`, etc. |

## Common Pitfalls

1. **PAL rendering is complex.** Single PALs go left-only. The boundary calculations must account for PAL width to prevent overlap with siblings. Always run spacing regression tests after touching PAL code.

2. **D3 tree separation.** We override D3's default `separation()` to return 1 for all nodes. Our `enforceSpacing` handles gap logic — don't fight D3's layout.

3. **localStorage persistence.** Imported settings override defaults. If things look wrong after testing imports, clear `localStorage.removeItem('arbol-settings')`.

4. **IC detection is automatic.** A manager is an M1 if ALL children are leaf nodes. Adding a grandchild under an IC converts the parent from M1 to regular manager — this changes rendering. Test both states.

5. **Settings editor wiring.** `SettingsStore` must be passed to `SettingsEditor` for export/import to work. Check `main.ts` wiring if buttons silently fail.
