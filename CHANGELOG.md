# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Backup restore with best-effort rollback** — `restoreFullReplace()` validates all data before deleting existing charts; if writing fails, original data is restored on a best-effort basis (#14)
- **Clear-all blocks on backup failure** — destructive "Clear All Data" and "Replace" actions now show an explicit warning dialog when the auto-backup fails, requiring user acknowledgment before proceeding (#15)
- **Version tree validation** — `restoreFullReplace()` and `restoreMerge()` now validate version trees before persisting; malformed versions are skipped with a warning (#16)
- **Bundle import metadata validation** — `importChartAsNew()` and `importChartReplaceCurrent()` now validate categories, levelMappings, and levelDisplayMode; malformed categories are stripped, malformed levelMappings entries are sanitized (valid kept), and invalid levelDisplayMode values are rejected (#17)
- **Layout engine performance** — replaced O(n²) recursive `shiftSubtree` calls with single-pass O(n) offset accumulation for vertical spacing adjustments (#18)

## [3.12.1] — 2026-03-22

### Fixed

- **Undo stack corruption** — OrgStore mutations (`addChild`, `removeNode`, `updateNode`, `fromJSON`) now validate inputs before creating undo snapshots; failed mutations no longer leave orphan entries
- **Silent save failures** — `saveVersion()` and `saveWorkingTree()` now catch and report errors to users instead of fire-and-forget
- **Backup restore accepts invalid trees** — `validateTree()` now runs on backup restore and legacy localStorage migration; invalid trees are skipped or replaced with defaults
- **Settings import breaks on upgrade** — `parseImport()` now merges with defaults instead of rejecting files missing new settings keys
- **Theme preset contrast failures** — 7 theme presets had title colors below WCAG AA 4.5:1 ratio; upgraded from `#64748b` (3.8:1) to `#475569` (6:1)
- **Focus traps missing in 3 modals** — settings modal, import wizard, and command palette now trap Tab key per WCAG 2.1.1
- **Keyboard select handlers not wired** — Enter/Space on SVG tree nodes now triggers selection and context menu
- **~28 hardcoded English strings** — wired to existing i18n `t()`/`tp()` keys in import-editor, utilities-editor, help-dialog, column-mapper, preset-creator
- **flatted CVE** — upgraded `flatted` 3.4.1→3.4.2 (prototype pollution, dev-only)

### Added

- `LoadingOverlay` wired to PPTX/PNG/SVG exports and chart switching — users now see loading feedback during async operations
- `src/constants/defaults.ts` — single source of truth for renderer default values (previously duplicated in 3 files)
- `src/utils/debounce.ts` — reusable debounce utility with flush support
- `tests/helpers/factories.ts` — shared test factories (`makeTree`, `makeChart`, `makeCategories`, `makeM1Tree`, `makeAdvisorTree`, `makeDeepTree`, `makeWideTree`)
- `tests/helpers/dom.ts` — shared DOM container helpers for tests
- 135 new tests across 10 new test files

### Changed

- **IndexedDB saves debounced** — `saveWorkingTree()` calls now debounced at 500ms with `beforeunload` flush; eliminates 80% of I/O writes during rapid edits
- **Rerender batching** — multiple store changes within a single frame now produce one render via `requestAnimationFrame`, down from 5-6 cascading re-renders
- **OrgStore O(1) lookups** — internal `findNodeById`/`findParent` calls replaced with `Map<string, OrgNode>` index; `moveNode` goes from ~50k node visits to O(1) at 10k nodes
- **2,798 tests across 112 files** — all passing

## [3.12.0] — 2026-03-22

### Added

- **Dual-track level mappings** — each level can now map to different titles for Managers vs Individual Contributors; auto-detected from tree structure (has children = manager)
- **Pinned titles** — manually edited titles are auto-pinned and won't be overridden by level mapping; 📌 toggle in property panel to pin/unpin with undo support
- **Inline editing of level mappings** — click any IC or Manager title cell in the mapping table to edit in-place (Enter saves, Escape cancels)
- **Level mappings in chart bundles** — shared `.arbol.json` files now include level mappings and display mode so recipients see mapped titles; warning dialog before replacing existing mappings on import
- **Category presets** — save, load, and delete reusable category configurations; copy categories from another chart
- **Level mapping presets** — save, load, and delete reusable level mapping configurations; copy mappings from another chart
- **Enhanced chart creation** — when creating a new chart, optionally pick categories and level mappings from a saved preset or an existing chart
- 3-column CSV import/export for level mappings (`raw_level,display_title,manager_display_title`), backward compatible with 2-column format
- `CategoryPresetStore` and `LevelPresetStore` — localStorage-backed preset stores following the existing `MappingStore` pattern
- `PresetToolbar` reusable UI component with Save / Load / Copy-from-chart buttons
- `CreateChartDialog` — dedicated dialog for chart creation with preset/chart source pickers
- 30+ new i18n keys for preset and pin functionality
- 97 new tests across 8 new test files

### Changed

- `LevelMapping` interface gains optional `managerDisplayTitle` field
- `OrgNode` interface gains optional `pinnedTitle` boolean field
- `ChartBundle.chart` gains optional `levelMappings` and `levelDisplayMode` fields
- `resolveTitle` signature extended to `(title, rawLevel?, isManager?, pinnedTitle?) => string` across renderer, PPTX exporter, property panel, and footer builder
- `SettingsEditor` constructor extended with optional `categoryPresetStore`, `levelPresetStore`, and `chartStore` parameters
- `ChartStore.createChart()` accepts optional `categories`, `levelMappings`, `levelDisplayMode` parameters
- Level mapping panel now shows 3-column table with column headers (Level | IC Title | Manager Title)

## [3.11.4] — 2026-03-22

### Fixed

- **Chart list export showing wrong dialog** — the 📤 export button on the active chart in the sidebar was showing the PPTX/SVG/PNG format picker instead of the JSON data export dialog with version selection; created a dedicated `showChartExportDialog()` that correctly exports chart data as `.arbol.json`

## [3.11.3] — 2026-03-22

### Fixed

- **CSV import losing level field** — `normalizeTreeText()` was not copying `level` or `dottedLine` when cloning nodes, causing levels mapped during CSV import to be silently dropped when text normalization was applied
- **Wrong tree shown after deleting active chart** — deleting the active chart left OrgStore holding the deleted chart's tree; the remaining chart now loads correctly

## [3.11.2] — 2026-03-21

### Added

- **Analytics disclaimer in help** — added "for reference only" note to the Analytics section in the help dialog

## [3.11.1] — 2026-03-20

### Added

- **Analytics Help** — new "Analytics" section in the help dialog explaining all five KPI metrics (Headcount, Org Depth, Manager-to-IC Ratio, Span of Control, Alerts)
- **KPI Tooltips** — ℹ️ info icons on each analytics KPI card with hover tooltips explaining what each metric measures
- 16 new i18n keys for analytics help content and tooltips

## [3.11.0] — 2026-03-20

### Added

- **Advanced Analytics Visualizations** — three new interactive D3 charts in the analytics tab, accessible via sub-tabs:
  - **Zoomable Sunburst** — radial partition chart showing org hierarchy as concentric rings; arc width = team size, color by department category; click-to-zoom with animated transitions, breadcrumb navigation, center label with stats
  - **Span of Control Distribution** — lollipop chart showing manager span distribution with health zone bands (green=healthy 4-8, yellow=watch, red=alert); KPI strip with avg/median/min-max; hover for manager details, click for drill-down list with `onNodeSelect` integration
  - **Interactive Treemap** — zoomable nested rectangles where tile area = team headcount; click-to-drill-down into sub-orgs; toggle color by department or org depth; breadcrumb navigation, tooltips with metrics
- **Analytics sub-tab navigation** — tab bar with [Overview | Sunburst | Span Chart | Treemap] between KPI strip and detail sections; accessible keyboard navigation with roving tabindex; lazy chart initialization
- **Configurable ideal span range** — "Ideal span: [min] to [max]" controls on the span chart; health zones, background bands, and lollipop colors derive dynamically from the user's ideal range; persisted in localStorage; default 4–8
- **Analytics drawer drag-to-resize** — drag the grip bar at the top of the analytics drawer to make it taller or shorter; height persisted in localStorage; constrained between 120px and 80% viewport

### Performance

- Replace 25 instances of `transition: all` with specific CSS properties (background-color, color, border-color, opacity, transform)
- Reduce `backdrop-filter: blur(8px)` to `blur(4px)` on 3 modal overlays
- Move JS hover style mutations to CSS `:hover` rules in settings panels (eliminates per-hover reflows)
- Add `requestAnimationFrame` throttle to tooltip mousemove handlers in all chart visualizations
- Batch treemap tile creation with `DocumentFragment` (1 reflow instead of N)

## [3.10.0] — 2026-03-20

### Added

- **Level Mapping System** — many-to-one mapping from raw level values to display titles (e.g., L10→IC, L12→Senior); three display modes: raw, mapped, or both
- **LevelStore** — new store for managing level mappings per chart, with CSV import/export support
- **Level mapping settings** — new "Level Mapping" tab in Settings Modal for managing mappings and display mode
- **Analytics bottom drawer** — slide-up panel overlaying the chart canvas with 5 color-coded KPI cards and a 2-column detail grid:
  - Headcount overview (total, managers/ICs/advisors, manager-to-IC ratio)
  - Structure shape (org depth, average leaf depth, layer headcount bars)
  - Span of control (avg/min/max/median, benchmark colors, wide/narrow/single-child manager alerts)
  - Level distribution (raw + mapped, ungrouped count)
  - Category distribution (color-coded with uncategorized count)
- **Analytics toggle** — toolbar button with headcount badge + Ctrl+Shift+A keyboard shortcut
- **Clickable analytics alerts** — clicking a wide/narrow span manager name selects that node on the canvas
- **Focus-mode aware analytics** — shows metrics for focused subtree when in focus mode
- **Context menu level submenu** — set or clear level via right-click menu (single and multi-select)
- **CSV import level column** — optional level/grade/band column in CSV imports with auto-detection
- **Level change tracking** — tree diff now detects and reports level changes (`oldLevel` in DiffEntry)
- **Mapped level rendering** — level badges on cards and in PPTX export show resolved display titles
- **Clickable analytics alerts** — clicking a wide/narrow span manager name selects that node on the canvas
- **Focus-mode aware analytics** — analytics panel shows metrics for focused subtree when in focus mode

### Testing

- **2,431 tests across 96 files** — all passing
- ~152 new tests: analytics metrics (55), level-store (44), analytics-editor (15), level-mapping-panel (15), context-menu level (17), csv-parser level (8), column-mapper level (4), tree-diff level (7), chart-store level integration (6), chart-renderer resolveLevel (3), pptx-exporter resolveLevel (2)

## [3.9.0] — 2026-03-19

### Changed

- **Range slider debouncing** — settings sliders now debounce renderer updates at 60ms; value display updates immediately for smooth UX
- **Chart dirty detection** — `isDirty()` uses mutation counter instead of `JSON.stringify` when available, eliminating repeated serialization of large trees
- **IndexedDB patchChart** — `saveWorkingTree()` uses new `patchChart()` method, avoiding redundant read-before-write in IndexedDB
- **CategoryStore cache** — in-memory cache eliminates `JSON.parse` + type filtering on every CRUD operation; `invalidateCache()` for chart switching
- **SettingsStore cache** — `writeToStorage()` uses cached settings instead of re-reading from `localStorage` on every debounced save
- **Property panel dropdown** — category dropdown skips DOM rebuild when categories haven't changed; uses `DocumentFragment` for batch writes when they have
- **Debounce timer cleanup** — settings editor clears pending debounce timers on rebuild and destroy, preventing zombie callbacks

### Testing

- **2,251 tests across 91 files** — all passing
- 33 new tests: settings editor debounce (4), chart-store dirty detection (5), patchChart (3), category cache (7), settings cache (4), property panel dropdown (4), context menu caching (6)

## [3.8.0] — 2026-03-19

### Added

- **Level metadata** — `level` field on `OrgNode` for organizational level tracking (e.g., L1, L2)
- **Level badge** — circular indigo badge on org chart cards showing level; configurable color, size, font
- **Level settings** — show/hide toggle, badge color, text color, font size, badge size in settings panel
- **Level editing** — set level via property panel, inline editor, and right-click context menu
- **Bulk level operations** — `setNodeLevel()`, `bulkSetLevel()` on OrgStore
- **PPTX level badge** — ellipse shape in PowerPoint export for circular badge rendering

### Testing

- **2,218 tests across 90 files** — all passing

## [3.7.0] — 2026-03-19

### Added

- **SVG export** — download org chart as `.svg` with proper viewBox, cleaned of ARIA attributes
- **PNG export** — download org chart as `.png` at configurable resolution (1×, 2×, 3×)
- **Export format picker** — radio buttons in export dialog to choose PPTX, SVG, or PNG
- PNG scale selector (1×/2×/3×) shown only when PNG format selected
- Version selection shown only when PPTX format selected
- Respects focus mode — exports only the visible sub-org

### Fixed

- **PPTX version slides** — selected versions now render as additional PowerPoint slides (was silently dropped)

### Testing

- **2,147 tests across 89 files** — all passing
- 27 new tests: SVG/PNG exporter (15), export dialog format picker (6), PPTX version slides (6)

## [3.6.0] — 2026-03-19

### Added

- **Spanish locale** — complete Spanish translation (967 keys) in Latin American neutral Spanish
- **Language switcher** — dropdown in settings modal to switch between English and Español
- **Locale persistence** — language preference saved in localStorage, restored on app load
- **Dynamic locale loading** — Spanish bundle loaded on demand via dynamic import (code-split)

### Testing

- **2,120 tests across 88 files** — all passing
- 7 new tests: locale persistence, settings UI picker, locale switching

## [3.5.0] — 2026-03-19

### Fixed

- **Import shows wrong active chart** — explicitly await sidebar refresh after creating a new chart from import wizard, ensuring the correct chart is displayed as active ([#4](https://github.com/pedrofuentes/arbol/issues/4))
- **Global error handler** — added `window.onunhandledrejection` handler that shows toast notifications for runtime errors instead of silent console-only failures
- **localStorage save failures** — settings-store, category-store, and mapping-store now show toast notifications when save operations fail (e.g., storage quota exceeded)
- **D3 render protection** — wrapped render pipeline and getBBox() calls in try/catch for graceful degradation instead of white-screen crashes

### Accessibility

- **aria-invalid on form validation** — add-popover, inline-editor, column-mapper, and preset-creator now set `aria-invalid="true"` and `aria-describedby` on inputs when validation fails, and clear them on user input

### Internationalization

- **29 hardcoded strings extracted** — all remaining user-facing strings in import-editor, column-mapper, preset-creator, backup-panel, form-editor, json-editor, and category-legend now use `t()` translation calls

### Testing

- **2,112 tests across 87 files** — all passing
- chart-renderer: +18 tests (getters, setSelectedNode, setDimUnchanged)
- column-mapper: +8 tests (prefill, radio toggle, callbacks)
- Performance regression tests: +4 tests (100/500/1000-node rendering, DOM leak detection)
- error-handling: +10 tests (global handler, localStorage toasts, render protection)
- aria-invalid: +18 tests (set/clear behavior across 4 forms)
- New helper: `tests/helpers/tree-generator.ts` for synthetic tree generation

## [3.4.7] — 2026-03-19

### Fixed

- **Styled tooltips on chart/version actions** — chart action buttons (Rename, Duplicate, Export, Delete) and version action buttons (View, Compare, Restore, Delete) now use the styled `data-tooltip` CSS tooltips instead of the native browser `title` attribute, matching the toolbar tooltip style

## [3.4.6] — 2026-03-18

### Fixed

- **i18n hardcoded strings** — wrapped 60+ user-facing strings in `t()` across UI components, editors, renderer, and main.ts fatal error handler
- **CSS RTL readiness** — converted 30 physical direction properties (`left:`, `margin-left:`, `text-align: left`, etc.) to CSS logical equivalents (`inset-inline-start:`, `margin-inline-start:`, `text-align: start`)
- **Dark theme contrast** — changed `--text-tertiary` from `#64748b` (3.9:1) to `#94a3b8` (7.3:1), meeting WCAG AA 4.5:1 minimum
- **Touch targets** — added mobile overrides for zoom buttons, sidebar toggle, close buttons, and preview controls to meet 44×44px WCAG minimum
- **Missing ARIA labels** — added `aria-label` to 3 search inputs (manager picker, version picker, chart search) and 5 banner buttons (comparison, focus, welcome)
- **Label associations** — linked `<label>` to `<input>`/`<select>` via `htmlFor`/`id` in input dialog and utilities editor
- **Date formatting** — added `getLocale()` parameter to 4 `.toLocaleString()` calls for locale-aware dates
- **Terminology consistency** — standardized "Tag" → "Category" and "Node" → "Person" across all user-facing strings
- **Duplicate i18n keys** — removed 8 duplicate aria key entries in `en.ts`

### Added

- **`contrastRatio()` utility** — WCAG contrast ratio calculator exported from `src/utils/contrast.ts`
- **`td()` / `tn()` i18n helpers** — locale-aware date and number formatting via `Intl.DateTimeFormat` / `Intl.NumberFormat`
- **Loading overlay** — reusable `showLoading()` / `hideLoading()` component for async operations
- **Required field indicators** — visual asterisk and `aria-required` on Name field with on-blur validation
- **Search UX** — placeholder now says "Search by name or title" ; no-results message gives guidance
- **Help content** — added dotted lines explanation, version comparison section, improved advisor description
- **Discoverability** — welcome banner mentions sample chart; column mapper help text for non-technical users; ICs tooltip in footer
- **Export dialog** — version checkbox description text

### Changed

- **Welcome banner** — dismiss button now hints at help recovery: "Got it — click ❓ anytime for help"
- **Footer separator** — extracted `' · '` to i18n key `footer.separator`; footer stats now use `<span>` elements with tooltips

### Testing

- 2,063 tests across 85 files — all passing

## [3.4.5] — 2026-03-18

### Added

- **Load Sample Org Chart** — button in Help dialog's "Getting Started" section loads a ~20-node demo org showcasing managers, M1s, ICs, advisors, and dotted-line relationships

### Testing

- 1,965 tests across 76 files — all passing

## [3.4.4] — 2026-03-18

### Fixed

- **Preset save prompt regression** — "Save as preset" dialog now correctly triggers when changing any setting (spacing, fonts, alignment, border radius, etc.), not just the 7 color/size fields previously checked

### Testing

- 1,955 tests across 75 files — all passing

## [3.4.3] — 2026-03-18

### Added

- **Tree favicon** — SVG primary favicon with PNG fallbacks (32×32, 16×16) and Apple touch icon (180×180); minimal green tree silhouette on dark background matching theme-color
- **Grab cursor on settings preview** — preview area now shows a hand cursor to indicate drag-to-pan is available

### Testing

- 1,945 tests across 74 files — all passing

## [3.4.2] — 2026-03-16

### Removed

- **Unused sample-org.ts** — `src/data/sample-org.ts` was never imported; deleted
- **Stale PPTX artifact** — removed accidentally committed `202603121439-org-chart.pptx` from repo root
- **Completed plan doc** — deleted `docs/plans/2026-03-14-import-wizard-content.md` (fully implemented)

### Changed

- **.gitignore** — added `*.pptx` and `npm-tree.json` to prevent future accidental commits

### Testing

- 1,945 tests across 74 files — all passing

## [3.4.1] — 2026-03-15

### Fixed

- **Preview zoom regression** — restored Fit, Reset, zoom percentage, drag-to-pan, and scroll-to-zoom in settings preview (broken in v3.4.0 when ZoomManager was set to null for preview mode)
- **SettingsEditor cleanup** — `destroy()` now properly calls `previewRenderer.destroy()` to clean up D3 event listeners

### Added

- **ZoomManager `programmaticOnly` option** — allows creating zoom behavior for programmatic use only (no user interaction), available for future use

### Testing

- 1,945 tests across 74 files — all passing
- 14 new tests: zoom-manager programmaticOnly (11), chart-renderer preview (1), settings-editor preview+destroy (2)

## [3.4.0] — 2026-03-15

### Security

- **Tree validation on bundle import** — `.arbol.json` imports now validate tree structure (depth, node count, field types) before storing, preventing DoS via malicious files
- **Upgrade jsdom 28→29** — resolves 6 undici CVEs (0 audit vulnerabilities)

### Performance

- **O(1) dirty tracking** — replaced JSON.stringify comparison with mutation version counter
- **O(n) descendant counts** — pre-computed in single bottom-up pass (was O(n²) per-node flattenTree)
- **O(1) bulk operation lookups** — pre-computed node/parent maps (was O(n) findNodeById per node)
- **ZoomManager memory leak fix** — skip creation in preview mode, add destroy() for cleanup
- **ADVISORS_PER_ROW constant** — extracted magic number from 5 interdependent layout calculations

### Architecture

- **main.ts decomposition** — split from 1,931→900 lines (53% reduction) into 5 init modules: context-menu-handler, toolbar-builder, footer-builder, comparison-handler, shortcuts-handler
- **SettingsEditor extraction** — split from 1,517→736 lines into 4 panels: preset-panel, category-panel, settings-io, backup-panel
- **DOM builder utility** — shared createButton/createFormGroup/createHeading helpers, refactored 4 UI components

### API Design

- **MappingStore reactive** — now extends EventEmitter (was only store without events)
- **Standardized event payloads** — all stores emit void (ThemeManager was inconsistent)

### Regression fixes

- **Chart switch sanitization** — repaired charts now persisted back to IndexedDB
- **Bulk operations** — collect all nodes before mutation loop (prevents silent skips)
- **isM1() documented** — comprehensive JSDoc + 9 edge case tests for node type classification

### Testing

- 1,931 tests across 74 files — all passing
- 122 new tests: event-emitter (21), E2E workflows (11), dom-builder (22), layout-engine (7), chart-store (14), org-store (6), zoom-manager (5), tree (9), PPTX assertions (23), mapping-store (4)

## [3.3.1] — 2026-03-15

### Fixed

- **Silent data loss prevention** — `saveWorkingTree()` now catches IndexedDB failures and shows a toast notification instead of silently losing edits
- **Crash on early interaction** — guarded `focusMode` references before initialization to prevent `TypeError` when comparison mode triggers during page load
- **Memory leak** — bounded the redo stack to `MAX_HISTORY` (50 entries), matching the undo stack, preventing unbounded memory growth
- **Ghost highlights** — multi-selection is now cleared before re-rendering, preventing brief flicker of deleted nodes
- **CSV import crash on HTTP** — replaced direct `crypto.randomUUID()` calls with `generateId()` fallback for non-secure contexts
- **White screen on init failure** — added error boundary to `main()` showing a user-friendly fatal error screen instead of a blank page
- **Frozen UI on file read failure** — added `FileReader.onerror` handlers to import wizard and settings import
- **Multi-tab deadlock** — added `IndexedDB.onblocked` and `onversionchange` handlers to prevent cross-tab database upgrade deadlocks
- **i18n compliance** — replaced 3 hardcoded error strings in import-editor with `t()` calls

### Testing

- 1,809 tests across 70 files — all passing
- 8 new tests: redo stack limits (3), IndexedDB blocked/versionchange (3), saveWorkingTree catch (3) (note: 1 test file was added but contains 3 tests)

## [3.3.0] — 2026-03-15

### Added

- **Collapsible accordion help dialog** — 13 sections now collapse/expand with chevron indicators; only one section open at a time
- **Keyboard Shortcuts promoted** — Shortcuts section is now first and expanded by default, displayed as a clean two-column grid with 13 shortcuts (8 new: Ctrl+K, Ctrl+,, ?, arrow keys, Enter, Space, Home/End, Shift+F10)
- **New keyboard shortcuts** — `?` opens help dialog, `Ctrl+,` opens settings modal
- **5 new command palette commands** — Help & Shortcuts (❓), Toggle Theme (🌙/☀️), New Chart (➕), Save Version (💾), Import Data (📥)
- **Mobile-friendly welcome** — updated to "Tap, click, or right-click any card…"

### Changed

- **Help content accuracy overhaul** — every section audited and corrected to match current app state: removed non-existent Sidebar Tabs/Collapse-Expand/Export-Import Settings; fixed menu labels (Tag not Set Category, Focus not Focus on sub-org); updated sidebar, import wizard, settings modal, and export dialog descriptions
- **i18n compliance** — all hardcoded English strings in help dialog now use `t()` i18n calls

### Testing

- 1,800 tests across 69 files — all passing

## [3.2.2] — 2026-03-15

### Changed

- **Context menu labels** — shortened "Focus on sub-org" → "Focus", "Set Category" → "Tag", "Set as dotted line" / "Remove dotted line" → "Dotted" / "Solid"

### Added

- **Dotted/Solid toggle** in property panel actions — toggle a node's reporting line between dotted and solid directly from the panel

### Removed

- **Floating actions toolbar** — the bottom toolbar on card selection was redundant with the context menu and property panel; all its actions remain accessible via those UIs

### Testing

- 1,786 tests across 69 files — all passing

## [3.2.1] — 2026-03-15

### Changed

- **Chart centering** — org chart now centers both horizontally and vertically on initial load, fit-to-content, and reset zoom (previously pinned to top with padding)
- `centerAtRealSize()` no longer accepts a `padding` parameter — vertical position is always centered
- `fitToContent()` now centers vertically instead of top-aligning with padding

### Testing

- 1,794 tests across 70 files — all passing

## [3.2.0] — 2026-03-15

### Added

- **Live preview strip** — shared preview area at the top of the settings modal content, visible on all tabs except Backup; per-tab contextual hint text updates automatically on tab switch
- **Preview renderer** — new `src/renderer/preview-renderer.ts` that uses the full `ChartRenderer` in preview mode — zero rendering divergence with the main chart
- Preview mode (`preview: true`) on `ChartRenderer` disables keyboard nav, click handlers, legend, and ARIA tree attributes; pan/zoom remains enabled
- Preview area has fixed 140px height with pan/zoom support for navigating the mini chart
- Preview renders at 100% zoom (real card sizes) — user pans to explore
- **Zoom controls** in preview header — Fit to view (⊞), Reset to 100% (↺), and live zoom percentage indicator
- Preview updates live on every individual control change (sliders, colors, selects, text inputs), not just presets
- Persistent `PreviewRenderer` class avoids recreating the renderer on each update
- `getSvgElement()` API on `ChartRenderer` to access the underlying SVG element
- New `getPreviewArea()`, `setPreviewHint()`, `getPreviewFitBtn()`, `getPreviewResetBtn()`, `getPreviewZoomPct()` APIs on `SettingsModal`
- `setPreviewArea()` and `wirePreviewControls()` on `SettingsEditor` to wire the preview into the modal
- 12 new i18n strings for preview hints and zoom control labels

### Changed

- Settings modal content area wrapped in `.settings-content-column` flex container to support the fixed preview strip above scrollable settings

### Testing

- 1,793 tests across 70 files — all passing

## [3.1.1] — 2026-03-15

### Added

- **File type mismatch warnings** — when restoring a backup, importing settings, or importing org data, the app now detects if you selected the wrong file type and shows a helpful message directing you to the correct feature

### Fixed

- **Category preview readability** — enlarged preview card (52×28 → 64×34px) and increased font sizes; title now displays uppercase

### Testing

- 1,744 tests across 69 files — all passing

## [3.1.0] — 2026-03-15

### Changed

- **Settings panel redesign** — row-based layout matching mockup (label+description left, control+value right)
- Setting groups rendered as flat sections instead of accordions (sidebar tab nav handles grouping)
- Custom styled range sliders (teal thumb, thin track) and color swatch pickers
- 23 settings now have descriptive help text
- Mono-font value display next to range controls

### Testing

- 1,711 tests across 68 files — all passing

## [3.0.2] — 2026-03-15

### Added

- **Command palette: Settings** — ⚙️ Settings action with Ctrl+, shortcut
- **Command palette: Switch Chart** — lists all non-active charts for quick switching
- **Property panel: Avg Span of Control** — shows average direct reports per manager in the selected node's subtree
- **Draggable search bar** — click+drag to reposition the floating search bar on the canvas

### Fixed

- **Command palette input** — removed focus-visible border on the search input
- **Floating search bar** — moved from header to canvas overlay matching mockup (pill shape, 🔍 icon, expands on focus)
- **Clear All Data** — moved inside Backup & Restore section (was showing on every settings tab)

### Testing

- 1,712 tests across 68 files — all passing

## [3.0.1] — 2026-03-15

### Fixed

- **Sidebar UX polish** — reduced side padding, chart list absorbs height (versions + Quick Actions flush at bottom)
- **Ghost buttons** — added `.btn-ghost` and `.btn-icon` CSS classes; `+` and `+ Save` buttons now transparent
- **Chart names visible** — action buttons changed from `opacity:0` to `display:none` so they don't steal flex space
- **No horizontal scrollbar** — added `overflow-x: hidden` to sidebar
- **Text color hierarchy** — fixed dark theme `--text-tertiary` (`#94a3b8` → `#64748b`) to differ from `--text-secondary`
- **Hover actions overlay** — chart/version action buttons render as centered icon overlay (✏️📋📤🗑️) instead of expanding the row
- **Actions on active chart only** — non-active charts are click-to-switch; overlay doesn't block selection
- **Rename via dialog** — replaced inline text input with `showInputDialog` popup (consistent with New Chart)
- **Footer stats update** — `OrgStore.replaceTree()` now emits change event so footer status refreshes on chart switch
- **Version highlighting** — viewed version gets teal accent highlight (`.version-item.viewing`) matching active chart style

### Added

- **Compare button in version viewer** — banner now shows Compare · Restore · ✕ Close (was Restore · Close)
- **Header toolbar dividers** — separators between Undo/Redo | Import/Export | Settings/Theme/Help

### Removed

- **Footer export button** — redundant with header Export button and Ctrl+E shortcut

### Testing

- 1,707 tests across 68 files — all passing

## [3.0.0] — 2026-03-14

### Added

- **Command Palette**: Ctrl+K opens fuzzy search overlay for quick access to all actions (export, undo, redo, search)
- **Property Panel**: Right-side contextual panel appears when clicking a node — shows info, edit fields, and action buttons
- **Floating Actions**: Bottom toolbar with quick action buttons for selected nodes (single and multi-select modes)
- **Settings Modal**: Full-screen tabbed modal accessible via ⚙️ header button (container — content wiring in future release)
- **Import Wizard**: Step-by-step import modal accessible via 📂 Import header button (container — content wiring in future release)
- **Sidebar collapse**: Toggle button (‹/›) to collapse/expand the chart navigator
- **Ctrl+K Quick actions**: Footer button in sidebar opens command palette
- **Export in header**: 📤 Export button moved to header toolbar

### Changed

- Sidebar slimmed from 300px 4-tab editor to 200px chart navigator (chart list + versions only)
- Header buttons styled with ghost theme (transparent background, hover highlight)

### Testing

- 1,707 tests across 68 files — all passing

## [2.9.1] — 2026-03-14

### Added

- **Cross-highlight on hover in side-by-side comparison** — hovering a node in one pane highlights the matching node in the other pane with an amber glow, making it easy to track people across versions
- **Click-to-select in side-by-side comparison** — click nodes to persistently highlight them across both panes; click again to deselect

### Fixed

- **"Dim: Off" toggle not working in side-by-side comparison** — toggling dim unchanged had no effect because the internal renderers always used the default `dimUnchanged = true`; now `SideBySideRenderer` exposes `setDimUnchanged()` and propagates the state to both panes

## [2.9.0] — 2026-03-14

### Added

- **"Remove entire org" option** — when removing a manager, a choice dialog offers "Reassign reports" (existing flow) or "Remove entire org (N people)" with a danger confirmation before deleting the manager and all their descendants
- **Side-by-side comparison zoom** — Fit and Reset zoom buttons now work on both panels in version comparison mode via new `SideBySideRenderer.fitToContent()`, `resetZoom()`, and `centerAtRealSize()` methods
- **Auto-create "Original" version on import** — importing a new chart from JSON or CSV automatically saves an "Original" version snapshot; skipped for bundle imports that already carry their own versions

### Fixed

- **Search highlighting visual bug** — IC container backgrounds and advisor links were not dimmed during search, causing an uneven appearance; now all four rendering layers (tree links, IC containers, advisor links, nodes) are dimmed consistently
- **Search highlighting SVG compositing artifact** — applying opacity to `<g>` group elements created compositing layers causing visible color banding; now targets individual `path.link` elements instead

### Tests

- Added 13 new tests (1,510 → 1,523): search highlighting (8), side-by-side zoom delegation (5)

## [2.8.0] — 2026-03-14

### Added

- **Accessibility: SVG chart ARIA tree semantics** — org chart cards now have `role="treeitem"`, `aria-label`, `aria-level`, `aria-expanded`; SVG container has `role="tree"`
- **Accessibility: Chart keyboard navigation** — Arrow keys navigate the org tree (↑ parent, ↓ child, ←→ siblings), Enter to select, Space for multi-select, Shift+F10 for context menu, Home/End (`src/renderer/keyboard-nav.ts`)
- **Accessibility: Screen reader announcer** — global `aria-live` region announces search results, undo/redo, chart switching, save, selection changes, theme toggle, focus mode (`src/ui/announcer.ts`)
- **Accessibility: Context menu submenu keyboard navigation** — ArrowRight/Left opens/closes submenus, `aria-haspopup`/`aria-expanded` attributes
- **Accessibility: Manager picker keyboard navigation** — ArrowUp/Down with `aria-activedescendant` pattern
- **Accessibility: Complete ARIA tab pattern** — `aria-controls`, `role="tabpanel"`, `aria-labelledby`, ArrowLeft/Right between tabs
- **Accessibility: Keyboard-accessible components** — drop zone, chart list items, chart name header, preset delete button all now reachable via keyboard
- **Accessibility: Focus trapping** — inline editor, add popover now trap focus; confirm dialog focuses Cancel on danger actions; context menu and help dialog restore focus on close
- **Accessibility: `forced-colors` media query** — high contrast mode support for card strokes, focus outlines, toasts
- **Accessibility: `aria-keyshortcuts`** — on undo, redo, export, and search elements
- **Toast notification system** — `showToast()` for success/error/info feedback with auto-dismiss, stacking, `role="alert"` (`src/ui/toast.ts`)
- **Custom input dialog** — `showInputDialog()` replacing native `prompt()`, with focus trap, Enter/Escape, theming (`src/ui/input-dialog.ts`)
- **Welcome banner** — dismissible first-time user guidance with localStorage persistence (`src/ui/welcome-banner.ts`)
- **Search "no results" indicator** — visual hint shown when search matches zero nodes
- **Loading indicators** — spinner states for PPTX export, chart switching, file import, and app initialization
- **Mobile responsive layout** — collapsible sidebar overlay at ≤768px, full-width at ≤480px, hamburger menu toggle, 44px touch targets on mobile
- **i18n infrastructure** — `t()`, `tp()`, `setLocale()`, `getLocale()`, `getDirection()` translation system with 400+ English strings extracted (`src/i18n/`)
- **RTL readiness** — CSS logical properties, dynamic `dir`/`lang` attributes, RTL sidebar animation, text expansion accommodation
- **`beforeunload` guard** — warns before closing tab with unsaved changes
- **Decorative emoji `aria-hidden`** — toolbar button emoji wrapped in `<span aria-hidden="true">`

### Fixed

- **Recursive undo/redo crash** — replaced recursive calls with iterative loop; corrupted snapshots are now skipped gracefully
- **Color contrast WCAG AA** — `DEFAULT_TITLE_DARK` changed from `#64748b` to `#475569`; `--text-tertiary` updated for both themes; Pastel preset title color fixed
- **Form labels not linked to inputs** — ~30+ controls now have `htmlFor`/`id` associations; JSON editor textarea, file input, paste textarea have `aria-label`
- **Silent failures on context menu operations** — `console.error` replaced with visible `showToast()` error messages
- **Native `prompt()` and `alert()` replaced** — version naming and new chart naming use custom `showInputDialog()`; settings errors use `showToast()` instead of `alert()`
- **Contradictory remove confirmation** — "This cannot be undone (but you can use Ctrl+Z)" → "You can undo this with Ctrl+Z."
- **Silent validation failures** — inline editor, add popover, chart name header now show "Name is required" error text
- **Confirm dialog focuses Cancel on danger actions** — previously always focused the destructive Confirm button
- **Disabled context menu items** — now have `aria-disabled="true"` alongside visual disabled style
- **Duplicate `role="main"`** removed from `index.html`
- **Tooltips not keyboard-accessible** — now visible on `:focus-visible` as well as `:hover`
- **Icon button touch targets** — increased from 30px to 36px (44px on mobile)
- **Font sizes converted from `px` to `rem`** — scales with user font size preferences
- **`color-scheme` CSS property** — set for dark/light themes so native controls (scrollbars, form elements) match
- **`textAlign` option extended** — now accepts `'start'` and `'end'` in addition to `'left'`/`'center'`/`'right'`

### Changed

- **Help dialog expanded** — added 4 new sections: How the Chart Works (IC/Advisor/Manager terminology), Color Categories, Focus Mode, Headcount Badges; updated context menu description, Escape priority chain, Backup/Restore docs
- **README.md** — fixed incorrect double-click editing claim
- **AGENTS.md** — updated file count (39→59), added `src/controllers/` directory, updated test count, fixed interactions table
- **Settings accordions** — headers now wrapped in `<h3>` elements with `role="region"` content panels
- **Chart/version lists** — now have `role="list"`/`role="listitem"` semantics
- **Footer** — added `aria-label="Status bar"`

### Tests

- Added 153 new tests (1,357 → 1,510) across 7 new test files
- New: `announcer.test.ts` (10), `toast.test.ts` (9), `input-dialog.test.ts` (10), `welcome-banner.test.ts` (11), `keyboard-nav.test.ts` (26), `accessibility.test.ts` (24), `i18n.test.ts` (26)
- Updated: `org-store.test.ts` (+6 corrupted snapshot tests), `contrast.test.ts`, `category-store.test.ts`, `chart-editor.test.ts`, `settings-store.test.ts`, `theme-presets.test.ts`
- Total: 1,510 tests across 62 files

## [2.7.0] — 2026-03-13

### Refactored

- **CSS utility classes** — extracted 24 utility classes (flex, gap, text, spacing, grid) replacing 28 inline styles
- **localStorage abstraction** — `IStorage` interface with `browserStorage` default; all 8 store files accept injectable storage
- **Generic EventEmitter** — `EventEmitter<T>` with typed payloads; ThemeManager now uses `EventEmitter<Theme>`
- **main.ts decomposition** — extracted `FocusModeController`, `SelectionManager`, `SearchController` (−167 lines)
- **D3 data joins** — all 4 render layers converted to `.data().join()` pattern for future incremental updates

### Tests

- Added 54 new controller tests (focus-mode 16, selection-manager 15, search-controller 11, integration +6)
- Total: 1,352 tests across 55 files

## [2.6.0] — 2026-03-13

### Fixed

- **Undo/redo resilience** — corrupted undo stack entries are now skipped instead of crashing the app
- **Event listener isolation** — a failing listener no longer prevents other listeners from being notified
- **Storage error handling** — localStorage writes wrapped in try/catch; IndexedDB quota errors show user-friendly messages
- **crypto.randomUUID() fallback** — app now works in non-secure contexts (http://) with a fallback UUID generator
- **IndexedDB data validation** — charts loaded from IndexedDB are now sanitized to handle missing/malformed fields

### Improved

- **Layout performance** — eliminated 4 O(n²) algorithms; pre-computed node lookup maps, cached subtree bounds, single-pass manager level computation
- **Render performance** — pre-computed category Map for O(1) lookups instead of O(n) find per rendered element
- **Bundle size** — converted D3 imports from namespace (`import * as d3`) to selective named imports for better tree-shaking
- **Import speed** — version imports now use batched IndexedDB transactions (single transaction instead of N)
- **Category import safety** — importing a chart bundle now warns before replacing existing categories

### Refactored

- Extracted `EventEmitter` base class, eliminating duplicated observer pattern across 3 stores
- Extracted `dismissible.ts` utility for singleton UI element lifecycle management
- Deduplicated legend rendering into shared generic method
- Standardized OrgStore mutation return types (now return affected `OrgNode`)
- Added JSDoc documentation to all core type interfaces

### Tests

- Added 68 new tests (1,230 → 1,298): dialog-utils (30), version-viewer (20), dismissible (9), IndexedDB error paths (4), category import warnings (5)
- Centralized localStorage mock via shared test setup

## [2.5.0] — 2026-03-13

### Added

- **Version comparison** — compare any two chart versions (or a version vs the working tree) to see what changed; click "Compare" on any version in the sidebar, then pick a target
- **Merged diff view** — single chart with color-coded corner badges: Added (green), Removed (red), Moved (purple), Modified (amber); removed nodes shown as ghost cards at their old position
- **Side-by-side diff view** — dual-pane rendering with old tree on the left and new tree on the right, both annotated with diff badges; toggle between merged and side-by-side via the comparison banner
- **Diff legend** — color legend below the chart showing which statuses are present and their counts
- **Dim unchanged toggle** — "Dim: On/Off" button in the comparison banner lets you toggle muting of unchanged nodes; when on, unchanged cards fade to gray so changes stand out

### Fixed

- **Inconsistent diff dimming** — unchanged cards now use uniform fill color overrides instead of group opacity, preventing visual inconsistency between manager cards (dark background) and IC cards (gray container background)

## [2.4.0] — 2026-03-13

### Added

- **Chart bundle export** — new "Export" button on each chart in the sidebar opens a dialog to select which versions to include, then downloads a `.arbol.json` bundle containing the chart's working tree, categories, and selected version snapshots
- **Chart bundle import** — the Import tab auto-detects `.arbol.json` bundle files; users choose to create a new chart or replace the current one; imported versions are added alongside any existing versions

## [2.3.0] — 2026-03-13

### Added

- **Duplicate chart** — new "Duplicate" button on each chart in the sidebar copies the working tree and categories into a new chart (versions are not copied); auto-switches to the copy
- **Import destination choice** — importing CSV/JSON now shows a dialog asking whether to create a new chart or replace the current one (previously always replaced)

### Fixed

- **Dotted line disabled for ICs** — the "Set as dotted line" context menu option is now disabled for Individual Contributor nodes (leaf nodes under M1 managers), which have no connecting lines to make dotted
- **New chart shows empty tree** — creating a new chart now properly loads the empty default tree instead of continuing to display the previous chart's data
- **False unsaved changes warning** — creating a new chart no longer triggers a spurious "unsaved changes" warning when switching charts

## [2.2.1] — 2026-03-13

### Fixed

- Standardized all exported filenames to use `yyyymmddhhmm-` prefix (backup files and PPTX chart exports were using inconsistent date formats)

## [2.2.0] — 2026-03-13

### Added

- **Text alignment** — new `textAlign` option (left / center / right) for card name and title text, with `textPaddingHorizontal` for left/right-aligned padding; syncs to PPTX export
- **Font family** — configurable `fontFamily` with 8 PowerPoint-safe options (Calibri, Arial, Verdana, Georgia, Tahoma, Trebuchet MS, Segoe UI, Microsoft Sans Serif); replaces all hardcoded Calibri references
- **Card border radius** — new `cardBorderRadius` option (0–15px) for rounded card corners; PPTX export uses `roundRect` shape when radius > 0
- **IC container border radius** — new `icContainerBorderRadius` option (0–15px) for rounded bottom corners on IC group containers
- **Ocean Teal preset** — new theme preset with teal `#14b8a6` border, 1.5px stroke, left-aligned text, 6px card radius, 8px IC container radius, Segoe UI font
- **Select control type** — new dropdown control type in settings editor for enum options (textAlign, fontFamily)

### Changed

- IC container background now starts at the vertical midpoint of the M1 manager card (instead of the bottom edge), eliminating visual gaps with rounded card corners
- IC container fill and IC container border radius settings moved to IC Options group
- All 8 existing theme presets now include explicit `textAlign`, `cardBorderRadius`, `fontFamily`, and `icContainerBorderRadius` values

## [2.1.0] — 2026-03-13

### Added

- **Backup & Restore** — new "Backup & Restore" section in the Settings tab to export and import all app data as a single `.arbol-backup.json` file
- Backup bundles all charts, version snapshots, settings, theme, CSV mapping presets, and custom theme presets
- Two restore strategies: **Replace All** (wipe current data and restore from backup) or **Merge** (add new charts, keep existing ones)
- Auto-backup safety net: a backup file is automatically downloaded before destructive actions (Clear All Data, Full Replace restore)
- Restore strategy picker dialog with backup summary (chart count, version count, date, app version)

## [2.0.0] — 2026-03-13

### Added

- **Multiple org charts** — create, rename, and delete independent org charts; switch between them from the new "Charts" sidebar tab or the header chart name
- **Version snapshots** — save named point-in-time snapshots of any chart; view in read-only mode, restore, or delete
- **IndexedDB storage** — org chart data and categories moved from localStorage to IndexedDB for greater capacity (multiple charts × versions)
- **Per-chart categories** — each chart has its own set of color categories
- **Chart name in header** — editable chart name displayed next to the logo with a dirty-state indicator (●) and quick save-version button (💾)
- **Charts sidebar tab** — full chart and version management UI (create, rename, delete, save version, view, restore)
- **Version viewer overlay** — read-only banner when viewing a saved version with Restore / Close actions
- **Import destination choice** — importing CSV/JSON now asks whether to create a new chart or replace the current one
- **Unsaved-changes warnings** — switching charts or restoring versions warns if the current tree has unsaved changes
- **Auto-migration** — existing localStorage data automatically migrates to IndexedDB on first load; no data loss on upgrade

### Changed

- PPTX export filename now includes the chart name
- Status bar now displays the active chart name
- Undo/redo stacks reset when switching charts or restoring versions
- Escape key priority chain now includes dismissing the version viewer

## [1.9.0] — 2026-03-13

### Added

- **Configurable legend rows** — new `legendRows` setting in the "Categories Legend" section controls how many rows the category legend uses; columns are auto-calculated (`ceil(count / rows)`) with row-major fill order
- Multi-column layout applies to all three legend renderers: SVG canvas, HTML overlay, and PPTX export
- Default `legendRows = 0` preserves existing single-column behavior

### Changed

- PPTX legend items are now properly vertically centered within the legend box
- PPTX legend column spacing tightened for a more compact multi-column layout

## [1.8.0] — 2026-03-13

### Added

- **Configurable name & title text colors** — new `nameColor` and `titleColor` settings in the Typography section, persisted across sessions and included in all 8 theme presets
- **Auto-contrast text colors for categories** — when a category's background color is set or changed, name and title text colors are auto-computed using WCAG 2.1 relative luminance for readability
- **Per-category text color overrides** — each category row in Settings now has Name and Title color pickers, auto-initialized with contrast-safe defaults but manually adjustable
- **Color swatches in context menu** — category submenu items now display a colored circle swatch for quick visual identification
- **Contrast utility module** (`src/utils/contrast.ts`) — `relativeLuminance()`, `contrastingTextColor()`, `contrastingTitleColor()` helpers
- Midnight theme preset now uses light text colors (`#e2e8f0` / `#cbd5e1`) for readability on dark cards
- PPTX export respects both global and per-category text colors

### Changed

- Title text color is no longer hardcoded to `#64748b` — it now uses the configurable `titleColor` setting
- Name text color is no longer inherited black — it now uses the configurable `nameColor` setting
- `ColorCategory` interface extended with optional `nameColor` and `titleColor` fields (backward-compatible — old data auto-migrated)

## [1.7.2] — 2026-03-13

### Changed

- **Timestamped filenames on all exports** — mapping preset exports, settings exports, and PPTX exports now all use `yyyymmddhhmm-` prefix for consistent file naming
- Extracted shared `generateTimestamp()` utility from PPTX exporter into `src/utils/filename.ts`

## [1.7.1] — 2026-03-13

### Security

- **Replaced xlsx with exceljs** — `xlsx` 0.18.5 had high-severity prototype pollution (CVE-2023-30533) and ReDoS vulnerabilities with no fix on npm; replaced with actively-maintained `exceljs`

### Changed

- Bumped `vitest` and `@vitest/coverage-v8` from 4.0.18 to 4.1.0

## [1.7.0] — 2026-03-13

### Added

- **Privacy messaging** — README and in-app Help dialog now clearly state all data stays in your browser (no server, no tracking, no accounts)
- **Clear All Data** — button in both the Help dialog and Settings panel to delete all local data with a danger confirmation

## [1.6.0] — 2026-03-13

### Added

- **Headcount badge** — optional badge on each manager card showing total number of reports
  - Grey rounded-corner box positioned on the right edge of the card, vertically centered
  - Enable via Settings → Headcount Badge → Show Headcount
  - Fully configurable: font size, height, radius, padding, colors
  - Renders in both SVG and PowerPoint exports
- **PPTX export warning** — shows a confirmation dialog when the org chart exceeds PowerPoint's 56″ slide limit, suggesting to use Focus mode to export a sub-org instead
- **1000-person sample org** — `public/big-org-1000.csv` with 8 levels of depth for testing large orgs

### Fixed

- Default layout for first-time users is now "Default" instead of "Compact"
- PPTX badge text no longer wraps to 2 lines for multi-digit numbers

## [1.5.2] — 2026-03-12

### Fixed

- **PPTX export now matches on-screen 100% zoom** — slide is dynamically sized to the chart's bounding box at 1:1 scale (96 DPI) instead of shrinking/stretching to fit a fixed slide
  - Font sizes, card colors, stroke widths, and link styles are forwarded from renderer settings
  - Safety cap at PowerPoint's 56″ max slide dimension (only scales down if exceeded)
  - Backward compatible: explicit `slideWidth`/`slideHeight` still uses fit-to-slide behavior

## [1.5.1] — 2026-03-12

### Changed

- **Scaled categories legend** — legend now sizes proportionally with each layout preset instead of using fixed 8px values
  - New `legendFontSize` option on `RendererOptions` controls all legend dimensions (font, swatch, padding, row height)
  - Per-preset values: Compact (8px), Default (12px), Spacious (14px), Presentation (16px)

## [1.5.0] — 2026-03-12

### Changed

- **Rebalanced layout presets** — larger default sizes for better readability
  - Default preset now uses previous Presentation values (160×34 cards, 11/9px fonts)
  - New Spacious (190×42) and Presentation (220×50) presets for extra-large displays
  - Compact preset retains the previous Default values (110×22) for dense layouts
  - Slider max for Node Width increased to 250, IC Node Width to 220
  - IC node width ratio updated from 0.77 to 0.88 of parent node width

## [1.4.0] — 2026-03-12

### Added

- **Dotted-line reporting** — optional dashed connections indicating a person works for one manager but reports to another
  - `dottedLine` boolean on `OrgNode`, `setDottedLine()` store method with undo/redo
  - Dashed SVG links (`stroke-dasharray`) and dashed PPTX connectors (`dashType`)
  - "Dotted line" checkbox in manager picker during Move, toggle in context menu
  - Configurable `dottedLineDash` setting (default `6,4`)

### Changed

- **Real-size initial zoom** — org chart now loads at actual pixel size (1:1 scale) instead of fitting to viewport
  - New `centerAtRealSize()` method on `ZoomManager` — positions chart at scale=1, centered horizontally, top-aligned
  - "⟲ Reset" button returns to real size; "⊞ Fit" button still fits to viewport
  - Zoom indicator shows absolute percentage (100% = real pixel size)
  - Focus mode enter/exit still auto-fits to viewport

## [1.3.1] — 2026-03-12

### Security

- Pinned `xlsx` dependency to exact version `0.18.5` (known prototype pollution and ReDoS vulnerabilities in `^0.18.x` range)
- Hardened Content Security Policy with `form-action`, `frame-ancestors`, `base-uri`, `object-src`, and `connect-src` directives
- Replaced `innerHTML` usage in import editor drop zone with safe DOM construction

### Fixed

- Added missing `FileReader.onerror` handler in import editor preset file loader
- Wrapped all async context menu actions (Move, Remove, bulk operations) in try/catch to prevent unhandled promise rejections
- Added `console.warn` logging to 5 silent `catch` blocks in stores (`CategoryStore`, `MappingStore`, `SettingsStore`) and `main.ts`
- Implemented `ShortcutManager.destroy()` — now properly removes the keydown event listener
- Replaced `as any` type assertions in chart renderer with proper `CardDatum` D3 generics

### Improved

- **Performance**: `flattenTree()` rewritten as iterative (avoids stack overflow on deep trees), `cloneTree()` uses `structuredClone`, search results memoized with auto-invalidation
- **Accessibility**: Added `:focus-visible` outlines on all buttons/inputs, skip-navigation link, `@media (prefers-reduced-motion: reduce)`, focus traps in all modal dialogs, `aria-hidden` on decorative emoji icons
- **Reusability**: Extracted shared `dialog-utils.ts` with `createOverlay()`, `createDialogPanel()`, and `trapFocus()` — refactored confirm dialog, manager picker, and help dialog to use them

### Added

- ESLint + Prettier tooling with `lint`, `lint:fix`, `format`, `format:check`, and `type-check` npm scripts
- `<meta name="description">` and `<meta name="theme-color">` tags in `index.html`
- `.prettierrc` and `.prettierignore` configuration files
- 52 new tests across 4 new test files: `confirm-dialog`, `help-dialog`, `preset-creator`, `column-mapper` (722 total across 34 files)
- Extended `.gitignore` with `*.log`, `.env`, `.env.local`, `.DS_Store`, `*.swp`, `*.swo`

## [1.3.0] — 2026-03-12

### Added

- **Collapsible accordion sections** in Settings — fine-tuning groups collapsed by default, presets and categories expanded
- **Per-group reset buttons** — reset individual setting groups to defaults
- **Settings quick-filter** — search input at top of Settings to find specific settings
- **Unified preset system** — theme cards + layout buttons in single section, save custom presets
- **Category legend** — floating legend on chart area showing defined categories
- **Zoom level indicator** — shown in footer right side
- **Selection count** — shown in footer center when multi-selecting

### Changed

- **Sidebar tabs consolidated** from 5 (Add, Load, Edit, Settings, Utilities) to 3 (People, Import, Settings)
- **People tab** — combines Add Person + Edit Person workflows
- **Import tab** — combines file import, text normalization, and collapsible JSON editor
- **Import flow simplified** — preset list always visible, removed Manage toggle
- **Sample org button** moved to bottom of Import tab
- **Footer center** restored GitHub links

### Removed

- Standalone Edit (JSON) tab — now a collapsible section in Import tab
- Standalone Utilities tab — text normalization moved into Import tab
- Mini card preview in Settings

### Fixed

- Zoom indicator showed 150% as the default view — now displays percentage relative to fit-to-content base scale so the default always reads 100%

### Changed (internal)

- Renamed PAL to Advisor in user-facing text
- Reset zoom button now calls fitToContent() instead of resetZoom()

## [1.2.0] — 2026-03-12

### Added

- **Text normalization on import** — Title Case / UPPERCASE / lowercase options for name and title fields independently, available in the import preview step for all import types (CSV, JSON, XLSX)
- **Utilities sidebar tab** — new tab with text normalization for the existing org chart (apply Title Case / UPPERCASE / lowercase to all names and/or titles with a single click)
- Normalization dropdowns in Column Mapper UI, saved as part of mapping presets
- `TextNormalization` type and `nameNormalization` / `titleNormalization` fields on `ColumnMapping`
- `normalizeText()` utility with title case support for hyphens and apostrophes (e.g., "O'Brien", "Mary-Jane")
- `normalizeTreeText()` for deep immutable tree normalization
- `UtilitiesEditor` class following existing editor pattern with apply/undo support
- 52 new tests (621 total across 30 files)

## [1.1.0] — 2026-03-12

### Added

- Per-node color categories with customizable labels and colors
- Default categories: Open Position (amber), Offer Pending (blue), Future Start (purple)
- `CategoryStore` for managing category definitions with localStorage persistence
- `categoryId` optional field on `OrgNode` for category assignment
- `setNodeCategory()` and `bulkSetCategory()` methods on `OrgStore` with undo support
- "Set Category" submenu in right-click context menu (single and multi-select)
- Category management section in Settings panel (color pickers, labels, add/delete)
- SVG legend overlay showing all defined categories below the chart
- PPTX export includes per-node category colors and slide legend
- Submenu support in context menu component
- XLSX multi-sheet import warning (notes which sheet was used)
- 103 new tests (569 total across 27 files)

### Fixed

- CSV import now handles trailing HR system metadata (e.g., Workday "Applied filters:" blocks) via RFC 4180 multi-line quoted field support
- Rows with empty name fields are silently skipped during CSV import
- Duplicate IDs (Format A) and duplicate names (Format B/C) now throw a clear error instead of silently overwriting data
- Circular reference errors now show the full cycle path (e.g., "Alice → Carol → Bob → Alice")

### Changed

- `MAX_NODES` limit of 10,000 enforced on CSV import to prevent browser crashes

## [1.0.0] — 2026-03-11

Initial release. See [docs/roadmap.md](docs/roadmap.md) for the full feature breakdown.

### Added

- Interactive org chart visualization with D3.js SVG rendering
- Three editing modes: Form (Add), Import (Load), JSON (Edit)
- Right-click context menu with Edit, Add Child, Focus, Move, Remove
- Inline card editing (double-click)
- Shift+click multi-select with bulk Move and Remove
- Focus mode — view any subtree as its own org chart
- PowerPoint export (.pptx) with editable shapes and connectors
- Advisor layout with alternating left/right columns
- M1 detection with compact IC stack layout
- 20+ configurable renderer settings (dimensions, spacing, typography, colors)
- Dark/light theme with 8 color presets and 4 layout presets
- CSV import with 3 auto-detected formats and saveable column mapping presets
- Settings persistence to localStorage with export/import
- Full undo/redo (50-entry stack)
- Search & highlight by name/title
- Keyboard shortcuts (Ctrl+Z, Ctrl+E, Ctrl+F, Escape, etc.)
- Pan/zoom with fit-to-screen
- Help dialog with full feature reference
- Security: safe DOM APIs, input validation, CSP meta tag
- 327 tests across 19 test files
