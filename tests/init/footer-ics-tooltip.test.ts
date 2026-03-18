import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { buildFooter } from '../../src/init/footer-builder';
import { OrgStore } from '../../src/store/org-store';
let s1: any, s2: any;
beforeAll(() => { s1 = vi.spyOn(localStorage, 'setItem'); s2 = vi.spyOn(localStorage, 'getItem').mockReturnValue(null); setLocale('en', en); });
afterAll(() => { s1.mockRestore(); s2.mockRestore(); });
const ROOT = { id: 'root', name: 'CEO', title: 'CEO', children: [{ id: 'i1', name: 'A', title: 'B' }, { id: 'i2', name: 'C', title: 'D' }] };
function makeDeps(): any { const footer = document.createElement('footer'); document.body.appendChild(footer); return { store: new OrgStore(structuredClone(ROOT)), renderer: { getZoomManager: () => ({ getRelativeZoomPercent: () => 100, onZoom: () => () => {} }), getLastLayout: () => null, getOptions: () => ({}) }, categoryStore: { getAll: () => [] }, chartStore: { getActiveChart: async () => null }, focusMode: { getVisibleTree: () => ROOT }, selection: { hasSelection: false, selected: new Set(), onChange: () => () => {} }, footer, getChartName: () => 'T', getSideBySideRenderer: () => null }; }
describe('footer ICs tooltip', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });
  it('tooltip', () => { const d = makeDeps(); buildFooter(d); const t = d.footer.querySelectorAll('[title]'); const ic = Array.from(t).find((el) => (el as Element).getAttribute('title')!.includes('Individual Contributors')); expect(ic).toBeTruthy(); });
  it('count', () => { const d = makeDeps(); buildFooter(d); expect(d.footer.querySelector('.footer-status')!.textContent).toContain('ICs'); });
});
