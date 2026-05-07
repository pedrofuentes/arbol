import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';

// Mock app-config
const mockGetAppConfig = vi.fn();
vi.mock('../../src/config/app-config', () => ({
  getAppConfig: mockGetAppConfig,
}));

const { renderSourceStep, WizardState } = await import('../../src/ui/import-wizard-steps');

beforeAll(() => {
  setLocale('en', en);
});

describe('renderSourceStep — import instructions integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockGetAppConfig.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders import instructions when config has importInstructions', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Steps\n\n1. Do this',
    });
    const state = {} as typeof WizardState;
    renderSourceStep(container, state, vi.fn());
    const instructions = container.querySelector('.import-instructions');
    expect(instructions).not.toBeNull();
  });

  it('does not render import instructions when config is empty', () => {
    mockGetAppConfig.mockReturnValue({});
    const state = {} as typeof WizardState;
    renderSourceStep(container, state, vi.fn());
    const instructions = container.querySelector('.import-instructions');
    expect(instructions).toBeNull();
  });

  it('renders instructions before the dropzone', () => {
    mockGetAppConfig.mockReturnValue({
      importInstructions: '## Guide\n\nFollow these steps',
    });
    const state = {} as typeof WizardState;
    renderSourceStep(container, state, vi.fn());
    const instructions = container.querySelector('.import-instructions');
    const dropzone = container.querySelector('.wizard-dropzone');
    expect(instructions).not.toBeNull();
    expect(dropzone).not.toBeNull();
    // Instructions should come before dropzone in DOM order
    const children = Array.from(container.children);
    const instrIdx = children.indexOf(instructions as Element);
    const dropIdx = children.indexOf(dropzone as Element);
    expect(instrIdx).toBeLessThan(dropIdx);
  });
});
