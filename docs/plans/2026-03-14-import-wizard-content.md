# Import Wizard Content Wiring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire functional import content into the 4-step Import Wizard modal (Source → Mapping → Preview → Import).

**Architecture:** Build 4 step-renderer functions in a new module `import-wizard-steps.ts`. Each renders UI into the wizard's content area. Shared state flows via a `WizardState` object. Reuses existing `ColumnMapper`, `parseCsvToTree`, `extractHeaders`, and `normalizeTreeText`.

**Tech Stack:** TypeScript, vanilla DOM, existing csv-parser.ts, column-mapper.ts, text-normalize.ts, chart-store.ts

---

## Task 1: Create WizardState type and Source step renderer

**Files:**
- Create: `src/ui/import-wizard-steps.ts`
- Create: `tests/ui/import-wizard-steps.test.ts`
- Modify: `src/i18n/en.ts` (add source step i18n keys)
- Modify: `src/style.css` (add wizard content styles)

**What to build:**
- `WizardState` interface holding data that flows between steps
- `renderSourceStep(container, state, onReady)` — renders file drop zone + paste textarea
- onReady(true) called when file selected or text pasted
- State updated with rawText and fileName

**Tests:** renders drop zone and textarea, onReady called on paste, state.rawText set

**Commit:** `feat: add Source step renderer for import wizard`

---

## Task 2: Implement Mapping step renderer

**Files:**
- Modify: `src/ui/import-wizard-steps.ts`
- Modify: `tests/ui/import-wizard-steps.test.ts`

**What to build:**
- `renderMappingStep(container, state, onReady)` — detects JSON vs CSV
- JSON: shows "JSON format detected, no mapping needed", auto-ready
- CSV: extracts headers, mounts `ColumnMapper`, onReady when mapping applied
- Stores mapping in state

**Tests:** JSON auto-ready, CSV shows mapper, mapping saved to state

**Commit:** `feat: add Mapping step renderer for import wizard`

---

## Task 3: Implement Preview step renderer

**Files:**
- Modify: `src/ui/import-wizard-steps.ts`
- Modify: `tests/ui/import-wizard-steps.test.ts`

**What to build:**
- `renderPreviewStep(container, state, onReady)` — parses tree, shows stats
- Calls parseCsvToTree or JSON.parse depending on format
- Shows "✓ X people parsed" + tree stats
- Text normalization dropdowns (name + title format)
- Error display if parsing fails, onReady(false)

**Tests:** success shows count, error shows message, normalization dropdowns work

**Commit:** `feat: add Preview step renderer for import wizard`

---

## Task 4: Implement Import step renderer

**Files:**
- Modify: `src/ui/import-wizard-steps.ts`
- Modify: `tests/ui/import-wizard-steps.test.ts`

**What to build:**
- `renderImportStep(container, state, onReady)` — destination choice
- Radio: "Create new chart" (with name input) / "Import to current chart"
- Import summary
- Returns getter for destination choice

**Tests:** renders options, name input shows for new chart, always ready

**Commit:** `feat: add Import step renderer for import wizard`

---

## Task 5: Wire steps into ImportWizard in main.ts

**Files:**
- Modify: `src/main.ts`
- Modify: `src/i18n/en.ts` (remaining i18n keys)
- Modify: `src/style.css` (remaining styles)

**What to build:**
- Update ImportWizard instantiation in main.ts
- Wire onStepChange to call render functions
- Wire onComplete to apply normalization, create/replace chart, close wizard
- Reset state on close
- Render source step on open

**Tests:** Run full suite, verify build

**Commit:** `feat: wire import wizard steps with functional content`

---

## Task 6: Integration tests and polish

**Files:**
- Modify: `tests/ui/import-wizard-steps.test.ts`

**What to build:**
- End-to-end flow tests: CSV paste → mapping → preview → import
- JSON flow test: paste → auto-skip mapping → preview → import
- Error handling: invalid data blocks Next
- Back/Forward state persistence

**Commit:** `test: add integration tests for import wizard flow`
