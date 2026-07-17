# M4 Dialog Consolidation Implementation Plan

**Goal:** Consolidate dialog, popover, menu, editor, banner, and side-panel chrome and lifecycle behavior without changing computed appearance or Escape priority.

**Architecture:** `src/ui/dialog-utils.ts` will create class-based overlays and dialog panels, expose a stack-aware lifecycle helper for Escape/focus trapping/focus restoration, and create the shared lightweight banner shell. `src/style.css` will own the exact static values currently embedded in TypeScript; per-surface classes will override the shared chrome while dynamic coordinates and data-driven colors remain inline.

**Tech stack:** TypeScript 6, DOM APIs, CSS custom properties, Vitest/jsdom.

## Global Constraints

- Preserve exact padding, colors, shadows, sizes, positions, animations, and z-index hierarchy.
- Use semantic `var(--z-*)` values for every layer; modal overlays remain below nested dialogs.
- Do not touch renderer, layout engine, theme presets, or SVG-affecting selectors.
- Preserve logical properties and the existing 768px 44px targets.
- Preserve icon-factory usage and i18n parity; no copy changes are planned.
- Property panel remains non-modal and receives no focus trap or `aria-modal`.

## Task 1: Specify shared utilities and migrated surfaces

**Tests:** `tests/ui/dialog-utils.test.ts`, existing tests for help, add popover, context menu, inline editor, banners, property panel, confirm/input dialogs, CSS token tests, and shortcut precedence tests.

- [ ] Replace inline-style expectations with class/custom-property expectations.
- [ ] Add tests for semantic overlay token parameterization, dialog ARIA defaults, topmost-only Escape handling, focus trapping, focus restoration, and cleanup.
- [ ] Add surface tests for shared chrome/banner classes and absence of runtime style injection.
- [ ] Run the focused tests and confirm failures are caused by missing consolidation behavior.
- [ ] Commit tests only as `test(ui): specify consolidated dialog surfaces`.

## Task 2: Implement class-based chrome and lifecycle

**Files:** `src/ui/dialog-utils.ts`, `src/style.css`, and the scoped surface modules.

- [ ] Add `.dialog-overlay`, `.dialog-panel`, shared surface chrome, floating banner rules, and exact per-surface modifiers to `src/style.css`.
- [ ] Replace static surface `cssText`/runtime keyframe injection with classes while retaining only dynamic coordinates and data colors inline.
- [ ] Add a stack-aware lifecycle helper that traps focus when requested, handles only the topmost Escape surface, restores invoker focus on cleanup, and blocks the global Escape chain while a modal/surface owns Escape.
- [ ] Migrate help, confirm/input dialogs, add popover, context menu, and inline editor to shared lifecycle behavior.
- [ ] Apply shared banner creation to focus, offline, and comparison banners; apply non-modal shared chrome to property panel without dialog semantics.
- [ ] Run focused UI, design-token, RTL/accessibility, and shortcut tests until green.
- [ ] Commit implementation as `refactor(ui): consolidate dialog surfaces`.

## Task 3: Verify the branch

- [ ] Inspect `git diff main...HEAD` and commit ordering.
- [ ] Run `npm run type-check && npm run lint && npm test` from final HEAD.
- [ ] Record final SHA, commit subjects, test count, and per-surface DOM-structure changes.
