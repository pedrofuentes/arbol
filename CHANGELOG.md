# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- PAL (Personal Advisor) layout with alternating left/right columns
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
