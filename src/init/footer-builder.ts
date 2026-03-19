import { t } from '../i18n';
import { flattenTree, isLeaf, countLeaves, countManagersByLevel } from '../utils/tree';
import { exportToPptx } from '../export/pptx-exporter';
import { timestampedFilename } from '../utils/filename';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showExportDialog } from '../ui/export-dialog';
import { showToast } from '../ui/toast';
import { APP_VERSION } from '../version';
import type { ExportFormat } from '../ui/export-dialog';
import type { OrgStore } from '../store/org-store';
import type { ChartRenderer } from '../renderer/chart-renderer';
import type { CategoryStore } from '../store/category-store';
import type { ChartStore } from '../store/chart-store';
import type { FocusModeController } from '../controllers/focus-mode';
import type { SelectionManager } from '../controllers/selection-manager';
import type { SideBySideRenderer } from '../renderer/side-by-side-renderer';

export interface FooterDeps {
  store: OrgStore;
  renderer: ChartRenderer;
  categoryStore: CategoryStore;
  chartStore: ChartStore;
  focusMode: FocusModeController;
  selection: SelectionManager;
  footer: HTMLElement;
  getChartName: () => string;
  getSideBySideRenderer: () => SideBySideRenderer | null;
}

export interface FooterElements {
  exportCurrentChart: () => Promise<void>;
  updateStatus: () => void;
  updateSelectionIndicator: () => void;
  notifySettingsSaved: () => void;
}

export function buildFooter(deps: FooterDeps): FooterElements {
  const { store, renderer, categoryStore, chartStore, focusMode, selection, footer, getChartName, getSideBySideRenderer } = deps;

  // Footer: Status area (left side)
  const footerLeft = document.createElement('div');
  footerLeft.className = 'footer-left';
  footerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:auto;';
  footer.appendChild(footerLeft);

  const versionLabel = document.createElement('span');
  versionLabel.className = 'footer-version';
  versionLabel.id = 'footer-version';
  versionLabel.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionLabel.textContent = t('footer.version', { version: APP_VERSION });
  footerLeft.appendChild(versionLabel);

  const versionSeparator = document.createElement('span');
  versionSeparator.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionSeparator.textContent = t('footer.separator').trim();
  footerLeft.appendChild(versionSeparator);

  const statusText = document.createElement('span');
  statusText.className = 'footer-status';
  statusText.id = 'footer-status';
  statusText.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  footerLeft.appendChild(statusText);

  // Save indicator — flashes briefly when settings are persisted
  const saveIndicator = document.createElement('span');
  saveIndicator.style.cssText =
    'font-size:10px;color:var(--accent);font-family:var(--font-sans);font-weight:600;' +
    'opacity:0;transition:opacity 200ms ease;';
  saveIndicator.textContent = t('footer.saved');
  footerLeft.appendChild(saveIndicator);

  let saveFlashTimer: ReturnType<typeof setTimeout> | null = null;
  const notifySettingsSaved = () => {
    saveIndicator.style.opacity = '1';
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => {
      saveIndicator.style.opacity = '0';
    }, 1500);
  };

  const updateStatus = () => {
    const tree = focusMode.getVisibleTree();
    const allNodes = flattenTree(tree);
    const total = allNodes.length;
    const managerCount = allNodes.filter((n) => !isLeaf(n)).length;
    const icCount = countLeaves(tree);
    const levels = countManagersByLevel(tree);

    statusText.textContent = '';

    const activeChartName = getChartName();
    const prefix = activeChartName ? `${activeChartName} · ` : '';
    const segments: { text: string; title?: string }[] = [
      { text: `${prefix}${t('footer.people', { count: total })}` },
      { text: t('footer.managers', { count: managerCount }) },
      { text: t('footer.ics', { count: icCount }), title: t('footer.ics_tooltip') },
    ];
    const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
    for (const [depth, count] of sortedLevels) {
      segments.push({ text: t('footer.manager_level', { count, depth }) });
    }
    segments.forEach((seg, i) => {
      if (i > 0) statusText.appendChild(document.createTextNode(t('footer.separator')));
      const span = document.createElement('span');
      span.textContent = seg.text;
      if (seg.title) span.title = seg.title;
      statusText.appendChild(span);
    });
  };
  store.onChange(updateStatus);
  updateStatus();

  // Footer: Center area (GitHub links + selection indicator)
  const footerCenter = document.createElement('div');
  footerCenter.className = 'footer-center';
  footerCenter.style.cssText =
    'position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;font-size:11px;font-family:var(--font-sans);';

  const selectionIndicator = document.createElement('span');
  selectionIndicator.style.cssText = 'color:var(--accent);font-weight:600;display:none;';
  footerCenter.appendChild(selectionIndicator);

  const githubLink = document.createElement('a');
  githubLink.href = 'https://github.com/pedrofuentes/arbol';
  githubLink.target = '_blank';
  githubLink.rel = 'noopener noreferrer';
  githubLink.textContent = t('footer.built_with');
  footerCenter.appendChild(githubLink);

  const centerSeparator = document.createElement('span');
  centerSeparator.style.color = 'var(--text-tertiary)';
  centerSeparator.textContent = t('footer.separator').trim();
  footerCenter.appendChild(centerSeparator);

  const issuesLink = document.createElement('a');
  issuesLink.href = 'https://github.com/pedrofuentes/arbol/issues';
  issuesLink.target = '_blank';
  issuesLink.rel = 'noopener noreferrer';
  issuesLink.textContent = t('footer.report_bugs');
  footerCenter.appendChild(issuesLink);

  footer.appendChild(footerCenter);

  // Update selection indicator when multi-select changes
  const updateSelectionIndicator = () => {
    if (selection.hasSelection) {
      selectionIndicator.textContent = t('footer.selected', { count: selection.count });
      selectionIndicator.style.display = '';
      // Hide links when selection is active
      githubLink.style.display = 'none';
      centerSeparator.style.display = 'none';
      issuesLink.style.display = 'none';
    } else {
      selectionIndicator.style.display = 'none';
      githubLink.style.display = '';
      centerSeparator.style.display = '';
      issuesLink.style.display = '';
    }
  };

  // Zoom indicator (will be appended to footer right, after Reset button)
  const zoomIndicator = document.createElement('span');
  zoomIndicator.style.cssText =
    'font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);min-width:36px;text-align:end;';

  const zoomManager = renderer.getZoomManager();
  const updateZoomIndicator = () => {
    if (zoomManager) {
      const pct = zoomManager.getRelativeZoomPercent();
      zoomIndicator.textContent = `${pct}%`;
    }
  };
  zoomManager?.onZoom(() => {
    updateZoomIndicator();
  });
  updateZoomIndicator();

  // Footer: Buttons (right side)
  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'display:flex;align-items:center;gap:var(--space-2);';
  footer.appendChild(footerRight);

  const exportCurrentChart = async () => {
    const activeChart = await chartStore.getActiveChart();
    const chartName = activeChart?.name ?? 'org-chart';
    const safeChartName = chartName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').toLowerCase();
    const versions = activeChart ? await chartStore.getVersions(activeChart.id) : [];

    showExportDialog({
      chartName,
      versions,
      onExport: async (format: ExportFormat, selectedVersionIds: string[], pngScale?: number) => {
        try {
          if (format === 'pptx') {
            const layout = renderer.getLastLayout();
            if (!layout) return;

            const PX_TO_IN = 1 / 96;
            const MAX_SLIDE = 56;
            const chartW = layout.boundingBox.width * PX_TO_IN + 1;
            const chartH = layout.boundingBox.height * PX_TO_IN + 1;
            if (chartW > MAX_SLIDE || chartH > MAX_SLIDE) {
              const confirmed = await showConfirmDialog({
                title: t('dialog.large_export.title'),
                message: t('dialog.large_export.message'),
                confirmLabel: t('dialog.large_export.confirm'),
                danger: false,
              });
              if (!confirmed) return;
            }

            const rendererOpts = renderer.getOptions();
            const additionalLayouts: { layout: import('../renderer/layout-engine').LayoutResult; title: string }[] = [];
            if (selectedVersionIds.length > 0) {
              const { computeLayout } = await import('../renderer/layout-engine');
              for (const vId of selectedVersionIds) {
                const version = versions.find(v => v.id === vId);
                if (version?.tree) {
                  const vLayout = computeLayout(version.tree, rendererOpts);
                  additionalLayouts.push({ layout: vLayout, title: version.name });
                }
              }
            }
            await exportToPptx(layout, {
              fileName: timestampedFilename(`${safeChartName}.pptx`),
              categories: categoryStore.getAll(),
              nameFontSize: rendererOpts.nameFontSize,
              titleFontSize: rendererOpts.titleFontSize,
              cardFill: rendererOpts.cardFill,
              cardStroke: rendererOpts.cardStroke,
              cardStrokeWidth: rendererOpts.cardStrokeWidth,
              icContainerFill: rendererOpts.icContainerFill,
              linkColor: rendererOpts.linkColor,
              linkWidth: rendererOpts.linkWidth,
              nameColor: rendererOpts.nameColor,
              titleColor: rendererOpts.titleColor,
              showHeadcount: rendererOpts.showHeadcount,
              headcountBadgeColor: rendererOpts.headcountBadgeColor,
              headcountBadgeTextColor: rendererOpts.headcountBadgeTextColor,
              headcountBadgeFontSize: rendererOpts.headcountBadgeFontSize,
              headcountBadgeRadius: rendererOpts.headcountBadgeRadius,
              headcountBadgePadding: rendererOpts.headcountBadgePadding,
              headcountBadgeHeight: rendererOpts.headcountBadgeHeight,
              legendRows: rendererOpts.legendRows,
              textAlign: rendererOpts.textAlign as 'left' | 'center' | 'right',
              cardBorderRadius: rendererOpts.cardBorderRadius as number,
              fontFamily: rendererOpts.fontFamily as string,
              additionalLayouts,
            });
            showToast(t('footer.exported'), 'success');
          } else if (format === 'svg') {
            const { exportSvg } = await import('../export/svg-png-exporter');
            exportSvg({
              svgElement: renderer.getSvgElement(),
              fileName: timestampedFilename(`${safeChartName}.svg`),
            });
            showToast(t('export.exported_svg'), 'success');
          } else if (format === 'png') {
            const { exportPng } = await import('../export/svg-png-exporter');
            await exportPng({
              svgElement: renderer.getSvgElement(),
              fileName: timestampedFilename(`${safeChartName}.png`),
              scale: pngScale,
            });
            showToast(t('export.exported_png'), 'success');
          }
        } catch (e) {
          showToast(t('footer.export_failed', { error: e instanceof Error ? e.message : String(e) }), 'error');
        }
      },
      onCancel: () => {},
    });
  };

  const fitBtn = document.createElement('button');
  fitBtn.className = 'footer-btn';
  fitBtn.dataset.action = 'fit';
  const fitIcon = document.createElement('span');
  fitIcon.setAttribute('aria-hidden', 'true');
  fitIcon.textContent = t('footer.fit_icon');
  fitBtn.appendChild(fitIcon);
  fitBtn.appendChild(document.createTextNode(t('footer.fit_label')));
  fitBtn.setAttribute('aria-label', t('footer.fit_aria'));
  fitBtn.setAttribute('data-tooltip', t('footer.fit_tooltip'));
  footerRight.appendChild(fitBtn);

  fitBtn.addEventListener('click', () => {
    const sideBySideRenderer = getSideBySideRenderer();
    if (sideBySideRenderer) {
      sideBySideRenderer.fitToContent();
    } else {
      renderer.getZoomManager()?.fitToContent();
    }
  });

  const resetZoomBtn = document.createElement('button');
  resetZoomBtn.className = 'footer-btn';
  resetZoomBtn.dataset.action = 'reset-zoom';
  const resetIcon = document.createElement('span');
  resetIcon.setAttribute('aria-hidden', 'true');
  resetIcon.textContent = t('footer.reset_icon');
  resetZoomBtn.appendChild(resetIcon);
  resetZoomBtn.appendChild(document.createTextNode(t('footer.reset_label')));
  resetZoomBtn.setAttribute('aria-label', t('footer.reset_aria'));
  resetZoomBtn.setAttribute('data-tooltip', t('footer.reset_tooltip'));
  footerRight.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    const sideBySideRenderer = getSideBySideRenderer();
    if (sideBySideRenderer) {
      sideBySideRenderer.centerAtRealSize();
    } else {
      renderer.getZoomManager()?.centerAtRealSize();
    }
  });

  // Zoom level indicator (right side, after Reset)
  const zoomSeparator = document.createElement('span');
  zoomSeparator.style.cssText = 'width:1px;height:14px;background:var(--border-default);';
  footerRight.appendChild(zoomSeparator);
  footerRight.appendChild(zoomIndicator);

  return {
    exportCurrentChart,
    updateStatus,
    updateSelectionIndicator,
    notifySettingsSaved,
  };
}
