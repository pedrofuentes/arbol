import type { ChartRecord, VersionRecord } from '../types';

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

      request.onsuccess = () => {
        this.db = request.result;
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

  getAllCharts(): Promise<ChartRecord[]> {
    return this.getAll<ChartRecord>(CHARTS_STORE).then((charts) =>
      charts.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0)),
    );
  }

  getChart(id: string): Promise<ChartRecord | undefined> {
    return this.getByKey<ChartRecord>(CHARTS_STORE, id);
  }

  putChart(chart: ChartRecord): Promise<void> {
    return this.put(CHARTS_STORE, chart);
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

  getVersionsByChart(chartId: string): Promise<VersionRecord[]> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, 'readonly');
      const index = tx.objectStore(VERSIONS_STORE).index('chartId');
      const request = index.getAll(IDBKeyRange.only(chartId));

      request.onsuccess = () => {
        const versions = request.result as VersionRecord[];
        versions.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
        resolve(versions);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get versions for chart ${chartId}: ${request.error?.message}`));
      };
    });
  }

  getVersion(id: string): Promise<VersionRecord | undefined> {
    return this.getByKey<VersionRecord>(VERSIONS_STORE, id);
  }

  putVersion(version: VersionRecord): Promise<void> {
    return this.put(VERSIONS_STORE, version);
  }

  deleteVersion(id: string): Promise<void> {
    return this.deleteByKey(VERSIONS_STORE, id);
  }

  deleteVersionsByChart(chartId: string): Promise<void> {
    const db = this.requireDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, 'readwrite');
      tx.onerror = () => reject(new Error(`Failed to delete versions for chart ${chartId}: ${tx.error?.message}`));
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
        reject(new Error(`Failed to put into ${storeName}: ${tx.error?.message}`));
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
}
