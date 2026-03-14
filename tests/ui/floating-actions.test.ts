import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { FloatingActions } from '../../src/ui/floating-actions';

beforeAll(() => { setLocale('en', en); });

function createActions() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const callbacks = {
    onEdit: vi.fn(), onAdd: vi.fn(), onFocus: vi.fn(),
    onMove: vi.fn(), onCategory: vi.fn(), onRemove: vi.fn(),
  };
  const actions = new FloatingActions({ container, ...callbacks });
  return { container, actions, ...callbacks };
}

describe('FloatingActions', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('creates element with floating-actions class', () => {
    const { container } = createActions();
    expect(container.querySelector('.floating-actions')).not.toBeNull();
  });

  it('has role="toolbar"', () => {
    const { container } = createActions();
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
  });

  it('hidden by default', () => {
    const { actions } = createActions();
    expect(actions.isVisible()).toBe(false);
  });

  it('showSingle makes visible', () => {
    const { actions } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: false });
    expect(actions.isVisible()).toBe(true);
  });

  it('showSingle renders Edit, Add, Focus, Move, Tag, Remove', () => {
    const { container, actions } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: false });
    const btns = container.querySelectorAll('.fa-btn');
    expect(btns.length).toBe(6);
  });

  it('showSingle disables Move and Remove for root', () => {
    const { container, actions } = createActions();
    actions.showSingle({ isRoot: true, isLeaf: false });
    const btns = container.querySelectorAll('.fa-btn');
    const moveBtn = Array.from(btns).find(b => b.textContent?.includes('Move'));
    const removeBtn = Array.from(btns).find(b => b.textContent?.includes('🗑'));
    expect(moveBtn?.getAttribute('aria-disabled')).toBe('true');
    expect(removeBtn?.getAttribute('aria-disabled')).toBe('true');
  });

  it('showSingle disables Focus for leaf', () => {
    const { container, actions } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: true });
    const btns = container.querySelectorAll('.fa-btn');
    const focusBtn = Array.from(btns).find(b => b.textContent?.includes('Focus'));
    expect(focusBtn?.getAttribute('aria-disabled')).toBe('true');
  });

  it('showMulti renders count-based buttons', () => {
    const { container, actions } = createActions();
    actions.showMulti(3);
    const btns = container.querySelectorAll('.fa-btn');
    expect(btns.length).toBe(3); // Tag, Move, Remove
    expect(btns[0].textContent).toContain('3');
  });

  it('hide removes visible class', () => {
    const { actions } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: false });
    actions.hide();
    expect(actions.isVisible()).toBe(false);
  });

  it('Edit button calls onEdit', () => {
    const { container, actions, onEdit } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: false });
    const btn = container.querySelectorAll('.fa-btn')[0] as HTMLElement;
    btn.click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('disabled buttons do not fire callbacks', () => {
    const { container, actions, onMove } = createActions();
    actions.showSingle({ isRoot: true, isLeaf: false });
    const btns = container.querySelectorAll('.fa-btn');
    const moveBtn = Array.from(btns).find(b => b.textContent?.includes('Move')) as HTMLElement;
    moveBtn.click();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('has dividers between button groups', () => {
    const { container, actions } = createActions();
    actions.showSingle({ isRoot: false, isLeaf: false });
    const dividers = container.querySelectorAll('.fa-divider');
    expect(dividers.length).toBe(2);
  });

  it('destroy removes element', () => {
    const { container, actions } = createActions();
    actions.destroy();
    expect(container.querySelector('.floating-actions')).toBeNull();
  });
});
