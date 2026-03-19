import type { ColorCategory } from '../types';
import { generateId } from '../utils/id';
import { contrastingTextColor, contrastingTitleColor } from '../utils/contrast';
import { EventEmitter } from '../utils/event-emitter';
import { type IStorage, browserStorage } from '../utils/storage';
import { t } from '../i18n';
import { showToast } from '../ui/toast';

const STORAGE_KEY = 'arbol-categories';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_CATEGORIES: ColorCategory[] = [
  {
    id: 'open-position',
    label: t('category.open_position'),
    color: '#fbbf24',
    nameColor: contrastingTextColor('#fbbf24'),
    titleColor: contrastingTitleColor('#fbbf24'),
  },
  {
    id: 'offer-pending',
    label: t('category.offer_pending'),
    color: '#60a5fa',
    nameColor: contrastingTextColor('#60a5fa'),
    titleColor: contrastingTitleColor('#60a5fa'),
  },
  {
    id: 'future-start',
    label: t('category.future_start'),
    color: '#a78bfa',
    nameColor: contrastingTextColor('#a78bfa'),
    titleColor: contrastingTitleColor('#a78bfa'),
  },
];

export class CategoryStore extends EventEmitter {
  private storage: IStorage;
  private cache: ColorCategory[] | null = null;

  constructor(storage: IStorage = browserStorage) {
    super();
    this.storage = storage;
  }

  getAll(): ColorCategory[] {
    if (this.cache !== null) return this.cache.map((c) => ({ ...c }));
    const stored = this.loadFromStorage();
    const list = stored.length > 0 ? stored : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    this.cache = list.map((c) => this.ensureTextColors(c));
    return this.cache.map((c) => ({ ...c }));
  }

  getById(id: string): ColorCategory | undefined {
    return this.getAll().find((c) => c.id === id);
  }

  add(label: string, color: string): ColorCategory {
    if (!label?.trim()) {
      throw new Error('Category label must not be empty');
    }
    if (!HEX_COLOR_RE.test(color)) {
      throw new Error(`Invalid color format: ${color}`);
    }

    const category: ColorCategory = {
      id: generateId(),
      label: label.trim(),
      color,
      nameColor: contrastingTextColor(color),
      titleColor: contrastingTitleColor(color),
    };
    const current = this.getAll();
    current.push(category);
    this.cache = current;
    this.saveToStorage(current);
    this.emit();
    return category;
  }

  update(id: string, fields: { label?: string; color?: string; nameColor?: string; titleColor?: string }): void {
    const categories = this.getAll();
    const category = categories.find((c) => c.id === id);
    if (!category) {
      throw new Error(`Category not found: ${id}`);
    }

    if (fields.label !== undefined) {
      if (!fields.label.trim()) {
        throw new Error('Category label must not be empty');
      }
      category.label = fields.label.trim();
    }
    if (fields.color !== undefined) {
      if (!HEX_COLOR_RE.test(fields.color)) {
        throw new Error(`Invalid color format: ${fields.color}`);
      }
      category.color = fields.color;
      // Recompute text colors when background changes
      category.nameColor = contrastingTextColor(fields.color);
      category.titleColor = contrastingTitleColor(fields.color);
    }
    if (fields.nameColor !== undefined) {
      if (!HEX_COLOR_RE.test(fields.nameColor)) {
        throw new Error(`Invalid color format: ${fields.nameColor}`);
      }
      category.nameColor = fields.nameColor;
    }
    if (fields.titleColor !== undefined) {
      if (!HEX_COLOR_RE.test(fields.titleColor)) {
        throw new Error(`Invalid color format: ${fields.titleColor}`);
      }
      category.titleColor = fields.titleColor;
    }

    this.cache = categories;
    this.saveToStorage(categories);
    this.emit();
  }

  remove(id: string): void {
    const categories = this.getAll();
    const filtered = categories.filter((c) => c.id !== id);
    this.cache = filtered;
    this.saveToStorage(filtered);
    this.emit();
  }

  replaceAll(categories: ColorCategory[]): void {
    const processed = categories.map((c) => this.ensureTextColors(c));
    this.cache = processed;
    this.saveToStorage(processed);
    this.emit();
  }

  invalidateCache(): void {
    this.cache = null;
  }

  /** Ensure text colors exist on a category (migration for old data). */
  private ensureTextColors(cat: ColorCategory): ColorCategory {
    if (!cat.nameColor || !cat.titleColor) {
      return {
        ...cat,
        nameColor: cat.nameColor ?? contrastingTextColor(cat.color),
        titleColor: cat.titleColor ?? contrastingTitleColor(cat.color),
      };
    }
    return cat;
  }

  private loadFromStorage(): ColorCategory[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item: unknown): item is ColorCategory =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ColorCategory).id === 'string' &&
          typeof (item as ColorCategory).label === 'string' &&
          typeof (item as ColorCategory).color === 'string',
      );
    } catch (e) {
      console.warn('Failed to load categories from localStorage:', e);
      return [];
    }
  }

  private saveToStorage(categories: ColorCategory[]): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage:', e);
      showToast(t('error.storage_save_failed'), 'error');
    }
  }

}
