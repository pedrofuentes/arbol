import type { OrgNode, ColorCategory, ChartRecord, VersionRecord } from '../types';
import { ChartDB } from './chart-db';
import { generateId } from '../utils/id';

type ChangeListener = () => void;

const DEFAULT_ROOT: OrgNode = {
  id: 'root',
  name: 'Organization',
  title: 'CEO',
};

const LS_ORG_KEY = 'arbol-org-data';
const LS_CAT_KEY = 'arbol-categories';

export class ChartStore {
  private db: ChartDB;
  private activeChartId: string | null = null;
  private lastSavedTree: string | null = null;
  private listeners: Set<ChangeListener> = new Set();

  constructor(db: ChartDB) {
    this.db = db;
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

    const active = charts[0];
    this.activeChartId = active.id;
    this.lastSavedTree = JSON.stringify(active.workingTree);
    return active;
  }

  private async createFromLocalStorageOrDefault(): Promise<ChartRecord> {
    const rawTree = localStorage.getItem(LS_ORG_KEY);
    let tree: OrgNode = DEFAULT_ROOT;
    let categories: ColorCategory[] = [];

    if (rawTree) {
      try {
        tree = JSON.parse(rawTree) as OrgNode;
      } catch {
        tree = DEFAULT_ROOT;
      }

      const rawCats = localStorage.getItem(LS_CAT_KEY);
      if (rawCats) {
        try {
          categories = JSON.parse(rawCats) as ColorCategory[];
        } catch {
          categories = [];
        }
      }

      localStorage.removeItem(LS_ORG_KEY);
      localStorage.removeItem(LS_CAT_KEY);
    }

    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: 'My Org Chart',
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
    const chart = await this.db.getChart(id);
    if (!chart) throw new Error(`Chart not found: ${id}`);

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
  // Events
  // ---------------------------------------------------------------------------

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async createFallbackChart(): Promise<ChartRecord> {
    const now = new Date().toISOString();
    const chart: ChartRecord = {
      id: generateId(),
      name: 'My Org Chart',
      createdAt: now,
      updatedAt: now,
      workingTree: { ...DEFAULT_ROOT },
      categories: [],
    };
    await this.db.putChart(chart);
    return chart;
  }
}
