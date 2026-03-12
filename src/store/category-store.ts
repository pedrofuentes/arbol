import type { ColorCategory } from '../types';
import { generateId } from '../utils/id';

type ChangeListener = () => void;

const STORAGE_KEY = 'arbol-categories';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_CATEGORIES: ColorCategory[] = [
  { id: 'open-position', label: 'Open Position', color: '#fbbf24' },
  { id: 'offer-pending', label: 'Offer Pending', color: '#60a5fa' },
  { id: 'future-start', label: 'Future Start', color: '#a78bfa' },
];

export class CategoryStore {
  private listeners: Set<ChangeListener> = new Set();

  getAll(): ColorCategory[] {
    const stored = this.loadFromStorage();
    return stored.length > 0 ? stored : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
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

    const category: ColorCategory = { id: generateId(), label: label.trim(), color };
    const categories = this.loadFromStorage();
    const list = categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    list.push(category);
    this.saveToStorage(list);
    this.emit();
    return category;
  }

  update(id: string, fields: { label?: string; color?: string }): void {
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

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
