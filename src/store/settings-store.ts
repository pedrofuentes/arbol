export interface PersistableSettings {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  branchSpacing: number;
  topVerticalSpacing: number;
  bottomVerticalSpacing: number;
  icNodeWidth: number;
  icGap: number;
  icContainerPadding: number;
  palTopGap: number;
  palBottomGap: number;
  palRowGap: number;
  palCenterGap: number;
  nameFontSize: number;
  titleFontSize: number;
  textPaddingTop: number;
  textGap: number;
  linkColor: string;
  linkWidth: number;
  cardFill: string;
  cardStroke: string;
  cardStrokeWidth: number;
  icContainerFill: string;
}

export interface SettingsExport {
  version: number;
  name: string;
  timestamp: string;
  settings: PersistableSettings;
}

interface StorageEnvelope {
  version: number;
  settings: Partial<PersistableSettings>;
}

const NUMERIC_KEYS: ReadonlySet<string> = new Set<string>([
  'nodeWidth', 'nodeHeight', 'horizontalSpacing', 'branchSpacing',
  'topVerticalSpacing', 'bottomVerticalSpacing', 'icNodeWidth', 'icGap',
  'icContainerPadding', 'palTopGap', 'palBottomGap', 'palRowGap',
  'palCenterGap', 'nameFontSize', 'titleFontSize', 'textPaddingTop',
  'textGap', 'linkWidth', 'cardStrokeWidth',
]);

const STRING_KEYS: ReadonlySet<string> = new Set<string>([
  'linkColor', 'cardFill', 'cardStroke', 'icContainerFill',
]);

const ALL_KEYS = [...NUMERIC_KEYS, ...STRING_KEYS];

function validateSettings(obj: Record<string, unknown>): Partial<PersistableSettings> {
  const result: Record<string, unknown> = {};
  for (const key of ALL_KEYS) {
    if (!(key in obj)) continue;
    const val = obj[key];
    if (NUMERIC_KEYS.has(key)) {
      if (typeof val !== 'number' || !isFinite(val)) {
        throw new Error(`Invalid value for "${key}": expected a finite number`);
      }
      result[key] = val;
    } else {
      if (typeof val !== 'string') {
        throw new Error(`Invalid value for "${key}": expected a string`);
      }
      result[key] = val;
    }
  }
  return result as Partial<PersistableSettings>;
}

export class SettingsStore {
  private static STORAGE_KEY = 'chartit-settings';
  private static CURRENT_VERSION = 1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  save(settings: Partial<PersistableSettings>): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.writeToStorage(settings);
    }, 300);
  }

  saveImmediate(settings: Partial<PersistableSettings>): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.writeToStorage(settings);
  }

  load(defaults: PersistableSettings): PersistableSettings {
    try {
      const raw = localStorage.getItem(SettingsStore.STORAGE_KEY);
      if (!raw) return { ...defaults };
      const envelope: StorageEnvelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || !envelope.settings) {
        return { ...defaults };
      }
      const validated = validateSettings(envelope.settings as Record<string, unknown>);
      return { ...defaults, ...validated };
    } catch {
      return { ...defaults };
    }
  }

  hasSaved(): boolean {
    return localStorage.getItem(SettingsStore.STORAGE_KEY) !== null;
  }

  clear(): void {
    localStorage.removeItem(SettingsStore.STORAGE_KEY);
  }

  exportToFile(name?: string): void {
    const saved = this.loadRaw();
    const settings = saved ?? ({} as PersistableSettings);
    const exportObj = this.createExport(settings as PersistableSettings, name);
    const json = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportObj.name}.chartit-settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromFile(jsonContent: string): PersistableSettings {
    const settings = this.parseImport(jsonContent);
    this.writeToStorage(settings);
    return settings;
  }

  createExport(settings: PersistableSettings, name?: string): SettingsExport {
    return {
      version: SettingsStore.CURRENT_VERSION,
      name: name ?? 'chartit-settings',
      timestamp: new Date().toISOString(),
      settings,
    };
  }

  parseImport(jsonContent: string): PersistableSettings {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error('Invalid JSON');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid settings file: expected an object');
    }

    const obj = parsed as Record<string, unknown>;

    if (!('settings' in obj) || !obj.settings || typeof obj.settings !== 'object') {
      throw new Error('Invalid settings file: missing "settings" field');
    }

    if (!('version' in obj) || typeof obj.version !== 'number') {
      throw new Error('Invalid settings file: missing "version" field');
    }

    const settingsObj = obj.settings as Record<string, unknown>;
    const validated = validateSettings(settingsObj);

    // Ensure all keys are present
    for (const key of ALL_KEYS) {
      if (!(key in validated)) {
        throw new Error(`Invalid settings file: missing setting "${key}"`);
      }
    }

    return validated as PersistableSettings;
  }

  private writeToStorage(settings: Partial<PersistableSettings>): void {
    const existing = this.loadRaw() ?? {};
    const merged = { ...existing, ...settings };
    const envelope: StorageEnvelope = {
      version: SettingsStore.CURRENT_VERSION,
      settings: merged,
    };
    localStorage.setItem(SettingsStore.STORAGE_KEY, JSON.stringify(envelope));
  }

  private loadRaw(): Partial<PersistableSettings> | null {
    try {
      const raw = localStorage.getItem(SettingsStore.STORAGE_KEY);
      if (!raw) return null;
      const envelope: StorageEnvelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || !envelope.settings) return null;
      return envelope.settings;
    } catch {
      return null;
    }
  }
}
