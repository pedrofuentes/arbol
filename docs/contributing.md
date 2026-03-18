# Contributing to Arbol

Thank you for your interest in contributing to Arbol! This guide covers everything you need to get started.

## Quick Start

```bash
git clone https://github.com/pedrofuentes/arbol.git
cd arbol
npm install
npm run dev     # http://localhost:5173/
npm run test    # 2063 tests, all must pass
```

## Development Workflow

1. **Create a branch** off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD). Tests go in `tests/` mirroring the `src/` structure.

3. **Implement the feature.** Follow the [coding standards](../AGENTS.md#coding-standards).

4. **Run the full test suite:**
   ```bash
   npm run test
   ```

5. **Build for production** to catch TypeScript errors:
   ```bash
   npm run build
   ```

6. **Commit** with conventional message format:
   ```
   feat: add node color customization
   fix: correct Advisor boundary spacing for odd counts
   refactor: extract link drawing into reusable method
   test: add regression tests for single-child managers
   docs: update roadmap with new feature
   ```

7. **Open a PR** against `main`.

## Project Structure

See [AGENTS.md](../AGENTS.md#project-structure) for the full file tree and module descriptions.

## Key Architecture Decisions

### Why no UI framework?
D3.js needs direct DOM control over the SVG. A framework like React/Vue would fight D3 for ownership. Vanilla TypeScript avoids this conflict while keeping the codebase simple.

### Why pptxgenjs for export?
PowerPoint export needs editable shapes (not embedded images). pptxgenjs generates native `.pptx` with rectangles, text boxes, and connectors that users can modify in PowerPoint. It's code-split to keep the initial bundle small.

### Why localStorage?
Arbol is a browser-only tool with no backend. Settings and CSV mapping presets persist via localStorage so users don't lose their configuration between sessions.

### Accessibility approach
Every interactive element must be keyboard-accessible and have proper ARIA attributes. Dialogs must trap focus and restore it on close. Dynamic content changes are announced via `announce()` from `src/ui/announcer.ts`. Use `role="alert"` for error messages. See AGENTS.md for the full accessibility guidelines.

### CSS conventions
- Use CSS logical properties (`margin-inline-start`, `inset-inline-end`) instead of directional properties (`margin-left`, `right`) for RTL support
- Use `rem` for font sizes (not `px`) so text scales with user preferences
- Use CSS custom properties (`var(--accent)`) for all colors and spacing values
- Respect `prefers-reduced-motion` — all animations/transitions are disabled when active

## Rendering Concepts

Understanding these concepts is essential for working on the renderer:

- **IC stacks** — Individual Contributors under M1 managers render vertically in a grey container with no connecting lines
- **Advisor stacks** — Advisors render in alternating left/right columns with elbow connectors from the manager's sides
- **Boundary spacing** — Sibling subtree gaps are calculated from bounding boxes, not node centers
- **All spacing is configurable** — Nothing is hardcoded; everything flows through `RendererOptions`

## Testing Guidelines

- Always run `npm run test` before committing
- Spacing changes must include regression tests (see `chart-renderer.test.ts`)
- Store modules should test persistence, serialization, and edge cases
- UI modules with business logic need unit tests; purely presentational DOM builders are optional

## Internationalization (i18n)

All user-facing strings should use the `t()` function from `src/i18n/index.ts`:

```typescript
import { t, tp } from './i18n';

// Simple translation
button.textContent = t('toolbar.undo');

// With interpolation
message.textContent = t('dialog.remove.message', { name: 'John' });

// Pluralization
status.textContent = tp('status.people', count);
```

When adding new user-facing strings:
1. Add the English text to `src/i18n/en.ts` with a descriptive dot-notation key
2. Use `t('your.key')` in the source code
3. For plurals, add both `.one` and `.other` variants

Key naming convention: `area.component.specific` — e.g., `'menu.edit'`, `'dialog.remove.title'`, `'status.people.other'`.

## Versioning

Arbol follows [Semantic Versioning](https://semver.org/). Before every merge to `main`:

1. **Bump the version** in `package.json` (`patch` for fixes, `minor` for features, `major` for breaking changes)
2. **Update `CHANGELOG.md`** with what changed
3. **Update `docs/roadmap.md`** to mark completed items
4. **Update any other affected docs** (README, contributing, AGENTS.md)

The version in `package.json` is the single source of truth — it's injected into the app at build time and displayed in the footer. See [AGENTS.md — Version & Docs Update](../AGENTS.md#4-version--docs-update-pre-merge) for the full process.

## Need Help?

- Check the [roadmap](roadmap.md) for what's been done and what's planned
- Read [AGENTS.md](../AGENTS.md) for technical details and common pitfalls
- Look at existing tests for patterns and examples
