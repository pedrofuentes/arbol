import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock app-config
const mockGetAppConfig = vi.fn();
vi.mock('../../src/config/app-config', () => ({
  getAppConfig: mockGetAppConfig,
}));

const { showHelpDialog } = await import('../../src/ui/help-dialog');

describe('help dialog — How to Export from Your HR System section', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockGetAppConfig.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows How to Export from Your HR System section when config has importInstructions', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps\n\n1. Do this',
    });
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    const texts = Array.from(headers).map((h) => h.textContent);
    expect(texts.some((t) => t?.includes('How to Export from Your HR System'))).toBe(true);
  });

  it('does not show How to Export from Your HR System section when config is empty', () => {
    mockGetAppConfig.mockReturnValue({});
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    const texts = Array.from(headers).map((h) => h.textContent);
    expect(texts.some((t) => t?.includes('How to Export from Your HR System'))).toBe(false);
  });

  it('renders markdown content in the help section body', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Guide\n\n- Step one\n- Step two',
    });
    showHelpDialog();
    // Find the How to Export from Your HR System section
    const headers = document.querySelectorAll('.help-section-header');
    let targetSection: Element | null = null;
    headers.forEach((h) => {
      if (h.textContent?.includes('How to Export from Your HR System')) {
        targetSection = h.closest('.help-section');
      }
    });
    expect(targetSection).not.toBeNull();
    const body = targetSection!.querySelector('.help-section-body');
    expect(body).not.toBeNull();
    expect(body!.querySelector('h2')!.textContent).toBe('Guide');
    expect(body!.querySelectorAll('li').length).toBe(2);
  });

  it('places How to Export from Your HR System as the second section (after Getting Started)', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps\n\n1. Do this',
    });
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    const texts = Array.from(headers).map((h) => h.textContent);

    // First 3 sections should be: Getting Started, How to Export from Your HR System, Keyboard Shortcuts
    expect(texts[0]).toContain('Getting Started');
    expect(texts[1]).toContain('How to Export from Your HR System');
    expect(texts[2]).toContain('Keyboard Shortcuts');
  });
});
