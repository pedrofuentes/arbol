import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __getActiveSurfaceCountForTests,
  activateDialog,
  createBanner,
  createDialogPanel,
  createOverlay,
  pushSurface,
  trapFocus,
} from '../../src/ui/dialog-utils';

describe('dialog-utils', () => {
  afterEach(() => {
    expect(__getActiveSurfaceCountForTests()).toBe(0);
    document.body.innerHTML = '';
  });

  describe('createOverlay', () => {
    it('creates a class-based full-screen overlay at the dialog layer', () => {
      const overlay = createOverlay();

      expect(overlay).toBeInstanceOf(HTMLDivElement);
      expect(overlay.classList.contains('dialog-overlay')).toBe(true);
      expect(overlay.style.zIndex).toBe('var(--z-dialog)');
      expect(overlay.style.position).toBe('');
      expect(overlay.style.background).toBe('');
    });

    it('accepts a semantic overlay layer token', () => {
      const overlay = createOverlay('var(--z-modal)');

      expect(overlay.style.zIndex).toBe('var(--z-modal)');
    });
  });

  describe('createDialogPanel', () => {
    it('creates a class-based modal dialog by default', () => {
      const panel = createDialogPanel();

      expect(panel).toBeInstanceOf(HTMLDivElement);
      expect(panel.classList.contains('dialog-panel')).toBe(true);
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(panel.getAttribute('aria-modal')).toBe('true');
      expect(panel.style.background).toBe('');
      expect(panel.style.padding).toBe('');
    });

    it('accepts custom dialog semantics and labels', () => {
      const panel = createDialogPanel({
        role: 'alertdialog',
        ariaModal: false,
        ariaLabelledBy: 'my-title',
        ariaLabel: 'Confirm action',
      });

      expect(panel.getAttribute('role')).toBe('alertdialog');
      expect(panel.getAttribute('aria-modal')).toBe('false');
      expect(panel.getAttribute('aria-labelledby')).toBe('my-title');
      expect(panel.getAttribute('aria-label')).toBe('Confirm action');
    });

    it('does not add optional labels when omitted', () => {
      const panel = createDialogPanel();

      expect(panel.hasAttribute('aria-labelledby')).toBe(false);
      expect(panel.hasAttribute('aria-label')).toBe(false);
    });

    it('parameterizes dimensions through panel custom properties', () => {
      const panel = createDialogPanel({
        minWidth: '200px',
        maxWidth: '600px',
        padding: '16px',
      });

      expect(panel.style.getPropertyValue('--dialog-panel-min-width')).toBe('200px');
      expect(panel.style.getPropertyValue('--dialog-panel-max-width')).toBe('600px');
      expect(panel.style.getPropertyValue('--dialog-panel-padding')).toBe('16px');
    });
  });

  describe('createBanner', () => {
    it('creates the shared lightweight status banner pattern', () => {
      const banner = createBanner('comparison-banner');

      expect(banner.className).toBe('ui-banner comparison-banner');
      expect(banner.getAttribute('role')).toBe('status');
    });

    it('marks non-interactive banners without changing their structure', () => {
      const banner = createBanner('offline-banner', { interactive: false });

      expect(banner.classList.contains('ui-banner--passive')).toBe(true);
      expect(banner.children).toHaveLength(0);
    });
  });

  describe('activateDialog', () => {
    it('lets an anonymous surface participate in Escape stack ordering', () => {
      const onEscape = vi.fn();
      const cleanupDialog = activateDialog(document.createElement('div'), {
        onEscape,
        trapFocus: false,
      });
      const releaseSurface = pushSurface();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      expect(onEscape).not.toHaveBeenCalled();

      releaseSurface();
      releaseSurface();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      expect(onEscape).toHaveBeenCalledOnce();

      cleanupDialog();
    });

    it('closes only the topmost active surface on Escape', () => {
      const first = document.createElement('div');
      const second = document.createElement('div');
      const firstEscape = vi.fn();
      const secondEscape = vi.fn();
      const cleanupFirst = activateDialog(first, { onEscape: firstEscape, trapFocus: false });
      const cleanupSecond = activateDialog(second, { onEscape: secondEscape, trapFocus: false });

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );

      expect(firstEscape).not.toHaveBeenCalled();
      expect(secondEscape).toHaveBeenCalledOnce();
      cleanupSecond();
      cleanupFirst();
    });

    it('prevents an active surface Escape from reaching later document handlers', () => {
      const surface = document.createElement('div');
      const downstream = vi.fn();
      const cleanup = activateDialog(surface, { onEscape: vi.fn(), trapFocus: false });
      document.addEventListener('keydown', downstream);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(downstream).not.toHaveBeenCalled();
      cleanup();
      document.removeEventListener('keydown', downstream);
    });

    it('traps focus and restores it to the invoking element on cleanup', () => {
      const invoker = document.createElement('button');
      const dialog = document.createElement('div');
      const first = document.createElement('button');
      const last = document.createElement('button');
      dialog.append(first, last);
      document.body.append(invoker, dialog);
      invoker.focus();

      const cleanup = activateDialog(dialog, { onEscape: vi.fn() });
      last.focus();
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement).toBe(first);

      cleanup();
      expect(document.activeElement).toBe(invoker);
    });

    it('removes Escape handling during cleanup', () => {
      const onEscape = vi.fn();
      const cleanup = activateDialog(document.createElement('div'), {
        onEscape,
        trapFocus: false,
      });
      cleanup();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onEscape).not.toHaveBeenCalled();
    });
  });

  describe('trapFocus', () => {
    it('wraps focus from last to first element on Tab', () => {
      const container = document.createElement('div');
      const first = document.createElement('button');
      const last = document.createElement('button');
      container.append(first, last);
      document.body.appendChild(container);
      trapFocus(container);
      last.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);

      expect(prevented).toBe(true);
      expect(document.activeElement).toBe(first);
    });

    it('wraps focus from first to last element on Shift+Tab', () => {
      const container = document.createElement('div');
      const first = document.createElement('button');
      const last = document.createElement('button');
      container.append(first, last);
      document.body.appendChild(container);
      trapFocus(container);
      first.focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(document.activeElement).toBe(last);
    });

    it('does not prevent Tab away from a boundary and ignores non-Tab keys', () => {
      const container = document.createElement('div');
      const first = document.createElement('button');
      const middle = document.createElement('button');
      const last = document.createElement('button');
      container.append(first, middle, last);
      document.body.appendChild(container);
      trapFocus(container);
      middle.focus();

      const tab = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const enter = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });

      expect(container.dispatchEvent(tab)).toBe(true);
      expect(container.dispatchEvent(enter)).toBe(true);
    });

    it('handles no focusable elements and stops after cleanup', () => {
      const empty = document.createElement('div');
      expect(() => {
        const cleanup = trapFocus(empty);
        empty.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        cleanup();
      }).not.toThrow();

      const container = document.createElement('div');
      const first = document.createElement('button');
      const last = document.createElement('button');
      container.append(first, last);
      document.body.appendChild(container);
      const cleanup = trapFocus(container);
      cleanup();
      last.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      expect(container.dispatchEvent(event)).toBe(true);
    });

    it('skips disabled buttons', () => {
      const container = document.createElement('div');
      const disabled = document.createElement('button');
      disabled.disabled = true;
      const first = document.createElement('button');
      const last = document.createElement('button');
      container.append(disabled, first, last);
      document.body.appendChild(container);
      trapFocus(container);
      last.focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );

      expect(document.activeElement).toBe(first);
    });
  });
});
