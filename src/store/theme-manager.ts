import { type IStorage, browserStorage } from '../utils/storage';
import { EventEmitter } from '../utils/event-emitter';

export type Theme = 'dark' | 'light';

export class ThemeManager extends EventEmitter<Theme> {
  private static STORAGE_KEY = 'arbol-theme';
  private currentTheme: Theme;
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage) {
    super();
    this.storage = storage;
    const saved = this.storage.getItem(ThemeManager.STORAGE_KEY);
    this.currentTheme = saved === 'light' || saved === 'dark' ? saved : 'dark';
    this.apply();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.storage.setItem(ThemeManager.STORAGE_KEY, theme);
    this.apply();
    this.emit(this.currentTheme);
  }

  toggle(): void {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  private apply(): void {
    const html = document.documentElement;
    if (this.currentTheme === 'light') {
      html.classList.add('theme-light');
    } else {
      html.classList.remove('theme-light');
    }
  }
}
