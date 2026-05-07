import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock app-config
const mockGetAppConfig = vi.fn();
vi.mock('../../src/config/app-config', () => ({
  getAppConfig: mockGetAppConfig,
}));

const { showHelpDialog } = await import('../../src/ui/help-dialog');

describe('help dialog — import instructions section', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockGetAppConfig.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows import instructions section when config has importInstructions', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps\n\n1. Do this',
    });
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    const texts = Array.from(headers).map((h) => h.textContent);
    expect(texts.some((t) => t?.includes('Import Instructions'))).toBe(true);
  });

  it('does not show import instructions section when config is empty', () => {
    mockGetAppConfig.mockReturnValue({});
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    const texts = Array.from(headers).map((h) => h.textContent);
    expect(texts.some((t) => t?.includes('Import Instructions'))).toBe(false);
  });

  it('renders markdown content in the help section body', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Guide\n\n- Step one\n- Step two',
    });
    showHelpDialog();
    // Find the import instructions section
    const headers = document.querySelectorAll('.help-section-header');
    let targetSection: Element | null = null;
    headers.forEach((h) => {
      if (h.textContent?.includes('Import Instructions')) {
        targetSection = h.closest('.help-section');
      }
    });
    expect(targetSection).not.toBeNull();
    const body = targetSection!.querySelector('.help-section-body');
    expect(body).not.toBeNull();
    expect(body!.querySelector('h2')!.textContent).toBe('Guide');
    expect(body!.querySelectorAll('li').length).toBe(2);
  });
});
