import { timestampedFilename } from '../utils/filename';
import { type IStorage, browserStorage } from '../utils/storage';

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
  textAlign: string;
  textPaddingHorizontal: number;
  fontFamily: string;
  nameColor: string;
  titleColor: string;
  linkColor: string;
  linkWidth: number;
  dottedLineDash: string;
  cardFill: string;
  cardStroke: string;
  cardStrokeWidth: number;
  cardBorderRadius: number;
  icContainerFill: string;
  icContainerBorderRadius: number;
  showHeadcount: boolean;
  headcountBadgeColor: string;
  headcountBadgeTextColor: string;
  headcountBadgeFontSize: number;
  headcountBadgeRadius: number;
  headcountBadgePadding: number;
  headcountBadgeHeight: number;
  legendRows: number;
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
  'nodeWidth',
  'nodeHeight',
  'horizontalSpacing',
  'branchSpacing',
  'topVerticalSpacing',
  'bottomVerticalSpacing',
  'icNodeWidth',
  'icGap',
  'icContainerPadding',
  'palTopGap',
  'palBottomGap',
  'palRowGap',
  'palCenterGap',
  'nameFontSize',
  'titleFontSize',
  'textPaddingTop',
  'textGap',
  'textPaddingHorizontal',
  'cardBorderRadius',
  'icContainerBorderRadius',
  'linkWidth',
  'cardStrokeWidth',
  'headcountBadgeFontSize',
  'headcountBadgeRadius',
  'headcountBadgePadding',
  'headcountBadgeHeight',
  'legendRows',
]);

const STRING_KEYS: ReadonlySet<string> = new Set<string>([
  'linkColor',
  'cardFill',
  'cardStroke',
  'icContainerFill',
  'headcountBadgeColor',
  'headcountBadgeTextColor',
  'nameColor',
  'titleColor',
]);

const DASH_PATTERN_KEYS: ReadonlySet<string> = new Set<string>(['dottedLineDash']);

const BOOLEAN_KEYS: ReadonlySet<string> = new Set<string>(['showHeadcount']);

const ENUM_KEYS: ReadonlyMap<string, readonly string[]> = new Map([
  ['textAlign', ['left', 'center', 'right', 'start', 'end']],
  ['fontFamily', ['Calibri', 'Arial', 'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Segoe UI', 'Microsoft Sans Serif']],
]);

const ALL_KEYS = [
  ...NUMERIC_KEYS,
  ...STRING_KEYS,
  ...DASH_PATTERN_KEYS,
  ...BOOLEAN_KEYS,
  ...ENUM_KEYS.keys(),
];

function validateSettings(obj: Record<string, unknown>): Partial<PersistableSettings> {
  const result: Record<string, unknown> = {};
  for (const key of ALL_KEYS) {
    if (!(key in obj)) continue;
    const val = obj[key];
    if (ENUM_KEYS.has(key)) {
      const allowed = ENUM_KEYS.get(key)!;
      if (typeof val !== 'string' || !allowed.includes(val)) {
        throw new Error(
          `Invalid value for "${key}": expected one of ${allowed.map((v) => `"${v}"`).join(', ')}`,
        );
      }
      result[key] = val;
    } else if (BOOLEAN_KEYS.has(key)) {
      if (typeof val !== 'boolean') {
        throw new Error(`Invalid value for "${key}": expected a boolean`);
      }
      result[key] = val;
    } else if (NUMERIC_KEYS.has(key)) {
      if (typeof val !== 'number' || !isFinite(val)) {
        throw new Error(`Invalid value for "${key}": expected a finite number`);
      }
      result[key] = val;
    } else if (DASH_PATTERN_KEYS.has(key)) {
      if (typeof val !== 'string') {
        throw new Error(`Invalid value for "${key}": expected a string`);
      }
      if (!/^[\d]+([.,][\d]+)*$/.test(val.replace(/\s/g, ''))) {
        throw new Error(
          `Invalid dash pattern for "${key}": expected comma-separated numbers (e.g., "6,4")`,
        );
      }
      result[key] = val;
    } else {
      if (typeof val !== 'string') {
        throw new Error(`Invalid value for "${key}": expected a string`);
      }
      if (!/^#[0-9a-fA-F]{3,8}$|^rgba?\([\d\s,./%]+\)$|^var\(--[\w-]+\)$/.test(val)) {
        throw new Error(
          `Invalid color value for "${key}": must be a hex color, rgb(), or CSS variable`,
        );
      }
      result[key] = val;
    }
  }
  return result as Partial<PersistableSettings>;
}

export class SettingsStore {
  private static STORAGE_KEY = 'arbol-settings';
  private static CURRENT_VERSION = 1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage) {
    this.storage = storage;
  }

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
      const raw = this.storage.getItem(SettingsStore.STORAGE_KEY);
      if (!raw) return { ...defaults };
      const envelope: StorageEnvelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || !envelope.settings) {
        return { ...defaults };
      }
      const validated = validateSettings(envelope.settings as Record<string, unknown>);
      return { ...defaults, ...validated };
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
      return { ...defaults };
    }
  }

  hasSaved(): boolean {
    return this.storage.getItem(SettingsStore.STORAGE_KEY) !== null;
  }

  clear(): void {
    this.storage.removeItem(SettingsStore.STORAGE_KEY);
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
    a.download = timestampedFilename(`${exportObj.name}.arbol-settings.json`);
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
      name: name ?? 'arbol-settings',
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
    try {
      this.storage.setItem(SettingsStore.STORAGE_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }

  private loadRaw(): Partial<PersistableSettings> | null {
    try {
      const raw = this.storage.getItem(SettingsStore.STORAGE_KEY);
      if (!raw) return null;
      const envelope: StorageEnvelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || !envelope.settings) return null;
      return envelope.settings;
    } catch (e) {
      console.warn('Failed to load raw settings from localStorage:', e);
      return null;
    }
  }
}
