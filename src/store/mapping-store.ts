import type { MappingPreset } from '../types';
import { type IStorage, browserStorage } from '../utils/storage';

const STORAGE_KEY = 'arbol-csv-mappings';

export class MappingStore {
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage) {
    this.storage = storage;
  }

  getPresets(): MappingPreset[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: unknown) => this.isValidPreset(item)) as MappingPreset[];
    } catch (e) {
      console.warn('Failed to load mapping presets from localStorage:', e);
      return [];
    }
  }

  savePreset(preset: MappingPreset): void {
    const { name, mapping } = preset;
    if (
      !name?.trim() ||
      !mapping?.name?.trim() ||
      !mapping?.title?.trim() ||
      !mapping?.parentRef?.trim()
    ) {
      throw new Error(
        'Preset must have a non-empty name, mapping.name, mapping.title, and mapping.parentRef',
      );
    }

    const presets = this.getPresets();
    const idx = presets.findIndex((p) => p.name === name);
    if (idx >= 0) {
      presets[idx] = preset;
    } else {
      presets.push(preset);
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save mapping presets to localStorage:', e);
    }
  }

  deletePreset(name: string): void {
    const presets = this.getPresets();
    const filtered = presets.filter((p) => p.name !== name);
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to save mapping presets to localStorage:', e);
    }
  }

  getPreset(name: string): MappingPreset | undefined {
    return this.getPresets().find((p) => p.name === name);
  }

  exportPresets(names?: string[]): string {
    const all = this.getPresets();
    const selected = names ? all.filter((p) => names.includes(p.name)) : all;
    return JSON.stringify(selected, null, 2);
  }

  importPresets(json: string): number {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON: expected an array of mapping presets');
    }

    let count = 0;
    for (const item of parsed) {
      if (!this.isValidPreset(item)) continue;
      this.savePreset(item as MappingPreset);
      count++;
    }
    return count;
  }

  private isValidPreset(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    if (typeof obj.name !== 'string' || !obj.name.trim()) return false;
    if (typeof obj.mapping !== 'object' || obj.mapping === null) return false;
    const m = obj.mapping as Record<string, unknown>;
    if (typeof m.name !== 'string' || !m.name.trim()) return false;
    if (typeof m.title !== 'string' || !m.title.trim()) return false;
    if (typeof m.parentRef !== 'string' || !m.parentRef.trim()) return false;
    if (m.parentRefType !== 'id' && m.parentRefType !== 'name') return false;
    return true;
  }
}
