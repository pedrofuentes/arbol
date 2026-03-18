import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import en from '../../src/i18n/en';
import { buildFooter, type FooterDeps } from '../../src/init/footer-builder';
import { OrgStore } from '../../src/store/org-store';
import { CategoryStore } from '../../src/store/category-store';

let setItemSpy: ReturnType<typeof vi.spyOn>;
let getItemSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  setItemSpy = vi.spyOn(localStorage, 'setItem');
  getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
  setLocale('en', en);
});

afterAll(() => {
  setItemSpy.mockRestore();
  getItemSpy.mockRestore();
});

function makeDeps(overrides: Partial<FooterDeps> = {}): FooterDeps {
  const store = new OrgStore({ id: 'root', name: 'Root', title: 'CEO', children: [] });
  const footer = document.createElement('footer');
  document.body.appendChild(footer);

  return {
    store,
    renderer: {
      getLastLayout: () => null,
      getOptions: () => ({}),
      getZoomManager: () => ({
        getRelativeZoomPercent: () => 100,
        onZoom: () => () => {},
      }),
    } as any,
    categoryStore: new CategoryStore(),
    chartStore: {
      getActiveChart: async () => null,
    } as any,
    focusMode: {
      getVisibleTree: () => store.getTree(),
    } as any,
    selection: {
      hasSelection: false,
      count: 0,
    } as any,
    footer,
    getChartName: () => 'Test Chart',
    getSideBySideRenderer: () => null,
    ...overrides,
  };
}

describe('FooterBuilder', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the i18n footer.separator key for status parts', () => {
    const deps = makeDeps();
    buildFooter(deps);
    const statusText = deps.footer.querySelector('.footer-status');
    expect(statusText).not.toBeNull();
    const separator = t('footer.separator');
    expect(statusText!.textContent).toContain(separator.trim());
  });

  it('uses the i18n separator for the version separator element', () => {
    const deps = makeDeps();
    buildFooter(deps);
    const footerLeft = deps.footer.querySelector('.footer-left');
    const spans = footerLeft!.querySelectorAll('span');
    const separatorSpan = spans[1];
    expect(separatorSpan.textContent).toBe(t('footer.separator').trim());
  });
});
