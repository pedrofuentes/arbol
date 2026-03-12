import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showAddPopover, dismissAddPopover } from '../../src/ui/add-popover';

function makeAnchor(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 100,
    bottom: 150,
    left: 200,
    right: 400,
    width: 200,
    height: 50,
    x: 200,
    y: 100,
    toJSON() { return this; },
    ...overrides,
  } as DOMRect;
}

describe('AddPopover', () => {
  let onAdd: (...args: any[]) => any;
  let onCancel: (...args: any[]) => any;

  beforeEach(() => {
    onAdd = vi.fn();
    onCancel = vi.fn();
  });

  afterEach(() => {
    dismissAddPopover();
    document.body.innerHTML = '';
  });

  function openPopover(anchor = makeAnchor()) {
    showAddPopover({ anchor, onAdd, onCancel });
    return document.querySelector<HTMLDivElement>('[role="dialog"]')!;
  }

  it('renders with title, two inputs, and two buttons', () => {
    const popover = openPopover();
    expect(popover).toBeInstanceOf(HTMLDivElement);
    expect(popover.textContent).toContain('Add Person');

    const inputs = popover.querySelectorAll('input');
    expect(inputs).toHaveLength(2);

    const buttons = popover.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('Cancel');
    expect(buttons[1].textContent).toBe('Add');
  });

  it('name input is focused after showing', () => {
    const popover = openPopover();
    const nameInput = popover.querySelector('input')!;
    expect(document.activeElement).toBe(nameInput);
  });

  it('clicking Add calls onAdd with input values', () => {
    const popover = openPopover();
    const inputs = popover.querySelectorAll('input');
    const addBtn = popover.querySelector('.btn-primary')!;

    // Set values
    inputs[0].value = 'Jane Doe';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = 'Engineer';

    (addBtn as HTMLButtonElement).click();

    expect(onAdd).toHaveBeenCalledWith('Jane Doe', 'Engineer');
  });

  it('clicking Add with empty name does NOT call onAdd', () => {
    const popover = openPopover();
    const nameInput = popover.querySelector('input')!;
    const addBtn = popover.querySelector<HTMLButtonElement>('.btn-primary')!;

    nameInput.value = '';
    addBtn.click();

    expect(onAdd).not.toHaveBeenCalled();
    // Name input should show error border
    expect(nameInput.style.borderColor).toBe('var(--danger, #e53e3e)');
  });

  it('clicking Cancel calls onCancel', () => {
    const popover = openPopover();
    const cancelBtn = popover.querySelector<HTMLButtonElement>('.btn-secondary')!;

    cancelBtn.click();

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('Escape key calls onCancel', () => {
    openPopover();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('click outside calls onCancel', () => {
    vi.useFakeTimers();
    openPopover();

    // Flush the deferred mousedown listener registration
    vi.advanceTimersByTime(1);

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('Enter in title input submits when valid', () => {
    const popover = openPopover();
    const inputs = popover.querySelectorAll('input');

    inputs[0].value = 'Bob';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = 'Manager';

    inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onAdd).toHaveBeenCalledWith('Bob', 'Manager');
  });

  it('Enter in title input does not submit when name is empty', () => {
    const popover = openPopover();
    const inputs = popover.querySelectorAll('input');

    inputs[0].value = '';
    inputs[1].value = 'Manager';

    inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('dismissAddPopover removes the popover', () => {
    openPopover();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    dismissAddPopover();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('only one popover at a time', () => {
    openPopover();
    openPopover();

    const popovers = document.querySelectorAll('[role="dialog"]');
    expect(popovers).toHaveLength(1);
  });

  it('positions below anchor by default', () => {
    const popover = openPopover(makeAnchor({ bottom: 150, left: 200, width: 200 }));
    expect(popover.style.top).toBe('158px'); // 150 + 8
  });

  it('positions above anchor when not enough space below', () => {
    // jsdom has no layout — mock offsetHeight so viewport logic triggers
    const origDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() { return 120; },
    });

    // Anchor near bottom of viewport — jsdom default innerHeight is 768
    const popover = openPopover(makeAnchor({ top: 700, bottom: 750 }));
    // Should be above: top = 700 - 120 - 8 = 572
    const top = parseInt(popover.style.top, 10);
    expect(top).toBeLessThan(700);

    // Restore
    if (origDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origDescriptor);
    }
  });

  it('cleans up event listeners on dismiss', () => {
    openPopover();
    dismissAddPopover();

    // Fire escape after dismiss — onCancel should not be called again
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
