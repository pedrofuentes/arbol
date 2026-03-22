import type { CategoryPreset } from '../types';
import { type IStorage, browserStorage } from '../utils/storage';
import { EventEmitter } from '../utils/event-emitter';
import { showToast } from '../ui/toast';
import { t } from '../i18n';

const STORAGE_KEY = 'arbol-category-presets';

export class CategoryPresetStore extends EventEmitter {
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage) {
    super();
    this.storage = storage;
  }

  getPresets(): CategoryPreset[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: unknown) => this.isValidPreset(item)) as CategoryPreset[];
    } catch {
      return [];
    }
  }

  getPreset(name: string): CategoryPreset | undefined {
    return this.getPresets().find((p) => p.name === name);
  }

  savePreset(preset: CategoryPreset): void {
    if (!preset.name?.trim()) throw new Error('Preset name must not be empty');
    if (!preset.categories || preset.categories.length === 0) {
      throw new Error('Categories must not be empty');
    }
    for (const cat of preset.categories) {
      if (!cat.id || !cat.label || !cat.color) {
        throw new Error('Each category must have id, label, and color');
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
      console.error('Failed to save category presets:', e);
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
      console.error('Failed to save category presets:', e);
      showToast(t('error.storage_save_failed'), 'error');
    }
  }

  private isValidPreset(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    if (typeof obj.name !== 'string' || !obj.name.trim()) return false;
    if (!Array.isArray(obj.categories) || obj.categories.length === 0) return false;
    return true;
  }
}
