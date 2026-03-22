import { describe, it, expect } from 'vitest';
import { DEFAULT_RENDERER_OPTIONS } from '../../src/constants/defaults';

describe('DEFAULT_RENDERER_OPTIONS', () => {
  // ── Structural checks ──────────────────────────────────────────────

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(DEFAULT_RENDERER_OPTIONS)).toBe(true);
  });

  it('has no undefined values', () => {
    for (const [key, value] of Object.entries(DEFAULT_RENDERER_OPTIONS)) {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    }
  });

  // ── Card dimensions ────────────────────────────────────────────────

  it('has card dimension defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.nodeWidth).toBe(160);
    expect(DEFAULT_RENDERER_OPTIONS.nodeHeight).toBe(34);
  });

  // ── Tree layout spacing ────────────────────────────────────────────

  it('has tree layout spacing defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.horizontalSpacing).toBe(50);
    expect(DEFAULT_RENDERER_OPTIONS.branchSpacing).toBe(20);
    expect(DEFAULT_RENDERER_OPTIONS.topVerticalSpacing).toBe(10);
    expect(DEFAULT_RENDERER_OPTIONS.bottomVerticalSpacing).toBe(20);
  });

  // ── IC options ─────────────────────────────────────────────────────

  it('has IC (individual contributor) defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.icNodeWidth).toBe(141);
    expect(DEFAULT_RENDERER_OPTIONS.icGap).toBe(6);
    expect(DEFAULT_RENDERER_OPTIONS.icContainerPadding).toBe(10);
    expect(DEFAULT_RENDERER_OPTIONS.icContainerFill).toBe('#e5e7eb');
    expect(DEFAULT_RENDERER_OPTIONS.icContainerBorderRadius).toBe(0);
  });

  // ── Advisor options ────────────────────────────────────────────────

  it('has advisor (pal) spacing defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.palTopGap).toBe(12);
    expect(DEFAULT_RENDERER_OPTIONS.palBottomGap).toBe(12);
    expect(DEFAULT_RENDERER_OPTIONS.palRowGap).toBe(6);
    expect(DEFAULT_RENDERER_OPTIONS.palCenterGap).toBe(70);
  });

  // ── Typography ─────────────────────────────────────────────────────

  it('has typography defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.nameFontSize).toBe(11);
    expect(DEFAULT_RENDERER_OPTIONS.titleFontSize).toBe(9);
    expect(DEFAULT_RENDERER_OPTIONS.fontFamily).toBe('Calibri');
    expect(DEFAULT_RENDERER_OPTIONS.textPaddingTop).toBe(6);
    expect(DEFAULT_RENDERER_OPTIONS.textGap).toBe(2);
    expect(DEFAULT_RENDERER_OPTIONS.textAlign).toBe('center');
    expect(DEFAULT_RENDERER_OPTIONS.textPaddingHorizontal).toBe(8);
    expect(DEFAULT_RENDERER_OPTIONS.nameColor).toBe('#1e293b');
    expect(DEFAULT_RENDERER_OPTIONS.titleColor).toBe('#64748b');
  });

  // ── Link style ─────────────────────────────────────────────────────

  it('has link style defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.linkColor).toBe('#94a3b8');
    expect(DEFAULT_RENDERER_OPTIONS.linkWidth).toBe(1.5);
    expect(DEFAULT_RENDERER_OPTIONS.dottedLineDash).toBe('6,4');
  });

  // ── Card style ─────────────────────────────────────────────────────

  it('has card style defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.cardFill).toBe('#ffffff');
    expect(DEFAULT_RENDERER_OPTIONS.cardStroke).toBe('#22c55e');
    expect(DEFAULT_RENDERER_OPTIONS.cardStrokeWidth).toBe(1);
    expect(DEFAULT_RENDERER_OPTIONS.cardBorderRadius).toBe(0);
  });

  // ── Headcount badge ────────────────────────────────────────────────

  it('has headcount badge defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.showHeadcount).toBe(false);
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgeColor).toBe('#9ca3af');
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgeTextColor).toBe('#1e293b');
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgeFontSize).toBe(11);
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgeRadius).toBe(4);
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgePadding).toBe(8);
    expect(DEFAULT_RENDERER_OPTIONS.headcountBadgeHeight).toBe(22);
  });

  // ── Level badge ────────────────────────────────────────────────────

  it('has level badge defaults', () => {
    expect(DEFAULT_RENDERER_OPTIONS.showLevel).toBe(false);
    expect(DEFAULT_RENDERER_OPTIONS.levelBadgeColor).toBe('#6366f1');
    expect(DEFAULT_RENDERER_OPTIONS.levelBadgeTextColor).toBe('#ffffff');
    expect(DEFAULT_RENDERER_OPTIONS.levelBadgeFontSize).toBe(11);
    expect(DEFAULT_RENDERER_OPTIONS.levelBadgeSize).toBe(22);
  });

  // ── Legend ─────────────────────────────────────────────────────────

  it('has legend default', () => {
    expect(DEFAULT_RENDERER_OPTIONS.legendRows).toBe(0);
  });

  // ── Completeness ───────────────────────────────────────────────────

  it('contains all PersistableSettings keys', () => {
    const expectedKeys = [
      'nodeWidth', 'nodeHeight', 'horizontalSpacing',
      'branchSpacing', 'topVerticalSpacing', 'bottomVerticalSpacing',
      'icNodeWidth', 'icGap', 'icContainerPadding',
      'palTopGap', 'palBottomGap', 'palRowGap', 'palCenterGap',
      'nameFontSize', 'titleFontSize', 'textPaddingTop', 'textGap',
      'textAlign', 'textPaddingHorizontal', 'fontFamily',
      'nameColor', 'titleColor',
      'linkColor', 'linkWidth', 'dottedLineDash',
      'cardFill', 'cardStroke', 'cardStrokeWidth', 'cardBorderRadius',
      'icContainerFill', 'icContainerBorderRadius',
      'showHeadcount', 'headcountBadgeColor', 'headcountBadgeTextColor',
      'headcountBadgeFontSize', 'headcountBadgeRadius',
      'headcountBadgePadding', 'headcountBadgeHeight',
      'showLevel', 'levelBadgeColor', 'levelBadgeTextColor',
      'levelBadgeFontSize', 'levelBadgeSize',
      'legendRows',
    ];

    for (const key of expectedKeys) {
      expect(DEFAULT_RENDERER_OPTIONS).toHaveProperty(key);
    }
  });

  // ── Immutability ───────────────────────────────────────────────────

  it('prevents property assignment', () => {
    expect(() => {
      (DEFAULT_RENDERER_OPTIONS as Record<string, unknown>).nodeWidth = 999;
    }).toThrow();
  });
});
