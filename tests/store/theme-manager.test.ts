import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { ThemeManager } from '../../src/store/theme-manager';

let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  setItemSpy = vi.spyOn(localStorage, 'setItem');
});

afterAll(() => {
  setItemSpy.mockRestore();
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.classList.remove('theme-light');
});

describe('ThemeManager', () => {
  it('defaults to dark theme', () => {
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('dark');
  });

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('arbol-theme', 'light');
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('light');
  });

  it('defaults to dark when localStorage has invalid value', () => {
    localStorage.setItem('arbol-theme', 'invalid');
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('dark');
  });

  it('toggle() switches from dark to light', () => {
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('dark');
    tm.toggle();
    expect(tm.getTheme()).toBe('light');
  });

  it('toggle() switches from light to dark', () => {
    localStorage.setItem('arbol-theme', 'light');
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('light');
    tm.toggle();
    expect(tm.getTheme()).toBe('dark');
  });

  it('setTheme() persists to localStorage', () => {
    const tm = new ThemeManager();
    vi.clearAllMocks();
    tm.setTheme('light');
    expect(setItemSpy).toHaveBeenCalledWith('arbol-theme', 'light');
    tm.setTheme('dark');
    expect(setItemSpy).toHaveBeenCalledWith('arbol-theme', 'dark');
  });

  it('apply() adds .theme-light on documentElement for light theme', () => {
    const tm = new ThemeManager();
    tm.setTheme('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('apply() removes .theme-light on documentElement for dark theme', () => {
    const tm = new ThemeManager();
    tm.setTheme('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    tm.setTheme('dark');
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
  });

  it('apply() is called during construction with saved light theme', () => {
    localStorage.setItem('arbol-theme', 'light');
    new ThemeManager();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('onChange listener fires on theme change with no arguments', () => {
    const tm = new ThemeManager();
    const listener = vi.fn();
    tm.onChange(listener);
    tm.setTheme('light');
    expect(listener).toHaveBeenCalledWith();
    tm.setTheme('dark');
    expect(listener).toHaveBeenCalledWith();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe removes the listener', () => {
    const tm = new ThemeManager();
    const listener = vi.fn();
    const unsub = tm.onChange(listener);
    tm.setTheme('light');
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    tm.setTheme('dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
