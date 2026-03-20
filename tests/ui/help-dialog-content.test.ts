import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showHelpDialog } from '../../src/ui/help-dialog';
const lsMock = (() => { let s: Record<string, string> = {}; return { getItem: vi.fn((k: string) => s[k] ?? null), setItem: vi.fn((k: string, v: string) => { s[k] = v; }), removeItem: vi.fn((k: string) => { delete s[k]; }), clear: vi.fn(() => { s = {}; }) }; })();
Object.defineProperty(globalThis, 'localStorage', { value: lsMock });
describe('help-dialog content', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });
  it('Color Categories', () => { showHelpDialog(); const h = document.querySelectorAll('.help-section-header'); expect(Array.from(h).some(t => t.textContent!.includes('Color Categories'))).toBe(true); });
  it('dotted lines', () => { showHelpDialog(); expect(document.body.textContent).toContain('Dotted lines'); });
  it('comparison', () => { showHelpDialog(); expect(document.body.textContent).toContain('Version Comparison'); });
  it('advisor', () => { showHelpDialog(); expect(document.body.textContent).toContain('Chief of Staff'); });
  it('Analytics section exists', () => { showHelpDialog(); const h = document.querySelectorAll('.help-section-header'); expect(Array.from(h).some(t => t.textContent!.includes('Analytics'))).toBe(true); });
  it('Analytics section explains ratio', () => { showHelpDialog(); expect(document.body.textContent).toContain('Manager-to-IC Ratio'); });
  it('Analytics section explains span', () => { showHelpDialog(); expect(document.body.textContent).toContain('Span of Control'); });
});
