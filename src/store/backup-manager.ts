import type { ChartRecord, VersionRecord } from '../types';
import type { ChartDB } from './chart-db';
import { APP_VERSION } from '../version';
import { timestampedFilename } from '../utils/filename';
import { type IStorage, browserStorage } from '../utils/storage';
import { validateTree } from './org-store';

// ── Backup format ────────────────────────────────────────────────────────────

const CURRENT_FORMAT_VERSION = 1;
const MAX_BACKUP_SIZE = 50 * 1024 * 1024; // 50 MB

export interface ArbolBackup {
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  data: {
    charts: ChartRecord[];
    versions: VersionRecord[];
    settings: unknown | null;
    theme: string | null;
    csvMappings: unknown | null;
    customPresets: unknown | null;
    accordionState: unknown | null;
  };
}

export interface BackupSummary {
  chartCount: number;
  versionCount: number;
  appVersion: string;
  createdAt: string;
}

export interface MergeResult {
  chartsAdded: number;
  chartsSkipped: number;
  versionsAdded: number;
}

// localStorage keys that belong to Arbol
const BACKUP_LS_KEYS = {
  settings: 'arbol-settings',
  theme: 'arbol-theme',
  csvMappings: 'arbol-csv-mappings',
  customPresets: 'arbol-custom-presets',
  accordionState: 'arbol-accordion-state',
} as const;

const ALL_ARBOL_LS_KEYS = [
  'arbol-org-data',
  'arbol-settings',
  'arbol-categories',
  'arbol-csv-mappings',
  'arbol-accordion-state',
  'arbol-custom-presets',
  'arbol-theme',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJsonParse(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createBackup(
  db: ChartDB,
  storage: IStorage = browserStorage,
): Promise<ArbolBackup> {
  const charts = await db.getAllCharts();

  const versions: VersionRecord[] = [];
  for (const chart of charts) {
    const chartVersions = await db.getVersionsByChart(chart.id);
    versions.push(...chartVersions);
  }

  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      charts,
      versions,
      settings: safeJsonParse(storage.getItem(BACKUP_LS_KEYS.settings)),
      theme: storage.getItem(BACKUP_LS_KEYS.theme),
      csvMappings: safeJsonParse(storage.getItem(BACKUP_LS_KEYS.csvMappings)),
      customPresets: safeJsonParse(storage.getItem(BACKUP_LS_KEYS.customPresets)),
      accordionState: safeJsonParse(storage.getItem(BACKUP_LS_KEYS.accordionState)),
    },
  };
}

export function downloadBackup(backup: ArbolBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = timestampedFilename('arbol-backup.json');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<ArbolBackup> {
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error(`Backup file too large (max ${MAX_BACKUP_SIZE / 1024 / 1024}MB)`);
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON — the file is not a valid backup');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup file — expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.formatVersion !== 'number') {
    throw new Error('Invalid backup file — missing formatVersion');
  }
  if (obj.formatVersion > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Backup was created with a newer app version (format v${obj.formatVersion}). ` +
        `Please update Arbol to restore this backup.`,
    );
  }
  if (!obj.data || typeof obj.data !== 'object') {
    throw new Error('Invalid backup file — missing data section');
  }

  const data = obj.data as Record<string, unknown>;
  if (!Array.isArray(data.charts)) {
    throw new Error('Invalid backup file — missing charts array');
  }
  if (!Array.isArray(data.versions)) {
    throw new Error('Invalid backup file — missing versions array');
  }

  return parsed as ArbolBackup;
}

export function getBackupSummary(backup: ArbolBackup): BackupSummary {
  return {
    chartCount: backup.data.charts.length,
    versionCount: backup.data.versions.length,
    appVersion: backup.appVersion,
    createdAt: backup.createdAt,
  };
}

export async function restoreFullReplace(
  db: ChartDB,
  backup: ArbolBackup,
  storage: IStorage = browserStorage,
): Promise<void> {
  // Stage 1: Validate all backup data before any destructive operations
  const validChartIds = new Set<string>();
  const validCharts: ChartRecord[] = [];
  for (const chart of backup.data.charts) {
    try {
      validateTree(chart.workingTree);
      validCharts.push(chart);
      validChartIds.add(chart.id);
    } catch {
      console.warn(`Backup restore: skipping chart "${chart.name}" (${chart.id}) — invalid tree`);
    }
  }

  // Filter versions to only those belonging to valid charts
  const validVersions: VersionRecord[] = [];
  for (const version of backup.data.versions) {
    if (!validChartIds.has(version.chartId)) continue;
    try {
      validateTree(version.tree);
      validVersions.push(version);
    } catch {
      console.warn(
        `Backup restore: skipping version "${version.name}" (${version.id}) — invalid tree`,
      );
    }
  }

  // Stage 2: Snapshot existing data for rollback
  const existingCharts = await db.getAllCharts();
  const existingVersions = await db.getAllVersions();
  const existingLSValues: Record<string, string | null> = {};
  for (const key of ALL_ARBOL_LS_KEYS) {
    existingLSValues[key] = storage.getItem(key);
  }

  // Stage 3: Clear existing data, write backup, restore localStorage — all rollback-protected
  const writtenChartIds: string[] = [];
  const writtenVersionIds: string[] = [];
  try {
    for (const key of ALL_ARBOL_LS_KEYS) {
      storage.removeItem(key);
    }
    for (const chart of existingCharts) {
      await db.deleteChart(chart.id);
    }

    for (const chart of validCharts) {
      await db.putChart(chart);
      writtenChartIds.push(chart.id);
    }
    for (const version of validVersions) {
      await db.putVersion(version);
      writtenVersionIds.push(version.id);
    }

    restoreLocalStorage(backup, storage);
  } catch (error) {
    const rollbackErrors: unknown[] = [];

    // Best-effort rollback: attempt all recovery steps, never abort mid-recovery
    for (const id of writtenVersionIds) {
      try {
        await db.deleteVersion(id);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const id of writtenChartIds) {
      try {
        await db.deleteChart(id);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const chart of existingCharts) {
      try {
        await db.putChart(chart);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const version of existingVersions) {
      try {
        await db.putVersion(version);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const [key, value] of Object.entries(existingLSValues)) {
      try {
        if (value !== null) {
          storage.setItem(key, value);
        } else {
          storage.removeItem(key);
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    if (rollbackErrors.length > 0) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${message} (rollback also failed: ${rollbackErrors.length} recovery step(s) failed)`,
        { cause: error },
      );
    }

    throw error;
  }
}

export async function restoreMerge(db: ChartDB, backup: ArbolBackup): Promise<MergeResult> {
  const result: MergeResult = { chartsAdded: 0, chartsSkipped: 0, versionsAdded: 0 };

  const existingCharts = await db.getAllCharts();
  const existingIds = new Set(existingCharts.map((c) => c.id));

  for (const chart of backup.data.charts) {
    if (existingIds.has(chart.id)) {
      result.chartsSkipped++;
      continue;
    }

    try {
      validateTree(chart.workingTree);
    } catch {
      console.warn(`Backup merge: skipping chart "${chart.name}" (${chart.id}) — invalid tree`);
      result.chartsSkipped++;
      continue;
    }

    await db.putChart(chart);
    result.chartsAdded++;

    // Restore versions for this newly-added chart
    const chartVersions = backup.data.versions.filter((v) => v.chartId === chart.id);
    for (const version of chartVersions) {
      try {
        validateTree(version.tree);
      } catch {
        console.warn(
          `Backup merge: skipping version "${version.name}" (${version.id}) — invalid tree`,
        );
        continue;
      }
      await db.putVersion(version);
      result.versionsAdded++;
    }
  }

  return result;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function restoreLocalStorage(backup: ArbolBackup, storage: IStorage = browserStorage): void {
  const { data } = backup;

  if (data.settings !== null && data.settings !== undefined) {
    storage.setItem(BACKUP_LS_KEYS.settings, JSON.stringify(data.settings));
  }
  if (data.theme !== null && data.theme !== undefined) {
    storage.setItem(BACKUP_LS_KEYS.theme, data.theme);
  }
  if (data.csvMappings !== null && data.csvMappings !== undefined) {
    storage.setItem(BACKUP_LS_KEYS.csvMappings, JSON.stringify(data.csvMappings));
  }
  if (data.customPresets !== null && data.customPresets !== undefined) {
    storage.setItem(BACKUP_LS_KEYS.customPresets, JSON.stringify(data.customPresets));
  }
  if (data.accordionState !== null && data.accordionState !== undefined) {
    storage.setItem(BACKUP_LS_KEYS.accordionState, JSON.stringify(data.accordionState));
  }
}
