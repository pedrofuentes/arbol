# Category & Level Mapping Presets — Design

> Approved 2026-03-22. Enables reusing categories and level mappings across charts.

## Problem

When creating a new chart, categories start empty and level mappings are absent. The only way to reuse them is duplicating an entire chart (which also copies the tree). Users managing multiple charts for the same company need a way to share configuration without duplicating data.

## Solution

Two independent preset systems — **Category Presets** and **Level Mapping Presets** — stored in localStorage, usable from both the settings panel and chart creation flow.

## Data Model

### Category Preset

```typescript
interface CategoryPreset {
  name: string;
  categories: ColorCategory[];
}
```

**Storage key:** `arbol-category-presets`

### Level Mapping Preset

```typescript
interface LevelMappingPreset {
  name: string;
  levelMappings: LevelMapping[];
  levelDisplayMode: LevelDisplayMode;
}
```

**Storage key:** `arbol-level-presets`

## Stores

Two new stores following the existing `MappingStore` pattern:

### CategoryPresetStore (`src/store/category-preset-store.ts`)

| Method | Signature |
|--------|-----------|
| `getPresets()` | `(): CategoryPreset[]` |
| `getPreset(name)` | `(name: string): CategoryPreset \| undefined` |
| `savePreset(preset)` | `(preset: CategoryPreset): void` |
| `deletePreset(name)` | `(name: string): void` |

### LevelPresetStore (`src/store/level-preset-store.ts`)

| Method | Signature |
|--------|-----------|
| `getPresets()` | `(): LevelMappingPreset[]` |
| `getPreset(name)` | `(name: string): LevelMappingPreset \| undefined` |
| `savePreset(preset)` | `(preset: LevelMappingPreset): void` |
| `deletePreset(name)` | `(name: string): void` |

Both stores extend EventEmitter, emit on mutations, and persist to localStorage.

## UI Integration

### 1. Settings Panel — Category Section

Add a preset toolbar below the categories list:

```
[Save as preset...] [Load preset ▾] [Copy from chart ▾]
```

- **Save as preset** — prompts for name, saves current categories
- **Load preset** — dropdown listing saved presets, selecting one replaces current categories (with confirmation)
- **Copy from chart** — dropdown listing other charts, selecting one copies that chart's categories

### 2. Settings Panel — Level Mapping Section

Same toolbar pattern:

```
[Save as preset...] [Load preset ▾] [Copy from chart ▾]
```

- **Save as preset** — saves current level mappings + display mode
- **Load preset** — replaces current level mappings
- **Copy from chart** — copies from another chart's level mappings

### 3. Chart Creation Dialog

When creating a new chart (existing dialog), add optional preset pickers:

```
Chart name: [____________]

Categories: [None ▾]       ← dropdown: None, presets, other charts
Level Mappings: [None ▾]   ← dropdown: None, presets, other charts

[Create]
```

Both dropdowns show:
- "None" (default — empty)
- Saved presets by name
- Divider
- "Copy from: Chart A", "Copy from: Chart B", etc.

## Behavioral Notes

- **Loading a preset replaces** — it's not a merge. Confirmation dialog shown if current data would be lost.
- **Presets are independent** — category presets don't include level mappings and vice versa.
- **"Copy from chart"** is a one-time copy — no ongoing link between charts.
- **Preset names are unique** within each type. Saving with an existing name overwrites (with confirmation).
- **localStorage limits** — presets are small (a few KB each). No practical limit concerns.

## Files to Create

1. `src/store/category-preset-store.ts` — store
2. `src/store/level-preset-store.ts` — store
3. `tests/store/category-preset-store.test.ts` — tests
4. `tests/store/level-preset-store.test.ts` — tests

## Files to Modify

1. `src/types.ts` — CategoryPreset and LevelMappingPreset interfaces
2. `src/editor/settings-editor.ts` — preset toolbar in category + level sections
3. `src/store/chart-store.ts` — `createChart()` to accept optional initial categories/mappings
4. `src/ui/` — chart creation dialog (if separate component)
5. `src/i18n/en.ts` — translation keys for preset UI
6. `src/main.ts` — instantiate and wire preset stores
