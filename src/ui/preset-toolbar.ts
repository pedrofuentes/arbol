import { t } from '../i18n';
import { showInputDialog } from './input-dialog';

export interface PresetToolbarOptions {
  container: HTMLElement;
  presetNames: () => string[];
  chartEntries: () => { id: string; name: string }[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onCopyFromChart: (chartId: string) => void;
  onDelete: (name: string) => void;
  typeLabel: string;
}

export class PresetToolbar {
  private container: HTMLElement;
  private opts: PresetToolbarOptions;

  constructor(opts: PresetToolbarOptions) {
    this.container = opts.container;
    this.opts = opts;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'flex-row';
    row.style.cssText = 'gap:6px;flex-wrap:wrap;';
    row.setAttribute('data-testid', 'preset-toolbar');

    row.appendChild(this.buildSaveButton());
    row.appendChild(this.buildLoadSelect());
    row.appendChild(this.buildCopySelect());

    this.container.appendChild(row);
  }

  private buildSaveButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = t('preset.save');
    btn.style.cssText = 'font-size:11px;padding:4px 10px;';
    btn.setAttribute('data-testid', 'preset-save-btn');
    btn.addEventListener('click', () => this.handleSave());
    return btn;
  }

  private buildLoadSelect(): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.cssText =
      'font-size:11px;padding:4px 8px;border:1px solid var(--border-default);' +
      'border-radius:var(--radius-sm);background:var(--bg-surface);' +
      'color:var(--text-primary);cursor:pointer;';
    select.setAttribute('data-testid', 'preset-load-select');
    select.setAttribute('aria-label', t('preset.load'));

    this.populateLoadSelect(select);

    select.addEventListener('focus', () => this.populateLoadSelect(select));
    select.addEventListener('change', () => {
      const name = select.value;
      if (name) {
        this.opts.onLoad(name);
        select.value = '';
      }
    });

    return select;
  }

  private buildCopySelect(): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.cssText =
      'font-size:11px;padding:4px 8px;border:1px solid var(--border-default);' +
      'border-radius:var(--radius-sm);background:var(--bg-surface);' +
      'color:var(--text-primary);cursor:pointer;';
    select.setAttribute('data-testid', 'preset-copy-select');
    select.setAttribute('aria-label', t('preset.copy_from_chart'));

    this.populateCopySelect(select);

    select.addEventListener('focus', () => this.populateCopySelect(select));
    select.addEventListener('change', () => {
      const chartId = select.value;
      if (chartId) {
        this.opts.onCopyFromChart(chartId);
        select.value = '';
      }
    });

    return select;
  }

  private populateLoadSelect(select: HTMLSelectElement): void {
    const currentValue = select.value;
    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = t('preset.load');
    select.appendChild(defaultOpt);

    const names = this.opts.presetNames();
    if (names.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = t('preset.no_presets');
      emptyOpt.disabled = true;
      select.appendChild(emptyOpt);
    } else {
      for (const name of names) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      }
    }

    select.value = currentValue || '';
  }

  private populateCopySelect(select: HTMLSelectElement): void {
    const currentValue = select.value;
    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = t('preset.copy_from_chart');
    select.appendChild(defaultOpt);

    const charts = this.opts.chartEntries();
    if (charts.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = t('preset.no_other_charts');
      emptyOpt.disabled = true;
      select.appendChild(emptyOpt);
    } else {
      for (const chart of charts) {
        const opt = document.createElement('option');
        opt.value = chart.id;
        opt.textContent = chart.name;
        select.appendChild(opt);
      }
    }

    select.value = currentValue || '';
  }

  private async handleSave(): Promise<void> {
    const name = await showInputDialog({
      title: t('preset.save_name_title'),
      label: t('preset.save_name_label'),
      placeholder: t('preset.save_name_placeholder'),
    });
    if (name) {
      this.opts.onSave(name);
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
