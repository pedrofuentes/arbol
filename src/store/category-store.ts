import type { ColorCategory } from '../types';
import { generateId } from '../utils/id';
import { contrastingTextColor, contrastingTitleColor } from '../utils/contrast';

type ChangeListener = () => void;

const STORAGE_KEY = 'arbol-categories';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_CATEGORIES: ColorCategory[] = [
  {
    id: 'open-position',
    label: 'Open Position',
    color: '#fbbf24',
    nameColor: contrastingTextColor('#fbbf24'),
    titleColor: contrastingTitleColor('#fbbf24'),
  },
  {
    id: 'offer-pending',
    label: 'Offer Pending',
    color: '#60a5fa',
    nameColor: contrastingTextColor('#60a5fa'),
    titleColor: contrastingTitleColor('#60a5fa'),
  },
  {
    id: 'future-start',
    label: 'Future Start',
    color: '#a78bfa',
    nameColor: contrastingTextColor('#a78bfa'),
    titleColor: contrastingTitleColor('#a78bfa'),
  },
];

export class CategoryStore {
  private listeners: Set<ChangeListener> = new Set();

  getAll(): ColorCategory[] {
    const stored = this.loadFromStorage();
    const list = stored.length > 0 ? stored : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    return list.map((c) => this.ensureTextColors(c));
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
    const categories = this.loadFromStorage();
    const list = categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    list.push(category);
    this.saveToStorage(list);
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

    this.saveToStorage(categories);
    this.emit();
  }

  remove(id: string): void {
    const categories = this.getAll();
    const filtered = categories.filter((c) => c.id !== id);
    this.saveToStorage(filtered);
    this.emit();
  }

  replaceAll(categories: ColorCategory[]): void {
    const processed = categories.map((c) => this.ensureTextColors(c));
    this.saveToStorage(processed);
    this.emit();
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
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
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage:', e);
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('CategoryStore listener error:', e);
      }
    }
  }
}
