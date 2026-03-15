import { t } from '../i18n';
import { compareTrees, buildMergedTree, getDiffStats } from '../utils/tree-diff';
import { showComparisonBanner, dismissComparisonBanner } from '../ui/comparison-banner';
import { showVersionPicker } from '../ui/version-picker';
import { dismissVersionViewer, isVersionViewerActive } from '../ui/version-viewer';
import { SideBySideRenderer } from '../renderer/side-by-side-renderer';
import type { OrgStore } from '../store/org-store';
import type { ChartRenderer } from '../renderer/chart-renderer';
import type { ChartStore } from '../store/chart-store';
import type { CategoryStore } from '../store/category-store';
import type { FocusModeController } from '../controllers/focus-mode';
import type { ComparisonState, VersionRecord } from '../types';

export interface ComparisonDeps {
  store: OrgStore;
  renderer: ChartRenderer;
  chartStore: ChartStore;
  categoryStore: CategoryStore;
  chartArea: HTMLElement;
  focusMode: FocusModeController;
  rerender: () => void;
}

export interface ComparisonHandler {
  enterComparisonMode: (baseVersion: VersionRecord) => Promise<void>;
  exitComparisonMode: () => void;
  isInComparisonMode: () => boolean;
  getSideBySideRenderer: () => SideBySideRenderer | null;
}

export function createComparisonHandler(deps: ComparisonDeps): ComparisonHandler {
  const { store, renderer, chartStore, categoryStore, chartArea, focusMode, rerender } = deps;

  let comparisonState: ComparisonState | null = null;
  let sideBySideRenderer: SideBySideRenderer | null = null;
  let dimUnchanged = true;

  const exitComparisonMode = () => {
    comparisonState = null;
    dimUnchanged = true;
    renderer.setDiffMap(null);
    dismissComparisonBanner();
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }
    // Show main SVG again if it was hidden
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.removeAttribute('style');
    rerender();
    renderer.getZoomManager()?.fitToContent();
  };

  const showMergedView = (state: ComparisonState) => {
    // Tear down side-by-side if active
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }
    // Show main SVG
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.removeAttribute('style');

    const merged = buildMergedTree(state.oldTree, state.newTree, state.diff);
    renderer.setDiffMap(state.diff);
    renderer.updateOptions({ categories: categoryStore.getAll() });
    renderer.render(merged);
    renderer.getZoomManager()?.fitToContent();
  };

  const showSideBySideView = (state: ComparisonState) => {
    // Hide main SVG
    const svgEl = chartArea.querySelector('svg');
    if (svgEl) svgEl.setAttribute('style', 'display:none');

    // Tear down previous side-by-side if any
    if (sideBySideRenderer) {
      sideBySideRenderer.destroy();
      sideBySideRenderer = null;
    }

    sideBySideRenderer = new SideBySideRenderer({
      container: chartArea,
      rendererOptions: { ...renderer.getOptions(), container: chartArea },
      oldLabel: state.oldLabel,
      newLabel: state.newLabel,
    });
    sideBySideRenderer.setDimUnchanged(dimUnchanged);
    sideBySideRenderer.render(state.oldTree, state.newTree, state.diff);
  };

  const handleToggleDim = (enabled: boolean) => {
    dimUnchanged = enabled;
    renderer.setDimUnchanged(enabled);
    if (!comparisonState) return;

    if (comparisonState.viewMode === 'merged') {
      showMergedView(comparisonState);
    } else {
      showSideBySideView(comparisonState);
    }
  };

  const toggleComparisonView = () => {
    if (!comparisonState) return;

    const newMode = comparisonState.viewMode === 'merged' ? 'side-by-side' : 'merged';
    comparisonState.viewMode = newMode;

    if (newMode === 'merged') {
      showMergedView(comparisonState);
    } else {
      showSideBySideView(comparisonState);
    }

    // Re-show banner with updated mode
    const stats = getDiffStats(comparisonState.diff);
    dismissComparisonBanner();
    showComparisonBanner({
      container: chartArea,
      oldLabel: comparisonState.oldLabel,
      newLabel: comparisonState.newLabel,
      stats,
      viewMode: newMode,
      dimUnchanged,
      onToggleView: toggleComparisonView,
      onToggleDimUnchanged: handleToggleDim,
      onExit: exitComparisonMode,
    });
  };

  const enterComparisonMode = async (baseVersion: VersionRecord) => {
    // Exit any active modes first
    if (focusMode?.isFocused) { focusMode.clear(); }
    if (isVersionViewerActive()) { dismissVersionViewer(); }
    if (comparisonState) {
      renderer.setDiffMap(null);
      dismissComparisonBanner();
      if (sideBySideRenderer) { sideBySideRenderer.destroy(); sideBySideRenderer = null; }
      const svgEl = chartArea.querySelector('svg');
      if (svgEl) svgEl.removeAttribute('style');
      comparisonState = null;
    }

    // Get all versions for the picker
    const allVersions = await chartStore.getVersions();

    const target = await showVersionPicker({
      versions: allVersions,
      excludeVersionId: baseVersion.id,
      includeWorkingTree: true,
    });

    if (!target) return;

    // Determine old (base) and new (target) trees
    const oldTree = baseVersion.tree;
    const oldLabel = baseVersion.name;
    let newTree: typeof oldTree;
    let newLabel: string;

    if (target.type === 'working') {
      newTree = store.getTree();
      newLabel = t('comparison.working_tree');
    } else {
      newTree = target.version.tree;
      newLabel = target.version.name;
    }

    // Compute diff
    const diff = compareTrees(oldTree, newTree);
    const stats = getDiffStats(diff);

    comparisonState = { oldTree, newTree, oldLabel, newLabel, diff, viewMode: 'merged' };

    // Show merged view by default
    showMergedView(comparisonState);

    showComparisonBanner({
      container: chartArea,
      oldLabel,
      newLabel,
      stats,
      viewMode: 'merged',
      dimUnchanged,
      onToggleView: toggleComparisonView,
      onToggleDimUnchanged: handleToggleDim,
      onExit: exitComparisonMode,
    });
  };

  return {
    enterComparisonMode,
    exitComparisonMode,
    isInComparisonMode: () => comparisonState !== null,
    getSideBySideRenderer: () => sideBySideRenderer,
  };
}
