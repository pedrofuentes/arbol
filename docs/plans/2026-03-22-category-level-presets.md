# Category & Level Mapping Presets — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users save, load, and copy categories and level mappings across charts via reusable presets.

**Architecture:** Two new localStorage-backed stores (`CategoryPresetStore`, `LevelPresetStore`) following the existing `MappingStore` pattern. Preset toolbars added to the category and level mapping settings panels. Chart creation dialog extended with optional preset/chart pickers.

**Tech Stack:** TypeScript, Vitest, vanilla DOM, localStorage via `IStorage` abstraction.

---

### Task 1: Type definitions

**Files:**
- Modify: `src/types.ts`

**Step 1: Add the two preset interfaces to `src/types.ts`**

Add after the `MappingPreset` interface (around line 50):

```typescript
/** Reusable category preset for applying to multiple charts. */
export interface CategoryPreset {
  /** User-assigned preset name. Must be unique. */
  name: string;
  /** Snapshot of ColorCategory array. */
  categories: ColorCategory[];
}

/** Reusable level mapping preset for applying to multiple charts. */
export interface LevelMappingPreset {
  /** User-assigned preset name. Must be unique. */
  name: string;
  /** Snapshot of LevelMapping array. */
  levelMappings: LevelMapping[];
  /** Display mode at time of save. */
  levelDisplayMode: LevelDisplayMode;
}
```

**Step 2: Commit**

```
git add src/types.ts
git commit -m "feat: add CategoryPreset and LevelMappingPreset types"
```

---

### Task 2: CategoryPresetStore — tests then implementation

**Files:**
- Create: `src/store/category-preset-store.ts`
- Create: `tests/store/category-preset-store.test.ts`

**Step 1: Write the test file**

Follow the `mapping-store.test.ts` pattern exactly. Test:

- `getPresets()` returns empty array when nothing saved
- `savePreset()` stores and retrieves a preset
- `savePreset()` overwrites existing preset with same name
- `getPreset(name)` returns a single preset
- `getPreset(name)` returns undefined for non-existent
- `deletePreset(name)` removes a preset
- `deletePreset(name)` is no-op for non-existent
- `savePreset()` emits change event
- `deletePreset()` emits change event
- `savePreset()` throws on empty name
- `savePreset()` throws on empty categories array
- `getPresets()` returns copies (not references)
- Handles corrupt localStorage gracefully (returns [])

Use the same `localStorageMock` pattern from `mapping-store.test.ts`. Storage key: `arbol-category-presets`.

**Step 2: Run tests to verify they fail**

```
npx vitest run tests/store/category-preset-store.test.ts --no-coverage
```

**Step 3: Implement `src/store/category-preset-store.ts`**

Follow `MappingStore` pattern:
- Extends `EventEmitter`
- Constructor takes `storage: IStorage = browserStorage`
- Storage key: `arbol-category-presets`
- Methods: `getPresets()`, `getPreset(name)`, `savePreset(preset)`, `deletePreset(name)`
- Validation: name must be non-empty string, categories must be non-empty array, each category must have id + label + color
- Emit on mutations, toast on storage errors

**Step 4: Run tests to verify they pass**

```
npx vitest run tests/store/category-preset-store.test.ts --no-coverage
```

**Step 5: Commit**

```
git add src/store/category-preset-store.ts tests/store/category-preset-store.test.ts
git commit -m "feat: add CategoryPresetStore with tests"
```

---

### Task 3: LevelPresetStore — tests then implementation

**Files:**
- Create: `src/store/level-preset-store.ts`
- Create: `tests/store/level-preset-store.test.ts`

**Step 1: Write the test file**

Same pattern as Task 2 but for level mapping presets. Test:

- `getPresets()` returns empty array
- `savePreset()` stores with levelMappings + levelDisplayMode
- `savePreset()` overwrites existing
- `getPreset(name)` returns single / undefined
- `deletePreset(name)` removes / no-op
- Events emitted on mutations
- Validation: name non-empty, levelMappings must be non-empty array
- Handles corrupt localStorage

Storage key: `arbol-level-presets`.

**Step 2: Run tests — expect failures**

**Step 3: Implement `src/store/level-preset-store.ts`**

Same pattern as CategoryPresetStore. Validation: name non-empty, levelMappings non-empty array, each mapping must have rawLevel + displayTitle.

**Step 4: Run tests — expect pass**

**Step 5: Commit**

```
git add src/store/level-preset-store.ts tests/store/level-preset-store.test.ts
git commit -m "feat: add LevelPresetStore with tests"
```

---

### Task 4: i18n keys for preset UI

**Files:**
- Modify: `src/i18n/en.ts`

**Step 1: Add translation keys**

Add near the existing category and level mapping keys:

```typescript
// Category presets
'preset.save_category': 'Save as preset',
'preset.load_category': 'Load preset',
'preset.copy_from_chart': 'Copy from chart',
'preset.save_name_prompt': 'Preset name',
'preset.save_name_placeholder': 'e.g., Company Standard',
'preset.delete_confirm': 'Delete preset "{name}"?',
'preset.load_confirm': 'Replace current {type} with preset "{name}"?',
'preset.load_confirm_title': 'Load Preset',
'preset.copy_confirm': 'Replace current {type} with {type} from "{name}"?',
'preset.copy_confirm_title': 'Copy from Chart',
'preset.saved': 'Preset "{name}" saved',
'preset.loaded': 'Preset "{name}" loaded',
'preset.deleted': 'Preset "{name}" deleted',
'preset.copied': '{type} copied from "{name}"',
'preset.no_presets': 'No saved presets',
'preset.no_other_charts': 'No other charts',
'preset.type_categories': 'categories',
'preset.type_level_mappings': 'level mappings',
'preset.overwrite_confirm': 'A preset named "{name}" already exists. Overwrite?',
```

**Step 2: Commit**

```
git add src/i18n/en.ts
git commit -m "feat: add i18n keys for category and level mapping presets"
```

---

### Task 5: Preset toolbar UI component

**Files:**
- Create: `src/ui/preset-toolbar.ts`
- Create: `tests/ui/preset-toolbar.test.ts`

**Step 1: Write tests**

The PresetToolbar is a reusable component with 3 buttons:
- "Save as preset" — prompts for name, calls `onSave(name)`
- "Load preset" — dropdown of preset names, calls `onLoad(name)`
- "Copy from chart" — dropdown of chart names, calls `onCopyFromChart(chartId)`

Test:
- Renders 3 buttons with correct labels
- Save button opens input dialog
- Load dropdown lists preset names
- Copy from chart dropdown lists chart names
- Callbacks fire with correct arguments
- Empty presets shows "No saved presets" in dropdown
- Empty charts shows "No other charts" in dropdown

**Step 2: Implement `src/ui/preset-toolbar.ts`**

```typescript
export interface PresetToolbarOptions {
  container: HTMLElement;
  presetNames: string[];
  chartNames: { id: string; name: string }[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onCopyFromChart: (chartId: string) => void;
  onDelete: (name: string) => void;
  typeLabel: string; // e.g., "categories" or "level mappings"
}
```

Build 3 buttons in a flex row. "Save" uses `showInputDialog`. "Load" and "Copy from chart" use simple dropdown menus (DOM `<select>` or custom dropdown — follow existing patterns in the codebase).

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```
git add src/ui/preset-toolbar.ts tests/ui/preset-toolbar.test.ts
git commit -m "feat: add reusable PresetToolbar component"
```

---

### Task 6: Wire preset toolbar into Category section

**Files:**
- Modify: `src/editor/settings-editor.ts`
- Modify: `src/main.ts`
- Modify: `tests/editor/settings-editor.test.ts` (if exists, add tests)

**Step 1: Update `SettingsEditor` constructor to accept preset stores and chart store**

Add parameters: `categoryPresetStore?: CategoryPresetStore`, `levelPresetStore?: LevelPresetStore`, and `chartStore?: ChartStore`.

**Step 2: After the category panel section, add the preset toolbar**

Wire the toolbar:
- `presetNames` → `categoryPresetStore.getPresets().map(p => p.name)`
- `chartNames` → `chartStore.getCharts().filter(c => c.id !== activeChartId)`
- `onSave(name)` → `categoryPresetStore.savePreset({ name, categories: categoryStore.getAll() })`
- `onLoad(name)` → confirm, then `categoryStore.replaceAll(preset.categories)`, rerender
- `onCopyFromChart(chartId)` → confirm, then load chart from DB, `categoryStore.replaceAll(chart.categories)`, rerender
- `onDelete(name)` → confirm, then `categoryPresetStore.deletePreset(name)`

**Step 3: Update `src/main.ts`** to instantiate `CategoryPresetStore` and pass to `SettingsEditor`.

**Step 4: Add tests for the integration**

**Step 5: Run full test suite**

**Step 6: Commit**

```
git commit -m "feat: wire category preset toolbar into settings panel"
```

---

### Task 7: Wire preset toolbar into Level Mapping section

**Files:**
- Modify: `src/editor/settings/level-mapping-panel.ts`
- Modify: `src/editor/settings-editor.ts`
- Modify: `src/main.ts`

**Step 1: Add preset toolbar to LevelMappingPanel**

Similar to Task 6 but for level mappings:
- `onSave(name)` → save current levelStore mappings + displayMode
- `onLoad(name)` → replaceAll mappings, setDisplayMode, rerender
- `onCopyFromChart(chartId)` → load chart, apply its levelMappings/levelDisplayMode
- `onDelete(name)` → delete preset

**Step 2: Update `LevelMappingPanelDeps` to include `levelPresetStore` and chart data source**

**Step 3: Update `main.ts` to instantiate `LevelPresetStore` and pass to panel**

**Step 4: Run full test suite**

**Step 5: Commit**

```
git commit -m "feat: wire level mapping preset toolbar into settings panel"
```

---

### Task 8: Extend chart creation with preset pickers

**Files:**
- Modify: `src/editor/chart-editor.ts`
- Modify: `src/store/chart-store.ts`

**Step 1: Update `createChart()` to accept optional categories and level mappings**

Change signature:
```typescript
async createChart(
  name: string,
  categories?: ColorCategory[],
  levelMappings?: LevelMapping[],
  levelDisplayMode?: LevelDisplayMode,
): Promise<ChartRecord>
```

Set `categories: categories ?? []` and conditionally add mappings.

**Step 2: Update `handleCreateChart()` in chart-editor.ts**

Replace the simple `showInputDialog` with a richer dialog that includes:
1. Chart name input
2. Category source dropdown: None / preset names / chart names
3. Level mapping source dropdown: None / preset names / chart names

Use a custom dialog (DOM-built) since `showInputDialog` only handles a single text field.

**Step 3: Wire the dialog to resolve presets/charts and pass to `createChart()`**

**Step 4: Add tests**

**Step 5: Run full test suite**

**Step 6: Commit**

```
git commit -m "feat: chart creation with optional category and level mapping presets"
```

---

### Task 9: Integration test and final verification

**Step 1: Run full test suite**

```
npx vitest run --no-coverage
```

**Step 2: TypeScript check**

```
npx tsc --noEmit
```

**Step 3: Production build**

```
npx vite build
```

**Step 4: Verify new test count**

Should be baseline + ~40-60 new tests.

**Step 5: Final commit if any cleanup needed**
