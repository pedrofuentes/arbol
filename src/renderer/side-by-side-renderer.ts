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
  }

  render(
    oldTree: OrgNode,
    newTree: OrgNode,
    diff: Map<string, DiffEntry>
  ): void {
    this.leftRenderer.setDiffMap(diff);
    this.rightRenderer.setDiffMap(diff);

    this.leftRenderer.render(oldTree);
    this.rightRenderer.render(newTree);

    this.leftRenderer.getZoomManager().fitToContent();
    this.rightRenderer.getZoomManager().fitToContent();
  }

  destroy(): void {
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
