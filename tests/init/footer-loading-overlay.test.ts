import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import en from '../../src/i18n/en';
import { showLoading, hideLoading } from '../../src/ui/loading-overlay';

beforeAll(() => {
  setLocale('en', en);
});

describe('loading overlay integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('showLoading creates an overlay element with message', () => {
    showLoading('Exporting…');
    const overlay = document.querySelector('.loading-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('status');
    expect(overlay?.textContent).toContain('Exporting…');
  });

  it('hideLoading removes the overlay', () => {
    showLoading('Exporting…');
    expect(document.querySelector('.loading-overlay')).not.toBeNull();
    hideLoading();
    expect(document.querySelector('.loading-overlay')).toBeNull();
  });

  it('showLoading replaces existing overlay', () => {
    showLoading('First');
    showLoading('Second');
    const overlays = document.querySelectorAll('.loading-overlay');
    expect(overlays).toHaveLength(1);
    expect(overlays[0].textContent).toContain('Second');
  });

  it('hideLoading is safe to call when no overlay exists', () => {
    expect(() => hideLoading()).not.toThrow();
  });

  it('i18n keys for loading indicators exist', () => {
    expect(t('footer.exporting_label')).toBeTruthy();
    expect(t('loading.switching_chart')).toBeTruthy();
  });
});
