# Arbol — Project Roadmap

> Last updated: 2026-03-11

## Overview

Arbol is an interactive org chart editor for the browser, built with TypeScript, D3.js, and Vite. This roadmap tracks everything completed, in progress, and planned.

---

## 🚀 v1.0.0 (Current Release)

### Phase 1 — Project Foundation
- [x] Initialize project with Vite + TypeScript + D3.js + Vitest
- [x] Define `OrgNode` data model and `generateId` utility
- [x] Tree utility functions (flatten, find, parent lookup)
- [x] `OrgStore` — single source of truth with CRUD, events, serialization

### Phase 2 — Chart Renderer
- [x] D3 tree layout with SVG rendering (`ChartRenderer`)
- [x] Base card design — 110×22px, sharp corners, Calibri font, 8/7px text, green border
- [x] Connecting lines with vertical elbow connectors
- [x] IC (Individual Contributor) stacks — vertical layout below M1 managers, grey container, no connecting lines
- [x] PAL (Personal Advisor) stacks — alternating left/right columns with side-entry connecting lines
- [x] Consistent vertical spacing logic for PAL/non-PAL managers
- [x] Single-child manager optimized gap (matches `bottomVerticalSpacing`)
- [x] Boundary-based branch spacing with configurable exact gaps

### Phase 3 — Configurable Settings
- [x] Extract all spacing/sizing into `RendererOptions` (no hardcoded numbers)
- [x] Settings panel in sidebar with live-updating sliders
- [x] 20+ configurable options: dimensions, spacing, typography, colors
- [x] Split vertical spacing into top/bottom controls
- [x] `LayoutEngine` extracted from `ChartRenderer` for shared layout computation

### Phase 4 — Editor Panels
- [x] **Form editor** — parent dropdown, name/title fields, add/edit/delete people
- [x] **JSON editor** — textarea with full tree, Apply button, error feedback
- [x] **Tab switcher** — Add, Load, Edit, Settings

### Phase 5 — Pan/Zoom
- [x] `d3-zoom` integration with `ZoomManager`
- [x] Auto-fit on initial render
- [x] Fit to Screen and Reset Zoom buttons
- [x] Preserves zoom/pan across re-renders

### Phase 6 — PowerPoint Export
- [x] Native `.pptx` export using pptxgenjs — fully editable shapes and connectors
- [x] Title font 1pt smaller than name, grey color
- [x] Timestamped filenames (`yyyymmddhhmm-org-chart.pptx`)
- [x] Code-split pptxgenjs for smaller initial bundle

### Phase 7 — UI/UX Redesign ("Architect's Desk")
- [x] Deep navy background with cross-hatch grid canvas
- [x] Plus Jakarta Sans font for app chrome (chart retains Calibri)
- [x] Teal accent color with glow effects
- [x] Pill-style tabs, tactile hover buttons, animated tooltips
- [x] Smooth fade-in on load

### Phase 8 — Dark/Light Theme
- [x] `ThemeManager` with toggle in header
- [x] 8 color theme presets (Emerald, Corporate Blue, Forest, etc.)
- [x] 4 layout size presets (Compact, Default, Spacious, Presentation)
- [x] IC node widths per preset: 83, 99, 125, 141

### Phase 9 — Data Import
- [x] JSON file import (paste)
- [x] CSV import with 3 auto-detected formats:
  - With IDs: `id, name, title, parent_id`
  - By manager name: `name, title, manager_name`
  - Auto-detected from headers
- [x] CSV column mapping with saveable presets (`MappingStore`)
- [x] Format help with collapsible examples
- [x] `ColumnMapper` UI for custom header mapping

### Phase 10 — Settings Persistence
- [x] Auto-save to `localStorage` with "✓ Saved" flash indicator
- [x] Export/import settings as `.chartit-settings.json` files
- [x] Imported settings create custom preset
- [x] `SettingsStore` for serialization/deserialization

### Phase 11 — UX Polish
- [x] Help dialog (`?` button) with full feature reference
- [x] Real-time search with node highlighting
- [x] Undo/redo with 50-step history
- [x] Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+E, Ctrl+F, Ctrl+H, Escape)
- [x] `ShortcutManager` for centralized key bindings

### Phase 12 — Project Naming & Branding
- [x] Renamed from "ChartIt" to "Arbol" 🌳
- [x] Updated package.json, index.html, header, localStorage keys, theme classes

### Phase 13 — Security & Quality
- [x] Replaced 27 innerHTML usages with safe DOM APIs (XSS prevention)
- [x] Added ARIA attributes for accessibility
- [x] Reduced `as any` casts (proper TypeScript types)
- [x] Content Security Policy meta tag
- [x] Input validation: file size limits, JSON depth/count limits, CSS injection prevention
- [x] MIT LICENSE file

### Testing
- [x] **327 tests across 19 test files** — all passing
- [x] TDD approach from day one
- [x] Unit tests: OrgStore, tree utilities, search, ID generation
- [x] Integration tests: renderer output, IC/PAL stacks, spacing regression
- [x] Store tests: settings-store, mapping-store, theme-manager, theme-presets
- [x] Editor tests: import-editor, tab-switcher, shortcuts

---

## 🔲 Planned / Ideas

### v1.1.0 — Drag-and-Drop Reorganization
- [ ] Drag-and-drop node reorganization with visual feedback
- [ ] Confirmation dialog for large moves (>5 reports)
- [ ] Full test coverage for drag interactions
- [ ] Drag-and-drop file import refinement

### v1.2.0 — Collapsible Subtrees
- [ ] Collapse/expand subtrees with toggle indicators
- [ ] Persist collapse state across re-renders
- [ ] Full test coverage for collapse/expand behavior
- [ ] Large hierarchy support (1000+ people)

### Short-term
- [ ] Increase test coverage on `chart-renderer` (currently ~52%) and `column-mapper` (low branch coverage)
- [ ] Animation/transitions on tree layout changes
- [ ] PNG/SVG export option alongside PPTX
- [ ] Mobile/responsive layout improvements

### Medium-term
- [ ] Multiple org chart tabs / workspaces
- [ ] Undo/redo for settings changes (not just tree mutations)
- [ ] Shareable URL with encoded org data
- [ ] Custom node templates (different card styles per role/level)
- [ ] Batch CSV update (merge new data into existing tree)

### Long-term
- [ ] Collaboration (real-time multi-user editing)
- [ ] Backend/API for persistence (optional — currently browser-only)
- [ ] Plugin system for custom renderers or exporters
- [ ] Integration with HR systems (Workday, BambooHR, etc.)
- [ ] Accessibility audit and full WCAG compliance

---

## Known Issues
- Fatima→Ethan vertical spacing required special-case logic for single-child non-PAL managers (fixed, has regression tests)
- Cross-parent boundary spacing required careful D3 separation override (fixed)
- Imported settings can override defaults if not cleared from localStorage

---

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript | Language (strict mode) |
| Vite | Bundler with HMR |
| D3.js | Tree layout, SVG rendering, zoom/pan |
| pptxgenjs | PowerPoint export |
| Vitest | Testing framework |
| jsdom | DOM testing environment |

---

## Architecture

```
Editor (Add / Load / Edit) → OrgStore (data + events) → Renderer (D3 + SVG)
                                    ↕                            ↑
                              SettingsStore (localStorage)       Right-click / Inline edit / Multi-select
                              ThemeManager (dark/light + presets)
                              MappingStore (CSV column presets)
```

```
src/
├── editor/        # Data editing tabs (Add, Load, Edit, Settings)
├── export/        # PowerPoint export
├── renderer/      # D3-based chart rendering, layout engine, zoom
├── store/         # State management (org data, settings, themes, mappings)
├── ui/            # Dialogs, context menu, inline editor, popovers, pickers
├── utils/         # Shared helpers (tree, search, CSV parser, shortcuts, ID)
├── types.ts       # Shared type definitions
├── main.ts        # Application entry point and wiring
└── style.css      # Global styles and theme variables
```
