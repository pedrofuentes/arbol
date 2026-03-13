import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateTimestamp, timestampedFilename } from '../../src/utils/filename';

describe('generateTimestamp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a 12-character string', () => {
    const result = generateTimestamp();
    expect(result).toHaveLength(12);
  });

  it('contains only digits', () => {
    const result = generateTimestamp();
    expect(result).toMatch(/^\d{12}$/);
  });

  it('formats a known date correctly', () => {
    const date = new Date(2026, 2, 13, 9, 5); // March 13 2026 09:05
    expect(generateTimestamp(date)).toBe('202603130905');
  });

  it('zero-pads single-digit months', () => {
    const date = new Date(2026, 0, 15, 14, 30); // January
    expect(generateTimestamp(date)).toBe('202601151430');
  });

  it('zero-pads single-digit days', () => {
    const date = new Date(2026, 11, 3, 8, 7); // Dec 3
    expect(generateTimestamp(date)).toBe('202612030807');
  });

  it('zero-pads single-digit hours and minutes', () => {
    const date = new Date(2026, 5, 10, 1, 2);
    expect(generateTimestamp(date)).toBe('202606100102');
  });

  it('handles midnight correctly', () => {
    const date = new Date(2026, 0, 1, 0, 0);
    expect(generateTimestamp(date)).toBe('202601010000');
  });

  it('handles end-of-day correctly', () => {
    const date = new Date(2026, 11, 31, 23, 59);
    expect(generateTimestamp(date)).toBe('202612312359');
  });

  it('uses current date when no argument is provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 4, 15, 42));
    expect(generateTimestamp()).toBe('202607041542');
  });
});

describe('timestampedFilename', () => {
  it('prefixes a base filename with a timestamp', () => {
    const date = new Date(2026, 2, 13, 14, 30);
    expect(timestampedFilename('org-chart.pptx', date)).toBe(
      '202603131430-org-chart.pptx',
    );
  });

  it('works with JSON filenames', () => {
    const date = new Date(2026, 0, 1, 0, 0);
    expect(timestampedFilename('arbol-mappings.json', date)).toBe(
      '202601010000-arbol-mappings.json',
    );
  });

  it('works with compound filenames', () => {
    const date = new Date(2026, 5, 15, 9, 5);
    expect(timestampedFilename('my-preset.arbol-settings.json', date)).toBe(
      '202606150905-my-preset.arbol-settings.json',
    );
  });

  it('uses current date when no date argument is provided', () => {
    const result = timestampedFilename('test.json');
    expect(result).toMatch(/^\d{12}-test\.json$/);
  });
});
