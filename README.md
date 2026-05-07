## Arbol 🌳

An interactive org chart editor for the browser — manage multiple org charts with version snapshots, all running locally.

**[Try Arbol →](https://arbol.pedrofuent.es)**

## Features

- **Multiple org charts** — create, rename, switch between, and delete independent org charts
- **Version snapshots** — save named point-in-time snapshots; view read-only, restore, or delete
- **Version comparison** — side-by-side or merged diff view with diff badges (added/removed/moved/modified), click-to-select cross-highlighting, and hover cross-pane tracking
- **Per-chart color categories** — each chart has its own set of color categories
- **Dual-track level mappings** — same level maps to different titles for Managers vs ICs, with auto-detection from tree structure
- **Pinned titles** — manually override any node's title to prevent level mapping from changing it
- **Category & level mapping presets** — save reusable presets, copy from other charts, pick presets when creating new charts
- **Chart name in header** — editable name with dirty-state indicator (●) and quick save button (💾)
- **IndexedDB storage** — org data stored in IndexedDB for capacity across multiple charts and versions
- **Import creates or replaces** — importing CSV/JSON asks whether to create a new chart or replace the current one
- **Unsaved-changes warnings** — switching charts or restoring versions warns if the current tree has unsaved changes
- **Accessible org chart** — full keyboard navigation (arrow keys, Enter, Space), ARIA tree semantics, screen reader announcements
- **Mobile responsive** — collapsible sidebar on tablet/phone, touch-friendly 44px targets, works at 200% zoom
- **i18n ready** — translation infrastructure with 400+ extractable strings, RTL-ready CSS logical properties
- **First-time guidance** — help dialog with Getting Started guide for new users, contextual "no results" hints
- **Loading indicators** — visual feedback for exports, imports, chart switching
- Interactive hierarchical org chart visualization
- Four sidebar tabs: People (add/edit), Import (files, paste, JSON editor, text normalization), Settings (presets, categories, fine-tuning), Charts (chart & version management)
- Text normalization — normalize name/title casing (Title Case, UPPERCASE, lowercase) on import or for the existing org chart
- Per-node color categories (Open Position, Offer Pending, Future Start + custom)
- Color category legend on the chart (SVG overlay, included in PPTX export)
- Right-click context menu on cards (Edit, Add Child, Set Category, Focus on sub-org, Move, Remove)
- Inline card editing — right-click a card and choose Edit to modify name/title directly on the chart
- Inline validation and toast notifications for user actions
- Shift+click multi-select with bulk Move and Remove operations
- Focus mode — view any subtree as its own org chart (exports only the focused sub-org)
- PowerPoint export (.pptx) with editable shapes, connectors, per-node category colors, and legend
- Advisor role support with special 2-column layout
- Smart M1 detection (compact layout for manager groups)
- 20+ customizable renderer settings (dimensions, spacing, typography, colors, rounded corners, font family, text alignment)
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

- 400+ user-facing strings extracted to `src/i18n/en.ts`
- `t()` and `tp()` translation functions with interpolation and pluralization
- RTL-ready CSS using logical properties
- Locale-aware date formatting via `toLocaleString()`
- Dynamic `dir` and `lang` attributes on `<html>`

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

## Enterprise Configuration

When deploying Arbol for an organization, you can provide company-specific import instructions to help users prepare their CSV files.

Create a `public/arbol.config.json` file (it gets served at `/arbol.config.json`):

```json
{
  "importInstructions": "## How to export from Workday\n\n1. Go to **Reports** → People\n2. Select *Arbol Org Export*\n3. Click Export → CSV\n4. Upload the file here\n\n[Full guide](https://intranet.example.com/arbol)"
}
```

The `importInstructions` field accepts **Markdown** (headings, bold, italic, links, lists, code blocks). Instructions appear in:

- **Import wizard** — collapsible callout above the file upload area
- **Help dialog** — dedicated accordion section

When the config file is absent or `importInstructions` is not set, nothing changes — the app works the same as before.

## Project Structure

```
src/
├── controllers/ # Focus mode, search, selection state
├── editor/      # Sidebar tab editors (People, Import, Settings, Charts)
├── i18n/        # Internationalization (translations, locale management)
├── renderer/    # D3-based chart rendering, layout, and keyboard navigation
├── store/       # State management, IndexedDB, undo/redo
├── export/      # PowerPoint export
├── ui/          # Panels, dialogs, controls, and accessibility utilities
└── utils/       # Shared helpers and types
```

## License

[MIT](LICENSE)
