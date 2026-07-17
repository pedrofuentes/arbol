<!-- The chart-canvas areas in these mocks are illustrative stand-ins. The production chart rendering, style presets, and layout engine are final as-is (owner decision, 2026-07-16). -->

# Future design directions

## Context

A full UX review on 2026-07-16 explored two directions for Arbol. Direction A, **Refined Arbol**, evolved the existing product and was implemented through milestones M1–M9. Direction B, **Arbol Studio**, proposed a more fundamental overhaul. It was not selected for implementation, but its strongest ideas are preserved here as future inspiration.

The chart-canvas areas in both interactive mocks are illustrative stand-ins. The production chart rendering, style presets, and layout engine are final as-is (owner decision, 2026-07-16).

## Direction B: Arbol Studio

Arbol Studio treated organization design as a focused working environment rather than a collection of separate management screens. Four signature ideas defined the direction:

- **Version timeline** — a horizontal, milestone-first path through saved versions. This made time and change legible at a glance and turned version navigation into a primary part of the workspace instead of a secondary list.
- **Command-first chrome** — the command palette became the primary surface for navigation and actions. This reduced persistent chrome, rewarded keyboard use, and gave infrequent commands one consistent home.
- **Compare as a mode** — comparison became a first-class view mode rather than a dialog-driven task. Unchanged people were dimmed so meaningful deltas carried the visual weight, supporting fast review of organizational change.
- **Icon rail navigation** — a compact left rail replaced header clutter. Stable destinations stayed visible while the top of the workspace remained available for chart context, version state, and mode-specific actions.

## Ideas carried into Refined Arbol

Direction A remained an evolution of the existing product, but Direction B influenced several shipped details:

- Consumer version vocabulary: **Version history**, **Current chart**, **Save a version**, and **Preview**
- Delta chips that summarize added, removed, moved, and modified people
- Always-visible version actions in the app chrome
- Search within the six-group settings modal

## Artifacts

The external artifacts are private and may require access to the original review workspace:

- [Full UX review report](https://claude.ai/code/artifact/f39ac6bc-8483-4852-aad5-63c4cc1683be)
- [Direction A: Refined Arbol](https://claude.ai/code/artifact/4a56c195-fb93-46e5-8c8a-b55ab2969b58)
- [Direction B: Arbol Studio](https://claude.ai/code/artifact/255f85d5-8b5b-4415-a159-5e26c6a18bd0)

Local interactive copies are preserved in [`mocks/direction-a.html`](mocks/direction-a.html) and [`mocks/direction-b.html`](mocks/direction-b.html).
