# M9 Trash Implementation Plan

**Goal:** Replace permanent chart/version deletion with a migration-safe Trash that supports restore and explicit permanent deletion while keeping trashed data out of every active-data consumer.

**Architecture:** Add optional epoch-millisecond `deletedAt` metadata to existing IndexedDB records without changing database version or object stores. Make `ChartDB` provide raw include-trashed reads and permanent-delete primitives, while `ChartStore` owns active filtering, soft delete/restore behavior, cache invalidation, and active-chart fallback. Add a focused Trash panel under Settings → Data & Backup using the existing editor/dialog/icon conventions.

**Tech stack:** TypeScript 6, IndexedDB/fake-indexeddb, vanilla DOM, Vitest, existing i18n and icon helpers.

## Global Constraints

- Keep `DB_VERSION = 1`; records without `deletedAt` are active.
- Do not modify `src/renderer/*`, `layout-engine.ts`, `theme-presets.ts`, README.md, `docs/**`, import wizard, help-dialog structure, or dialog-utils structure.
- Preserve every existing settings `data-section-id`; add only `trash`, mapped to `data_backup` in `SECTION_TAB_MAP`.
- Use immutable version snapshots and `loadVersionBaselineWithFallback` for baseline refreshes.
- Add mirrored English and Spanish keys and use existing design tokens/icons.
- Commit tests before behavior-bearing implementation.

## Task 1: RED — data and store contract

- Add `ChartDB` tests proving legacy records load as active with schema version 1, default reads omit trashed records, include-trashed reads return them, and hard-delete methods permanently remove records.
- Add `ChartStore` tests for chart/version soft delete timestamps, restore, delete forever, active-chart fallback/empty state, active-only default reads, timestamp ordering, name reuse rules, and delta/baseline cache invalidation.
- Run file-scoped tests and confirm failures are caused by missing trash APIs/behavior.

## Task 2: RED — UI and workflow contract

- Add chart-editor tests proving soft-delete copy, active chart switching/empty handling, version count filtering, and preview closure when deleting the viewed version.
- Add settings-editor/Trash panel tests proving the additive `trash` section, active/trashed item rendering with chart association and localized dates, restore actions, permanent-delete confirmations, empty state, and icon use.
- Extend the settings group-map test with only the new `trash: data_backup` entry.
- Add an integration workflow test for delete chart → Trash → restore → sidebar.
- Run the scoped UI/integration tests and confirm RED.

## Task 3: GREEN — persistence and store behavior

- Extend `ChartRecord` and `VersionRecord` with optional `deletedAt?: number`.
- Add include-trashed read options to DB/store methods only where needed by Trash.
- Convert ordinary deletes to `patch`-based soft deletes; retain explicit permanent-delete methods.
- Restore by removing `deletedAt`, sort active versions by `createdAt`, and invalidate the affected version cache/adjacency baseline.
- When deleting the active chart, select another active chart or expose the empty state without creating an automatic replacement chart.

## Task 4: GREEN — active consumer filtering and Trash UI

- Ensure sidebar, counts, version history/deltas, pickers, exports, bundles, analytics, and backups use active-only default reads.
- Add a focused `TrashPanel` and wire it to `SettingsEditor` as a new `data-section-id="trash"` section under Data & Backup.
- Add restore/permanent-delete buttons and confirmations, safe chart association labels, empty state, and a restore icon only if the existing icon set lacks one.
- Update chart/version delete dialog copy to “Move to Trash” semantics and add mirrored en/es Trash keys; grep for obsolete permanence wording/keys.
- Close version preview/comparison before soft-deleting a version through the editor/main wiring.

## Task 5: Verification and commits

- Format changed TypeScript/tests and run targeted tests until green.
- Commit implementation as `feat(trash): add soft-delete trash for charts and versions` after the RED test commit.
- Audit `git diff --name-only main...HEAD`, `DB_VERSION`, section IDs/map, i18n parity, forbidden paths, and test-before-feature ordering.
- Run `npm run type-check && npm run lint && npm test` and capture the final test count and HEAD SHA.
