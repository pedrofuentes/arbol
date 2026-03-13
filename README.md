## Arbol 🌳

An interactive org chart editor for the browser — manage multiple org charts with version snapshots, all running locally.

**[Try Arbol →](https://arbol.pedrofuent.es)**

## Features

- **Multiple org charts** — create, rename, switch between, and delete independent org charts
- **Version snapshots** — save named point-in-time snapshots; view read-only, restore, or delete
- **Per-chart color categories** — each chart has its own set of color categories
- **Chart name in header** — editable name with dirty-state indicator (●) and quick save button (💾)
- **IndexedDB storage** — org data stored in IndexedDB for capacity across multiple charts and versions
- **Import creates or replaces** — importing CSV/JSON asks whether to create a new chart or replace the current one
- **Unsaved-changes warnings** — switching charts or restoring versions warns if the current tree has unsaved changes
- Interactive hierarchical org chart visualization
- Four sidebar tabs: People (add/edit), Import (files, paste, JSON editor, text normalization), Settings (presets, categories, fine-tuning), Charts (chart & version management)
- Text normalization — normalize name/title casing (Title Case, UPPERCASE, lowercase) on import or for the existing org chart
- Per-node color categories (Open Position, Offer Pending, Future Start + custom)
- Color category legend on the chart (SVG overlay, included in PPTX export)
- Right-click context menu on cards (Edit, Add Child, Set Category, Focus on sub-org, Move, Remove)
- Inline card editing — double-click to edit name/title directly on the chart
- Shift+click multi-select with bulk Move and Remove operations
- Focus mode — view any subtree as its own org chart (exports only the focused sub-org)
- PowerPoint export (.pptx) with editable shapes, connectors, per-node category colors, and legend
- Advisor role support with special 2-column layout
- Smart M1 detection (compact layout for manager groups)
- 20+ customizable renderer settings (dimensions, spacing, typography, colors, rounded corners, font family, text alignment)
- Dark/light theme with 9 presets (including Ocean Teal)
- Full undo/redo (50-entry stack)
- Search & highlight by name/title
- Keyboard shortcuts (Ctrl+Z, Ctrl+E, Ctrl+F, etc.)
- Pan/zoom with fit-to-screen

## Privacy

Arbol runs entirely in your browser. Your org charts, version snapshots, settings, and preferences are stored in IndexedDB and localStorage and **never leave your device**. There is no server, no tracking, and no account required. When you close the tab, your data stays on your machine — nobody else can see it.

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

TypeScript, Vite, D3.js, pptxgenjs — no UI framework.

## Project Structure

```
src/
├── editor/      # Sidebar tab editors (People, Import, Settings, Charts)
├── renderer/    # D3-based chart rendering and layout
├── store/       # State management, IndexedDB, undo/redo
├── export/      # PowerPoint export
├── ui/          # Panels, dialogs, and controls
└── utils/       # Shared helpers and types
```

## License

[MIT](LICENSE)
