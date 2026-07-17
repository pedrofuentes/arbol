import type { ChartStore } from '../../store/chart-store';
import type { ChartRecord, VersionRecord } from '../../types';
import { getLocale, t } from '../../i18n';
import { showConfirmDialog } from '../../ui/confirm-dialog';
import { appendIconLabel, createIcon } from '../../ui/icon';
import { showToast } from '../../ui/toast';

export interface TrashPanelDeps {
  chartStore: ChartStore;
}

export class TrashPanel {
  private readonly chartStore: ChartStore;
  private root: HTMLDivElement | null = null;
  private renderVersion = 0;

  constructor({ chartStore }: TrashPanelDeps) {
    this.chartStore = chartStore;
  }

  build(): HTMLElement {
    this.root = document.createElement('div');
    this.root.className = 'trash-panel';
    void this.refresh();
    return this.root;
  }

  private async refresh(): Promise<void> {
    const root = this.root;
    if (!root) return;
    const currentRender = ++this.renderVersion;

    try {
      const [allCharts, allVersions] = await Promise.all([
        this.chartStore.getCharts({ includeTrashed: true }),
        this.chartStore.getAllVersions({ includeTrashed: true }),
      ]);
      if (root !== this.root || currentRender !== this.renderVersion) return;

      const charts = allCharts
        .filter((chart) => chart.deletedAt !== undefined)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
      const versions = allVersions
        .filter((version) => version.deletedAt !== undefined)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
      const chartNames = new Map(allCharts.map((chart) => [chart.id, chart.name]));

      root.textContent = '';
      if (charts.length === 0 && versions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'trash-empty text-sm text-tertiary';
        empty.dataset.trashEmpty = '';
        empty.appendChild(createIcon('trash'));
        empty.appendChild(document.createTextNode(t('trash.empty')));
        root.appendChild(empty);
        return;
      }

      if (charts.length > 0) {
        root.appendChild(this.createHeading(t('trash.charts_heading')));
        for (const chart of charts) root.appendChild(this.createChartItem(chart));
      }
      if (versions.length > 0) {
        root.appendChild(this.createHeading(t('trash.versions_heading')));
        for (const version of versions) {
          root.appendChild(
            this.createVersionItem(
              version,
              chartNames.get(version.chartId) ?? t('trash.unknown_chart'),
            ),
          );
        }
      }
    } catch (error) {
      showToast(
        t('trash.load_failed', {
          error: error instanceof Error ? error.message : String(error),
        }),
        'error',
      );
    }
  }

  private createHeading(label: string): HTMLHeadingElement {
    const heading = document.createElement('h4');
    heading.className = 'trash-heading';
    heading.textContent = label;
    return heading;
  }

  private createChartItem(chart: ChartRecord): HTMLDivElement {
    return this.createItem({
      id: chart.id,
      kind: 'chart',
      name: chart.name,
      deletedAt: chart.deletedAt!,
      onRestore: () => this.chartStore.restoreChart(chart.id),
      onDeleteForever: () => this.chartStore.deleteChartForever(chart.id),
    });
  }

  private createVersionItem(version: VersionRecord, chartName: string): HTMLDivElement {
    return this.createItem({
      id: version.id,
      kind: 'version',
      name: version.name,
      deletedAt: version.deletedAt!,
      association: t('trash.version_chart', { name: chartName }),
      onRestore: () => this.chartStore.restoreDeletedVersion(version.id),
      onDeleteForever: () => this.chartStore.deleteVersionForever(version.id),
    });
  }

  private createItem(options: {
    id: string;
    kind: 'chart' | 'version';
    name: string;
    deletedAt: number;
    association?: string;
    onRestore: () => Promise<void>;
    onDeleteForever: () => Promise<void>;
  }): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'trash-item';
    item.dataset.trashItem = '';
    if (options.kind === 'chart') item.dataset.trashChartId = options.id;
    else item.dataset.trashVersionId = options.id;

    const info = document.createElement('div');
    info.className = 'trash-item-info';
    const name = document.createElement('div');
    name.className = 'trash-item-name';
    name.textContent = options.name;
    info.appendChild(name);

    if (options.association) {
      const association = document.createElement('div');
      association.className = 'trash-item-meta';
      association.textContent = options.association;
      info.appendChild(association);
    }
    const deleted = document.createElement('div');
    deleted.className = 'trash-item-meta';
    deleted.textContent = t('trash.deleted_date', {
      date: new Date(options.deletedAt).toLocaleString(getLocale()),
    });
    info.appendChild(deleted);
    item.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'trash-item-actions';
    const restore = document.createElement('button');
    restore.className = 'btn btn-secondary';
    restore.dataset.trashAction = 'restore';
    appendIconLabel(restore, 'restore', t('trash.restore'));
    restore.addEventListener('click', () => void this.runAction(options.onRestore));
    actions.appendChild(restore);

    const deleteForever = document.createElement('button');
    deleteForever.className = 'btn btn-danger';
    deleteForever.dataset.trashAction = 'delete-forever';
    appendIconLabel(deleteForever, 'remove', t('trash.delete_forever'));
    deleteForever.addEventListener('click', () => {
      void this.confirmDeleteForever(options.name, options.onDeleteForever);
    });
    actions.appendChild(deleteForever);
    item.appendChild(actions);
    return item;
  }

  private async confirmDeleteForever(name: string, action: () => Promise<void>): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: t('trash.delete_forever_title'),
      message: t('trash.delete_forever_message', { name }),
      confirmLabel: t('trash.delete_forever'),
      danger: true,
    });
    if (confirmed) await this.runAction(action);
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    try {
      await action();
      await this.refresh();
    } catch (error) {
      showToast(
        t('trash.action_failed', {
          error: error instanceof Error ? error.message : String(error),
        }),
        'error',
      );
    }
  }
}
