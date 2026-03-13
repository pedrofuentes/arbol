# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
