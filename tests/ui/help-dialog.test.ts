import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showHelpDialog } from '../../src/ui/help-dialog';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _store: store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('showHelpDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog with help title', () => {
    showHelpDialog();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Help & Reference');
  });

  it('has aria-modal attribute', () => {
    showHelpDialog();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
  });

  it('contains keyboard shortcuts section', () => {
    showHelpDialog();
    expect(document.body.textContent).toContain('Keyboard Shortcuts');
    expect(document.body.textContent).toContain('Ctrl+Z');
  });

  it('contains getting started section', () => {
    showHelpDialog();
    expect(document.body.textContent).toContain('Getting Started');
  });

  it('contains importing data section', () => {
    showHelpDialog();
    expect(document.body.textContent).toContain('Importing Data');
  });

  it('contains chart interactions section', () => {
    showHelpDialog();
    expect(document.body.textContent).toContain('Chart Interactions');
  });

  it('closes on close button click', () => {
    showHelpDialog();
    const closeBtn = document.querySelector(
      '[aria-label="Close help dialog"]',
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes on Escape key', () => {
    showHelpDialog();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes on overlay click', () => {
    showHelpDialog();
    const dialog = document.querySelector('[role="dialog"]')!;
    const overlay = dialog.parentElement!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not close when clicking inside dialog', () => {
    showHelpDialog();
    const dialog = document.querySelector('[role="dialog"]')!;
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders kbd elements for shortcuts', () => {
    showHelpDialog();
    const kbdElements = document.querySelectorAll('kbd');
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it('renders section headings as accordion headers', () => {
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    expect(headers.length).toBeGreaterThan(0);
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts.some((t) => t!.includes('Getting Started'))).toBe(true);
    expect(headerTexts.some((t) => t!.includes('Keyboard Shortcuts'))).toBe(true);
  });

  it('contains Your Data section with privacy message', () => {
    showHelpDialog();
    expect(document.body.textContent).toContain('Your Data');
    expect(document.body.textContent).toContain('never leave your device');
    expect(document.body.textContent).toContain('no server');
  });

  it('renders Clear All Data button', () => {
    showHelpDialog();
    const clearBtn = document.querySelector(
      '[aria-label="Clear all local data"]',
    ) as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    expect(clearBtn.textContent).toContain('Clear All Data');
  });

  it('Clear All Data button triggers confirmation dialog', async () => {
    showHelpDialog();
    const clearBtn = document.querySelector(
      '[aria-label="Clear all local data"]',
    ) as HTMLButtonElement;
    clearBtn.click();

    // Confirm dialog should appear with danger warning
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Delete everything');
    });
  });

  // ─── Accordion Tests ─────────────────────────────────────────────

  it('renders sections as collapsible accordions', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    expect(sections.length).toBeGreaterThan(0);
    const firstSection = sections[0];
    expect(firstSection.querySelector('.help-section-header')).not.toBeNull();
    expect(firstSection.querySelector('.help-section-body')).not.toBeNull();
  });

  it('Getting Started is the first section', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    const firstHeader = sections[0].querySelector('.help-section-header');
    expect(firstHeader!.textContent).toContain('Getting Started');
  });

  it('first section is expanded by default', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    expect(sections[0].classList.contains('open')).toBe(true);
  });

  it('other sections are collapsed by default', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].classList.contains('open')).toBe(false);
    }
  });

  it('clicking a collapsed section header expands it and closes others', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    const firstSection = sections[0];
    const secondSection = sections[1];
    expect(firstSection.classList.contains('open')).toBe(true);
    expect(secondSection.classList.contains('open')).toBe(false);
    const header = secondSection.querySelector('.help-section-header') as HTMLButtonElement;
    header.click();
    expect(secondSection.classList.contains('open')).toBe(true);
    expect(firstSection.classList.contains('open')).toBe(false);
  });

  it('clicking an expanded section header collapses it', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    const firstSection = sections[0];
    expect(firstSection.classList.contains('open')).toBe(true);
    const header = firstSection.querySelector('.help-section-header') as HTMLButtonElement;
    header.click();
    expect(firstSection.classList.contains('open')).toBe(false);
  });

  it('section headers have aria-expanded attribute', () => {
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
    expect(headers[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('section headers are buttons for keyboard accessibility', () => {
    showHelpDialog();
    const headers = document.querySelectorAll('.help-section-header');
    headers.forEach((h) => {
      expect(h.tagName).toBe('BUTTON');
    });
  });

  it('renders shortcuts in a grid layout', () => {
    showHelpDialog();
    const grid = document.querySelector('.help-shortcuts-grid');
    expect(grid).not.toBeNull();
  });

  it('shortcuts grid contains Ctrl+K', () => {
    showHelpDialog();
    const grid = document.querySelector('.help-shortcuts-grid');
    expect(grid!.textContent).toContain('Ctrl+K');
  });

  it('shortcuts grid contains Ctrl+,', () => {
    showHelpDialog();
    const grid = document.querySelector('.help-shortcuts-grid');
    expect(grid!.textContent).toContain('Ctrl+,');
  });

  it('shortcuts grid contains ? for help', () => {
    showHelpDialog();
    const grid = document.querySelector('.help-shortcuts-grid');
    expect(grid!.textContent).toContain('?');
  });

  it('shortcuts grid contains arrow key navigation', () => {
    showHelpDialog();
    const grid = document.querySelector('.help-shortcuts-grid');
    expect(grid!.textContent).toContain('↑ ↓ ← →');
  });

  it('uses chevron indicators on section headers', () => {
    showHelpDialog();
    const chevrons = document.querySelectorAll('.help-chevron');
    expect(chevrons.length).toBeGreaterThan(0);
  });

  it('renders sample org button when onLoadSample is provided', () => {
    showHelpDialog({ onLoadSample: vi.fn() });
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Load Sample Org Chart'),
    );
    expect(btn).toBeDefined();
  });

  it('does not render sample org button when onLoadSample is omitted', () => {
    showHelpDialog();
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Load Sample Org Chart'),
    );
    expect(btn).toBeUndefined();
  });

  it('sample org button has accessible aria-label', () => {
    showHelpDialog({ onLoadSample: vi.fn() });
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Load Sample Org Chart'),
    );
    expect(btn!.getAttribute('aria-label')).toBe('Load a sample organization chart');
  });

  // ─── initialSection Tests ─────────────────────────────────────────

  it('opens Getting Started section when initialSection is 1', () => {
    showHelpDialog({ initialSection: 1 });
    const sections = document.querySelectorAll('.help-section');
    expect(sections[0].classList.contains('open')).toBe(false);
    expect(sections[1].classList.contains('open')).toBe(true);
  });

  it('sets aria-expanded correctly for initialSection', () => {
    showHelpDialog({ initialSection: 1 });
    const headers = document.querySelectorAll('.help-section-header');
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    expect(headers[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('defaults to section 0 when initialSection is not provided', () => {
    showHelpDialog();
    const sections = document.querySelectorAll('.help-section');
    expect(sections[0].classList.contains('open')).toBe(true);
    expect(sections[1].classList.contains('open')).toBe(false);
  });
});
