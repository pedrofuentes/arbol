# Create Chart Dialog — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend chart creation to let users optionally copy categories and level mappings from a preset or another chart, via a dedicated dialog.

**Architecture:** Create `showCreateChartDialog()` in `src/ui/create-chart-dialog.ts` following the same DOM patterns as `input-dialog.ts`. Extend `ChartStore.createChart()` to accept optional categories/levelMappings. Update `ChartEditor` to accept preset stores and use the new dialog. TDD throughout.

**Tech Stack:** TypeScript, DOM APIs, Vitest

---

### Task 1: Add missing i18n key `dialog.create`

**Files:**
- Modify: `src/i18n/en.ts:288` (after `'dialog.ok': 'OK'`)

**Step 1: Add `dialog.create` key**

In `src/i18n/en.ts`, after line 288 (`'dialog.ok': 'OK',`), add:

```typescript
  'dialog.create': 'Create',
```

The following keys already exist and do NOT need adding:
- `dialog.cancel` (line 286)
- `chart_editor.name_required` (line 425)
- `chart_editor.categories_source` (line 1329)
- `chart_editor.level_mappings_source` (line 1330)
- `chart_editor.source_none` (line 1331)
- `chart_editor.source_preset` (line 1332)
- `chart_editor.source_chart` (line 1333)

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/i18n/en.ts
git commit -m "feat(i18n): add dialog.create key"
```

---

### Task 2: Write tests for `showCreateChartDialog`

**Files:**
- Create: `tests/ui/create-chart-dialog.test.ts`

**Step 1: Write all tests**

Follow the pattern from `tests/ui/input-dialog.test.ts`. The dialog function `showCreateChartDialog(options)` returns `Promise<CreateChartResult | null>`.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showCreateChartDialog, CreateChartDialogOptions } from '../../src/ui/create-chart-dialog';

function defaultOptions(): CreateChartDialogOptions {
  return {
    categoryPresets: ['Engineering', 'Design'],
    levelMappingPresets: ['Standard Levels'],
    charts: [
      { id: 'c1', name: 'Org Alpha' },
      { id: 'c2', name: 'Org Beta' },
    ],
  };
}

describe('showCreateChartDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((el) => {
      el.closest('div')?.remove();
    });
  });

  it('renders dialog with name input and two source selects', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const nameInput = dialog!.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.tagName).toBe('INPUT');
    const catSelect = dialog!.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    expect(catSelect).not.toBeNull();
    expect(catSelect.tagName).toBe('SELECT');
    const levelSelect = dialog!.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    expect(levelSelect).not.toBeNull();
    expect(levelSelect.tagName).toBe('SELECT');
  });

  it('populates category select with none, presets, and charts', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    const optionValues = Array.from(catSelect.options).map((o) => o.value);
    expect(optionValues).toContain('none:');
    expect(optionValues).toContain('preset:Engineering');
    expect(optionValues).toContain('preset:Design');
    expect(optionValues).toContain('chart:c1');
    expect(optionValues).toContain('chart:c2');
  });

  it('populates level select with none, presets, and charts', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const levelSelect = dialog.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    const optionValues = Array.from(levelSelect.options).map((o) => o.value);
    expect(optionValues).toContain('none:');
    expect(optionValues).toContain('preset:Standard Levels');
    expect(optionValues).toContain('chart:c1');
  });

  it('returns null on cancel', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    expect(await promise).toBeNull();
  });

  it('returns result with default none sources on create', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'My Chart';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.name).toBe('My Chart');
    expect(result!.categorySource.type).toBe('none');
    expect(result!.levelMappingSource.type).toBe('none');
  });

  it('returns preset source when selected', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Test';
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    catSelect.value = 'preset:Engineering';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result!.categorySource).toEqual({ type: 'preset', name: 'Engineering' });
  });

  it('returns chart source when selected', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Test';
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    catSelect.value = 'chart:c1';
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    const result = await promise;
    expect(result!.categorySource).toEqual({ type: 'chart', id: 'c1', name: 'Org Alpha' });
  });

  it('shows error when name is empty', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const createBtn = dialog.querySelector('[data-testid="create-chart-confirm"]') as HTMLButtonElement;
    createBtn.click();
    // Dialog should still be in DOM (not dismissed)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const errorEl = dialog.querySelector('[role="alert"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toBeTruthy();
    // Now cancel to resolve promise
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
  });

  it('submits on Enter key in name input', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.value = 'Enter Chart';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const result = await promise;
    expect(result!.name).toBe('Enter Chart');
  });

  it('cancels on Escape key in name input', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const nameInput = dialog.querySelector('[data-testid="create-chart-name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await promise).toBeNull();
  });

  it('cancels on overlay backdrop click', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const overlay = dialog.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(await promise).toBeNull();
  });

  it('removes overlay from DOM after close', async () => {
    const promise = showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const cancelBtn = dialog.querySelector('[data-testid="create-chart-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    await promise;
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('labels and controls are programmatically associated', () => {
    showCreateChartDialog(defaultOptions());
    const dialog = document.querySelector('[role="dialog"]')!;
    const labels = dialog.querySelectorAll('label');
    for (const label of labels) {
      expect(label.htmlFor).toBeTruthy();
      const ctrl = dialog.querySelector(`#${label.htmlFor}`);
      expect(ctrl).not.toBeNull();
    }
  });

  it('handles empty presets and charts gracefully', () => {
    showCreateChartDialog({
      categoryPresets: [],
      levelMappingPresets: [],
      charts: [],
    });
    const dialog = document.querySelector('[role="dialog"]')!;
    const catSelect = dialog.querySelector('[data-testid="cat-source"]') as HTMLSelectElement;
    expect(catSelect.options.length).toBe(1); // only "None"
    const levelSelect = dialog.querySelector('[data-testid="level-source"]') as HTMLSelectElement;
    expect(levelSelect.options.length).toBe(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/ui/create-chart-dialog.test.ts --no-coverage 2>&1 | tail -15`
Expected: FAIL — module `../../src/ui/create-chart-dialog` not found

**Step 3: Commit**

```bash
git add tests/ui/create-chart-dialog.test.ts
git commit -m "test: add create-chart-dialog tests (red)"
```

---

### Task 3: Implement `showCreateChartDialog`

**Files:**
- Create: `src/ui/create-chart-dialog.ts`

**Step 1: Create the dialog module**

```typescript
import { createOverlay, createDialogPanel, trapFocus } from './dialog-utils';
import { t } from '../i18n';

export interface ChartCreationSource {
  type: 'none' | 'preset' | 'chart';
  name?: string;
  id?: string;
}

export interface CreateChartResult {
  name: string;
  categorySource: ChartCreationSource;
  levelMappingSource: ChartCreationSource;
}

export interface CreateChartDialogOptions {
  categoryPresets: string[];
  levelMappingPresets: string[];
  charts: { id: string; name: string }[];
}

export function showCreateChartDialog(
  options: CreateChartDialogOptions,
): Promise<CreateChartResult | null> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = createOverlay();

    const dialogTitleId = 'create-chart-dialog-title';
    const dialog = createDialogPanel({
      role: 'dialog',
      ariaLabelledBy: dialogTitleId,
    });

    // Title
    const title = document.createElement('h3');
    title.id = dialogTitleId;
    title.textContent = t('chart_editor.new_chart_dialog_title');
    title.style.cssText = `
      margin:0 0 12px;font-size:16px;font-weight:600;
      color:var(--text-primary);font-family:var(--font-sans);
    `;
    dialog.appendChild(title);

    // Name input
    const nameId = 'create-chart-name';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = t('chart_editor.new_chart_dialog_label');
    nameLabel.htmlFor = nameId;
    nameLabel.style.cssText = `
      display:block;font-size:13px;font-weight:500;
      color:var(--text-secondary);font-family:var(--font-sans);
      margin-bottom:var(--space-1, 4px);
    `;
    dialog.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = nameId;
    nameInput.placeholder = t('chart_editor.new_chart_placeholder');
    nameInput.setAttribute('data-testid', 'create-chart-name');
    nameInput.style.cssText = `
      width:100%;box-sizing:border-box;
      padding:var(--space-2, 8px) var(--space-3, 12px);
      background:var(--bg-base);
      border:1px solid var(--border-default);
      border-radius:var(--radius-md, 6px);
      color:var(--text-primary);
      font-family:var(--font-sans);
      font-size:14px;outline:none;
      margin-bottom:12px;
    `;
    nameInput.addEventListener('focus', () => {
      nameInput.style.borderColor = 'var(--accent)';
    });
    nameInput.addEventListener('blur', () => {
      nameInput.style.borderColor = 'var(--border-default)';
    });
    dialog.appendChild(nameInput);

    // Helper to build a source <select>
    function createSourceSelect(
      labelText: string,
      presets: string[],
      testId: string,
    ): HTMLSelectElement {
      const selectId = `create-chart-${testId}`;
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      lbl.htmlFor = selectId;
      lbl.style.cssText = `
        display:block;font-size:13px;font-weight:500;
        color:var(--text-secondary);font-family:var(--font-sans);
        margin-bottom:var(--space-1, 4px);
      `;
      dialog.appendChild(lbl);

      const select = document.createElement('select');
      select.id = selectId;
      select.setAttribute('data-testid', testId);
      select.style.cssText = `
        width:100%;box-sizing:border-box;
        padding:var(--space-2, 8px) var(--space-3, 12px);
        background:var(--bg-base);
        border:1px solid var(--border-default);
        border-radius:var(--radius-md, 6px);
        color:var(--text-primary);
        font-family:var(--font-sans);
        font-size:14px;
        margin-bottom:12px;
      `;

      const noneOpt = document.createElement('option');
      noneOpt.value = 'none:';
      noneOpt.textContent = t('chart_editor.source_none');
      select.appendChild(noneOpt);

      for (const name of presets) {
        const opt = document.createElement('option');
        opt.value = `preset:${name}`;
        opt.textContent = t('chart_editor.source_preset', { name });
        select.appendChild(opt);
      }

      for (const chart of options.charts) {
        const opt = document.createElement('option');
        opt.value = `chart:${chart.id}`;
        opt.textContent = t('chart_editor.source_chart', { name: chart.name });
        select.appendChild(opt);
      }

      dialog.appendChild(select);
      return select;
    }

    const catSelect = createSourceSelect(
      t('chart_editor.categories_source'),
      options.categoryPresets,
      'cat-source',
    );

    const levelSelect = createSourceSelect(
      t('chart_editor.level_mappings_source'),
      options.levelMappingPresets,
      'level-source',
    );

    // Error message
    const errorEl = document.createElement('div');
    errorEl.setAttribute('role', 'alert');
    errorEl.style.cssText = `
      color:var(--danger, #d32f2f);font-size:12px;
      font-family:var(--font-sans);min-height:0;margin-bottom:8px;
    `;
    dialog.appendChild(errorEl);

    // Buttons
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = t('dialog.cancel');
    cancelBtn.setAttribute('data-testid', 'create-chart-cancel');
    btnGroup.appendChild(cancelBtn);

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-primary';
    createBtn.textContent = t('dialog.create');
    createBtn.setAttribute('data-testid', 'create-chart-confirm');
    btnGroup.appendChild(createBtn);

    dialog.appendChild(btnGroup);
    overlay.appendChild(dialog);

    const removeTrap = trapFocus(dialog);

    function parseSource(value: string): ChartCreationSource {
      const colonIdx = value.indexOf(':');
      const type = value.slice(0, colonIdx);
      const id = value.slice(colonIdx + 1);
      if (type === 'preset') return { type: 'preset', name: id };
      if (type === 'chart') {
        const chart = options.charts.find((c) => c.id === id);
        return { type: 'chart', id, name: chart?.name };
      }
      return { type: 'none' };
    }

    function dismiss(result: CreateChartResult | null): void {
      removeTrap();
      document.removeEventListener('keydown', escHandler);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      resolve(result);
    }

    function submit(): void {
      const name = nameInput.value.trim();
      if (!name) {
        errorEl.textContent = t('chart_editor.name_required');
        nameInput.focus();
        return;
      }
      dismiss({
        name,
        categorySource: parseSource(catSelect.value),
        levelMappingSource: parseSource(levelSelect.value),
      });
    }

    createBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => dismiss(null));

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); dismiss(null); }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss(null);
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(null);
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    nameInput.focus();
  });
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/ui/create-chart-dialog.test.ts --no-coverage 2>&1 | tail -15`
Expected: All 12 tests PASS

**Step 3: Commit**

```bash
git add src/ui/create-chart-dialog.ts
git commit -m "feat(ui): implement showCreateChartDialog"
```

---

### Task 4: Extend `ChartStore.createChart()` signature

**Files:**
- Modify: `src/store/chart-store.ts:106-129`
- Test: `tests/store/chart-store.test.ts` (existing — add new tests)

**Step 1: Find and check existing createChart tests**

Run: `grep -n "createChart" tests/store/chart-store.test.ts | head -20`

Look for tests that call `createChart(name)` to ensure we don't break them.

**Step 2: Write failing tests for extended signature**

Add to the existing test file (find the describe block for `createChart`):

```typescript
it('createChart with categories copies them to the new chart', async () => {
  const cats = [{ id: 'c1', label: 'Eng', color: '#ff0000' }];
  const chart = await store.createChart('With Cats', cats);
  expect(chart.categories).toEqual(cats);
});

it('createChart with levelMappings copies them to the new chart', async () => {
  const mappings = [{ rawLevel: 'L5', displayTitle: 'Senior' }];
  const chart = await store.createChart('With Levels', undefined, mappings, 'mapped');
  expect(chart.levelMappings).toEqual(mappings);
  expect(chart.levelDisplayMode).toBe('mapped');
});

it('createChart without optional params keeps existing behavior', async () => {
  const chart = await store.createChart('Plain');
  expect(chart.categories).toEqual([]);
  expect(chart.levelMappings).toBeUndefined();
  expect(chart.levelDisplayMode).toBeUndefined();
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/store/chart-store.test.ts --no-coverage 2>&1 | tail -15`
Expected: FAIL — createChart only accepts 1 argument

**Step 4: Extend `createChart()` implementation**

In `src/store/chart-store.ts`, change the `createChart` method (lines 106-129):

```typescript
  async createChart(
    name: string,
    categories?: ColorCategory[],
    levelMappings?: LevelMapping[],
    levelDisplayMode?: LevelDisplayMode,
  ): Promise<ChartRecord> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Chart name cannot be empty');
    if (await this.db.isChartNameTaken(trimmed)) {
      throw new Error(`A chart named "${trimmed}" already exists`);
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      workingTree: { ...DEFAULT_ROOT },
      categories: categories ?? [],
    };

    if (levelMappings) chart.levelMappings = levelMappings;
    if (levelDisplayMode) chart.levelDisplayMode = levelDisplayMode;

    await this.db.putChart(chart);
    this.activeChartId = chart.id;
    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.savedMutationVersion = null;
    this.emit();
    return chart;
  }
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/store/chart-store.test.ts --no-coverage 2>&1 | tail -15`
Expected: All tests PASS (existing + new)

**Step 6: Commit**

```bash
git add src/store/chart-store.ts tests/store/chart-store.test.ts
git commit -m "feat(store): extend createChart to accept categories and levels"
```

---

### Task 5: Update `ChartEditor` to use the new dialog

**Files:**
- Modify: `src/editor/chart-editor.ts`
- Modify: `src/main.ts` (pass preset stores to ChartEditor)
- Modify: `tests/editor/chart-editor.test.ts` (update mock, add tests)

**Step 1: Write failing tests for ChartEditor**

In `tests/editor/chart-editor.test.ts`:

Add mock for new dialog at top (alongside existing mocks):

```typescript
vi.mock('../../src/ui/create-chart-dialog', () => ({
  showCreateChartDialog: vi.fn().mockResolvedValue(null),
}));
```

Import it:

```typescript
import { showCreateChartDialog } from '../../src/ui/create-chart-dialog';
```

Add a new describe block for chart creation with sources:

```typescript
describe('ChartEditor – Create chart with sources', () => {
  let container: HTMLElement;
  let editor: ChartEditor;
  let store: ReturnType<typeof mockChartStore>;
  const chart = makeChart();

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    store = mockChartStore([chart]);

    editor = new ChartEditor({
      container,
      chartStore: store,
      onChartSwitch: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionView: vi.fn(),
      onVersionCompare: vi.fn(),
      getCurrentTree: () => makeTree(),
      getCurrentCategories: () => [],
      onBeforeSwitch: vi.fn().mockResolvedValue(true),
      categoryPresetStore: {
        getPresets: () => [{ name: 'Eng', categories: [{ id: 'c1', label: 'Eng', color: '#f00' }] }],
        getPreset: (n: string) =>
          n === 'Eng' ? { name: 'Eng', categories: [{ id: 'c1', label: 'Eng', color: '#f00' }] } : undefined,
      },
      levelPresetStore: {
        getPresets: () => [{ name: 'Std', levelMappings: [{ rawLevel: 'L5', displayTitle: 'Sr' }], levelDisplayMode: 'mapped' as const }],
        getPreset: (n: string) =>
          n === 'Std' ? { name: 'Std', levelMappings: [{ rawLevel: 'L5', displayTitle: 'Sr' }], levelDisplayMode: 'mapped' as const } : undefined,
      },
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-chart-id]')).not.toBeNull();
    });
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('calls showCreateChartDialog instead of showInputDialog when creating a chart', async () => {
    (showCreateChartDialog as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const createBtn = container.querySelector('[data-tooltip="New chart"]') as HTMLButtonElement;
    createBtn.click();
    await vi.waitFor(() => {
      expect(showCreateChartDialog).toHaveBeenCalled();
    });
    expect(showInputDialog).not.toHaveBeenCalled();
  });

  it('passes category preset names and chart list to the dialog', async () => {
    (showCreateChartDialog as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const createBtn = container.querySelector('[data-tooltip="New chart"]') as HTMLButtonElement;
    createBtn.click();
    await vi.waitFor(() => {
      expect(showCreateChartDialog).toHaveBeenCalled();
    });
    const opts = (showCreateChartDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(opts.categoryPresets).toEqual(['Eng']);
    expect(opts.levelMappingPresets).toEqual(['Std']);
  });

  it('creates chart with preset categories when selected', async () => {
    (showCreateChartDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'New Org',
      categorySource: { type: 'preset', name: 'Eng' },
      levelMappingSource: { type: 'none' },
    });
    const createBtn = container.querySelector('[data-tooltip="New chart"]') as HTMLButtonElement;
    createBtn.click();
    await vi.waitFor(() => {
      expect(store.createChart).toHaveBeenCalled();
    });
    expect(store.createChart).toHaveBeenCalledWith(
      'New Org',
      [{ id: 'c1', label: 'Eng', color: '#f00' }],
      undefined,
      undefined,
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/editor/chart-editor.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `categoryPresetStore` is not a known option

**Step 3: Update `ChartEditorOptions` interface and constructor**

In `src/editor/chart-editor.ts`:

Add imports:

```typescript
import type { CategoryPreset, LevelMappingPreset, LevelMapping, LevelDisplayMode } from '../types';
import { showCreateChartDialog } from '../ui/create-chart-dialog';
```

Extend `ChartEditorOptions`:

```typescript
export interface ChartEditorOptions {
  container: HTMLElement;
  chartStore: ChartStore;
  onChartSwitch: (chart: ChartRecord) => void;
  onVersionRestore: (tree: OrgNode) => void;
  onVersionView: (version: VersionRecord) => void;
  onVersionCompare: (version: VersionRecord) => void;
  getCurrentTree: () => OrgNode;
  getCurrentCategories: () => ColorCategory[];
  onBeforeSwitch: () => Promise<boolean>;
  categoryPresetStore?: {
    getPresets(): CategoryPreset[];
    getPreset(name: string): CategoryPreset | undefined;
  };
  levelPresetStore?: {
    getPresets(): LevelMappingPreset[];
    getPreset(name: string): LevelMappingPreset | undefined;
  };
}
```

Add private fields and assign in constructor:

```typescript
private categoryPresetStore: ChartEditorOptions['categoryPresetStore'];
private levelPresetStore: ChartEditorOptions['levelPresetStore'];
```

In constructor body:

```typescript
this.categoryPresetStore = options.categoryPresetStore;
this.levelPresetStore = options.levelPresetStore;
```

**Step 4: Replace `handleCreateChart` with new dialog logic**

```typescript
private async handleCreateChart(): Promise<void> {
  const charts = await this.chartStore.getCharts();
  const activeId = this.chartStore.getActiveChartId();

  const result = await showCreateChartDialog({
    categoryPresets: this.categoryPresetStore?.getPresets().map((p) => p.name) ?? [],
    levelMappingPresets: this.levelPresetStore?.getPresets().map((p) => p.name) ?? [],
    charts: charts
      .filter((c) => c.id !== activeId)
      .map((c) => ({ id: c.id, name: c.name })),
  });

  if (!result) return;

  const proceed = await this.onBeforeSwitch();
  if (!proceed) return;

  try {
    let categories: ColorCategory[] | undefined;
    if (result.categorySource.type === 'preset') {
      const preset = this.categoryPresetStore?.getPreset(result.categorySource.name!);
      if (preset) categories = preset.categories;
    } else if (result.categorySource.type === 'chart') {
      const sourceChart = charts.find((c) => c.id === result.categorySource.id);
      if (sourceChart) categories = structuredClone(sourceChart.categories);
    }

    let levelMappings: LevelMapping[] | undefined;
    let levelDisplayMode: LevelDisplayMode | undefined;
    if (result.levelMappingSource.type === 'preset') {
      const preset = this.levelPresetStore?.getPreset(result.levelMappingSource.name!);
      if (preset) {
        levelMappings = preset.levelMappings;
        levelDisplayMode = preset.levelDisplayMode;
      }
    } else if (result.levelMappingSource.type === 'chart') {
      const sourceChart = charts.find((c) => c.id === result.levelMappingSource.id);
      if (sourceChart) {
        levelMappings = sourceChart.levelMappings ? structuredClone(sourceChart.levelMappings) : undefined;
        levelDisplayMode = sourceChart.levelDisplayMode;
      }
    }

    const chart = await this.chartStore.createChart(
      result.name,
      categories,
      levelMappings,
      levelDisplayMode,
    );

    this.onChartSwitch(chart);
    this.chartErrorEl.textContent = '';
    await this.refresh();
  } catch (err) {
    this.showError(this.chartErrorEl, (err as Error).message);
  }
}
```

**Step 5: Update `main.ts` to pass preset stores**

In `src/main.ts`, find the `new ChartEditor({...})` call (line 598) and add the two new options:

```typescript
  const chartEditor = new ChartEditor({
    container: sidebar,
    chartStore,
    getCurrentTree: () => store.getTree(),
    getCurrentCategories: () => categoryStore.getAll(),
    onBeforeSwitch: handleBeforeSwitch,
    onChartSwitch: handleChartSwitched,
    categoryPresetStore,   // ← ADD
    levelPresetStore,      // ← ADD
    onVersionRestore: (tree) => { ... },
    // ... rest unchanged
  });
```

**Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/editor/chart-editor.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/editor/chart-editor.ts src/main.ts tests/editor/chart-editor.test.ts
git commit -m "feat(editor): wire create-chart-dialog with preset stores"
```

---

### Task 6: Full verification

**Step 1: Type check**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

**Step 2: Full test suite**

Run: `npx vitest run --no-coverage 2>&1 | tail -20`
Expected: All 2500+ tests pass

**Step 3: Commit any remaining fixes**

If any tests fail, fix and commit.

---

### Task 7: Remove `showInputDialog` import if unused

**Files:**
- Modify: `src/editor/chart-editor.ts`

**Step 1: Check if `showInputDialog` is still used in chart-editor.ts**

After replacing `handleCreateChart`, `showInputDialog` is still used by `handleRenameChart` (line 511) and `handleCreateVersion`. So keep the import.

**Step 2: Verify no dead imports**

Run: `npx tsc --noEmit 2>&1 | tail -5`

---

### Summary of all files changed

| File | Action |
|------|--------|
| `src/i18n/en.ts` | Add `dialog.create` key |
| `src/ui/create-chart-dialog.ts` | NEW — dialog function |
| `src/store/chart-store.ts` | Extend `createChart()` signature |
| `src/editor/chart-editor.ts` | Add preset store options, replace `handleCreateChart()` |
| `src/main.ts` | Pass preset stores to ChartEditor |
| `tests/ui/create-chart-dialog.test.ts` | NEW — dialog tests |
| `tests/store/chart-store.test.ts` | Add tests for extended `createChart()` |
| `tests/editor/chart-editor.test.ts` | Add mock + tests for new dialog usage |
