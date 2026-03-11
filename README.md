## Arbol 🌳

An interactive org chart editor for the browser.

## Features

- Interactive hierarchical org chart visualization
- Drag-and-drop reorganization with confirmation for large moves
- Three editing modes: Form, JSON, CSV import (3 formats auto-detected)
- PowerPoint export (.pptx) with editable shapes and connectors
- Collapsible subtrees for large hierarchies (1000+ people)
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
git clone https://github.com/pedro/arbol.git
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
├── editor/      # Data editing modes (form, JSON, CSV)
├── renderer/    # D3-based chart rendering and layout
├── store/       # State management and undo/redo
├── export/      # PowerPoint export
├── ui/          # Panels, dialogs, and controls
└── utils/       # Shared helpers and types
```

## License

[MIT](LICENSE)
