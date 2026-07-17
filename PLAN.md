# Settings Regroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regroup settings from 11 tabs into six audience-friendly groups, add cross-group section search, promote presets, and make the modal mobile-friendly without changing setting values or section IDs.

**Architecture:** `SettingsModal` owns group navigation, search UI, preview visibility, and search-result presentation. `main.ts` remains the sole source of section-to-group mapping through `SECTION_TAB_MAP`; it annotates existing editor sections with `data-settings-group`, and the modal filters those annotated sections. Presentation changes remain in `style.css` and the preset panel keeps all existing actions and preview behavior.

**Tech Stack:** TypeScript 6, vanilla DOM APIs, Vitest/jsdom, CSS design tokens, M2 `createIcon` factory.

## Global Constraints

- Work only in `/tmp/arbol-m7-codex` on `feat/settings-regroup`, based on `85405d9`.
- Preserve every `data-section-id` and the section-ordering assertion in `tests/editor/settings-editor.test.ts` unchanged.
- Keep `SECTION_TAB_MAP` in `src/main.ts` as the only section-to-group mapping.
- Do not modify renderer, layout engine, theme preset, parallel-refactor, banner, or dialog utility files named in the brief.
- Use `createIcon` for group/search icons and design tokens for new CSS values.
- Mirror new English i18n keys in Spanish and remove replaced tab-label keys only after grep confirms they are dead.
- Follow strict RED test commit before each behavior-bearing GREEN commit.

---

### Task 1: Six groups, mapping, and preview remap

**Files:**
- Modify: `tests/ui/settings-modal.test.ts`
- Add: a focused source assertion test for `SECTION_TAB_MAP` if no existing main integration seam exposes it
- Modify: `src/ui/settings-modal.ts`
- Modify: `src/main.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`

**Interfaces:**
- Produces default group IDs `appearance`, `layout`, `cards_badges`, `levels_categories`, `presets`, `data_backup`.
- Produces `data-settings-group` annotations derived exclusively from `SECTION_TAB_MAP`.
- Preserves `SettingsModal#setActiveTab(tabId: string): void`.

- [ ] Rewrite/add tests asserting six group tabs, order, labels, SVG `data-icon` values, mapped section membership, and visual-group preview visibility/hints.
- [ ] Run focused tests and confirm failures describe the old 11-tab structure/mapping.
- [ ] Commit tests only as `test(settings): cover regrouped settings navigation`.
- [ ] Implement the six defaults, preview allow-list/hints, sole mapping rewrite, and en/es label changes.
- [ ] Run focused tests and confirm they pass.
- [ ] Grep old tab keys, remove only dead replaced keys, then commit as `feat(settings): regroup settings into six sections`.

### Task 2: Cross-group settings search

**Files:**
- Modify: `tests/ui/settings-modal.test.ts`
- Modify: `src/ui/settings-modal.ts`
- Modify: `src/main.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`

**Interfaces:**
- Produces a modal-header `.settings-search-input` with localized placeholder/accessible label.
- Produces `SettingsModal#refreshSectionVisibility(): void` so rebuilt editor sections respect the current query or active group.
- Matching uses section title/description/control text as local keywords, shows localized group context, and displays localized no-results feedback.

- [ ] Add tests that populate annotated sections, type a query, and assert cross-group matches show with group labels while non-matches hide; also assert no-results and clear restoration.
- [ ] Run the focused modal test and confirm search UI/behavior failures.
- [ ] Commit tests only as `test(settings): cover cross-group settings search`.
- [ ] Add the header search control via `createIcon('search')`, filtering logic, result group labels, clear behavior, and en/es search strings.
- [ ] Update `main.ts` to annotate sections and ask the modal to refresh after editor rebuilds and tab changes.
- [ ] Run focused tests and commit as `feat(settings): add cross-group settings search`.

### Task 3: Preset strip, responsive layout, and icon-label spacing

**Files:**
- Modify: `tests/ui/settings-modal.test.ts`
- Modify: `tests/css-rtl-a11y.test.ts` or add a focused CSS assertion beside existing modal checks
- Modify: `src/style.css`
- Modify: `src/editor/settings/preset-panel.ts` only if a semantic class/style hook is required; do not change preset behavior or preview rendering

**Interfaces:**
- Preserves preset button IDs/click effects while making `.preset-grid` a compact horizontal strip at the top of the presets section.
- At `max-width: 768px`, produces a single-column modal body, horizontally scrollable group navigation, and 44px minimum nav/search/footer touch targets with logical CSS properties.
- Uses flex `gap: var(--space-*)` for icon-plus-label controls and removes inserted whitespace text nodes.

- [ ] Add failing DOM/CSS tests for compact preset placement, tokenized icon-label gap, mobile column layout, horizontal nav scrolling, logical properties, and 44px targets.
- [ ] Run focused tests and confirm expected CSS/DOM failures.
- [ ] Commit tests only as `test(settings): cover responsive settings presentation`.
- [ ] Implement CSS/presentation changes without altering preset actions or preview rendering.
- [ ] Run focused UI/editor/CSS suites and commit as `feat(settings): polish presets and mobile layout`.

### Task 4: Final verification and review

**Files:**
- Verify only unless a failing check requires a new RED/GREEN correction pair.

- [ ] Confirm `tests/editor/settings-editor.test.ts` section-ordering assertion is byte-for-byte untouched.
- [ ] Confirm forbidden paths are unchanged and all old replaced i18n keys are absent/dead as intended.
- [ ] Run `git log --oneline main..HEAD` and verify each test commit precedes its implementation commit.
- [ ] Run `npm run type-check && npm run lint && npm test` and capture the final file/test count.
- [ ] Invoke independent Sentinel review on the final local diff and retain the complete verdict report; do not merge or push.
- [ ] Report clone path, branch, final HEAD SHA, commit subjects, verification tail, final group mapping, and en/es key changes.
