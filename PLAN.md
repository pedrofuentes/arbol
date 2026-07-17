# M6 Inspector Consolidation Implementation Plan

**Goal:** Make the property-panel inspector the primary context-menu editing surface, preserve inline editing as Quick edit, expose title pinning, and register Ctrl+Shift+A through `ShortcutManager`.

**Architecture:** Reuse callbacks and a focused title-pin helper so click, keyboard, property-panel, and context-menu paths converge on the same behavior. Keep context-menu and help-dialog models additive, and inject analytics toggling into the shortcut registration dependencies.

**Constraints:** Work only on `feat/inspector-consolidation` in this clone; use RED test-only commits before each behavior implementation commit; mirror all added English i18n keys in Spanish; do not alter protected files or property-panel modality; finish with type-check, lint, and the complete test suite.

## Task 1: Inspector, Quick edit, and title pinning

- [ ] Add failing context-menu tests proving Edit routes to the inspector callback; Quick edit follows the existing inline editor flow and appears second; pin/unpin labels reflect node state and invoke the shared mutation.
- [ ] Run the scoped test and confirm failures are caused by the missing behavior.
- [ ] Commit tests as `test(editor): cover inspector context menu actions`.
- [ ] Implement shared inspector selection and shared title-pin mutation, add the context-menu items/icons, and add mirrored en/es context-menu and help interaction copy.
- [ ] Run the scoped context-menu, property-panel, help, i18n, icon, and accessibility/design-token guards.
- [ ] Commit as `feat(editor): consolidate inspector context menu actions`.

## Task 2: Analytics shortcut and help entry

- [ ] Add failing shortcut-handler tests proving Ctrl+Shift+A toggles analytics through `ShortcutManager` with exact required modifiers, plus a help-dialog test for the shortcut entry and a source assertion that the raw listener is absent.
- [ ] Run scoped tests and confirm failures are caused by the missing registration/help entry.
- [ ] Commit tests as `test(shortcuts): cover analytics shortcut registration`.
- [ ] Inject `toggleAnalyticsDrawer`, register Ctrl+Shift+A, remove the raw listener, and add mirrored en/es shortcut/help keys and grid content without changing the Escape chain.
- [ ] Run shortcut/help tests and guard suites.
- [ ] Commit as `feat(shortcuts): formalize analytics drawer shortcut`.

## Task 3: Final verification

- [ ] Inspect the diff against `main`, protected paths, i18n parity, and test-before-implementation commit order.
- [ ] Run `npm run type-check && npm run lint && npm test` and capture the test count.
- [ ] Report clone path, branch, HEAD SHA, commit subjects, verification tail, Ctrl+Shift+A behavior, and all added en/es keys.
