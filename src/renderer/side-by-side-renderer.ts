import { OrgNode, DiffEntry } from '../types';
import { ChartRenderer, RendererOptions } from './chart-renderer';

export interface SideBySideRendererOptions {
  container: HTMLElement;
  rendererOptions: RendererOptions;
  oldLabel: string;
  newLabel: string;
}

export class SideBySideRenderer {
  private wrapper: HTMLDivElement;
  private leftRenderer: ChartRenderer;
  private rightRenderer: ChartRenderer;
  private leftChart!: HTMLDivElement;
  private rightChart!: HTMLDivElement;
  private hoverCleanup: (() => void) | null = null;
  private selectedIds = new Set<string>();
  private dimUnchanged = true;

  constructor(options: SideBySideRendererOptions) {
    this.wrapper = document.createElement('div');
    this.wrapper.dataset.testid = 'side-by-side-wrapper';
    Object.assign(this.wrapper.style, {
      display: 'flex',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    const leftPane = this.createPane('left', options.oldLabel, true);
    const rightPane = this.createPane('right', options.newLabel, false);

    this.wrapper.appendChild(leftPane.pane);
    this.wrapper.appendChild(rightPane.pane);
    options.container.appendChild(this.wrapper);

    this.leftRenderer = new ChartRenderer({
      ...options.rendererOptions,
      container: leftPane.chart,
    });
    this.rightRenderer = new ChartRenderer({
      ...options.rendererOptions,
      container: rightPane.chart,
    });

    this.leftChart = leftPane.chart;
    this.rightChart = rightPane.chart;
  }

  setDimUnchanged(enabled: boolean): void {
    this.dimUnchanged = enabled;
    this.leftRenderer.setDimUnchanged(enabled);
    this.rightRenderer.setDimUnchanged(enabled);
  }

  render(
    oldTree: OrgNode,
    newTree: OrgNode,
    diff: Map<string, DiffEntry>
  ): void {
    this.leftRenderer.setDiffMap(diff);
    this.rightRenderer.setDiffMap(diff);
    this.leftRenderer.setDimUnchanged(this.dimUnchanged);
    this.rightRenderer.setDimUnchanged(this.dimUnchanged);

    this.leftRenderer.render(oldTree);
    this.rightRenderer.render(newTree);

    this.leftRenderer.getZoomManager()?.fitToContent();
    this.rightRenderer.getZoomManager()?.fitToContent();

    this.wireHoverHighlight();
  }

  private wireHoverHighlight(): void {
    this.cleanupHoverListeners();

    const nodeSelector = '.node, .ic-node, .pal-node';
    const abortController = new AbortController();
    const signal = abortController.signal;

    const wirePane = (
      sourceContainer: HTMLDivElement,
      targetContainer: HTMLDivElement
    ): void => {
      sourceContainer.querySelectorAll(nodeSelector).forEach((el) => {
        el.addEventListener(
          'mouseenter',
          () => {
            const nodeId = el.getAttribute('data-id');
            if (!nodeId) return;

            el.classList.add('cross-highlight');

            const match = targetContainer.querySelector(
              `[data-id="${nodeId}"]`
            );
            if (match) match.classList.add('cross-highlight');
          },
          { signal }
        );

        el.addEventListener(
          'mouseleave',
          () => {
            sourceContainer
              .querySelectorAll('.cross-highlight')
              .forEach((n) => n.classList.remove('cross-highlight'));
            targetContainer
              .querySelectorAll('.cross-highlight')
              .forEach((n) => n.classList.remove('cross-highlight'));
          },
          { signal }
        );
      });
    };

    wirePane(this.leftChart, this.rightChart);
    wirePane(this.rightChart, this.leftChart);

    // Click handling for toggle selection
    const wireClickPane = (
      sourceContainer: HTMLDivElement,
      targetContainer: HTMLDivElement
    ): void => {
      sourceContainer.querySelectorAll(`${nodeSelector} rect`).forEach((rect) => {
        rect.addEventListener(
          'click',
          (e) => {
            const group = rect.closest(nodeSelector);
            const nodeId = group?.getAttribute('data-id');
            if (!nodeId) return;

            if (this.selectedIds.has(nodeId)) {
              this.selectedIds.delete(nodeId);
            } else {
              this.selectedIds.add(nodeId);
            }

            this.syncSelection();
          },
          { signal }
        );
      });
    };

    wireClickPane(this.leftChart, this.rightChart);
    wireClickPane(this.rightChart, this.leftChart);

    this.hoverCleanup = () => abortController.abort();
  }

  private cleanupHoverListeners(): void {
    if (this.hoverCleanup) {
      this.hoverCleanup();
      this.hoverCleanup = null;
    }
    this.selectedIds.clear();
  }

  private syncSelection(): void {
    const nodeSelector = '.node, .ic-node, .pal-node';
    [this.leftChart, this.rightChart].forEach((pane) => {
      pane.querySelectorAll(nodeSelector).forEach((el) => {
        const id = el.getAttribute('data-id');
        el.classList.toggle('cross-selected', id !== null && this.selectedIds.has(id));
      });
    });
  }

  fitToContent(): void {
    this.leftRenderer.getZoomManager()?.fitToContent();
    this.rightRenderer.getZoomManager()?.fitToContent();
  }

  resetZoom(): void {
    this.leftRenderer.getZoomManager()?.resetZoom();
    this.rightRenderer.getZoomManager()?.resetZoom();
  }

  centerAtRealSize(): void {
    this.leftRenderer.getZoomManager()?.centerAtRealSize();
    this.rightRenderer.getZoomManager()?.centerAtRealSize();
  }

  destroy(): void {
    this.cleanupHoverListeners();
    this.leftRenderer.destroy();
    this.rightRenderer.destroy();
    this.wrapper.remove();
  }

  private createPane(
    side: 'left' | 'right',
    label: string,
    hasBorder: boolean
  ): { pane: HTMLDivElement; chart: HTMLDivElement } {
    const pane = document.createElement('div');
    pane.dataset.testid = `side-by-side-${side}`;
    Object.assign(pane.style, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      ...(hasBorder
        ? { borderRight: '1px solid var(--border-default, #e2e8f0)' }
        : {}),
    });

    const labelEl = document.createElement('div');
    labelEl.dataset.testid = `side-by-side-${side}-label`;
    Object.assign(labelEl.style, {
      padding: '8px 12px',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      fontWeight: '600',
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface, #f8fafc)',
      borderBottom: '1px solid var(--border-subtle)',
    });
    labelEl.textContent = label;

    const chart = document.createElement('div');
    chart.dataset.testid = `side-by-side-${side}-chart`;
    Object.assign(chart.style, {
      flex: '1',
      position: 'relative',
    });

    pane.appendChild(labelEl);
    pane.appendChild(chart);

    return { pane, chart };
  }
}
