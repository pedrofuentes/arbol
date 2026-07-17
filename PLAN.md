# M5 Versions & Vocabulary Implementation Plan

**Goal:** Make version management understandable and safe for non-technical managers and HR without changing persisted record shapes or database schema.

**Architecture:** Keep version records immutable and derive UI-only state from their trees. `ChartStore` owns safe restore and version-relative edit counting; `ChartEditor` renders cached adjacent-version deltas; `ChartNameHeader` renders the same version-relative status in the visible header center. All copy is provided by matching English and Spanish i18n keys.

**Tech stack:** TypeScript 6, vanilla DOM, Vitest/jsdom, IndexedDB via `ChartDB`, existing `compareTrees()`/`getDiffStats()` utilities, and CSS design tokens.

## Global constraints

- Branch remains `feat/versions-vocabulary` in `/tmp/arbol-m5-codex`, based on `6c14252`.
- No `VersionRecord`, `ChartRecord`, IndexedDB schema, or migration changes.
- Do not touch renderer files, layout engine, theme presets, settings modal/editor, or dialog-utils structure.
- Each behavior-bearing increment gets a failing `test(...)` commit before its `feat(...)` commit.
- No user-facing “working tree”, bare “unsaved”, or “dirty”; all copy is localized in English and Spanish.
- Use `createIcon`; use design tokens; keep the parallel inspector branch regions untouched.

## 1. Consumer vocabulary and visible saved-state header

**Tests:** `tests/i18n/i18n.test.ts`, `tests/ui/version-picker.test.ts`, `tests/ui/version-viewer.test.ts`, `tests/ui/chart-name-header.test.ts`, `tests/editor/chart-editor.test.ts`, and affected workflow/copy assertions.

1. Add failing assertions for “Current chart”, “Version history”, “Save a version”, “Preview”, clean status, pluralized edit status, and removal of prohibited English/Spanish vocabulary.
2. Run the scoped tests and confirm failures are copy/status mismatches.
3. Commit tests as `test(versions): define consumer version vocabulary`.
4. Rename consumer-facing i18n keys where their old names preserve prohibited vocabulary; update every caller and mirrored locale entry.
5. Replace the header dot with a non-interactive `role="status"` pill using `tp()` for edit count and CSS-token styles.
6. Mount `ChartNameHeader` in `#header-center`; update it from version-relative edit count after mutations, saves, switches, imports, and restores.
7. Run scoped tests, type-check, and commit as `feat(versions): adopt consumer version vocabulary`.

## 2. Save-version confirmation toast

**Tests:** add a focused source/wiring test around the `main.ts` save-version callback using the existing main-module test conventions.

1. Add a failing test proving a successful save calls `showToast(t('toast.version_saved', { name }))` and the failure path remains an error toast.
2. Confirm the test fails because success only announces today.
3. Commit as `test(versions): require save version confirmation`.
4. Add matching `toast.version_saved` translations and show the toast after `saveVersion` returns.
5. Run scoped tests and commit as `feat(versions): confirm saved versions`.

## 3. Restore safety snapshot

**Tests:** `tests/store/chart-store.test.ts`, `tests/integration/workflows.test.ts`, and `tests/editor/chart-editor.test.ts`/viewer flow assertions.

1. Add failing unit tests for dirty restore creating one localized “Before restoring {name} · {timestamp}” version before returning the target tree, clean restore creating none, and snapshot write failure preventing restore.
2. Add the required integration workflow: current live edits → restore target → both safety snapshot and restored state remain available.
3. Add failing dialog-copy assertions that restore explains “Your current chart will be saved first.” and is not danger-styled.
4. Confirm failures, then commit as `test(versions): define safe restore workflow`.
5. Extend `restoreVersion` with the live current tree and optional mutation version, snapshot it first when version-relative edits exist, then mark the target as the new version baseline.
6. Pass the live tree from both sidebar and version-viewer restore paths and use the safe restore confirmation copy.
7. Run scoped tests and commit as `feat(versions): safeguard current chart on restore`.

## 4. Discoverable version actions and cached delta chips

**Tests:** `tests/editor/chart-editor.test.ts`, `tests/css-rtl-a11y.test.ts`, and `tests/utils/tree-diff.test.ts` if a focused delta helper is introduced.

1. Add failing tests for persistent low-emphasis action buttons, hover/focus full emphasis, and `+N −N` chips for additions/removals against the previous chronological version.
2. Add a cache-behavior test documenting that unchanged adjacent version IDs reuse the computed delta rather than re-running tree diff work on refresh.
3. Confirm failures and commit as `test(versions): define version row deltas`.
4. Build delta stats with `compareTrees()`/`getDiffStats()`, memoized by adjacent immutable version IDs; the oldest version uses `+0 −0` because no prior saved version exists.
5. Render localized accessible chip labels and change CSS from `display:none` hover reveal to token-based persistent opacity, promoted on hover/focus-within.
6. Run scoped guards and commit as `feat(versions): add discoverable version deltas`.

## 5. Verification

1. Scan English and Spanish translation values for prohibited terms and inspect the complete diff for out-of-scope files.
2. Verify commit order with `git log --oneline main..HEAD`.
3. Run `npm run type-check && npm run lint && npm test`.
4. Report clone path, branch, final SHA, subjects, test count, cache strategy, and exact i18n key additions/renames/removals.
