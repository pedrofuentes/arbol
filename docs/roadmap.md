# Arbol — Project Roadmap

> Last updated: 2026-03-20

## Overview

Arbol is an interactive org chart editor for the browser, built with TypeScript, D3.js, and Vite. This roadmap tracks everything completed, in progress, and planned.

---

## 🚀 v3.10.0 — Level Mapping + CSV Import + Analytics

### Phase 38b — Level Mapping System
- [x] LevelMapping interface + LevelDisplayMode type
- [x] LevelStore (EventEmitter pattern) with CRUD, resolve(), CSV import/export
- [x] ChartStore integration (per-chart persistence of level mappings)
- [x] Level mapping settings panel (new tab in Settings Modal)
- [x] Mapped level rendering on cards and PPTX export

### Phase 38b — CSV Import Level Column
- [x] `level` field on ColumnMapping
- [x] Auto-detection of level/grade/band column headers
- [x] Level column dropdown in ColumnMapper UI
- [x] Level propagation through tree building

### Phase 38b — Analytics Panel
- [x] Pure `computeMetrics()` function with 5 metric groups
- [x] Sidebar tabs (Org + Analytics) via TabSwitcher
- [x] AnalyticsEditor with headcount, structure, span of control, levels, categories
- [x] Clickable span-of-control alerts (select node on canvas)
- [x] Focus-mode aware metrics

### Phase 38b — Gap Fills
- [x] Context menu level submenu (single + multi-select)
- [x] Tree diff level change tracking (oldLevel in DiffEntry)

### Testing
- [x] **2,418 tests across 95 files** — all passing
- [x] ~152 new tests across 11 new/modified test files

---

## 🚀 v3.9.0 — Performance Optimization

### Phase 38a-perf — Data Store & UI Performance
- [x] Range slider debouncing (60ms) — eliminates UI freezes during fast drag
- [x] Chart dirty detection via mutation counter instead of JSON.stringify
- [x] IndexedDB patchChart — avoids redundant read-before-write
- [x] CategoryStore in-memory cache — skips JSON.parse per CRUD op
- [x] SettingsStore cache — avoids double localStorage reads
- [x] Property panel dropdown — skips rebuild when categories unchanged
- [x] Debounce timer cleanup on rebuild/destroy

### Testing
- [x] **2,251 tests across 91 files** — all passing
- [x] 33 new tests across 7 files

---

## 🚀 v3.8.0 — Level Metadata + Badge

### Phase 38a — Level Metadata
- [x] `level` field on OrgNode for organizational level tracking
- [x] Circular level badge on org chart cards (configurable color, size, font)
- [x] Level settings — show/hide toggle, badge styling in settings panel
- [x] Level editing via property panel, inline editor, and context menu
- [x] Bulk level operations — setNodeLevel(), bulkSetLevel()
- [x] PPTX level badge export (ellipse shape)

### Testing
- [x] **2,218 tests across 90 files** — all passing

---

## 🚀 v3.7.0 — SVG/PNG Export

### Phase 37 — Image Export
- [x] SVG export — serialize org chart to downloadable `.svg` with proper viewBox
- [x] PNG export — render to canvas at configurable resolution (1×/2×/3×)
- [x] Export dialog format picker (PPTX / SVG / PNG radio buttons)
- [x] Version selection shown only for PPTX; scale selector only for PNG
- [x] Respects focus mode — exports only the visible sub-org
- [x] ARIA/accessibility attributes stripped from exported files
- [x] SVG/PNG exporters code-split via dynamic import

### Testing
- [x] **2,147 tests across 89 files** — all passing
- [x] 27 new tests: SVG/PNG exporter (15), export dialog format picker (6), PPTX version slides (6)

---

## 🚀 v3.6.0 — Spanish Locale

### Phase 36 — Internationalization
- [x] Complete Spanish translation (967 keys, Latin American neutral)
- [x] Language switcher dropdown in settings modal (English / Español)
- [x] Locale persistence in localStorage (`arbol-locale` key)
- [x] Dynamic import of Spanish bundle (code-split, loaded on demand)
- [x] `saveLocalePreference()` / `getSavedLocale()` API in i18n system
- [x] Locale-aware date/number formatting (already using `getLocale()`)

### Testing
- [x] **2,120 tests across 88 files** — all passing
- [x] 7 new tests: locale persistence (4), settings UI picker (3)

---

## 🚀 v3.5.0 — Polish Sprint (Bug Fix + i18n + Accessibility + Error Handling + Test Coverage)

### Phase 35 — Bug Fix + Polish
- [x] Fix GitHub #4 — import shows previous chart instead of newly imported one
- [x] i18n extraction — 29 hardcoded user-facing strings wrapped with `t()` across 7 files
- [x] Accessibility: `aria-invalid` + `aria-describedby` on 4 form validation errors
- [x] Error resilience: global `unhandledrejection` handler with toast notifications
- [x] Error resilience: localStorage save failures surfaced as toast notifications
- [x] Error resilience: D3 render pipeline wrapped in try/catch
- [x] Test coverage: chart-renderer getters, selection, and dim tests (+18)
- [x] Test coverage: column-mapper prefill, toggle, and callback tests (+8)
- [x] Test coverage: performance regression tests for 100/500/1000-node trees (+4)

### Testing
- [x] **2,112 tests across 87 files** — all passing
- [x] 49 new tests: error-handling (10), aria-invalid (18), chart-renderer (18), column-mapper (8), performance (4), chart-editor (1) — some overlap due to source changes adding inherent coverage

---

## 🚀 v3.4.1 — Preview Zoom Regression Fix

### Phase 34 — Bug Fix
- [x] Restore preview zoom controls in settings modal (Fit, Reset, zoom %, drag-to-pan)
- [x] Fix SettingsEditor.destroy() to clean up preview renderer
- [x] Add ZoomManager `programmaticOnly` option for future use

### Testing
- [x] **2,063 tests across 85 files** — all passing
- [x] 14 new tests: zoom-manager, chart-renderer, settings-editor

---

## 🚀 v3.4.0 — Code Review Remediation (All Critical + High)

### Phase 32 — Security, Performance & Architecture
- [x] Tree validation on bundle import — prevents DoS via malicious `.arbol.json`
- [x] Upgrade jsdom 28→29 — resolves 6 undici CVEs
- [x] O(1) dirty tracking via mutation version counter (was JSON.stringify)
- [x] O(n) descendant counts pre-computed (was O(n²) per-node)
- [x] O(1) bulk operation lookups via pre-computed maps
- [x] ZoomManager memory leak fix — skip in preview, add destroy()
- [x] ADVISORS_PER_ROW constant extracted from magic numbers
- [x] Chart switch sanitization — persist repaired charts to IndexedDB
- [x] Bulk operations — collect all nodes before mutation loop
- [x] isM1() documented with 9 edge case tests
- [x] MappingStore now extends EventEmitter
- [x] Standardized all store event payloads to void

### Phase 33 — Architecture Refactors
- [x] main.ts decomposed: 1,931→900 lines into 5 init modules
- [x] SettingsEditor extracted: 1,517→736 lines into 4 sub-panels
- [x] DOM builder utility created + 4 components refactored

### Testing
- [x] **1,931 tests across 74 files** — all passing
- [x] 122 new tests across 12 files

---

## 🚀 v3.3.1 — Code Review Quick Wins

### Phase 31 — Resilience & Error Handling Fixes
- [x] Silent data loss prevention — `.catch()` on fire-and-forget `saveWorkingTree()`
- [x] Crash guard — optional chaining on `focusMode` before initialization
- [x] Memory leak fix — bounded redo stack to `MAX_HISTORY` (50)
- [x] Selection ordering — clear multi-selection before rerender
- [x] HTTP compatibility — `generateId()` fallback in CSV parser
- [x] Error boundary — fatal error UI on `main()` initialization failure
- [x] File read errors — `FileReader.onerror` handlers on import wizard and settings
- [x] Multi-tab safety — `IndexedDB.onblocked` and `onversionchange` handlers
- [x] i18n compliance — replaced hardcoded error strings in import-editor

### Testing
- [x] **1,809 tests across 70 files** — all passing
- [x] 8 new tests: redo stack limits (3), IndexedDB lifecycle (3), save catch (3) (note: 1 test file added with 3 tests)

---

## 🚀 v2.9.1 — Side-by-Side Comparison Enhancements

### Phase 25 — Comparison Interactivity & Bug Fix
- [x] Cross-highlight on hover — hovering a node highlights its match in the other pane (amber glow)
- [x] Click-to-select — click nodes to persistently highlight across both panes; click again to deselect
- [x] Dim toggle fix — "Dim: Off" now correctly propagates to both side-by-side panes

### Testing
- [x] **1,540 tests across 62 files** — all passing
- [x] 17 new tests: cross-highlight hover (7), click-to-select (7), dim toggle (3)

---

## 🚀 v2.9.0 — UX Improvements & Bug Fixes

### Phase 24 — Manager Removal & Comparison Improvements
- [x] "Remove entire org" option — choice dialog when removing a manager: reassign reports or delete entire subtree
- [x] Side-by-side comparison zoom — Fit/Reset buttons now work on both panels
- [x] Auto-create "Original" version on import — new chart imports auto-save initial version snapshot
- [x] Search highlighting fix — all four rendering layers dimmed consistently; SVG compositing artifact resolved

### Testing
- [x] **1,523 tests across 62 files** — all passing
- [x] 13 new tests: search highlighting (8), side-by-side zoom (5)

---

## 🚀 v2.8.0 — Accessibility, i18n & Mobile

### Phase 20 — Comprehensive Accessibility
- [x] SVG chart ARIA tree semantics (`role="tree"`, `role="treeitem"`, `aria-label`, `aria-level`, `aria-expanded`)
- [x] Chart keyboard navigation — arrow keys, Enter, Space, Shift+F10, Home/End (`src/renderer/keyboard-nav.ts`)
- [x] Screen reader announcer — `aria-live` region for search, undo, save, selection, theme, focus mode (`src/ui/announcer.ts`)
- [x] Context menu submenu keyboard nav (ArrowRight/Left, `aria-haspopup`, `aria-expanded`)
- [x] Manager picker keyboard nav (ArrowUp/Down, `aria-activedescendant`)
- [x] Complete ARIA tab pattern (`aria-controls`, `role="tabpanel"`, ArrowLeft/Right)
- [x] Focus trapping in inline editor, add popover; focus restoration on context menu and help dialog dismiss
- [x] Confirm dialog focuses Cancel on danger actions
- [x] All form labels linked to inputs via `htmlFor`/`id` (~30+ controls)
- [x] `aria-label` on JSON editor textarea, file input, paste textarea
- [x] Drop zone, chart list items, chart name header, preset delete all keyboard-accessible
- [x] `aria-disabled` on disabled context menu items
- [x] `aria-keyshortcuts` on undo/redo/export/search
- [x] Removed duplicate `role="main"` from `index.html`
- [x] Footer `aria-label="Status bar"`
- [x] Focus-visible outlines on search, footer, accordion buttons
- [x] Icon button touch targets increased (30px → 36px, 44px on mobile)
- [x] Font sizes converted from `px` to `rem`
- [x] `color-scheme` CSS property for dark/light
- [x] `forced-colors` media query support
- [x] Decorative emoji wrapped in `<span aria-hidden="true">`
- [x] Color contrast WCAG AA — `DEFAULT_TITLE_DARK` `#64748b` → `#475569`, `--text-tertiary` fixed, Pastel preset title color fixed

### Phase 21 — UX & Error Handling
- [x] Toast notification system — `showToast()` with error/success/info types, auto-dismiss, stacking (`src/ui/toast.ts`)
- [x] Custom input dialog — `showInputDialog()` replacing native `prompt()`, with focus trap (`src/ui/input-dialog.ts`)
- [x] Silent `console.error` failures replaced with visible toast messages
- [x] Native `alert()` calls replaced with themed `showToast()`
- [x] Contradictory remove confirmation text fixed
- [x] Inline validation messages — "Name is required" on inline editor, add popover, chart name
- [x] `beforeunload` guard — warns before closing with unsaved changes
- [x] Recursive undo/redo crash fixed — iterative loop, corrupted snapshots skipped
- [x] Loading indicators — spinners for PPTX export, chart switching, file import, app init
- [x] Welcome banner — first-time user guidance with localStorage persistence (`src/ui/welcome-banner.ts`)
- [x] Search "no results" visual indicator

### Phase 22 — Documentation & Help
- [x] Help dialog: 4 new sections (How the Chart Works, Color Categories, Focus Mode, Headcount Badges)
- [x] Help dialog: updated context menu description (all 7 items), Escape priority chain, Backup/Restore docs
- [x] README: fixed incorrect double-click editing claim
- [x] AGENTS.md: updated file count, directory structure, test count, interactions table

### Phase 23 — Internationalization & Mobile
- [x] i18n system — `t()`, `tp()`, `setLocale()`, `getLocale()`, `getDirection()` (`src/i18n/index.ts`)
- [x] English translations — 400+ strings extracted to `src/i18n/en.ts`
- [x] 15 source files wired to use `t()` calls
- [x] RTL readiness — CSS logical properties, dynamic `dir`/`lang` attributes, RTL sidebar animation
- [x] Text expansion accommodation — tooltip `max-width`, flexible sidebar width, banner wrapping
- [x] `textAlign` option extended with `'start'`/`'end'` aliases
- [x] Mobile responsive layout — collapsible sidebar overlay (≤768px), full-width (≤480px), hamburger menu
- [x] 44px touch targets on mobile, adaptive header layout

### Testing
- [x] **1,510 tests across 62 files** — all passing
- [x] 7 new test files: keyboard-nav, accessibility, announcer, toast, input-dialog, welcome-banner, i18n
- [x] 153 new tests added (1,357 → 1,510)

---

## 🚀 v2.5.0 — Version Comparison

### Phase 19 — Version Comparison
- [x] Tree diff algorithm — detects added, removed, moved, and modified nodes by ID matching
- [x] Merged diff view — single chart with corner badges (Added/Removed/Moved/Modified) and removed ghost nodes
- [x] Side-by-side diff view — dual-pane rendering with labels, toggleable from banner
- [x] Comparison banner — shows diff stats (+N −N ↗N ~N), view toggle, dim toggle, exit
- [x] Version picker modal — select comparison target (version or working tree)
- [x] "Compare" button on each version row in the sidebar
- [x] Diff legend below chart with status colors and counts
- [x] Dim unchanged toggle — on/off button to mute or show unchanged nodes at full weight
- [x] Escape key exits comparison mode
- [x] Full test coverage: 1230 tests across 49 files

---

## 🚀 v2.2.0 — Card Styling & Ocean Teal

### Phase 18 — Card Styling Options
- [x] `textAlign` option (left / center / right) for card text alignment
- [x] `textPaddingHorizontal` for left/right-aligned text padding
- [x] `fontFamily` option — 8 PowerPoint-safe fonts (Calibri, Arial, Verdana, Georgia, Tahoma, Trebuchet MS, Segoe UI, Microsoft Sans Serif)
- [x] `cardBorderRadius` option (0–15px) — rounded card corners in SVG and PPTX
- [x] `icContainerBorderRadius` option (0–15px) — rounded IC group container corners
- [x] IC container starts at M1 card midpoint to eliminate visual gaps with rounded corners
- [x] New `select` control type in settings editor for dropdown options
- [x] **Ocean Teal** theme preset — teal #14b8a6 border, left-aligned text, Segoe UI, rounded corners
- [x] All options propagate to PPTX export (font, alignment, rounded shapes)
- [x] Full test coverage: 1056 tests across 41 files

---

## 🚀 v2.1.0 — Backup & Restore

### Phase 17.5 — Backup & Restore
- [x] Export all app data as `.arbol-backup.json` (charts, versions, settings, presets)
- [x] Two restore strategies: Replace All or Merge
- [x] Auto-backup safety net before destructive actions
- [x] Restore strategy picker dialog with backup summary

---

## 🚀 v2.0.0 — Multiple Charts & Versions

### Phase 17.1 — Multiple Charts & IndexedDB
- [x] Multiple org charts with independent categories
- [x] Version snapshots — save, view, restore named point-in-time snapshots
- [x] IndexedDB storage for charts and versions
- [x] Chart name header, dirty indicator, charts sidebar tab
- [x] Import destination choice (new chart vs replace)
- [x] Auto-migration from localStorage to IndexedDB

---

## 🚀 v1.2.0

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
- [x] Advisor stacks — alternating left/right columns with side-entry connecting lines
- [x] Consistent vertical spacing logic for Advisor/non-Advisor managers
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
- [x] **Tab switcher** — People, Import, Settings

### Phase 5 — Pan/Zoom
- [x] `d3-zoom` integration with `ZoomManager`
- [x] Auto-fit on initial render
- [x] Fit to Screen and Reset Zoom buttons
- [x] Preserves zoom/pan across re-renders

### Phase 6 — PowerPoint Export
- [x] Native `.pptx` export using pptxgenjs — fully editable shapes and connectors
- [x] Title font 1pt smaller than name, grey color
- [x] Timestamped filenames (`yyyymmddhhmm-org-chart.pptx`)
- [x] Timestamped filenames on all exports (settings, mapping presets)
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
- [x] RFC 4180 multi-line quoted field support in CSV parser
- [x] Trailing HR system metadata handling (e.g., Workday "Applied filters:" blocks)
- [x] Duplicate ID/name detection with clear error messages
- [x] Circular reference detection with full cycle path in error
- [x] `MAX_NODES` limit (10,000) to prevent browser crashes
- [x] XLSX multi-sheet import warning

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
- [x] **569 tests across 27 test files** — all passing
- [x] TDD approach from day one
- [x] Unit tests: OrgStore, tree utilities, search, ID generation, version
- [x] Integration tests: renderer output, IC/Advisor stacks, spacing regression
- [x] Store tests: settings-store, mapping-store, theme-manager, theme-presets, category-store
- [x] Editor tests: import-editor, tab-switcher, shortcuts

### Phase 14— Versioning Workflow
- [x] `CHANGELOG.md` with Keep-a-Changelog format
- [x] Version management step in Agent Workflow (AGENTS.md step 4)
- [x] Version display in footer (left side, before people count)
- [x] Build-time version injection via Vite (`__APP_VERSION__` from `package.json`)
- [x] `src/version.ts` — single source of truth for app version
- [x] Versioning section in `docs/contributing.md`

### Phase 15 — Per-Node Color Categories
- [x] `ColorCategory` type (`id`, `label`, `color`) and `categoryId` on `OrgNode`
- [x] `CategoryStore` — CRUD for categories with localStorage persistence and 4 default categories
- [x] `OrgStore.setNodeCategory()` and `bulkSetCategory()` for single/multi-node assignment
- [x] Renderer applies per-node card fill color from assigned category
- [x] PPTX export respects per-node category colors (card fill + legend slide)
- [x] Layout engine propagates `categoryId` to IC and Advisor layout nodes
- [x] Settings panel section for managing color categories (add/edit/remove)
- [x] Context menu integration — "Set Color" submenu with category assignment
- [x] Multi-select context menu — bulk category assignment
- [x] Undo/redo support for category assignment operations
- [x] JSON serialization preserves `categoryId` with validation
- [x] Configurable name & title text colors (`nameColor`, `titleColor` in Typography settings)
- [x] Auto-contrast text colors per category via WCAG 2.1 luminance (dark text on light BG, light text on dark BG)
- [x] Per-category text color overrides (Name/Title color pickers in settings, auto-initialized with contrast-safe defaults)
- [x] Color swatches in context menu category submenu
- [x] `src/utils/contrast.ts` — `relativeLuminance()`, `contrastingTextColor()`, `contrastingTitleColor()`
- [x] Midnight theme preset uses light text for dark card fills

### Phase 16 — Configurable Legend Layout
- [x] `legendRows` setting — controls number of rows in category legend; columns auto-calculated
- [x] Multi-column layout in SVG canvas legend (`chart-renderer.ts`)
- [x] Multi-column layout in HTML overlay legend (`category-legend.ts` via CSS grid)
- [x] Multi-column layout in PPTX export legend (`pptx-exporter.ts`)
- [x] "Categories Legend" section in settings editor with slider (0 = auto)
- [x] Proper vertical centering of PPTX legend items

### Phase 17 — Text Normalization & Utilities Tab
- [x] `TextNormalization` type (`none`, `titleCase`, `uppercase`, `lowercase`) and fields on `ColumnMapping`
- [x] `normalizeText()` utility — handles hyphens, apostrophes (e.g., "O'Brien", "Mary-Jane")
- [x] `normalizeTreeText()` — deep immutable tree normalization for name and title independently
- [x] Text normalization dropdowns in import preview step (all import types: CSV, JSON, XLSX)
- [x] Text normalization dropdowns in Column Mapper UI, saved as part of mapping presets
- [x] Preset normalization values pre-populate import preview dropdowns
- [x] **Text normalization** — integrated into Import tab (was standalone Utilities tab)
- [x] `UtilitiesEditor` — normalize all names/titles in the current org chart with one click
- [x] Apply button disabled when no normalization selected (none/none guard)
- [x] Normalization is undoable via OrgStore undo stack
- [x] Success/error feedback after applying normalization

### Testing
- [x] **857 tests across 36 test files** — all passing
- [x] TDD approach from day one
- [x] Unit tests: OrgStore, tree utilities, search, ID generation, version, text normalization
- [x] Integration tests: renderer output, IC/Advisor stacks, spacing regression
- [x] Store tests: settings-store, mapping-store, theme-manager, theme-presets, category-store
- [x] Editor tests: import-editor, tab-switcher, shortcuts, utilities-editor

---

## 🔲 Planned — Phased Roadmap

> **Execution model:** One phase at a time. Each phase is implemented on a feature branch, reviewed, merged, and shipped before starting the next.

### Phase 35 — v3.5.0: Bug Fix + Polish Sprint ✅

- [x] Fix GitHub #4 — import shows previous chart instead of newly imported one
- [x] i18n extraction — wrap remaining ~80 hardcoded user-facing strings with `t()` keys
- [x] Accessibility: add `aria-label` to all ~20 icon-only buttons (verified: already done — 0 issues found)
- [x] Accessibility: add `aria-invalid` + `aria-describedby` on form validation errors
- [x] Accessibility: audit and fix focus restoration after modal dismiss (verified: already correct)
- [x] Error resilience: add `window.onunhandledrejection` global handler
- [x] Error resilience: surface localStorage failures as toast notifications
- [x] Error resilience: add try/catch around D3 rendering operations
- [x] Test coverage: chart-renderer target 75%+ (from ~52%)
- [x] Test coverage: column-mapper branch coverage improvement
- [x] Test coverage: add performance regression tests (layout time for 500/1,000/5,000 nodes)

### Phase 36 — v3.6.0: Spanish Locale ✅

- [x] Create `src/i18n/es.ts` — full Spanish translation of all ~1,035 keys
- [x] Language switcher UI — locale picker in settings or command palette
- [x] Validate all UI strings render correctly in both locales
- [x] Locale-aware date/number formatting
- [x] Tests for locale switching, fallback behavior, interpolation in Spanish

### Phase 37 — v3.7.0: SVG/PNG Export ✅

- [x] SVG export — serialize current SVG to downloadable `.svg` file
- [x] PNG export — render SVG to canvas, export as `.png` (configurable resolution)
- [x] Update export dialog with format picker (PPTX / SVG / PNG)
- [x] Respect focus mode (export subtree only)
- [x] Option to export in dark or light theme regardless of current

### Phase 38 — v3.8.0: Level Metadata + Mapping + Analytics

**Scope:** Add optional `level` field to OrgNode, level mapping system, analytics panel.
**Complexity:** HIGH — touches 14+ files across data, UI, export, and storage layers.

#### Data Model (types.ts, org-store.ts)
- [ ] Add `level?: string` to `OrgNode` interface (e.g., "12", "L5", "Director")
- [ ] Extend `updateNode()` fields to include `level`
- [ ] Extend `addChild()` data to include `level`
- [ ] Add level validation to tree validator (string, max 50 chars)

#### Level Mapping System (new: level-store.ts)
- [ ] Create `LevelStore` extending `EventEmitter` (follows CategoryStore pattern)
- [ ] `LevelMapping` interface: `{ rawLevel: string, displayTitle: string }`
- [ ] Many-to-one: multiple raw levels → single display title (e.g., 10, 11, 12 → "IC")
- [ ] Configurable display mode: raw only, mapped only, or both ("L12 — Senior Engineer")
- [ ] Per-chart mappings stored alongside categories in `ChartRecord`
- [ ] Import mapping presets from CSV (level,title columns) or manual entry
- [ ] Persist to IndexedDB via ChartStore

#### UI — Cards & Editing
- [ ] Render level on cards below title (chart-renderer.ts line ~574, after title text element)
- [ ] Add `showLevel` toggle to `RendererOptions` + settings panel
- [ ] Level editable via inline editor (add 3rd input field)
- [ ] Level editable via property panel (add number input after title)
- [ ] Level column in CSV import (extend `ColumnMapping` with `level?: string`)
- [ ] Column mapper UI: add level dropdown to mapping form

#### Export
- [ ] Level text in PPTX export (pptx-exporter.ts `addNodeShape()` text array)
- [ ] Level text in SVG/PNG export (rendered on cards, exports automatically)
- [ ] Optional toggle to include/exclude level in exports

#### Analytics Panel (new: src/ui/analytics-panel.ts)
- [ ] New sidebar tab or command palette action
- [ ] Total headcount
- [ ] Headcount by level, grouped by mapped title ("Senior: 12 people across L10-L12")
- [ ] Span of control: avg/min/max direct reports per manager
- [ ] Tree depth
- [ ] Level distribution across teams (respects focus mode)
- [ ] Level-based auto-categories — auto-assign colors based on level ranges or mapped titles

### Phase 39 — v3.9.0: Collapsible Subtrees

**Scope:** Collapse/expand branches in the org chart, persisted per chart.
**Complexity:** MEDIUM — new controller + renderer filter + keyboard integration.
**Pattern:** Follows `FocusModeController` model (rendering-only filter, OrgStore holds full tree).

#### Controller (new: src/controllers/collapse-manager.ts)
- [ ] `CollapseManager` class with `collapsedIds: Set<string>`
- [ ] `toggle(nodeId)`, `collapse(nodeId)`, `expand(nodeId)`, `collapseAll()`, `expandAll()`
- [ ] `isCollapsed(nodeId)` query
- [ ] `getVisibleTree(tree)` — returns tree with collapsed branches pruned (same pattern as focus-mode.ts:66-70)
- [ ] Emits `'change'` event for renderer to re-render

#### Persistence
- [ ] Add `collapsedNodeIds?: string[]` to `ChartRecord` in types.ts
- [ ] Save collapsed state via `ChartStore` to IndexedDB on change
- [ ] Restore collapsed state on chart switch / app load

#### Rendering (chart-renderer.ts)
- [ ] Filter tree through `collapseManager.getVisibleTree()` BEFORE `computeLayout()` (line 190)
- [ ] Add collapse toggle button (▶/▼) on manager node cards that have children
- [ ] Badge showing hidden descendant count on collapsed nodes (reuse headcount badge pattern)
- [ ] `LayoutNode` already has `collapsible?: boolean` and `descendantCount` fields (layout-engine.ts:36-38)

#### Keyboard Navigation (keyboard-nav.ts:85-121)
- [ ] Left arrow: if node has children and is expanded → collapse; else navigate to parent
- [ ] Right arrow: if node has children and is collapsed → expand; else navigate to first child
- [ ] Add `onToggleCollapse(nodeId)` callback

#### Integration
- [ ] Command palette: "Collapse all" / "Expand all" commands
- [ ] PPTX/SVG/PNG export: only export visible (non-collapsed) nodes
- [ ] Collapse state preserved when entering/exiting focus mode
- [ ] Undo/redo: collapse state is independent of tree mutations (not in undo stack)

### Phase 40 — v4.0.0: Drag-and-Drop Reorganization

**Scope:** Drag cards to rearrange the org hierarchy visually.
**Complexity:** HIGH — D3 drag behavior + visual feedback + validation + undo.
**Existing foundation:** `moveNode()` (line 208) and `bulkMoveNodes()` (line 239) in org-store.ts.

#### Drag Behavior (chart-renderer.ts)
- [ ] Import D3 `drag()` and attach to `.node` group elements
- [ ] Drag threshold: 5px movement before initiating (prevents accidental drags on click)
- [ ] Drag initiation: `mousedown` on card → after threshold → enter drag mode
- [ ] Ghost card: clone the dragged card with reduced opacity, follows cursor
- [ ] Highlight valid drop targets (all manager cards except descendants of dragged node)
- [ ] Drop target detection: find nearest card under cursor via `document.elementFromPoint()`

#### Visual Feedback (style.css)
- [ ] `.dragging` class: reduced opacity (0.5), elevated z-index, cursor `grabbing`
- [ ] `.drag-over` class: highlighted border (accent color), subtle scale transform
- [ ] `.invalid-drop` class: red border, `not-allowed` cursor
- [ ] Drop line indicator showing where node will be inserted

#### Validation
- [ ] Prevent circular drops: can't drop parent onto its own descendant (use `isDescendant()` from org-store)
- [ ] Prevent root drag: root node is not draggable
- [ ] Prevent drop on self: can't drop node onto itself

#### Undo Integration
- [ ] Single `snapshot()` call before the move (already in `moveNode()` / `bulkMoveNodes()`)
- [ ] Ctrl+Z after drag reverts the move

#### Multi-Select Drag
- [ ] If dragged node is part of multi-selection → drag all selected nodes
- [ ] Use `bulkMoveNodes(selectedIds, newParentId)` for batch operation
- [ ] If dragged node is NOT selected → clear selection, drag only that node

#### Touch Support
- [ ] Long-press (500ms) to initiate drag on touch devices
- [ ] `touchmove` follows finger, `touchend` completes drop
- [ ] Cancel drag on `touchcancel` event

#### Accessibility
- [ ] Keyboard move already works via context menu → "Move" → manager picker
- [ ] Consider adding Ctrl+Arrow shortcuts as an enhancement

### Phase 41 — v4.1.0: PWA + Offline Support

**Scope:** Make Arbol installable as a Progressive Web App with offline capability.
**Complexity:** LOW-MEDIUM — mostly config/assets, minimal code changes.
**Key insight:** IndexedDB persistence already works offline — data layer is ready.

#### Dependencies
- [ ] Install `vite-plugin-pwa` as devDependency
- [ ] Configure in `vite.config.ts` with Workbox strategies

#### Web App Manifest (new: public/manifest.json)
- [ ] App name: "Arbol", short_name: "Arbol"
- [ ] Display: "standalone"
- [ ] Theme color: match `--bg-base` (#0c1222 dark / #ffffff light)
- [ ] Background color: match theme
- [ ] Icons: 192×192 and 512×512 PNG (generate from existing favicon.svg)
- [ ] Start URL: "/"
- [ ] Scope: "/"
- [ ] Description: reuse `app.meta_description` i18n key value

#### Icons
- [ ] Generate 192×192 PNG from favicon.svg
- [ ] Generate 512×512 PNG from favicon.svg
- [ ] Optionally: maskable icon variant for Android adaptive icons

#### Service Worker (via vite-plugin-pwa)
- [ ] Precache: index.html, CSS, JS bundles, favicon assets
- [ ] Runtime cache: no external resources to cache (fully self-contained)
- [ ] Strategy: CacheFirst for assets, NetworkFirst for index.html (for updates)
- [ ] GitHub Pages compatible: service worker scope must match deployment path

#### Registration & UI
- [ ] Add `<link rel="manifest" href="/manifest.json">` to index.html
- [ ] Service worker auto-registered by vite-plugin-pwa
- [ ] Offline indicator: subtle banner when `navigator.onLine === false` (new: src/ui/offline-banner.ts)
- [ ] Auto-update prompt: detect new SW version → show "Update available" toast → reload on confirm
- [ ] i18n keys for offline banner and update prompt (en.ts + es.ts)

#### Testing
- [ ] Verify build includes manifest and service worker
- [ ] Verify app installs on Chrome/Edge (Lighthouse PWA audit)
- [ ] Verify offline mode: disconnect network → app still loads from cache
- [ ] Verify auto-update: deploy new version → existing users see update prompt

### Phase 42 — v4.2.0: Additional Exports + CSV Export

- [ ] CSV export — export current org tree as CSV (name, title, level, parent, category)
- [ ] PDF export — multi-page PDF with configurable layout
- [ ] Excel import improvement — leverage existing exceljs dependency for native `.xlsx` import
- [ ] Batch CSV merge — import CSV to update existing tree (match by name or ID), not just replace

### Phase 43 — v5.0.0: Real-Time Collaboration

> Two managers adjusting an org together, an HR partner reviewing changes with a director — lightweight collaboration for small teams.

- [ ] Lightweight signaling backend — minimal WebSocket relay (Cloudflare Workers, Deno Deploy, or similar edge function; no database server)
- [ ] CRDT-based tree sync — conflict-free replicated data type for OrgNode tree (Yjs or Automerge)
- [ ] Room-based sessions — share a link to co-edit a specific chart (ephemeral rooms, no accounts)
- [ ] Presence indicators — show collaborator cursors/selections on the chart
- [ ] Conflict resolution — automatic merge for non-conflicting edits, visual prompt for conflicts
- [ ] Offline-first — edits queue locally (leveraging PWA), sync when reconnected
- [ ] No accounts required — anonymous or nickname-based collaboration
- [ ] 100% optional — works fully offline/solo with zero backend dependency

### 💡 Future Ideas (Backlog)

- Animation/transitions on tree layout changes
- Full RTL layout engine mirroring (tree direction, not just CSS)
- Custom node templates (different card styles per role/level)
- Shareable URL with encoded org data (base64 tree in URL hash)
- Undo/redo for settings changes (not just tree mutations)
- Hover tooltips showing detailed node info
- Mini-map/overview pane for large charts
- Alternative layouts (left-to-right, radial)
- Conditional formatting (auto-color by level/span of control)
- Node photos/avatars
- Performance: virtual rendering for 10K+ nodes

---

## Known Issues
- **Open — GitHub #4:** When importing, current version shows previously selected chart instead of newly imported one
- Fatima→Ethan vertical spacing required special-case logic for single-child non-Advisor managers (fixed, has regression tests)
- Cross-parent boundary spacing required careful D3 separation override (fixed)
- Imported settings can override defaults if not cleared from localStorage
- HR system CSV exports with trailing metadata caused orphan reference errors (fixed in v1.1.0)

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
Editor (People / Import) → OrgStore (data + events) → Renderer (D3 + SVG)
                                    ↕                            ↑
                              SettingsStore (localStorage)       Right-click / Inline edit / Multi-select
                              ThemeManager (dark/light + presets)
                              MappingStore (CSV column presets)
                              CategoryStore (color categories)
```

```
src/
├── controllers/   # Focus mode, search, selection state management
├── editor/        # Sidebar tab editors (People, Import, Settings, Charts)
├── i18n/          # Internationalization (translation system, locale files)
├── export/        # PowerPoint export
├── renderer/      # D3-based chart rendering, layout engine, keyboard nav, zoom
├── store/         # State management (org data, settings, themes, mappings)
├── ui/            # Dialogs, context menu, inline editor, popovers, pickers, a11y
├── utils/         # Shared helpers (tree, search, CSV parser, shortcuts, ID)
├── types.ts       # Shared type definitions
├── main.ts        # Application entry point and wiring
└── style.css      # Global styles and theme variables
```
