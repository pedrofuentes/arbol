import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showHelpDialog } from '../../src/ui/help-dialog';

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

  it('renders section headings as h3 elements', () => {
    showHelpDialog();
    const headings = document.querySelectorAll('h3');
    expect(headings.length).toBeGreaterThan(0);
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts).toContain('Getting Started');
    expect(headingTexts).toContain('Keyboard Shortcuts');
  });
});
