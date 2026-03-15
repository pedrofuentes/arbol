import { describe, it, expect, vi } from 'vitest';
import { createButton, createIconButton, createFormGroup, createHeading, createSection } from '../../src/utils/dom-builder';

describe('dom-builder', () => {
  describe('createButton', () => {
    it('creates a button with label', () => {
      const btn = createButton({ label: 'Click me' });
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.textContent).toBe('Click me');
    });

    it('sets className', () => {
      const btn = createButton({ className: 'btn btn-primary' });
      expect(btn.className).toBe('btn btn-primary');
    });

    it('attaches click handler', () => {
      const handler = vi.fn();
      const btn = createButton({ onClick: handler });
      btn.click();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('sets disabled and aria-disabled', () => {
      const btn = createButton({ disabled: true });
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets aria-label', () => {
      const btn = createButton({ ariaLabel: 'Save changes' });
      expect(btn.getAttribute('aria-label')).toBe('Save changes');
    });

    it('sets title', () => {
      const btn = createButton({ title: 'Tooltip text' });
      expect(btn.title).toBe('Tooltip text');
    });

    it('sets data-action', () => {
      const btn = createButton({ dataAction: 'save' });
      expect(btn.dataset.action).toBe('save');
    });

    it('creates button with no options', () => {
      const btn = createButton({});
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.textContent).toBe('');
    });
  });

  describe('createIconButton', () => {
    it('creates button with icon span', () => {
      const btn = createIconButton({ icon: '⚙️' });
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.className).toBe('icon-btn');
      const span = btn.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.getAttribute('aria-hidden')).toBe('true');
      expect(span!.textContent).toBe('⚙️');
    });

    it('sets tooltip via data-tooltip', () => {
      const btn = createIconButton({ icon: '⚙️', tooltip: 'Settings' });
      expect(btn.getAttribute('data-tooltip')).toBe('Settings');
    });

    it('sets aria-label', () => {
      const btn = createIconButton({ icon: '⚙️', ariaLabel: 'Open settings' });
      expect(btn.getAttribute('aria-label')).toBe('Open settings');
    });

    it('sets aria-keyshortcuts', () => {
      const btn = createIconButton({ icon: '⚙️', ariaKeyshortcuts: 'Control+,' });
      expect(btn.getAttribute('aria-keyshortcuts')).toBe('Control+,');
    });

    it('attaches click handler', () => {
      const handler = vi.fn();
      const btn = createIconButton({ icon: '✓', onClick: handler });
      btn.click();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('uses custom className', () => {
      const btn = createIconButton({ icon: '✓', className: 'custom-btn' });
      expect(btn.className).toBe('custom-btn');
    });
  });

  describe('createFormGroup', () => {
    it('creates div with label', () => {
      const group = createFormGroup('Name');
      expect(group.tagName).toBe('DIV');
      expect(group.className).toBe('form-group');
      const label = group.querySelector('label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('Name');
    });

    it('links label to input via htmlFor', () => {
      const group = createFormGroup('Email', 'email-input');
      const label = group.querySelector('label')!;
      expect(label.htmlFor).toBe('email-input');
    });

    it('does not set htmlFor when inputId is omitted', () => {
      const group = createFormGroup('Notes');
      const label = group.querySelector('label')!;
      expect(label.htmlFor).toBe('');
    });
  });

  describe('createHeading', () => {
    it('creates h3 by default', () => {
      const h = createHeading('Title');
      expect(h.tagName).toBe('H3');
      expect(h.textContent).toBe('Title');
    });

    it('creates h2 when specified', () => {
      const h = createHeading('Title', 'h2');
      expect(h.tagName).toBe('H2');
    });

    it('creates h4 when specified', () => {
      const h = createHeading('Title', 'h4');
      expect(h.tagName).toBe('H4');
    });
  });

  describe('createSection', () => {
    it('creates section with heading and children', () => {
      const child1 = document.createElement('p');
      child1.textContent = 'Child 1';
      const child2 = document.createElement('p');
      child2.textContent = 'Child 2';
      const section = createSection('My Section', [child1, child2]);
      expect(section.tagName).toBe('SECTION');
      const h = section.querySelector('h3');
      expect(h).not.toBeNull();
      expect(h!.textContent).toBe('My Section');
      expect(section.children.length).toBe(3); // heading + 2 children
    });

    it('creates section with no children', () => {
      const section = createSection('Empty', []);
      expect(section.children.length).toBe(1); // just the heading
    });
  });
});
