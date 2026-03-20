import type { LevelMapping, LevelDisplayMode, ChartRecord } from '../types';
import { EventEmitter } from '../utils/event-emitter';

const VALID_DISPLAY_MODES: LevelDisplayMode[] = ['original', 'mapped'];
const MAX_RAW_LEVEL_LENGTH = 50;
const MAX_DISPLAY_TITLE_LENGTH = 100;
const CSV_HEADER = 'raw_level,display_title';
const HEADER_RE = /level|raw/i;

export class LevelStore extends EventEmitter {
  private mappings: LevelMapping[] = [];
  private displayMode: LevelDisplayMode = 'original';
  private cache: Map<string, string> | null = null;

  // === CRUD ===

  getMappings(): LevelMapping[] {
    return this.mappings.map(m => ({ ...m }));
  }

  getMapping(rawLevel: string): LevelMapping | undefined {
    const m = this.mappings.find(m => m.rawLevel === rawLevel);
    return m ? { ...m } : undefined;
  }

  addMapping(rawLevel: string, displayTitle: string): void {
    const trimmedRaw = rawLevel.trim();
    const trimmedTitle = displayTitle.trim();

    if (!trimmedRaw) throw new Error('rawLevel must not be empty');
    if (!trimmedTitle) throw new Error('displayTitle must not be empty');
    if (trimmedRaw.length > MAX_RAW_LEVEL_LENGTH) {
      throw new Error(`rawLevel exceeds max length of ${MAX_RAW_LEVEL_LENGTH}`);
    }
    if (trimmedTitle.length > MAX_DISPLAY_TITLE_LENGTH) {
      throw new Error(`displayTitle exceeds max length of ${MAX_DISPLAY_TITLE_LENGTH}`);
    }
    if (this.mappings.some(m => m.rawLevel === trimmedRaw)) {
      throw new Error(`Duplicate rawLevel: ${trimmedRaw}`);
    }

    this.mappings.push({ rawLevel: trimmedRaw, displayTitle: trimmedTitle });
    this.invalidateCache();
    this.emit();
  }

  updateMapping(rawLevel: string, displayTitle: string): void {
    const mapping = this.mappings.find(m => m.rawLevel === rawLevel);
    if (!mapping) throw new Error(`Mapping not found: ${rawLevel}`);
    mapping.displayTitle = displayTitle.trim();
    this.invalidateCache();
    this.emit();
  }

  removeMapping(rawLevel: string): void {
    this.mappings = this.mappings.filter(m => m.rawLevel !== rawLevel);
    this.invalidateCache();
    this.emit();
  }

  replaceAll(mappings: LevelMapping[]): void {
    const seen = new Set<string>();
    for (const m of mappings) {
      if (seen.has(m.rawLevel)) {
        throw new Error(`Duplicate rawLevel: ${m.rawLevel}`);
      }
      seen.add(m.rawLevel);
    }
    this.mappings = mappings.map(m => ({ ...m }));
    this.invalidateCache();
    this.emit();
  }

  // === Display Mode ===

  getDisplayMode(): LevelDisplayMode {
    return this.displayMode;
  }

  setDisplayMode(mode: LevelDisplayMode): void {
    if (!VALID_DISPLAY_MODES.includes(mode)) {
      throw new Error(`Invalid display mode: ${mode}`);
    }
    this.displayMode = mode;
    this.invalidateCache();
    this.emit();
  }

  // === Resolution ===

  /**
   * Resolves the display title for a node based on its level.
   * Returns the mapped display title if mode is 'mapped' and a mapping exists,
   * otherwise returns undefined (caller should use original title).
   */
  resolveTitle(rawLevel: string | undefined): string | undefined {
    if (!rawLevel) return undefined;
    if (this.displayMode === 'original') return undefined;

    // 'mapped'
    if (!this.cache) this.cache = this.buildCache();
    return this.cache.get(rawLevel);
  }

  /**
   * @deprecated Use resolveTitle() instead. Kept for backward compatibility.
   */
  resolve(rawLevel: string | undefined): string {
    if (!rawLevel) return '';
    if (this.displayMode === 'original') return rawLevel;
    if (!this.cache) this.cache = this.buildCache();
    return this.cache.get(rawLevel) ?? rawLevel;
  }

  // === CSV Import/Export ===

  importFromCsv(csvText: string): number {
    if (!csvText.trim()) return 0;

    const lines = csvText.split('\n');
    let start = 0;

    if (lines.length > 0 && HEADER_RE.test(lines[0])) {
      start = 1;
    }

    let count = 0;
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const commaIdx = line.indexOf(',');
      if (commaIdx < 0) continue;

      const raw = line.slice(0, commaIdx).trim();
      const title = line.slice(commaIdx + 1).trim();
      if (!raw || !title) continue;

      const existing = this.mappings.find(m => m.rawLevel === raw);
      if (existing) {
        existing.displayTitle = title;
      } else {
        this.mappings.push({ rawLevel: raw, displayTitle: title });
      }
      count++;
    }

    this.invalidateCache();
    if (count > 0) this.emit();
    return count;
  }

  exportToCsv(): string {
    const rows = this.mappings.map(m => `${m.rawLevel},${m.displayTitle}`);
    return [CSV_HEADER, ...rows].join('\n');
  }

  // === Chart Integration ===

  loadFromChart(chart: ChartRecord): void {
    this.mappings = (chart.levelMappings ?? []).map(m => ({ ...m }));
    this.displayMode = chart.levelDisplayMode ?? 'original';
    this.invalidateCache();
    this.emit();
  }

  toChartData(): { levelMappings: LevelMapping[]; levelDisplayMode: LevelDisplayMode } {
    return {
      levelMappings: this.mappings.map(m => ({ ...m })),
      levelDisplayMode: this.displayMode,
    };
  }

  // === Internal ===

  private invalidateCache(): void {
    this.cache = null;
  }

  private buildCache(): Map<string, string> {
    const map = new Map<string, string>();
    for (const m of this.mappings) {
      map.set(m.rawLevel, m.displayTitle);
    }
    return map;
  }
}
