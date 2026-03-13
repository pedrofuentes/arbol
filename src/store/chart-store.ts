import type { OrgNode, ColorCategory, ChartRecord, VersionRecord, ChartBundle } from '../types';
import { ChartDB } from './chart-db';
import { generateId } from '../utils/id';
import { EventEmitter } from '../utils/event-emitter';
import { type IStorage, browserStorage } from '../utils/storage';
import { t } from '../i18n';

const DEFAULT_ROOT: OrgNode = {
  id: 'root',
  name: t('chart_store.default_root_name'),
  title: t('chart_store.default_root_title'),
};

const LS_ORG_KEY = 'arbol-org-data';
const LS_CAT_KEY = 'arbol-categories';

export class ChartStore extends EventEmitter {
  private db: ChartDB;
  private activeChartId: string | null = null;
  private lastSavedTree: string | null = null;
  private storage: IStorage;

  constructor(db: ChartDB, storage: IStorage = browserStorage) {
    super();
    this.db = db;
    this.storage = storage;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<ChartRecord> {
    let charts = await this.db.getAllCharts();

    if (charts.length === 0) {
      const chart = await this.createFromLocalStorageOrDefault();
      charts = [chart];
    }

    const active = this.sanitizeChart(charts[0]);
    this.activeChartId = active.id;
    this.lastSavedTree = JSON.stringify(active.workingTree);
    return active;
  }

  private async createFromLocalStorageOrDefault(): Promise<ChartRecord> {
    const rawTree = this.storage.getItem(LS_ORG_KEY);
    let tree: OrgNode = DEFAULT_ROOT;
    let categories: ColorCategory[] = [];

    if (rawTree) {
      try {
        tree = JSON.parse(rawTree) as OrgNode;
      } catch {
        tree = DEFAULT_ROOT;
      }

      const rawCats = this.storage.getItem(LS_CAT_KEY);
      if (rawCats) {
        try {
          categories = JSON.parse(rawCats) as ColorCategory[];
        } catch {
          categories = [];
        }
      }

      this.storage.removeItem(LS_ORG_KEY);
      this.storage.removeItem(LS_CAT_KEY);
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: t('chart_store.default_chart_name'),
      createdAt: now,
      updatedAt: now,
      workingTree: tree,
      categories,
    };

    await this.db.putChart(chart);
    return chart;
  }

  // ---------------------------------------------------------------------------
  // Chart CRUD
  // ---------------------------------------------------------------------------

  async getCharts(): Promise<ChartRecord[]> {
    return this.db.getAllCharts();
  }

  async getActiveChart(): Promise<ChartRecord | undefined> {
    if (!this.activeChartId) return undefined;
    return this.db.getChart(this.activeChartId);
  }

  getActiveChartId(): string | null {
    return this.activeChartId;
  }

  async createChart(name: string): Promise<ChartRecord> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Chart name cannot be empty');
    if (await this.db.isChartNameTaken(trimmed)) {
      throw new Error(`A chart named "${trimmed}" already exists`);
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      workingTree: { ...DEFAULT_ROOT },
      categories: [],
    };

    await this.db.putChart(chart);
    this.activeChartId = chart.id;
    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.emit();
    return chart;
  }

  async createChartFromTree(
    name: string,
    tree: OrgNode,
    categories: ColorCategory[] = [],
  ): Promise<ChartRecord> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Chart name cannot be empty');
    if (await this.db.isChartNameTaken(trimmed)) {
      throw new Error(`A chart named "${trimmed}" already exists`);
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      workingTree: tree,
      categories,
    };

    await this.db.putChart(chart);
    this.activeChartId = chart.id;
    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.emit();
    return chart;
  }

  async duplicateChart(chartId: string): Promise<ChartRecord> {
    const source = await this.db.getChart(chartId);
    if (!source) throw new Error(`Chart not found: ${chartId}`);

    let copyName = `Copy of ${source.name}`;
    let suffix = 2;
    while (await this.db.isChartNameTaken(copyName)) {
      copyName = `Copy of ${source.name} (${suffix++})`;
    }

    const clonedTree = structuredClone(source.workingTree);
    const clonedCategories = structuredClone(source.categories);
    return this.createChartFromTree(copyName, clonedTree, clonedCategories);
  }

  async renameChart(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Chart name cannot be empty');
    if (await this.db.isChartNameTaken(trimmed, id)) {
      throw new Error(`A chart named "${trimmed}" already exists`);
    }

    const chart = await this.db.getChart(id);
    if (!chart) throw new Error(`Chart not found: ${id}`);

    chart.name = trimmed;
    chart.updatedAt = new Date().toISOString();
    await this.db.putChart(chart);
    this.emit();
  }

  async deleteChart(id: string): Promise<void> {
    const chart = await this.db.getChart(id);
    if (!chart) throw new Error(`Chart not found: ${id}`);

    await this.db.deleteChart(id);

    if (this.activeChartId === id) {
      const remaining = await this.db.getAllCharts();
      if (remaining.length > 0) {
        this.activeChartId = remaining[0].id;
        this.lastSavedTree = JSON.stringify(remaining[0].workingTree);
      } else {
        const fallback = await this.createFallbackChart();
        this.activeChartId = fallback.id;
        this.lastSavedTree = JSON.stringify(fallback.workingTree);
      }
    }

    this.emit();
  }

  async switchChart(id: string): Promise<ChartRecord> {
    const raw = await this.db.getChart(id);
    if (!raw) throw new Error(`Chart not found: ${id}`);
    const chart = this.sanitizeChart(raw);

    this.activeChartId = chart.id;
    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.emit();
    return chart;
  }

  // ---------------------------------------------------------------------------
  // Working tree persistence
  // ---------------------------------------------------------------------------

  async saveWorkingTree(tree: OrgNode, categories: ColorCategory[]): Promise<void> {
    if (!this.activeChartId) throw new Error('No active chart');

    const chart = await this.db.getChart(this.activeChartId);
    if (!chart) throw new Error(`Chart not found: ${this.activeChartId}`);

    chart.workingTree = tree;
    chart.categories = categories;
    chart.updatedAt = new Date().toISOString();
    await this.db.putChart(chart);
    this.lastSavedTree = JSON.stringify(tree);
  }

  isDirty(currentTree: OrgNode): boolean {
    return JSON.stringify(currentTree) !== this.lastSavedTree;
  }

  // ---------------------------------------------------------------------------
  // Version management
  // ---------------------------------------------------------------------------

  async getVersions(chartId?: string): Promise<VersionRecord[]> {
    const id = chartId ?? this.activeChartId;
    if (!id) throw new Error('No active chart');
    return this.db.getVersionsByChart(id);
  }

  async saveVersion(name: string, tree: OrgNode): Promise<VersionRecord> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Version name cannot be empty');
    if (!this.activeChartId) throw new Error('No active chart');

    const version: VersionRecord = {
      id: generateId(),
      chartId: this.activeChartId,
      name: trimmed,
      createdAt: new Date().toISOString(),
      tree,
    };

    await this.db.putVersion(version);
    this.lastSavedTree = JSON.stringify(tree);
    this.emit();
    return version;
  }

  async getVersion(id: string): Promise<VersionRecord | undefined> {
    return this.db.getVersion(id);
  }

  async restoreVersion(versionId: string): Promise<OrgNode> {
    const version = await this.db.getVersion(versionId);
    if (!version) throw new Error(`Version not found: ${versionId}`);

    this.lastSavedTree = JSON.stringify(version.tree);
    this.emit();
    return version.tree;
  }

  async deleteVersion(id: string): Promise<void> {
    await this.db.deleteVersion(id);
    this.emit();
  }

  // ---------------------------------------------------------------------------
  // Bundle import
  // ---------------------------------------------------------------------------

  async importChartAsNew(bundle: ChartBundle): Promise<ChartRecord> {
    let name = bundle.chart.name;
    if (await this.db.isChartNameTaken(name)) {
      name = `${bundle.chart.name} (imported)`;
      let suffix = 2;
      while (await this.db.isChartNameTaken(name)) {
        name = `${bundle.chart.name} (imported ${suffix++})`;
      }
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      workingTree: bundle.chart.workingTree,
      categories: bundle.chart.categories,
    };
    await this.db.putChart(chart);

    const versions: VersionRecord[] = bundle.versions.map((v) => ({
      id: generateId(),
      chartId: chart.id,
      name: v.name,
      createdAt: v.createdAt,
      tree: v.tree,
    }));
    await this.db.putVersionsBatch(versions);

    this.activeChartId = chart.id;
    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.emit();
    return chart;
  }

  async importChartReplaceCurrent(bundle: ChartBundle): Promise<ChartRecord> {
    if (!this.activeChartId) throw new Error('No active chart');
    const chart = await this.db.getChart(this.activeChartId);
    if (!chart) throw new Error(`Chart not found: ${this.activeChartId}`);

    chart.workingTree = bundle.chart.workingTree;
    chart.categories = bundle.chart.categories;
    chart.updatedAt = new Date().toISOString();
    await this.db.putChart(chart);

    const versions: VersionRecord[] = bundle.versions.map((v) => ({
      id: generateId(),
      chartId: chart.id,
      name: v.name,
      createdAt: v.createdAt,
      tree: v.tree,
    }));
    await this.db.putVersionsBatch(versions);

    this.lastSavedTree = JSON.stringify(chart.workingTree);
    this.emit();
    return chart;
  }

  // ---------------------------------------------------------------------------
  // Category comparison
  // ---------------------------------------------------------------------------

  async wouldReplaceCategories(bundle: ChartBundle): Promise<boolean> {
    if (!this.activeChartId) return false;
    const chart = await this.db.getChart(this.activeChartId);
    if (!chart || chart.categories.length === 0) return false;
    if (bundle.chart.categories.length === 0) return true;
    return JSON.stringify(chart.categories) !== JSON.stringify(bundle.chart.categories);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async createFallbackChart(): Promise<ChartRecord> {
    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: t('chart_store.default_chart_name'),
      createdAt: now,
      updatedAt: now,
      workingTree: { ...DEFAULT_ROOT },
      categories: [],
    };
    await this.db.putChart(chart);
    return chart;
  }

  /** Ensures a chart record loaded from IndexedDB has all required fields with valid defaults. */
  private sanitizeChart(chart: ChartRecord): ChartRecord {
    if (!chart.workingTree || typeof chart.workingTree !== 'object') {
      chart.workingTree = { ...DEFAULT_ROOT };
    }
    const tree = chart.workingTree;
    if (!tree.id || typeof tree.id !== 'string') tree.id = 'root';
    if (typeof tree.name !== 'string') tree.name = '';
    if (typeof tree.title !== 'string') tree.title = '';
    if (!Array.isArray(chart.categories)) {
      chart.categories = [];
    }
    if (!chart.createdAt) chart.createdAt = new Date().toISOString();
    if (!chart.updatedAt) chart.updatedAt = chart.createdAt;
    return chart;
  }
}
