import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeManager, type Theme } from '../../src/store/theme-manager';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  document.documentElement.classList.remove('theme-light');
});

describe('ThemeManager', () => {
  it('defaults to dark theme', () => {
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('dark');
  });

  it('restores saved theme from localStorage', () => {
    localStorageMock.setItem('chartit-theme', 'light');
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('light');
  });

  it('defaults to dark when localStorage has invalid value', () => {
    localStorageMock.setItem('chartit-theme', 'invalid');
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
    localStorageMock.setItem('chartit-theme', 'light');
    const tm = new ThemeManager();
    expect(tm.getTheme()).toBe('light');
    tm.toggle();
    expect(tm.getTheme()).toBe('dark');
  });

  it('setTheme() persists to localStorage', () => {
    const tm = new ThemeManager();
    vi.clearAllMocks();
    tm.setTheme('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('chartit-theme', 'light');
    tm.setTheme('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('chartit-theme', 'dark');
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
    localStorageMock.setItem('chartit-theme', 'light');
    new ThemeManager();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('onChange listener fires on theme change', () => {
    const tm = new ThemeManager();
    const listener = vi.fn();
    tm.onChange(listener);
    tm.setTheme('light');
    expect(listener).toHaveBeenCalledWith('light');
    tm.setTheme('dark');
    expect(listener).toHaveBeenCalledWith('dark');
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
