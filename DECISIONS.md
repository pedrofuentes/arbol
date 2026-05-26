# Architecture Decision Records — Arbol

> **Record every significant technical decision here.** When choosing between approaches,
> document what was chosen and why. This prevents future agents and developers from
> re-debating settled decisions or accidentally reversing them.
>
> Do NOT write decisions to AGENTS.md — they belong here.

## Format

```markdown
### ADR-NNN: Decision Title
**Date**: YYYY-MM-DD
**Status**: Proposed / Accepted / Superseded by ADR-NNN
**Context**: What problem or question prompted this decision?
**Decision**: What was decided?
**Alternatives considered**: What other options were evaluated?
**Consequences**: What are the trade-offs? What does this enable or prevent?
```

## Decisions

<!-- Add new decisions below this line, most recent first -->

### ADR-008: uuid@14 override is safe for exceljs@4.4.0
**Date**: 2026-05-25
**Status**: Accepted
**Context**: PR #89 added `"overrides": { "uuid": ">=11.1.1" }` to fix CVE-2024-22025 in transitive uuid@8 (via exceljs). Need to verify exceljs still works with uuid@14.
**Decision**: Override is safe. exceljs uses uuid **only** in `lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js` for generating conditional formatting rule IDs. The call is `v4()` with no arguments — the stable public API that is backward-compatible across all uuid major versions. The CVE's vulnerable code path (passing a `buf` argument to v3/v5/v6) is never triggered by exceljs.
**Alternatives considered**: (1) Pin uuid to ^8.3.2 (patched within v8) — no such patch exists; v8 is unmaintained. (2) Remove exceljs entirely — it's used for .xlsx import (`import-editor.ts`). (3) Fork exceljs to remove uuid dependency — excessive maintenance burden.
**Consequences**: Users can import .xlsx files with conditional formatting without issues. The override resolves the CVE audit finding while maintaining full exceljs compatibility.

### ADR-007: Atomic backup restore with rollback
**Date**: 2026-05-05
**Status**: Accepted
**Context**: `restoreFullReplace()` deleted all existing charts before writing backup data. A failure mid-write left the app in an empty/partial state with no recovery path.
**Decision**: Validate all backup data upfront, snapshot existing data, then delete+write. If writing fails, roll back by re-inserting the snapshot.
**Alternatives considered**: (1) Two-phase IndexedDB transaction — not feasible with the current `ChartDB` abstraction. (2) Write-then-swap with temporary stores — adds complexity for marginal benefit.
**Consequences**: Slightly higher memory usage during restore (holds both old and new data). Eliminates guaranteed data loss by giving failed restores a recovery path instead of certain destruction. Rollback is still best-effort (if rollback itself fails, data may still be lost — but this is the same as the original situation and strictly better than guaranteed loss).

### ADR-005: agents-template v0.3.0 adoption
**Date**: 2026-05-05
**Status**: Accepted
**Context**: The project had a single monolithic AGENTS.md (367 lines) with all agent instructions, architecture details, and workflow guidance inline. This made it hard to maintain and exceeded recommended compressed size.
**Decision**: Adopt `agents-template v0.3.0` two-tier system — compressed AGENTS.md with companion docs (SENTINEL.md, ARCHITECTURE.md, TESTING-STRATEGY.md, DEVELOPMENT-WORKFLOW.md) plus structured logging (LEARNINGS.md, DECISIONS.md).
**Alternatives considered**: Keep the monolithic AGENTS.md; manually restructure without a template.
**Consequences**: Agents now have a consistent structure. Sentinel quality gate adds review overhead but catches more issues. Common Pitfalls migrated to LEARNINGS.md for discoverability.

### ADR-004: Unidirectional data flow without a framework
**Date**: Pre-2026 (documented retroactively)
**Status**: Accepted
**Context**: The app needs predictable state management for tree operations with undo/redo support.
**Decision**: OrgStore holds the single source of truth. All mutations go through OrgStore methods which call `snapshot()` then `emit()`. The renderer listens for changes and re-draws.
**Alternatives considered**: Redux, MobX, Zustand — all add framework weight for a pattern we can implement simply.
**Consequences**: Simple and predictable. No framework lock-in. Undo/redo is straightforward with snapshot arrays.

### ADR-003: IndexedDB for chart storage
**Date**: Pre-2026 (documented retroactively)
**Status**: Accepted
**Context**: localStorage has a ~5MB limit which is insufficient for multiple large org charts with version history.
**Decision**: Use IndexedDB (via `ChartDB` wrapper) for charts and versions. Keep settings, theme, and CSV mapping presets in localStorage.
**Alternatives considered**: All-localStorage (too small), server-side storage (adds backend complexity).
**Consequences**: Supports larger datasets. Requires async APIs (`await init()`). Tests need `fake-indexeddb`.

### ADR-002: D3.js for tree rendering
**Date**: Pre-2026 (documented retroactively)
**Status**: Accepted
**Context**: Need a tree layout algorithm with full control over SVG rendering for custom node types (M1s, ICs, Advisors).
**Decision**: D3.js tree layout for positioning, custom SVG rendering for cards and connectors.
**Alternatives considered**: GoJS (commercial), vis.js (less tree-specific), custom layout from scratch (too complex).
**Consequences**: D3 owns the SVG — no UI framework can touch it. Custom layout logic in `layout-engine.ts` overrides D3's defaults for advisor/IC handling.

### ADR-001: Vanilla TypeScript — no UI frameworks
**Date**: Pre-2026 (documented retroactively)
**Status**: Accepted
**Context**: D3.js manages the SVG DOM. Adding React/Vue creates ownership conflicts where both the framework and D3 try to manage the same DOM elements.
**Decision**: Vanilla TypeScript for all non-SVG UI (sidebar, dialogs, menus). D3 owns the SVG exclusively.
**Alternatives considered**: React with refs for D3 integration, Svelte.
**Consequences**: No virtual DOM overhead. Full control over DOM manipulation. Requires manual DOM helpers for UI components (`createElement`, `appendChild`, `textContent`). Every UI component is a class or function that returns/manipulates DOM elements directly.
