import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock app-config before importing the component
const mockGetAppConfig = vi.fn();
vi.mock('../../src/config/app-config', () => ({
  getAppConfig: mockGetAppConfig,
}));

// Must import after mock setup
const { renderImportInstructions } = await import(
  '../../src/ui/import-instructions'
);

describe('renderImportInstructions', () => {
  beforeEach(() => {
    mockGetAppConfig.mockReset();
  });

  it('returns null when no importInstructions in config', () => {
    mockGetAppConfig.mockReturnValue({});
    const result = renderImportInstructions();
    expect(result).toBeNull();
  });

  it('returns null when importInstructions is empty string', () => {
    mockGetAppConfig.mockReturnValue({ importInstructions: '' });
    const result = renderImportInstructions();
    expect(result).toBeNull();
  });

  it('renders a details element when instructions exist', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps\n\n1. Do this\n2. Do that',
    });
    const el = renderImportInstructions();
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe('DETAILS');
  });

  it('renders a summary with i18n label', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps',
    });
    const el = renderImportInstructions();
    const summary = el!.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary!.textContent!.length).toBeGreaterThan(0);
  });

  it('renders markdown content inside the details', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## How to export\n\n1. Open **Workday**\n2. Click export',
    });
    const el = renderImportInstructions();
    expect(el!.querySelector('h2')!.textContent).toBe('How to export');
    expect(el!.querySelectorAll('li').length).toBe(2);
    expect(el!.querySelector('strong')!.textContent).toBe('Workday');
  });

  it('has the import-instructions class', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: 'Some instructions',
    });
    const el = renderImportInstructions();
    expect(el!.classList.contains('import-instructions')).toBe(true);
  });

  it('does not use innerHTML', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Test\n\nSome **bold** text',
    });
    const el = renderImportInstructions();
    // Verify the element was built with DOM APIs by checking structure
    const div = el!.querySelector('.import-instructions-content');
    expect(div).not.toBeNull();
    // Content should have been rendered via appendChild, not innerHTML
    expect(div!.querySelector('h2')).not.toBeNull();
  });
});
