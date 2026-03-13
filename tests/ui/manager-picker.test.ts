import { describe, it, expect, afterEach } from 'vitest';
import { showManagerPicker, ManagerPickerItem, ManagerPickerResult } from '../../src/ui/manager-picker';

const sampleManagers: ManagerPickerItem[] = [
  { id: 'm1', name: 'Alice Johnson', title: 'VP Engineering' },
  { id: 'm2', name: 'Bob Smith', title: 'Director of Product' },
  { id: 'm3', name: 'Carol Davis', title: 'Engineering Manager' },
  { id: 'm4', name: 'Dave Wilson', title: 'Senior Director' },
];

describe('showManagerPicker', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders title, search input, and manager list', () => {
    showManagerPicker({ title: 'Move to…', managers: sampleManagers });

    const title = document.querySelector('h3');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Move to…');

    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input!.placeholder).toBe('Search managers…');

    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
  });

  it('shows all managers initially', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(4);
  });

  it('excludes managers in excludeIds', () => {
    showManagerPicker({
      title: 'Pick',
      managers: sampleManagers,
      excludeIds: new Set(['m1', 'm3']),
    });

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(2);

    const names = Array.from(items).map((el) => el.querySelector('span')!.textContent);
    expect(names).toContain('Bob Smith');
    expect(names).toContain('Dave Wilson');
    expect(names).not.toContain('Alice Johnson');
    expect(names).not.toContain('Carol Davis');
  });

  it('filters managers by name', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'bob';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('span')!.textContent).toBe('Bob Smith');
  });

  it('filters managers by title', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'director';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(2);

    const names = Array.from(items).map((el) => el.querySelector('span')!.textContent);
    expect(names).toContain('Bob Smith');
    expect(names).toContain('Dave Wilson');
  });

  it('clicking a manager resolves with its id', async () => {
    const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const items = document.querySelectorAll('[role="option"]');
    (items[1] as HTMLElement).click();

    const result = await promise;
    expect(result).toEqual({ managerId: 'm2', dottedLine: false });

    // Dialog should be removed
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Cancel button resolves with null', async () => {
    const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const cancelBtn = document.querySelector('.btn-secondary') as HTMLElement;
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn.textContent).toBe('Cancel');
    cancelBtn.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('Escape key resolves with null', async () => {
    const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await promise;
    expect(result).toBeNull();
  });

  it('overlay click resolves with null', async () => {
    const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });

    // The overlay is the outermost fixed-position element appended to body
    const overlay = document.body.firstElementChild as HTMLElement;
    overlay.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('shows "No matches" when search has no results', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(0);

    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox!.textContent).toContain('No matches');
  });

  it('search is auto-focused', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });

  it('search is case-insensitive', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'ALICE';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('span')!.textContent).toBe('Alice Johnson');
  });

  it('empty search shows all managers again', () => {
    showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;

    // Type something to filter
    input.value = 'alice';
    input.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('[role="option"]').length).toBe(1);

    // Clear search
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('[role="option"]').length).toBe(4);
  });

  it('does not resolve multiple times on repeated interactions', async () => {
    const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });

    const cancelBtn = document.querySelector('.btn-secondary') as HTMLElement;
    cancelBtn.click();

    // Second click and escape should not cause issues
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await promise;
    expect(result).toBeNull();
  });

  describe('keyboard navigation', () => {
    it('ArrowDown highlights first option', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      const listbox = document.querySelector('[role="listbox"]')!;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      const items = listbox.querySelectorAll('[role="option"]');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
      expect(input.getAttribute('aria-activedescendant')).toBe(items[0].id);
    });

    it('ArrowDown moves to next option', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      const listbox = document.querySelector('[role="listbox"]')!;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      const items = listbox.querySelectorAll('[role="option"]');
      expect(items[0].getAttribute('aria-selected')).toBe('false');
      expect(items[1].getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowUp moves to previous option', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      const listbox = document.querySelector('[role="listbox"]')!;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      const items = listbox.querySelectorAll('[role="option"]');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowDown wraps from last to first', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      const listbox = document.querySelector('[role="listbox"]')!;

      for (let i = 0; i < sampleManagers.length; i++) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      const items = listbox.querySelectorAll('[role="option"]');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowUp from first wraps to last', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      const listbox = document.querySelector('[role="listbox"]')!;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      const items = listbox.querySelectorAll('[role="option"]');
      expect(items[items.length - 1].getAttribute('aria-selected')).toBe('true');
    });

    it('Enter selects the highlighted option', async () => {
      const promise = showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result!.managerId).toBe('m1');
    });

    it('Enter without highlight does nothing', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).not.toBeNull();
    });

    it('highlight resets when search query changes', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const listbox = document.querySelector('[role="listbox"]')!;
      expect(listbox.querySelector('[aria-selected="true"]')).not.toBeNull();

      input.value = 'bob';
      input.dispatchEvent(new Event('input'));

      expect(input.getAttribute('aria-activedescendant')).toBe('');
    });

    it('option items have unique ids', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });
      const items = document.querySelectorAll('[role="option"]');
      const ids = Array.from(items).map((item) => item.id);
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('dotted-line option', () => {
    it('does not show dotted-line checkbox by default', () => {
      showManagerPicker({ title: 'Pick', managers: sampleManagers });

      const checkbox = document.querySelector('#dotted-line-checkbox');
      expect(checkbox).toBeNull();
    });

    it('shows dotted-line checkbox when showDottedLineOption is true', () => {
      showManagerPicker({
        title: 'Pick',
        managers: sampleManagers,
        showDottedLineOption: true,
      });

      const checkbox = document.querySelector('#dotted-line-checkbox') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.type).toBe('checkbox');

      const label = checkbox.closest('label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('Dotted line');
    });

    it('returns dottedLine: false when checkbox is unchecked', async () => {
      const promise = showManagerPicker({
        title: 'Pick',
        managers: sampleManagers,
        showDottedLineOption: true,
      });

      const items = document.querySelectorAll('[role="option"]');
      (items[0] as HTMLElement).click();

      const result = await promise;
      expect(result).toEqual({ managerId: 'm1', dottedLine: false });
    });

    it('returns dottedLine: true when checkbox is checked', async () => {
      const promise = showManagerPicker({
        title: 'Pick',
        managers: sampleManagers,
        showDottedLineOption: true,
      });

      const checkbox = document.querySelector('#dotted-line-checkbox') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      const items = document.querySelectorAll('[role="option"]');
      (items[1] as HTMLElement).click();

      const result = await promise;
      expect(result).toEqual({ managerId: 'm2', dottedLine: true });
    });

    it('returns null when cancelled with dotted-line option visible', async () => {
      const promise = showManagerPicker({
        title: 'Pick',
        managers: sampleManagers,
        showDottedLineOption: true,
      });

      const cancelBtn = document.querySelector('.btn-secondary') as HTMLElement;
      cancelBtn.click();

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
