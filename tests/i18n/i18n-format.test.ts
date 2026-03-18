import { describe, it, expect, beforeEach } from 'vitest';
import { setLocale, td, tn } from '../../src/i18n';
import en from '../../src/i18n/en';

describe('td() – date formatting', () => {
  beforeEach(() => {
    setLocale('en', en);
  });

  it('formats a date using the current locale', () => {
    const date = new Date(2024, 0, 15);
    const result = td(date);
    expect(result).toMatch(/Jan|1\/15/);
  });

  it('accepts Intl.DateTimeFormatOptions', () => {
    const date = new Date(2024, 0, 15);
    const result = td(date, { year: 'numeric', month: 'long' });
    expect(result).toContain('January');
    expect(result).toContain('2024');
  });

  it('respects locale set via setLocale()', () => {
    setLocale('de', {});
    const date = new Date(2024, 0, 15);
    const result = td(date, { year: 'numeric', month: 'long' });
    expect(result).toContain('Januar');
    expect(result).toContain('2024');
  });

  it('formats with short month style', () => {
    const date = new Date(2024, 5, 20);
    const result = td(date, { year: 'numeric', month: 'short', day: 'numeric' });
    expect(result).toContain('Jun');
    expect(result).toContain('20');
  });
});

describe('tn() – number formatting', () => {
  beforeEach(() => {
    setLocale('en', en);
  });

  it('formats a number with thousand separators for en locale', () => {
    const result = tn(1234.5);
    expect(result).toBe('1,234.5');
  });

  it('formats a number for de locale', () => {
    setLocale('de', {});
    const result = tn(1234.5);
    expect(result).toBe('1.234,5');
  });

  it('respects locale changes via setLocale()', () => {
    expect(tn(1000)).toBe('1,000');
    setLocale('fr', {});
    const result = tn(1000);
    expect(result).toMatch(/1[\s\u00A0\u202F]000/);
  });

  it('accepts Intl.NumberFormatOptions', () => {
    const result = tn(0.75, { style: 'percent' });
    expect(result).toBe('75%');
  });

  it('formats currency when options provided', () => {
    const result = tn(1234.5, { style: 'currency', currency: 'USD' });
    expect(result).toContain('1,234.50');
  });

  it('formats integers without decimal', () => {
    const result = tn(1000);
    expect(result).toBe('1,000');
  });
});
