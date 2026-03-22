import type { LevelMappingPreset } from '../types';
import { type IStorage, browserStorage } from '../utils/storage';
import { EventEmitter } from '../utils/event-emitter';
import { showToast } from '../ui/toast';
import { t } from '../i18n';

const STORAGE_KEY = 'arbol-level-presets';

export class LevelPresetStore extends EventEmitter {
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage) {
    super();
    this.storage = storage;
  }

  getPresets(): LevelMappingPreset[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: unknown) => this.isValidPreset(item)) as LevelMappingPreset[];
    } catch {
      return [];
    }
  }

  getPreset(name: string): LevelMappingPreset | undefined {
    return this.getPresets().find((p) => p.name === name);
  }

  savePreset(preset: LevelMappingPreset): void {
    if (!preset.name?.trim()) throw new Error('Preset name must not be empty');
    if (!preset.levelMappings || preset.levelMappings.length === 0) {
      throw new Error('Level mappings must not be empty');
    }
    for (const m of preset.levelMappings) {
      if (!m.rawLevel || !m.displayTitle) {
        throw new Error('Each mapping must have rawLevel and displayTitle');
      }
    }

    const presets = this.getPresets();
    const idx = presets.findIndex((p) => p.name === preset.name);
    if (idx >= 0) {
      presets[idx] = preset;
    } else {
      presets.push(preset);
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save level presets:', e);
      showToast(t('error.storage_save_failed'), 'error');
    }
    this.emit();
  }

  deletePreset(name: string): void {
    const presets = this.getPresets();
    const filtered = presets.filter((p) => p.name !== name);
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      this.emit();
    } catch (e) {
      console.error('Failed to save level presets:', e);
      showToast(t('error.storage_save_failed'), 'error');
    }
  }

  private isValidPreset(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    if (typeof obj.name !== 'string' || !obj.name.trim()) return false;
    if (!Array.isArray(obj.levelMappings) || obj.levelMappings.length === 0) return false;
    if (obj.levelDisplayMode !== 'original' && obj.levelDisplayMode !== 'mapped') return false;
    return true;
  }
}
