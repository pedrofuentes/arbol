import type { MappingPreset } from '../types';

const STORAGE_KEY = 'chartit-csv-mappings';

export class MappingStore {
  getPresets(): MappingPreset[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as MappingPreset[];
    } catch {
      return [];
    }
  }

  savePreset(preset: MappingPreset): void {
    const { name, mapping } = preset;
    if (!name?.trim() || !mapping?.name?.trim() || !mapping?.title?.trim() || !mapping?.parentRef?.trim()) {
      throw new Error('Preset must have a non-empty name, mapping.name, mapping.title, and mapping.parentRef');
    }

    const presets = this.getPresets();
    const idx = presets.findIndex((p) => p.name === name);
    if (idx >= 0) {
      presets[idx] = preset;
    } else {
      presets.push(preset);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }

  deletePreset(name: string): void {
    const presets = this.getPresets();
    const filtered = presets.filter((p) => p.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  getPreset(name: string): MappingPreset | undefined {
    return this.getPresets().find((p) => p.name === name);
  }
}
