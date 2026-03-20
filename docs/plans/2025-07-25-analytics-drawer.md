# Analytics Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace sidebar analytics tab with a bottom drawer that overlays the chart canvas, so users can see editing tools and analytics simultaneously.

**Architecture:** The AnalyticsDrawer component positions absolutely at the bottom of `#chart-area`. The existing TabSwitcher is removed from the sidebar — ChartEditor mounts directly to `sidebar`. A toggle button in `header-right` and `Ctrl+Shift+A` shortcut control the drawer. AnalyticsEditor is redesigned to render horizontal KPI cards + 2-column detail grid inside the drawer body.

**Tech Stack:** Vanilla TypeScript, CSS (no framework), EventEmitter for state, Vitest for testing.

---

## Task 1: Add i18n keys

**Files:**
- Modify: `src/i18n/en.ts:44-45`
- Modify: `src/i18n/es.ts:44-45`

**Step 1: Update en.ts**

In `src/i18n/en.ts`, replace lines 44-45:
```
  'tabs.org': 'Org',
  'tabs.analytics': 'Analytics',
```
with:
```
  'analytics.drawer_toggle': 'Analytics',
  'analytics.drawer_toggle_tooltip': 'Toggle analytics panel (Ctrl+Shift+A)',
  'analytics.drawer_close': 'Close analytics panel',
  'analytics.drawer_aria': 'Organization analytics panel',
  'analytics.benchmark_healthy': 'Healthy range',
  'analytics.benchmark_caution': 'Outside healthy range',
  'analytics.alerts_count': '{count} alerts',
```

Keep `'tabs.aria': 'Editor tabs'` (line 43) — still used by TabSwitcher in settings-modal.

**Step 2: Update es.ts**

In `src/i18n/es.ts`, replace lines 44-45:
```
  'tabs.org': 'Org',
  'tabs.analytics': 'Analíticas',
```
with:
```
  'analytics.drawer_toggle': 'Analíticas',
  'analytics.drawer_toggle_tooltip': 'Alternar panel de analíticas (Ctrl+Shift+A)',
  'analytics.drawer_close': 'Cerrar panel de analíticas',
  'analytics.drawer_aria': 'Panel de analíticas del organigrama',
  'analytics.benchmark_healthy': 'Rango saludable',
  'analytics.benchmark_caution': 'Fuera del rango saludable',
  'analytics.alerts_count': '{count} alertas',
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (keys are string-indexed, not type-checked).

---

## Task 2: Write AnalyticsDrawer tests (RED)

**Files:**
- Create: `tests/ui/analytics-drawer.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalyticsDrawer } from '../../src/ui/analytics-drawer';

describe('AnalyticsDrawer', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it('renders drawer element in parent', () => {
    const drawer = new AnalyticsDrawer(parent);
    expect(parent.querySelector('.analytics-drawer')).not.toBeNull();
    drawer.destroy();
  });

  it('starts collapsed', () => {
    const drawer = new AnalyticsDrawer(parent);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(true);
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('toggle opens drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.toggle();
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(false);
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('toggle closes open drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.toggle();
    drawer.toggle();
    expect(drawer.isOpen()).toBe(false);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.classList.contains('collapsed')).toBe(true);
    drawer.destroy();
  });

  it('open() opens', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('open() is idempotent', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    drawer.destroy();
  });

  it('close() closes', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('close() is idempotent', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('close button closes drawer', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    const closeBtn = parent.querySelector('.analytics-drawer-close') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });

  it('getContentContainer returns body element', () => {
    const drawer = new AnalyticsDrawer(parent);
    const body = drawer.getContentContainer();
    expect(body).not.toBeNull();
    expect(body.className).toBe('analytics-drawer-body');
    drawer.destroy();
  });

  it('emits on open', () => {
    const drawer = new AnalyticsDrawer(parent);
    let called = false;
    drawer.onChange(() => { called = true; });
    drawer.open();
    expect(called).toBe(true);
    drawer.destroy();
  });

  it('emits on close', () => {
    const drawer = new AnalyticsDrawer(parent);
    drawer.open();
    let called = false;
    drawer.onChange(() => { called = true; });
    drawer.close();
    expect(called).toBe(true);
    drawer.destroy();
  });

  it('destroy removes DOM', () => {
    const drawer = new AnalyticsDrawer(parent);
    expect(parent.querySelector('.analytics-drawer')).not.toBeNull();
    drawer.destroy();
    expect(parent.querySelector('.analytics-drawer')).toBeNull();
  });

  it('has correct aria attributes', () => {
    const drawer = new AnalyticsDrawer(parent);
    const el = parent.querySelector('.analytics-drawer')!;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Organization analytics panel');
    drawer.destroy();
  });

  it('has grip element', () => {
    const drawer = new AnalyticsDrawer(parent);
    const grip = parent.querySelector('.analytics-drawer-grip');
    expect(grip).not.toBeNull();
    expect(grip!.getAttribute('aria-hidden')).toBe('true');
    drawer.destroy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/ui/analytics-drawer.test.ts`
Expected: FAIL — module `../../src/ui/analytics-drawer` does not exist.

---

## Task 3: Implement AnalyticsDrawer (GREEN)

**Files:**
- Create: `src/ui/analytics-drawer.ts`

**Step 1: Write the implementation**

```typescript
import { t } from '../i18n';
import { EventEmitter } from '../utils/event-emitter';

export class AnalyticsDrawer extends EventEmitter {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private _isOpen = false;

  constructor(parent: HTMLElement) {
    super();

    this.root = document.createElement('div');
    this.root.className = 'analytics-drawer collapsed';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', t('analytics.drawer_aria'));

    // Handle bar
    const handle = document.createElement('div');
    handle.className = 'analytics-drawer-handle';

    // Grip indicator (visual only)
    const grip = document.createElement('div');
    grip.className = 'analytics-drawer-grip';
    grip.setAttribute('aria-hidden', 'true');
    handle.appendChild(grip);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'analytics-drawer-close';
    closeBtn.setAttribute('aria-label', t('analytics.drawer_close'));
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());
    handle.appendChild(closeBtn);

    this.root.appendChild(handle);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'analytics-drawer-body';
    this.root.appendChild(this.body);

    parent.appendChild(this.root);
  }

  getContentContainer(): HTMLElement {
    return this.body;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.root.classList.remove('collapsed');
    this.emit();
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.root.classList.add('collapsed');
    this.emit();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  destroy(): void {
    this.root.remove();
  }
}
```

**Step 2: Run drawer tests to verify they pass**

Run: `npx vitest run tests/ui/analytics-drawer.test.ts`
Expected: ALL PASS (15 tests).

---

## Task 4: Add CSS styles

**Files:**
- Modify: `src/style.css` — append before the end of file (after line 2743)

**Step 1: Append analytics drawer CSS**

Add the complete CSS block from the task spec at the end of `src/style.css`. This includes:
- `.analytics-drawer` and `.analytics-drawer.collapsed`
- `.analytics-drawer-handle`, `.analytics-drawer-grip`, `.analytics-drawer-close`
- `.analytics-drawer-body` with scrollbar styling
- `.analytics-kpi-strip` and `.analytics-kpi-card` with `data-accent` variants
- `.analytics-detail-grid` and `.analytics-detail-section`
- `.analytics-span-stats`, `.analytics-alert-list`, `.analytics-bar-row`
- `.analytics-dist-row` and distribution elements
- `.analytics-focus-banner`
- `.analytics-toggle-btn` with active/hover states and badge
- Responsive `@media (max-width: 900px)` for single-column detail grid
- `@keyframes analyticsCardIn`

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 5: Update AnalyticsEditor tests (RED)

**Files:**
- Modify: `tests/editor/analytics-editor.test.ts`

**Step 1: Update test selectors for new DOM structure**

The existing AnalyticsEditor tests check for old inline-styled DOM. Update them to expect the new CSS class-based structure:

Key selector changes:
- Old: `container.querySelector('h3')` for title → Remove (no title heading in drawer)
- Old: `container.textContent` checks → Keep most, update where needed
- Add: Check for `.analytics-kpi-strip` and `.analytics-kpi-card` elements
- Add: Check for `data-accent` attributes on KPI cards
- Add: Check for `.analytics-detail-grid` and `.analytics-detail-section` elements
- Update: Alert buttons now use `.analytics-alert-name` class instead of `button[data-node-id]`
- Add: Check for `.analytics-focus-banner` in focus mode test
- Keep: behavioral tests (refresh on change, destroy, category/level store)

Updated test file:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsEditor } from '../../src/editor/analytics-editor';
import { OrgStore } from '../../src/store/org-store';
import { CategoryStore } from '../../src/store/category-store';
import { LevelStore } from '../../src/store/level-store';
import type { OrgNode } from '../../src/types';

const testTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'Chief Executive Officer', level: 'L1',
  children: [
    {
      id: 'm1', name: 'VP Sales', title: 'VP', level: 'L2', children: [
        { id: 'ic1', name: 'Alice', title: 'Rep', level: 'L5' },
        { id: 'ic2', name: 'Bob', title: 'Rep', level: 'L5' },
      ],
    },
    {
      id: 'm2', name: 'VP Eng', title: 'VP', level: 'L2', children: [
        { id: 'ic3', name: 'Charlie', title: 'Dev' },
      ],
    },
  ],
};

describe('AnalyticsEditor', () => {
  let container: HTMLDivElement;
  let store: OrgStore;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(structuredClone(testTree));
  });

  afterEach(() => {
    container.remove();
  });

  it('renders KPI strip with cards', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const strip = container.querySelector('.analytics-kpi-strip');
    expect(strip).not.toBeNull();
    const cards = container.querySelectorAll('.analytics-kpi-card');
    expect(cards.length).toBe(5);
  });

  it('renders KPI cards with correct accents', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const accents = Array.from(container.querySelectorAll('.analytics-kpi-card'))
      .map(c => c.getAttribute('data-accent'));
    expect(accents).toEqual(['teal', 'blue', 'green', 'amber', 'rose']);
  });

  it('renders headcount in KPI card', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('7');
  });

  it('renders manager and IC counts in text', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('Managers');
    expect(text).toContain('Individual Contributors');
    expect(text).toContain('Advisors');
  });

  it('renders detail grid with sections', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const grid = container.querySelector('.analytics-detail-grid');
    expect(grid).not.toBeNull();
    const sections = container.querySelectorAll('.analytics-detail-section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('renders span of control stats', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('Average');
    expect(text).toContain('Minimum');
    expect(text).toContain('Maximum');
    expect(text).toContain('Median');
  });

  it('renders org depth', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('layers');
  });

  it('renders level distribution', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('L1');
    expect(text).toContain('L2');
    expect(text).toContain('L5');
  });

  it('renders nodes without level note', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('1 without level');
  });

  it('shows focus mode banner with class', () => {
    new AnalyticsEditor({
      container,
      orgStore: store,
      getFocusedTree: () => testTree.children![0],
      getFocusedName: () => 'VP Sales',
    });
    const banner = container.querySelector('.analytics-focus-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('VP Sales');
  });

  it('refreshes on store change', () => {
    const editor = new AnalyticsEditor({ container, orgStore: store });
    const textBefore = container.textContent!;
    expect(textBefore).toContain('7');

    store.addChild('ic1', { name: 'Dana', title: 'Junior' });
    const textAfter = container.textContent!;
    expect(textAfter).toContain('8');
  });

  it('clickable alert triggers onNodeSelect', () => {
    const onNodeSelect = vi.fn();
    new AnalyticsEditor({ container, orgStore: store, onNodeSelect });

    const buttons = container.querySelectorAll<HTMLButtonElement>('.analytics-alert-name');
    const vpEngBtn = Array.from(buttons).find(b => b.textContent?.includes('VP Eng'));
    expect(vpEngBtn).toBeDefined();
    vpEngBtn!.click();
    expect(onNodeSelect).toHaveBeenCalledWith('m2');
  });

  it('destroy cleans up DOM and listeners', () => {
    const editor = new AnalyticsEditor({ container, orgStore: store });
    expect(container.children.length).toBeGreaterThan(0);

    editor.destroy();
    expect(container.innerHTML).toBe('');

    store.addChild('ic1', { name: 'Eve', title: 'IC' });
    expect(container.innerHTML).toBe('');
  });

  it('works with CategoryStore', () => {
    const categoryStore = new CategoryStore();
    const engineeringCat = categoryStore.add('Engineering', '#0000ff');

    const tree = structuredClone(testTree);
    tree.children![1].categoryId = engineeringCat.id;
    const catStore = new OrgStore(tree);

    new AnalyticsEditor({
      container,
      orgStore: catStore,
      categoryStore,
    });
    const text = container.textContent!;
    expect(text).toContain('Engineering');
  });

  it('works with LevelStore', () => {
    const levelStore = new LevelStore();
    levelStore.addMapping('L1', 'Executive');
    levelStore.addMapping('L2', 'Vice President');
    levelStore.setDisplayMode('mapped');

    new AnalyticsEditor({
      container,
      orgStore: store,
      levelStore,
    });
    const text = container.textContent!;
    expect(text).toContain('Executive');
    expect(text).toContain('Vice President');
  });

  it('shows no-levels message for tree without levels', () => {
    const noLevelTree: OrgNode = {
      id: 'r', name: 'Root', title: 'Boss',
      children: [{ id: 'c1', name: 'Child', title: 'IC' }],
    };
    const s = new OrgStore(noLevelTree);
    new AnalyticsEditor({ container, orgStore: s });
    expect(container.textContent).toContain('No levels assigned');
  });

  it('shows no-categories message when none in use', () => {
    new AnalyticsEditor({ container, orgStore: store });
    expect(container.textContent).toContain('No categories in use');
  });

  it('renders span health indicators', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const healthValues = container.querySelectorAll('.analytics-span-stat-value[data-health]');
    expect(healthValues.length).toBeGreaterThan(0);
  });

  it('renders layer bars', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const bars = container.querySelectorAll('.analytics-bar-row');
    expect(bars.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/editor/analytics-editor.test.ts`
Expected: FAIL — old tests pass, new tests fail because AnalyticsEditor still renders old DOM.

---

## Task 6: Redesign AnalyticsEditor (GREEN)

**Files:**
- Modify: `src/editor/analytics-editor.ts`

**Step 1: Rewrite AnalyticsEditor to use new CSS classes**

Complete rewrite of the class. Keep same constructor API (`AnalyticsEditorOptions`), same public methods (`refresh()`, `destroy()`), same subscription logic. Change all DOM rendering:

- Remove `buildHeader()` — no title heading in drawer
- Add focus banner using `.analytics-focus-banner` class
- New `buildKPIStrip()` — 5 horizontal KPI cards (headcount, depth, ratio, avg span, alerts)
- New `buildDetailGrid()` with 4 sections in 2×2 grid
- Span stats use `.analytics-span-stats` with `data-health` attributes
- Alert items use `.analytics-alert-item` with `.analytics-alert-name` buttons
- Layer bars use `.analytics-bar-row` structure  
- Level/category distribution use `.analytics-dist-row` structure
- Stagger animation delays via inline `animation-delay` on cards and sections

Remove all `*_STYLE` inline style constants. Use CSS classes exclusively.

Health calculation for `data-health`:
- "healthy": 5-8 (inclusive)
- "caution": 3-5 (exclusive of 5) or 8-10 (exclusive of 8)
- "danger": <3 or >10

Full implementation code is provided in the task spec.

**Step 2: Run analytics-editor tests**

Run: `npx vitest run tests/editor/analytics-editor.test.ts`
Expected: ALL PASS.

**Step 3: Run drawer tests too**

Run: `npx vitest run tests/ui/analytics-drawer.test.ts`
Expected: ALL PASS.

---

## Task 7: Rewire main.ts (and update related tests)

**Files:**
- Modify: `src/main.ts`

**Step 1: Update imports**

Replace:
```typescript
import { TabSwitcher } from './editor/tab-switcher';
```
with:
```typescript
import { AnalyticsDrawer } from './ui/analytics-drawer';
```

(Keep the `AnalyticsEditor` import unchanged.)

**Step 2: Remove TabSwitcher, mount ChartEditor to sidebar directly**

Replace lines 533-539:
```typescript
  // Charts — sidebar with tabs
  const sidebarTabSwitcher = new TabSwitcher(sidebar, [
    { id: 'org', label: t('tabs.org') },
    { id: 'analytics', label: t('tabs.analytics') },
  ]);
  const orgTabContent = sidebarTabSwitcher.getContentContainer('org')!;
  const analyticsTabContent = sidebarTabSwitcher.getContentContainer('analytics')!;
```
with:
```typescript
  // Analytics bottom drawer (overlays chart-area)
  const analyticsDrawer = new AnalyticsDrawer(chartArea);
```

**Step 3: Update ChartEditor container**

Change line 572 from `container: orgTabContent` to `container: sidebar`:
```typescript
  const chartEditor = new ChartEditor({
    container: sidebar,
    // ... rest unchanged
  });
```

**Step 4: Update AnalyticsEditor container**

Change line 628 from `container: analyticsTabContent` to `container: analyticsDrawer.getContentContainer()`:
```typescript
  const analyticsEditor = new AnalyticsEditor({
    container: analyticsDrawer.getContentContainer(),
    // ... rest unchanged
  });
```

**Step 5: Add analytics toggle button**

After the `analyticsEditor` creation (around line 649) and before the sidebar collapse toggle (line 651), add:

```typescript
  // Analytics toggle button in toolbar
  const analyticsToggleBtn = document.createElement('button');
  analyticsToggleBtn.className = 'analytics-toggle-btn';
  analyticsToggleBtn.setAttribute('aria-label', t('analytics.drawer_toggle_tooltip'));
  analyticsToggleBtn.setAttribute('data-tooltip', t('analytics.drawer_toggle_tooltip'));
  const toggleIcon = document.createElement('span');
  toggleIcon.setAttribute('aria-hidden', 'true');
  toggleIcon.textContent = '📊';
  analyticsToggleBtn.appendChild(toggleIcon);
  analyticsToggleBtn.appendChild(document.createTextNode(' ' + t('analytics.drawer_toggle')));
  headerRight.appendChild(analyticsToggleBtn);

  analyticsToggleBtn.addEventListener('click', () => {
    analyticsDrawer.toggle();
  });

  analyticsDrawer.onChange(() => {
    analyticsToggleBtn.classList.toggle('active', analyticsDrawer.isOpen());
  });
```

**Step 6: Add Ctrl+Shift+A shortcut**

After the `registerShortcuts` block (around line 919-925), add:

```typescript
  // Analytics drawer keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      analyticsDrawer.toggle();
    }
  });
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 8: Run full test suite

**Step 1: Run all tests**

Run: `npm run test`
Expected: ALL 2,418+ tests pass. No regressions.

**Step 2: If any tests fail, fix them**

Common issues:
- Tests importing TabSwitcher for sidebar may need updating
- Tests checking for `tabs.org` or `tabs.analytics` i18n keys (check if any beyond `tab-switcher.test.ts`)
- The tab-switcher test file itself should still pass since TabSwitcher class is unchanged

---

## Task 9: Commit

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "feat: replace sidebar analytics tab with bottom drawer

- New AnalyticsDrawer component with slide-up animation
- Horizontal KPI strip with 5 color-coded metric cards
- 2-column detail grid (span alerts, layer bars, levels, categories)
- Analytics toggle button in header toolbar
- Ctrl+Shift+A keyboard shortcut
- Sidebar reverted to direct ChartEditor mount (no more TabSwitcher)
- Clickable manager alerts, benchmark color coding

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
