export type Theme = 'dark' | 'light';

export class ThemeManager {
  private static STORAGE_KEY = 'arbol-theme';
  private currentTheme: Theme;
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem(ThemeManager.STORAGE_KEY);
    this.currentTheme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
    this.apply();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem(ThemeManager.STORAGE_KEY, theme);
    this.apply();
    this.emit();
  }

  toggle(): void {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  onChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private apply(): void {
    const html = document.documentElement;
    if (this.currentTheme === 'light') {
      html.classList.add('theme-light');
    } else {
      html.classList.remove('theme-light');
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentTheme);
    }
  }
}
