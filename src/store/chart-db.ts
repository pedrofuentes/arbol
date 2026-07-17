import type { ChartRecord, IncludeTrashedOptions, VersionRecord } from '../types';

const DB_NAME = 'arbol-db';
const DB_VERSION = 1;

const CHARTS_STORE = 'charts';
const VERSIONS_STORE = 'versions';

export class ChartDB {
  private db: IDBDatabase | null = null;

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(CHARTS_STORE)) {
          const charts = db.createObjectStore(CHARTS_STORE, { keyPath: 'id' });
          charts.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
          const versions = db.createObjectStore(VERSIONS_STORE, { keyPath: 'id' });
          versions.createIndex('chartId', 'chartId', { unique: false });
        }
      };

      request.onblocked = () => {
        reject(new Error('Database upgrade blocked. Please close other tabs and refresh.'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  getAllCharts(options: IncludeTrashedOptions = {}): Promise<ChartRecord[]> {
    return this.getAll<ChartRecord>(CHARTS_STORE).then((charts) =>
      this.filterTrashed(charts, options).sort((a, b) =>
        a.createdAt > b.createdAt ? 1 : a.createdAt < b.createdAt ? -1 : 0,
      ),
    );
  }

  async getChart(
    id: string,
    options: IncludeTrashedOptions = {},
  ): Promise<ChartRecord | undefined> {
    const chart = await this.getByKey<ChartRecord>(CHARTS_STORE, id);
    return chart && this.isVisible(chart, options) ? chart : undefined;
  }

  putChart(chart: ChartRecord): Promise<void> {
    return this.put(CHARTS_STORE, chart);
  }

  patchChart(id: string, fields: Partial<Omit<ChartRecord, 'id'>>): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CHARTS_STORE, 'readwrite');
      const store = tx.objectStore(CHARTS_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const chart = getReq.result as ChartRecord | undefined;
        if (!chart) {
          reject(new Error(`Chart not found: ${id}`));
          return;
        }
        Object.assign(chart, fields);
        store.put(chart);
      };

      getReq.onerror = () =>
        reject(new Error(`Failed to get chart for patching: ${getReq.error?.message}`));

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error?.name === 'QuotaExceededError') {
          reject(
            new Error(
              'Storage quota exceeded. Please delete old charts or versions to free up space.',
            ),
          );
        } else {
          reject(new Error(`Failed to patch chart: ${tx.error?.message}`));
        }
      };
    });
  }

  deleteChart(id: string): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CHARTS_STORE, VERSIONS_STORE], 'readwrite');
      tx.onerror = () => reject(new Error(`Failed to delete chart: ${tx.error?.message}`));
      tx.oncomplete = () => resolve();

      tx.objectStore(CHARTS_STORE).delete(id);

      const versionsStore = tx.objectStore(VERSIONS_STORE);
      const index = versionsStore.index('chartId');
      const cursorReq = index.openCursor(IDBKeyRange.only(id));

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  getVersionsByChart(
    chartId: string,
    options: IncludeTrashedOptions = {},
  ): Promise<VersionRecord[]> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, 'readonly');
      const index = tx.objectStore(VERSIONS_STORE).index('chartId');
      const request = index.getAll(IDBKeyRange.only(chartId));

      request.onsuccess = () => {
        const versions = this.filterTrashed(request.result as VersionRecord[], options);
        versions.sort((a, b) =>
          b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0,
        );
        resolve(versions);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get versions for chart ${chartId}: ${request.error?.message}`));
      };
    });
  }

  getAllVersions(options: IncludeTrashedOptions = {}): Promise<VersionRecord[]> {
    return this.getAll<VersionRecord>(VERSIONS_STORE).then((versions) =>
      this.filterTrashed(versions, options).sort((a, b) =>
        b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0,
      ),
    );
  }

  async getVersion(
    id: string,
    options: IncludeTrashedOptions = {},
  ): Promise<VersionRecord | undefined> {
    const version = await this.getByKey<VersionRecord>(VERSIONS_STORE, id);
    return version && this.isVisible(version, options) ? version : undefined;
  }

  putVersion(version: VersionRecord): Promise<void> {
    return this.put(VERSIONS_STORE, version);
  }

  patchVersion(id: string, fields: Partial<Omit<VersionRecord, 'id'>>): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, 'readwrite');
      const store = tx.objectStore(VERSIONS_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const version = getReq.result as VersionRecord | undefined;
        if (!version) {
          reject(new Error(`Version not found: ${id}`));
          return;
        }
        Object.assign(version, fields);
        store.put(version);
      };
      getReq.onerror = () =>
        reject(new Error(`Failed to get version for patching: ${getReq.error?.message}`));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`Failed to patch version: ${tx.error?.message}`));
    });
  }

  /** Writes multiple versions in a single transaction for efficient bulk imports. */
  putVersionsBatch(versions: VersionRecord[]): Promise<void> {
    if (versions.length === 0) return Promise.resolve();
    return this.putBatch(VERSIONS_STORE, versions);
  }

  deleteVersion(id: string): Promise<void> {
    return this.deleteByKey(VERSIONS_STORE, id);
  }

  deleteVersionsByChart(chartId: string): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, 'readwrite');
      tx.onerror = () =>
        reject(new Error(`Failed to delete versions for chart ${chartId}: ${tx.error?.message}`));
      tx.oncomplete = () => resolve();

      const index = tx.objectStore(VERSIONS_STORE).index('chartId');
      const cursorReq = index.openCursor(IDBKeyRange.only(chartId));

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  isChartNameTaken(name: string, excludeId?: string): Promise<boolean> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CHARTS_STORE, 'readonly');
      const index = tx.objectStore(CHARTS_STORE).index('name');
      const request = index.get(name);

      request.onsuccess = () => {
        const chart = request.result as ChartRecord | undefined;
        resolve(chart !== undefined && chart.id !== excludeId);
      };

      request.onerror = () => {
        reject(new Error(`Failed to check chart name: ${request.error?.message}`));
      };
    });
  }

  // ── Private helpers ────────────────────────────────────────────────

  private requireDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not open — call open() first');
    }
    return this.db;
  }

  private filterTrashed<T extends { deletedAt?: number }>(
    records: T[],
    options: IncludeTrashedOptions,
  ): T[] {
    return options.includeTrashed
      ? records
      : records.filter((record) => record.deletedAt === undefined);
  }

  private isVisible(record: { deletedAt?: number }, options: IncludeTrashedOptions): boolean {
    return options.includeTrashed || record.deletedAt === undefined;
  }

  private getAll<T>(storeName: string): Promise<T[]> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => {
        reject(new Error(`Failed to get all from ${storeName}: ${request.error?.message}`));
      };
    });
  }

  private getByKey<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => {
        reject(new Error(`Failed to get ${key} from ${storeName}: ${request.error?.message}`));
      };
    });
  }

  private put(storeName: string, value: unknown): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error?.name === 'QuotaExceededError') {
          reject(
            new Error(
              'Storage quota exceeded. Please delete old charts or versions to free up space.',
            ),
          );
        } else {
          reject(new Error(`Failed to put into ${storeName}: ${tx.error?.message}`));
        }
      };
    });
  }

  private deleteByKey(storeName: string, key: string): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        reject(new Error(`Failed to delete ${key} from ${storeName}: ${tx.error?.message}`));
      };
    });
  }

  private putBatch(storeName: string, items: unknown[]): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error?.name === 'QuotaExceededError') {
          reject(
            new Error(
              'Storage quota exceeded. Please delete old charts or versions to free up space.',
            ),
          );
        } else {
          reject(new Error(`Failed to batch put into ${storeName}: ${tx.error?.message}`));
        }
      };
    });
  }
}
