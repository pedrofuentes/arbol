import { describe, it, expect, afterEach } from 'vitest';
import { showVersionPicker, VersionPickerResult } from '../../src/ui/version-picker';
import { VersionRecord } from '../../src/types';

const sampleVersions: VersionRecord[] = [
  {
    id: 'v1',
    chartId: 'c1',
    name: 'Q1 Reorg',
    createdAt: '2024-01-15T10:00:00Z',
    tree: { id: 'root', name: 'CEO', title: 'Chief Executive', children: [] },
  },
  {
    id: 'v2',
    chartId: 'c1',
    name: 'Q2 Planning',
    createdAt: '2024-04-01T12:00:00Z',
    tree: { id: 'root', name: 'CEO', title: 'Chief Executive', children: [] },
  },
  {
    id: 'v3',
    chartId: 'c1',
    name: 'Mid-year Review',
    createdAt: '2024-06-15T09:30:00Z',
    tree: { id: 'root', name: 'CEO', title: 'Chief Executive', children: [] },
  },
];

describe('showVersionPicker', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog with title', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const title = document.querySelector('[data-testid="version-picker-title"]');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Compare against\u2026');
  });

  it('shows version items with name and date', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const items = document.querySelectorAll('[data-testid="version-picker-item"]');
    expect(items.length).toBe(3);

    const firstItem = items[0];
    const spans = firstItem.querySelectorAll('span');
    expect(spans[0].textContent).toBe('Q1 Reorg');
    expect(spans[1].textContent).toBe(
      new Date('2024-01-15T10:00:00Z').toLocaleDateString(),
    );
  });

  it('excludes specified version', () => {
    showVersionPicker({
      versions: sampleVersions,
      excludeVersionId: 'v2',
      includeWorkingTree: false,
    });

    const items = document.querySelectorAll('[data-testid="version-picker-item"]');
    expect(items.length).toBe(2);

    const ids = Array.from(items).map((el) => (el as HTMLElement).dataset.versionId);
    expect(ids).toContain('v1');
    expect(ids).toContain('v3');
    expect(ids).not.toContain('v2');
  });

  it('search filters versions by name', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const input = document.querySelector('[data-testid="version-picker-search"]') as HTMLInputElement;
    input.value = 'planning';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[data-testid="version-picker-item"]');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('span')!.textContent).toBe('Q2 Planning');
  });

  it('shows working tree option when includeWorkingTree is true', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: true });

    const workingItem = document.querySelector('[data-testid="version-picker-working-tree"]');
    expect(workingItem).not.toBeNull();
    expect(workingItem!.textContent).toContain('Current working tree');
    expect(workingItem!.textContent).toContain('Compare against live changes');
  });

  it('hides working tree option when includeWorkingTree is false', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const workingItem = document.querySelector('[data-testid="version-picker-working-tree"]');
    expect(workingItem).toBeNull();
  });

  it('working tree option not affected by search', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: true });

    const input = document.querySelector('[data-testid="version-picker-search"]') as HTMLInputElement;
    input.value = 'zzzznotfound';
    input.dispatchEvent(new Event('input'));

    const workingItem = document.querySelector('[data-testid="version-picker-working-tree"]');
    expect(workingItem).not.toBeNull();

    const versionItems = document.querySelectorAll('[data-testid="version-picker-item"]');
    expect(versionItems.length).toBe(0);
  });

  it('clicking version item resolves with version', async () => {
    const promise = showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const items = document.querySelectorAll('[data-testid="version-picker-item"]');
    (items[1] as HTMLElement).click();

    const result = await promise;
    expect(result).toEqual({ type: 'version', version: sampleVersions[1] });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('clicking working tree resolves correctly', async () => {
    const promise = showVersionPicker({ versions: sampleVersions, includeWorkingTree: true });

    const workingItem = document.querySelector('[data-testid="version-picker-working-tree"]') as HTMLElement;
    workingItem.click();

    const result = await promise;
    expect(result).toEqual({ type: 'working' });
  });

  it('cancel button resolves with null', async () => {
    const promise = showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const cancelBtn = document.querySelector('[data-testid="version-picker-cancel"]') as HTMLElement;
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn.textContent).toBe('Cancel');
    cancelBtn.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('escape key resolves with null', async () => {
    const promise = showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await promise;
    expect(result).toBeNull();
  });

  it('overlay click resolves with null', async () => {
    const promise = showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const overlay = document.body.firstElementChild as HTMLElement;
    overlay.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('shows "No matching versions" when search has no results', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const input = document.querySelector('[data-testid="version-picker-search"]') as HTMLInputElement;
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input'));

    const items = document.querySelectorAll('[data-testid="version-picker-item"]');
    expect(items.length).toBe(0);

    const listbox = document.querySelector('[data-testid="version-picker-list"]');
    expect(listbox!.textContent).toContain('No matching versions');
  });

  it('search input has focus on open', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const input = document.querySelector('[data-testid="version-picker-search"]') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });

  it('dialog has proper ARIA attributes', () => {
    showVersionPicker({ versions: sampleVersions, includeWorkingTree: false });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-labelledby')).toBe('version-picker-title');

    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();

    const options = document.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });
});
