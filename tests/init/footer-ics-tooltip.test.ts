import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { buildFooter, type FooterDeps } from '../../src/init/footer-builder';
import { OrgStore } from '../../src/store/org-store';
import type { OrgNode } from '../../src/types';

let s1: ReturnType<typeof vi.spyOn>;
let s2: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  s1 = vi.spyOn(localStorage, 'setItem');
  s2 = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
  setLocale('en', en);
});

afterAll(() => {
  s1.mockRestore();
  s2.mockRestore();
});

const ROOT: OrgNode = {
  id: 'root',
  name: 'CEO',
  title: 'CEO',
  children: [
    { id: 'i1', name: 'A', title: 'B' },
    { id: 'i2', name: 'C', title: 'D' },
  ],
};

function makeDeps(): FooterDeps {
  const footer = document.createElement('footer');
  document.body.appendChild(footer);

  return {
    store: new OrgStore(structuredClone(ROOT)),
    renderer: {
      getZoomManager: () => ({ getRelativeZoomPercent: () => 100, onZoom: () => () => {} }),
      getLastLayout: () => null,
      getOptions: () => ({}),
    } as unknown as FooterDeps['renderer'],
    categoryStore: {
      getAll: () => [],
    } as unknown as FooterDeps['categoryStore'],
    chartStore: {
      getActiveChart: async () => null,
    } as unknown as FooterDeps['chartStore'],
    focusMode: {
      getVisibleTree: () => ROOT,
    } as unknown as FooterDeps['focusMode'],
    selection: {
      hasSelection: false,
      count: 0,
    } as unknown as FooterDeps['selection'],
    footer,
    getChartName: () => 'T',
    getSideBySideRenderer: () => null,
  };
}

describe('footer ICs tooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('tooltip', () => {
    const d = makeDeps();
    buildFooter(d);
    const titledElements = d.footer.querySelectorAll('[title]');
    const ic = Array.from(titledElements).find((el) => el.getAttribute('title')!.includes('Individual Contributors'));
    expect(ic).toBeTruthy();
  });

  it('count', () => {
    const d = makeDeps();
    buildFooter(d);
    expect(d.footer.querySelector('.footer-status')!.textContent).toContain('ICs');
  });
});
