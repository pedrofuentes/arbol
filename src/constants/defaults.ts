import type { PersistableSettings } from '../store/settings-store';

/**
 * Single source of truth for all default renderer/settings values.
 *
 * Consumed by main.ts, ChartRenderer, and pptx-exporter so the same
 * defaults are never duplicated across files.
 */
export const DEFAULT_RENDERER_OPTIONS: Readonly<PersistableSettings> = Object.freeze({
  // Card dimensions
  nodeWidth: 160,
  nodeHeight: 34,

  // Tree layout spacing
  horizontalSpacing: 50,
  branchSpacing: 20,
  topVerticalSpacing: 10,
  bottomVerticalSpacing: 20,

  // IC (Individual Contributor) options
  icNodeWidth: 141,
  icGap: 6,
  icContainerPadding: 10,
  icContainerFill: '#e5e7eb',
  icContainerBorderRadius: 0,

  // Advisor options
  palTopGap: 12,
  palBottomGap: 12,
  palRowGap: 6,
  palCenterGap: 70,

  // Typography
  nameFontSize: 11,
  titleFontSize: 9,
  fontFamily: 'Calibri',
  textPaddingTop: 6,
  textGap: 2,
  textAlign: 'center',
  textPaddingHorizontal: 8,
  nameColor: '#1e293b',
  titleColor: '#64748b',

  // Link style
  linkColor: '#94a3b8',
  linkWidth: 1.5,
  dottedLineDash: '6,4',

  // Card style
  cardFill: '#ffffff',
  cardStroke: '#22c55e',
  cardStrokeWidth: 1,
  cardBorderRadius: 0,

  // Headcount badge
  showHeadcount: false,
  headcountBadgeColor: '#9ca3af',
  headcountBadgeTextColor: '#1e293b',
  headcountBadgeFontSize: 11,
  headcountBadgeRadius: 4,
  headcountBadgePadding: 8,
  headcountBadgeHeight: 22,

  // Level badge
  showLevel: false,
  levelBadgeColor: '#6366f1',
  levelBadgeTextColor: '#ffffff',
  levelBadgeFontSize: 11,
  levelBadgeSize: 22,

  // Legend
  legendRows: 0,
});
