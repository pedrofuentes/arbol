## Arbol 🌳

An interactive org chart editor for the browser — manage multiple org charts with version snapshots, all running locally.

**[Try Arbol →](https://arbol.pf.run)**

## Features

- **Multiple org charts** — create, rename, switch between, and delete independent org charts
- **Version history** — save named versions, preview any version read-only, restore safely, or delete versions you no longer need
- **Version comparison** — compare the Current chart with a saved version in side-by-side or merged views, with delta chips for added, removed, moved, and modified people
- **Per-chart color categories** — each chart has its own set of color categories
- **Dual-track level mappings** — same level maps to different titles for Managers vs ICs, with auto-detection from tree structure
- **Pinned titles** — manually override any node's title to prevent level mapping from changing it
- **Category & level mapping presets** — save reusable presets, copy from other charts, pick presets when creating new charts
- **Always-visible version actions** — the Current chart, Save a version, and Version history controls stay within reach in the app chrome
- **IndexedDB storage** — org data stored in IndexedDB for capacity across multiple charts and versions
- **Import creates or replaces** — importing CSV/JSON or re-importing `.arbol.json` ChartBundle exports asks whether to create a new chart or replace the current one
- **Autosave and restore safety** — the Current chart saves automatically, and restoring a version first creates a safety-net version when needed
- **Accessible org chart** — full keyboard navigation (arrow keys, Enter, Space), ARIA tree semantics, screen reader announcements
- **Mobile responsive** — collapsible sidebar on tablet/phone, touch-friendly 44px targets, works at 200% zoom
- **i18n ready** — translation infrastructure with 1,180+ keys, Spanish locale, RTL-ready CSS logical properties
- **First-time guidance** — one welcome dialog lets new users load the sample org chart or start empty, with a direct pointer to Import
- **Loading indicators** — visual feedback for exports, imports, chart switching
- Interactive hierarchical org chart visualization
- Focused editing surfaces — select a card to inspect its properties, use the Import wizard for CSV/Excel/JSON and `.arbol.json` bundles, and manage charts and versions from the app chrome
- Text normalization — normalize name/title casing (Title Case, UPPERCASE, lowercase) on import or for the existing org chart
- Per-node color categories (Open Position, Offer Pending, Future Start + custom)
- Color category legend on the chart (SVG overlay, included in PPTX export)
- Right-click context menu on cards (Edit, Quick edit, Pin title, Add Child, Set Category, Focus on sub-org, Move, Remove)
- Card editing — choose Edit to open the inspector (property panel), or Quick edit to modify name/title directly on the chart
- Inline validation and toast notifications for user actions
- Shift+click multi-select with bulk Move and Remove operations
- Focus mode — view any subtree as its own org chart (exports only the focused sub-org)
- PowerPoint export (.pptx) with editable shapes, connectors, per-node category colors, and legend
- Advisor role support with special 2-column layout
- Smart M1 detection (compact layout for manager groups)
- Six searchable settings groups covering presets, layout, appearance, cards & badges, levels & categories, and data & backup
- Dark/light theme with 10 presets (including Ocean Teal and Stone)
- Full undo/redo (50-entry stack)
- Search & highlight by name/title
- Keyboard shortcuts (Ctrl+Z, Ctrl+E, Ctrl+F, etc.) and full chart keyboard navigation
- Pan/zoom with fit-to-screen
- Advanced analytics visualizations — zoomable sunburst, span of control distribution, interactive treemap

## Privacy

Arbol runs entirely in your browser. Your org charts, version snapshots, settings, and preferences are stored in IndexedDB and localStorage and **never leave your device**. There is no server, no tracking, and no account required. When you close the tab, your data stays on your machine — nobody else can see it.

## Accessibility

Arbol follows WCAG 2.1 AA guidelines:

- Full keyboard navigation — every interactive element reachable without a mouse
- ARIA tree semantics on the org chart (roles, labels, levels, expanded state)
- Screen reader announcements for all dynamic operations (search, undo, save, selection)
- Focus trapping in dialogs with proper focus restoration
- Color contrast meets WCAG AA minimums (4.5:1 body, 3:1 large text)
- `prefers-reduced-motion` and `forced-colors` media query support
- Semantic HTML with landmark regions, skip navigation, and proper form labels

## Internationalization

Arbol includes a built-in i18n system:

- 1,180+ user-facing strings extracted to `src/i18n/en.ts`
- Complete Spanish locale in `src/i18n/es.ts` (code-split, loaded on demand)
- `t()` and `tp()` translation functions with interpolation and pluralization
- RTL-ready CSS using logical properties
- Locale-aware date formatting via `toLocaleString()`
- Dynamic `dir` and `lang` attributes on `<html>`
- Language switcher dropdown in settings modal (English / Español)

To add a new language, create a translation file in `src/i18n/` and call `setLocale()`.

## Getting Started

```bash
git clone https://github.com/pedrofuentes/arbol.git
cd arbol
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## Tech Stack

TypeScript, Vite, D3.js, pptxgenjs — no UI framework, no backend.

## Architecture

Arbol is a vanilla TypeScript application with deliberately small, composable UI surfaces:

- **D3-owned SVG canvas** — D3 computes the tree layout and owns chart rendering, zoom, keyboard navigation, comparison views, and export-ready SVG output.
- **SVG icon system** — app chrome and actions use the shared `createIcon` system instead of text glyphs or emoji controls.
- **Design-token CSS** — colors, spacing, typography, surfaces, and a semantic z-scale are defined as tokens so dialogs, panels, banners, and floating controls layer consistently.
- **Consolidated dialog utilities** — modal surfaces share overlay creation, panel chrome, focus trapping, Escape handling, focus restoration, and stacking behavior.
- **Inspector-first editing** — **Edit** opens the property panel for complete changes; **Quick edit** keeps the lightweight name-and-title editor inline on the chart.
- **Searchable settings** — one modal organizes settings into six groups and filters sections without replacing the underlying renderer controls.
- **Consumer-friendly versions** — the UI consistently uses **Version history**, **Current chart**, **Save a version**, and **Preview**, with restore safety-net language and delta chips in comparisons.

State is split by responsibility: stores own chart data and browser persistence, controllers coordinate interaction modes, editors assemble workflows, and UI modules provide focused panels and dialogs. Org charts and saved versions remain local in IndexedDB; preferences and lightweight configuration use localStorage.

## Enterprise Configuration

When deploying Arbol for an organization, you can provide company-specific import instructions to help users prepare their CSV files.

### Quick setup

1. Copy `public/arbol.config.example.json` to `public/arbol.config.json`
2. Replace the example content with your company's instructions
3. Build and deploy — the instructions appear automatically in the import wizard and help dialog

### Config file format

Create a `public/arbol.config.json` file (Vite serves it at `/arbol.config.json`):

```json
{
  "importInstructions": "## How to export from Workday\n\n1. Go to **Reports** → People\n2. Select *Arbol Org Export*\n3. Click Export → CSV\n4. Upload the file here\n\n[Full guide](https://intranet.example.com/arbol)"
}
```

The `importInstructions` value is a **Markdown string** (use `\n` for newlines in JSON). Instructions appear in:

- **Import wizard** — collapsible callout above the file upload area
- **Help dialog** — dedicated accordion section

When the config file is absent or `importInstructions` is not set, nothing changes — the app works the same as before.

### Supported markdown syntax

The built-in renderer (`src/utils/markdown.ts`) supports a safe subset of Markdown using DOM APIs only (no `innerHTML`, zero dependencies):

| Syntax                                     | Renders as               |
| ------------------------------------------ | ------------------------ |
| `# Heading` / `## Heading` / `### Heading` | `<h1>` / `<h2>` / `<h3>` |
| `**bold**`                                 | `<strong>`               |
| `*italic*`                                 | `<em>`                   |
| `` `code` ``                               | `<code>`                 |
| `[text](https://url)`                      | `<a>` (http/https only)  |
| `- item`, `* item`, or `+ item`            | `<ul><li>`               |
| `1. item`                                  | `<ol><li>`               |
| ` ``` ` fenced code blocks                 | `<pre><code>`            |

**Not supported:** tables, images, nested lists, HTML passthrough (intentionally omitted for security).

### Tips for writing good instructions

- **Keep it short** — 5–10 lines max. Users skim, not read.
- **Use numbered steps** — "1. Open X → 2. Click Y → 3. Upload here" works best
- **Name the specific HR system** — "Open **Workday**" not "Open your HR system"
- **Link to internal docs** — `[Full guide](https://intranet.example.com/arbol)` for details
- **Include column names** — mention `name`, `title`, `manager_name` so users know what to expect
- **Test with real users** — have someone follow the instructions cold before deploying

## Project Structure

```
src/
├── analytics/   # D3 visualization charts (sunburst, span, treemap)
├── config/      # Enterprise config loader (arbol.config.json)
├── constants/   # Renderer default values
├── controllers/ # Focus mode, search, selection state
├── data/        # Built-in sample org chart
├── editor/      # Editing workflows and settings panels
├── export/      # PowerPoint, SVG, and PNG export
├── i18n/        # Internationalization (translations, locale management)
├── init/        # App wiring, toolbar, shortcuts, and interaction handlers
├── renderer/    # D3-based chart rendering, layout, and keyboard navigation
├── store/       # State management, IndexedDB, undo/redo
├── ui/          # Icon-based chrome, panels, dialogs, controls, and accessibility utilities
└── utils/       # Shared helpers and types
```

## License

[MIT](LICENSE)
