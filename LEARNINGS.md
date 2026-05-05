# Learnings — Arbol

> **This file is written by AI agents.** When you discover something about this project
> that isn't documented elsewhere, add it here. Do NOT write to AGENTS.md.
>
> Periodically, a human or agent should review this file and promote stable learnings
> into the appropriate companion doc (ARCHITECTURE.md, TESTING-STRATEGY.md, etc.).

## Format

```markdown
### [YYYY-MM-DD] Short description
**Context**: What were you doing when you discovered this?
**Learning**: What did you learn?
**Impact**: How should this affect future work?
```

## Learnings

<!-- Add new learnings below this line, most recent first -->

### [2026-05-05] Advisor rendering boundary calculations
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: Single Advisors go left-only. Boundary calculations must account for Advisor width to prevent sibling overlap. Advisor rendering is one of the most complex parts of the layout engine.
**Impact**: Always run spacing regression tests after touching Advisor code.

### [2026-05-05] D3 tree separation override
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: We override D3's `separation()` to return 1 for all nodes. Our `enforceSpacing` in `layout-engine.ts` handles gap logic — don't fight D3's layout.
**Impact**: Never modify D3's separation function. All spacing customization goes through `enforceSpacing`.

### [2026-05-05] localStorage persistence gotcha
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: Imported settings override defaults. If things look wrong after testing imports, clear `localStorage.removeItem('arbol-settings')`.
**Impact**: When debugging settings issues, always check if imported values are overriding defaults.

### [2026-05-05] IC detection is automatic
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: A manager is M1 if ALL children are leaf nodes. Adding a grandchild under an IC converts the parent from M1 to regular manager — this changes rendering completely (from IC stack to advisor layout).
**Impact**: Test both M1 and regular manager states when modifying tree structure.

### [2026-05-05] Settings editor wiring
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: `SettingsStore` must be passed to `SettingsEditor` for export/import to work. Check `main.ts` wiring if buttons silently fail.
**Impact**: When debugging silent failures in settings UI, check the wiring in `main.ts` first.

### [2026-05-05] Focus mode is rendering-only
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: `OrgStore` always holds the full tree. Never modify the store to implement focus — only change what is passed to `renderer.render()`.
**Impact**: NEVER modify OrgStore for focus mode. Only change the tree reference passed to render().

### [2026-05-05] Context menu styling in tests
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: Context menu uses `setAttribute('style', ...)` (not `style.cssText`) for CSS variables to work in jsdom tests.
**Impact**: When writing context menu tests, expect `setAttribute` usage for style application.

### [2026-05-05] IndexedDB in tests requires fake-indexeddb
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: Tests use `fake-indexeddb`. ChartStore is async — always `await init()` before interacting. Seed localStorage before `init()` when testing migration.
**Impact**: Never forget `await init()` in ChartStore tests. Seed localStorage first for migration tests.

### [2026-05-05] Test setup localStorage workaround
**Context**: Migrated from Common Pitfalls in original AGENTS.md.
**Learning**: Node.js v22+ has broken native localStorage. Tests use `tests/setup.ts` (Map-backed localStorage). `vi.spyOn(localStorage, ...)` must go in `beforeAll()`, not module top-level.
**Impact**: Always put localStorage spies in `beforeAll()`, never at module scope.
