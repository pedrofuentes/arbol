import { describe, it, expect, afterEach, vi } from 'vitest';
import { createOverlay, createDialogPanel, trapFocus } from '../../src/ui/dialog-utils';

/**
 * jsdom cannot fully parse certain multi-property style.cssText strings
 * (e.g. shorthand `background` followed by `z-index` triggers a parsing bug).
 * We spy on the cssText setter to capture the raw CSS string for assertions.
 */
function spyCssText(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText')!;
  Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', {
    set(value: string) {
      calls.push(value);
      desc.set!.call(this, value);
    },
    get() {
      return desc.get!.call(this);
    },
    configurable: true,
  });
  return {
    calls,
    restore: () => Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', desc),
  };
}

describe('dialog-utils', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('createOverlay', () => {
    it('creates a div element', () => {
      const overlay = createOverlay();
      expect(overlay).toBeInstanceOf(HTMLDivElement);
    });

    it('sets fixed positioning covering the viewport', () => {
      const spy = spyCssText();
      try {
        createOverlay();
        const css = spy.calls[0];
        expect(css).toContain('position:fixed');
        expect(css).toContain('top:0');
        expect(css).toContain('left:0');
        expect(css).toContain('right:0');
        expect(css).toContain('bottom:0');
      } finally {
        spy.restore();
      }
    });

    it('uses default z-index of 1000', () => {
      const spy = spyCssText();
      try {
        createOverlay();
        expect(spy.calls[0]).toContain('z-index:1000');
      } finally {
        spy.restore();
      }
    });

    it('accepts a custom z-index', () => {
      const spy = spyCssText();
      try {
        createOverlay(5000);
        expect(spy.calls[0]).toContain('z-index:5000');
      } finally {
        spy.restore();
      }
    });

    it('has a semi-transparent background', () => {
      const spy = spyCssText();
      try {
        createOverlay();
        expect(spy.calls[0]).toContain('rgba(0,0,0,0.5)');
      } finally {
        spy.restore();
      }
    });

    it('uses flex centering for content', () => {
      const spy = spyCssText();
      try {
        createOverlay();
        const css = spy.calls[0];
        expect(css).toContain('display:flex');
        expect(css).toContain('align-items:center');
        expect(css).toContain('justify-content:center');
      } finally {
        spy.restore();
      }
    });

    it('includes backdrop-filter blur', () => {
      const spy = spyCssText();
      try {
        createOverlay();
        const css = spy.calls[0];
        expect(css).toContain('backdrop-filter');
        expect(css).toContain('blur(2px)');
      } finally {
        spy.restore();
      }
    });
  });

  describe('createDialogPanel', () => {
    it('creates a div element', () => {
      const panel = createDialogPanel();
      expect(panel).toBeInstanceOf(HTMLDivElement);
    });

    it('has role="dialog" by default', () => {
      const panel = createDialogPanel();
      expect(panel.getAttribute('role')).toBe('dialog');
    });

    it('has aria-modal="true" by default', () => {
      const panel = createDialogPanel();
      expect(panel.getAttribute('aria-modal')).toBe('true');
    });

    it('accepts a custom role', () => {
      const panel = createDialogPanel({ role: 'alertdialog' });
      expect(panel.getAttribute('role')).toBe('alertdialog');
    });

    it('accepts ariaModal false', () => {
      const panel = createDialogPanel({ ariaModal: false });
      expect(panel.getAttribute('aria-modal')).toBe('false');
    });

    it('sets aria-labelledby when provided', () => {
      const panel = createDialogPanel({ ariaLabelledBy: 'my-title' });
      expect(panel.getAttribute('aria-labelledby')).toBe('my-title');
    });

    it('does not set aria-labelledby when omitted', () => {
      const panel = createDialogPanel();
      expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('sets aria-label when provided', () => {
      const panel = createDialogPanel({ ariaLabel: 'Confirm action' });
      expect(panel.getAttribute('aria-label')).toBe('Confirm action');
    });

    it('does not set aria-label when omitted', () => {
      const panel = createDialogPanel();
      expect(panel.hasAttribute('aria-label')).toBe(false);
    });

    it('applies default min-width of 320px', () => {
      const spy = spyCssText();
      try {
        createDialogPanel();
        expect(spy.calls[0]).toContain('min-width:320px');
      } finally {
        spy.restore();
      }
    });

    it('applies default max-width of 420px', () => {
      const spy = spyCssText();
      try {
        createDialogPanel();
        expect(spy.calls[0]).toContain('max-width:420px');
      } finally {
        spy.restore();
      }
    });

    it('accepts custom min-width and max-width', () => {
      const spy = spyCssText();
      try {
        createDialogPanel({ minWidth: '200px', maxWidth: '600px' });
        const css = spy.calls[0];
        expect(css).toContain('min-width:200px');
        expect(css).toContain('max-width:600px');
      } finally {
        spy.restore();
      }
    });

    it('applies default padding of 24px', () => {
      const spy = spyCssText();
      try {
        createDialogPanel();
        expect(spy.calls[0]).toContain('padding:24px');
      } finally {
        spy.restore();
      }
    });

    it('accepts custom padding', () => {
      const spy = spyCssText();
      try {
        createDialogPanel({ padding: '16px' });
        expect(spy.calls[0]).toContain('padding:16px');
      } finally {
        spy.restore();
      }
    });

    it('uses CSS variables for theming', () => {
      const spy = spyCssText();
      try {
        createDialogPanel();
        const css = spy.calls[0];
        expect(css).toContain('var(--bg-elevated)');
        expect(css).toContain('var(--border-default)');
        expect(css).toContain('var(--shadow-lg)');
      } finally {
        spy.restore();
      }
    });
  });

  describe('trapFocus', () => {
    it('returns a cleanup function', () => {
      const container = document.createElement('div');
      const cleanup = trapFocus(container);
      expect(typeof cleanup).toBe('function');
    });

    it('wraps focus from last to first element on Tab', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Last';
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      trapFocus(container);
      btn2.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      expect(prevented).toBe(true);
    });

    it('wraps focus from first to last element on Shift+Tab', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Last';
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      trapFocus(container);
      btn1.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      expect(prevented).toBe(true);
    });

    it('does not prevent Tab when focus is not on boundary', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      const btn3 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      container.appendChild(btn3);
      document.body.appendChild(container);

      trapFocus(container);
      btn2.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('handles containers with no focusable elements gracefully', () => {
      const container = document.createElement('div');
      const span = document.createElement('span');
      span.textContent = 'Not focusable';
      container.appendChild(span);
      document.body.appendChild(container);

      trapFocus(container);

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      expect(() => container.dispatchEvent(event)).not.toThrow();
    });

    it('ignores non-Tab key events', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      trapFocus(container);
      btn.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('stops trapping focus after cleanup is called', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      const cleanup = trapFocus(container);
      cleanup();

      btn2.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('skips disabled buttons', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      btn1.disabled = true;
      const btn2 = document.createElement('button');
      const btn3 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      container.appendChild(btn3);
      document.body.appendChild(container);

      trapFocus(container);
      btn3.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const prevented = !container.dispatchEvent(event);
      // btn3 is last focusable (btn1 is disabled), so Tab should wrap
      expect(prevented).toBe(true);
    });
  });
});
