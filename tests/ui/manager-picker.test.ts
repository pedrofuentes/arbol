import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showManagerPicker, ManagerPickerItem } from '../../src/ui/manager-picker';

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
    expect(result).toBe('m2');

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
});
