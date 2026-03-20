# Analytics Help — Design Document

## Problem

Analytics metrics (Manager-to-IC Ratio, Span of Control, etc.) are not self-explanatory. Users need contextual help to understand what each metric measures and why it matters.

## Solution

Two complementary help surfaces:

### 1. Help Dialog Section

A new **"Analytics"** accordion section in the existing help dialog (`src/ui/help-dialog.ts`), placed after "Headcount Badges". Contains 5 bullet items — one per KPI metric — using the existing `strong` label + description pattern.

**Content per metric:**

- **Headcount Overview:** Total people in the org, broken down by role type (Managers, ICs, Advisors). Useful for understanding org composition at a glance.
- **Org Depth:** The maximum number of layers from root to the deepest leaf. Deeper orgs have more management layers; flatter orgs have fewer. Average leaf depth shows where most people sit.
- **Manager-to-IC Ratio:** The ratio of managers to individual contributors (non-managers). Shown as "1 : X" — higher X means leaner management. Useful for benchmarking overhead.
- **Span of Control:** The average number of direct reports per manager, with min/max range. Wide spans (>10) may signal overload; narrow spans (<3) may signal unnecessary layers.
- **Alerts:** Flags structural anomalies — managers with too many reports (wide span), too few (narrow span), or exactly one (single-child, possible redundant layer).

### 2. Inline ℹ️ Tooltips on KPI Cards

Each KPI card in the analytics drawer gets a small `ℹ️` icon next to its label.

**Behavior:**
- Native `title` attribute tooltip on hover (no custom tooltip component)
- `role="img"` + `aria-label` with the full tooltip text for screen readers
- Muted styling (reduced opacity, small font) so it doesn't compete with metrics

**Tooltip text (shorter than help dialog):**
- Headcount: "Total people, split by managers, ICs, and advisors"
- Org Depth: "Maximum layers from top to bottom of the org"
- Ratio: "Managers divided by individual contributors — higher means leaner"
- Span: "Average direct reports per manager"
- Alerts: "Structural anomalies like overloaded or redundant managers"

## i18n Keys

All new text goes through `t()`. New keys in `src/i18n/en.ts`:

```
help.analytics.title
help.analytics.headcount_label / help.analytics.headcount_desc
help.analytics.depth_label / help.analytics.depth_desc
help.analytics.ratio_label / help.analytics.ratio_desc
help.analytics.span_label / help.analytics.span_desc
help.analytics.alerts_label / help.analytics.alerts_desc

analytics.tooltip.headcount
analytics.tooltip.org_depth
analytics.tooltip.ratio
analytics.tooltip.span
analytics.tooltip.alerts
```

## Files Changed

1. `src/i18n/en.ts` — Add ~16 new keys
2. `src/ui/help-dialog.ts` — Add analytics section to `getHelpSections()`
3. `src/editor/analytics-editor.ts` — Add ℹ️ icon + title to each KPI card label
4. `tests/ui/help-dialog.test.ts` — Test new section renders
5. `tests/editor/analytics-editor.test.ts` — Test tooltips present on KPI cards
