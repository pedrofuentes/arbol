# Testing Strategy

> Extended testing context for AI agents. Referenced from AGENTS.md.
> **The TDD mandate (tests before implementation) is enforced in AGENTS.md and verified by Sentinel.**
> This document covers the details of HOW to test.

---

## Test Types

| Type | Purpose | Location | Runner |
|------|---------|----------|--------|
| Unit | Core logic, pure functions, store methods, utility functions | `tests/` mirroring `src/` structure | Vitest |
| Integration | Cross-component interactions, DOM manipulation, store+renderer | `tests/` mirroring `src/` structure | Vitest + jsdom |

No E2E tests currently. All tests run in jsdom environment.

## Coverage Requirements

- **New code**: 80% diff coverage required (lines added/modified in the PR)
- **Project-wide coverage**: must never decrease from the previous merge baseline
- **Critical paths**: High coverage expected for OrgStore mutations, ChartStore persistence, tree utilities (aim for 90%+)
- **Run coverage**: `npm test -- --coverage`
- **Sentinel verifies coverage thresholds on every PR**

## Test-Only PRs

PRs that only add tests to existing (untested) code use commit type `test(scope)` and are exempt from test-first choreography ordering (there is no `feat`/`fix` to follow). Sentinel verifies the tests are meaningful and pass.

## Test Structure

Tests live in `tests/` mirroring `src/` structure exactly:
- `src/store/org-store.ts` → `tests/store/org-store.test.ts`
- `src/ui/context-menu.ts` → `tests/ui/context-menu.test.ts`
- `src/utils/tree.ts` → `tests/utils/tree.test.ts`

## Test Setup

### Map-backed localStorage (`tests/setup.ts`)

Node.js v22+ has broken native localStorage. All tests use `tests/setup.ts` which provides a Map-backed localStorage implementation.

**Critical**: `vi.spyOn(localStorage, ...)` must go in `beforeAll()`, not at module top-level.

### IndexedDB (`fake-indexeddb`)

Tests that involve `ChartStore` or `ChartDB` use the `fake-indexeddb` package. ChartStore is async — always `await init()` before interacting. Seed localStorage before `init()` when testing migration.

### Test Factories (`tests/helpers/factories.ts`)

Shared test factories for common tree structures:
- `makeTree()` — basic tree
- `makeChart()` — ChartRecord with defaults
- `makeCategories()` — ColorCategory array
- `makeM1Tree()` — tree where root is an M1 (all children are leaves)
- `makeAdvisorTree()` — tree with advisor nodes
- `makeDeepTree()` — deeply nested tree
- `makeWideTree()` — tree with many children

### DOM Helpers (`tests/helpers/dom.ts`)

Shared DOM container setup/teardown for tests that need a DOM environment.

## Testing Patterns

### Mocking

Use Vitest's built-in mocking. Dependency injection is preferred over module mocking.

```typescript
// Example: Testing OrgStore with spy on onChange
describe('OrgStore', () => {
  it('should emit change event when adding a child', () => {
    const store = new OrgStore(makeTree());
    const listener = vi.fn();
    store.onChange(listener);

    store.addChild(store.getTree().id, { name: 'New', title: 'IC' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

```typescript
// Example: Testing UI component with jsdom
describe('ContextMenu', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should show edit option for non-root node', () => {
    const menu = new ContextMenu(container);
    menu.show(node, { x: 100, y: 100 });

    const editItem = container.querySelector('[data-action="edit"]');
    expect(editItem).not.toBeNull();
    expect(editItem?.textContent).toBe(t('menu.edit'));
  });
});
```

### Test Naming Convention

```typescript
describe('ModuleName', () => {
  it('should expected behavior when condition', () => {
    // Arrange → Act → Assert
  });
});
```

### What Must Be Tested
- All public API functions on stores (OrgStore, ChartStore, SettingsStore, etc.)
- Error paths and edge cases (not just happy paths)
- State transitions (undo/redo, chart switching, focus mode)
- Input validation and boundary conditions (max 500 chars, max 10,000 nodes)
- i18n string rendering (`t()` / `tp()` calls produce expected output)
- Context menu styling (uses `setAttribute('style', ...)` for CSS variables to work in jsdom)

### What Should NOT Be Tested
- D3.js internals (trust the library)
- Vite bundler behavior
- Browser-native IndexedDB behavior (test through fake-indexeddb)
- Implementation details (test behavior, not structure)

## Gotchas

1. **Context menu styling**: Uses `setAttribute('style', ...)` (not `style.cssText`) for CSS variables to work in jsdom tests.
2. **IC detection**: A manager is M1 if ALL children are leaf nodes. Adding a grandchild converts the parent from M1 to regular manager — test both states.
3. **IndexedDB async**: ChartStore is async — always `await init()`. Seed localStorage before `init()` when testing migration.
4. **localStorage spying**: Must go in `beforeAll()`, not module top-level.

## CI Integration

- Tests run automatically on every PR via GitHub Actions
- All tests must pass before Sentinel review begins
- Flaky tests must be fixed immediately, not skipped
- Current test count: 2,798 tests across 112 files
