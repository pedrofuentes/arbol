import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { PropertyPanel } from '../../src/ui/property-panel';
import type { OrgNode } from '../../src/types';

beforeAll(() => { setLocale('en', en); });

function makeNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return { id: 'n1', name: 'Alice', title: 'Engineer', ...overrides };
}
function makeManager(): OrgNode {
  return { id: 'm1', name: 'Bob', title: 'Manager', children: [makeNode()] };
}
const cats = [{ id: 'c1', label: 'Open Position', color: '#fbbf24' }];

function createPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const callbacks = {
    onEdit: vi.fn(), onAddChild: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(),
    onFocus: vi.fn(), onCategoryChange: vi.fn(), onClose: vi.fn(),
  };
  const panel = new PropertyPanel({ container, ...callbacks });
  return { container, panel, ...callbacks };
}

describe('PropertyPanel', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('creates panel in container', () => {
    const { container } = createPanel();
    expect(container.querySelector('.property-panel')).not.toBeNull();
  });

  it('is hidden by default', () => {
    const { panel } = createPanel();
    expect(panel.isVisible()).toBe(false);
    expect(panel.getNodeId()).toBeNull();
  });

  it('show() adds open class and sets node data', () => {
    const { panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 5, cats);
    expect(panel.isVisible()).toBe(true);
    expect(panel.getNodeId()).toBe('n1');
  });

  it('displays node name and title', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 2, 10, []);
    expect(container.querySelector('.pp-node-name')!.textContent).toBe('Alice');
    expect(container.querySelector('.pp-node-title')!.textContent).toBe('Engineer');
  });

  it('shows parent name in metadata', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    const meta = container.querySelector('.pp-node-meta')!.textContent!;
    expect(meta).toContain('Boss');
  });

  it('shows Root when parentName is null', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, []);
    const meta = container.querySelector('.pp-node-meta')!.textContent!;
    expect(meta).toContain('Root');
  });

  it('populates edit inputs', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    const nameInput = container.querySelector('#pp-name-input') as HTMLInputElement;
    const titleInput = container.querySelector('#pp-title-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Alice');
    expect(titleInput.value).toBe('Engineer');
  });

  it('populates category dropdown', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode({ categoryId: 'c1' }), 'Boss', 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    expect(select.options.length).toBe(2); // None + 1 category
    expect(select.value).toBe('c1');
  });

  it('hide() removes open class', () => {
    const { panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(panel.getNodeId()).toBeNull();
  });

  it('save button calls onEdit when values changed', () => {
    const { container, panel, onEdit } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    const nameInput = container.querySelector('#pp-name-input') as HTMLInputElement;
    nameInput.value = 'Alice Updated';
    container.querySelector('.pp-save-btn')!.dispatchEvent(new Event('click'));
    expect(onEdit).toHaveBeenCalledWith('n1', 'Alice Updated', 'Engineer');
  });

  it('save button does NOT call onEdit when values unchanged', () => {
    const { container, panel, onEdit } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    container.querySelector('.pp-save-btn')!.dispatchEvent(new Event('click'));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('category change calls onCategoryChange', () => {
    const { container, panel, onCategoryChange } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    expect(onCategoryChange).toHaveBeenCalledWith('n1', 'c1');
  });

  it('category change to None passes null', () => {
    const { container, panel, onCategoryChange } = createPanel();
    panel.show(makeNode({ categoryId: 'c1' }), 'Boss', 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(onCategoryChange).toHaveBeenCalledWith('n1', null);
  });

  it('close button calls onClose', () => {
    const { container, panel, onClose } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    container.querySelector('.pp-close')!.dispatchEvent(new Event('click'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Move button disabled for root node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const moveBtn = Array.from(btns).find(b => b.textContent?.includes('Move'))!;
    expect(moveBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Remove button disabled for root node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const removeBtn = Array.from(btns).find(b => b.textContent?.includes('Remove'))!;
    expect(removeBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Focus button disabled for leaf node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const focusBtn = Array.from(btns).find(b => b.textContent?.includes('Focus'))!;
    expect(focusBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Focus button enabled for manager node', () => {
    const { container, panel } = createPanel();
    panel.show(makeManager(), 'CEO', 1, 2, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const focusBtn = Array.from(btns).find(b => b.textContent?.includes('Focus'))!;
    expect(focusBtn.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled buttons do not fire callbacks', () => {
    const { container, panel, onMove } = createPanel();
    panel.show(makeNode(), null, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const moveBtn = Array.from(btns).find(b => b.textContent?.includes('Move'))!;
    (moveBtn as HTMLElement).click();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('has role="complementary"', () => {
    const { container } = createPanel();
    expect(container.querySelector('[role="complementary"]')).not.toBeNull();
  });

  it('has aria-label', () => {
    const { container } = createPanel();
    const panel = container.querySelector('.property-panel')!;
    expect(panel.getAttribute('aria-label')).toBeTruthy();
  });

  it('inputs have labels with htmlFor', () => {
    const { container } = createPanel();
    const labels = container.querySelectorAll('.pp-field label');
    labels.forEach(label => {
      expect((label as HTMLLabelElement).htmlFor).toBeTruthy();
    });
  });

  it('update() refreshes displayed content', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 5, []);
    panel.update({ id: 'n1', name: 'Alice2', title: 'Sr Eng' }, 'NewBoss', 3, 10, []);
    expect(container.querySelector('.pp-node-name')!.textContent).toBe('Alice2');
    expect(container.querySelector('.pp-node-title')!.textContent).toBe('Sr Eng');
  });

  it('destroy removes element', () => {
    const { container, panel } = createPanel();
    panel.destroy();
    expect(container.querySelector('.property-panel')).toBeNull();
  });
});
