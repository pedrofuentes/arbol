import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TabSwitcher } from '../../src/editor/tab-switcher';

describe('TabSwitcher', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const TABS = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
    { id: 'c', label: 'Tab C' },
  ];

  it('creates tab buttons for each tab definition', () => {
    new TabSwitcher(container, TABS);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button.tab-btn');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].textContent).toBe('Tab A');
    expect(buttons[1].textContent).toBe('Tab B');
    expect(buttons[2].textContent).toBe('Tab C');
  });

  it('first tab is active by default', () => {
    const switcher = new TabSwitcher(container, TABS);
    expect(switcher.getActiveTabId()).toBe('a');
  });

  it('only the active tab content is visible', () => {
    const switcher = new TabSwitcher(container, TABS);
    expect(switcher.getContentContainer('a')!.style.display).toBe('block');
    expect(switcher.getContentContainer('b')!.style.display).toBe('none');
    expect(switcher.getContentContainer('c')!.style.display).toBe('none');
  });

  it('clicking a tab activates it and hides others', () => {
    const switcher = new TabSwitcher(container, TABS);
    const btnB = container.querySelectorAll<HTMLButtonElement>('button.tab-btn')[1];
    btnB.click();

    expect(switcher.getActiveTabId()).toBe('b');
    expect(switcher.getContentContainer('a')!.style.display).toBe('none');
    expect(switcher.getContentContainer('b')!.style.display).toBe('block');
    expect(switcher.getContentContainer('c')!.style.display).toBe('none');
  });

  it('getContentContainer() returns the correct div for each tab id', () => {
    const switcher = new TabSwitcher(container, TABS);
    for (const tab of TABS) {
      const div = switcher.getContentContainer(tab.id);
      expect(div).toBeInstanceOf(HTMLDivElement);
      expect(div!.dataset.tabId).toBe(tab.id);
    }
  });

  it('getContentContainer() returns undefined for unknown id', () => {
    const switcher = new TabSwitcher(container, TABS);
    expect(switcher.getContentContainer('unknown')).toBeUndefined();
  });

  it('getActiveTabId() returns the currently active tab', () => {
    const switcher = new TabSwitcher(container, TABS);
    expect(switcher.getActiveTabId()).toBe('a');
    switcher.activate('c');
    expect(switcher.getActiveTabId()).toBe('c');
  });

  it('activate() programmatically switches tabs', () => {
    const switcher = new TabSwitcher(container, TABS);
    switcher.activate('c');

    expect(switcher.getActiveTabId()).toBe('c');
    expect(switcher.getContentContainer('a')!.style.display).toBe('none');
    expect(switcher.getContentContainer('b')!.style.display).toBe('none');
    expect(switcher.getContentContainer('c')!.style.display).toBe('block');
  });

  it('active tab button has primary text color', () => {
    const switcher = new TabSwitcher(container, TABS);
    const btnA = container.querySelectorAll<HTMLButtonElement>('button.tab-btn')[0];
    expect(btnA.style.color).toBe('var(--text-primary)');
  });

  it('inactive tab buttons have tertiary text color', () => {
    const switcher = new TabSwitcher(container, TABS);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button.tab-btn');
    expect(buttons[1].style.color).toBe('var(--text-tertiary)');
    expect(buttons[2].style.color).toBe('var(--text-tertiary)');
  });
});
