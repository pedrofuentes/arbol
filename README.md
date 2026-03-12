## Arbol 🌳

An interactive org chart editor for the browser.

**[Try Arbol →](https://arbol.pedrofuent.es)**

## Features

- Interactive hierarchical org chart visualization
- Three editing tabs: Add (form), Load (JSON/CSV import, 3 formats auto-detected), Edit (JSON tree)
- Per-node color categories (Open Position, Offer Pending, Future Start + custom)
- Color category legend on the chart (SVG overlay, included in PPTX export)
- Right-click context menu on cards (Edit, Add Child, Set Category, Focus on sub-org, Move, Remove)
- "Set Category" context menu option with submenu picker (single & multi-select)
- Inline card editing — double-click to edit name/title directly on the chart
- Shift+click multi-select with bulk Move and Remove operations
- Focus mode — view any subtree as its own org chart (exports only the focused sub-org)
- PowerPoint export (.pptx) with editable shapes, connectors, per-node category colors, and legend
- Category management in Settings panel (color pickers, labels, add/delete)
- PAL (Personal Advisor) role support with special 2-column layout
- Smart M1 detection (compact layout for manager groups)
- 20+ customizable renderer settings (dimensions, spacing, typography, colors)
- Dark/light theme with presets
- Full undo/redo (50-entry stack)
- Search & highlight by name/title
- Keyboard shortcuts (Ctrl+Z, Ctrl+E, Ctrl+F, etc.)
- Pan/zoom with fit-to-screen

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
├── editor/      # Data editing tabs (Add, Load, Edit)
├── renderer/    # D3-based chart rendering and layout
├── store/       # State management and undo/redo
├── export/      # PowerPoint export
├── ui/          # Panels, dialogs, and controls
└── utils/       # Shared helpers and types
```

## License

[MIT](LICENSE)
