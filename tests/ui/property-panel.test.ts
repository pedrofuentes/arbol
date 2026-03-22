import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { PropertyPanel, type PropertyPanelOptions } from '../../src/ui/property-panel';
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
    onFocus: vi.fn(), onCategoryChange: vi.fn(), onLevelChange: vi.fn(), onToggleDottedLine: vi.fn(), onClose: vi.fn(),
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
    panel.show(makeNode(), 'Boss', 0, 5, 0, cats);
    expect(panel.isVisible()).toBe(true);
    expect(panel.getNodeId()).toBe('n1');
  });

  it('displays node name and title', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 2, 10, 0, []);
    expect(container.querySelector('.pp-node-name')!.textContent).toBe('Alice');
    expect(container.querySelector('.pp-node-title')!.textContent).toBe('Engineer');
  });

  it('shows parent name in metadata', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const meta = container.querySelector('.pp-node-meta')!.textContent!;
    expect(meta).toContain('Boss');
  });

  it('shows Root when parentName is null', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
    const meta = container.querySelector('.pp-node-meta')!.textContent!;
    expect(meta).toContain('Root');
  });

  it('shows avg span of control for manager nodes', () => {
    const { container, panel } = createPanel();
    panel.show(makeManager(), 'CEO', 1, 2, 3.5, []);
    const meta = container.querySelector('.pp-node-meta')!.textContent!;
    expect(meta).toContain('3.5');
  });

  it('hides span of control for leaf nodes', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const spanRow = container.querySelectorAll('.pp-node-meta span');
    const spanOfControl = Array.from(spanRow).find(s => s.textContent?.includes('span of control'));
    expect(spanOfControl).toBeDefined();
    expect((spanOfControl as HTMLElement).style.display).toBe('none');
  });

  it('populates edit inputs', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const nameInput = container.querySelector('#pp-name-input') as HTMLInputElement;
    const titleInput = container.querySelector('#pp-title-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Alice');
    expect(titleInput.value).toBe('Engineer');
  });

  it('populates category dropdown', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode({ categoryId: 'c1' }), 'Boss', 0, 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    expect(select.options.length).toBe(2); // None + 1 category
    expect(select.value).toBe('c1');
  });

  it('hide() removes open class', () => {
    const { panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(panel.getNodeId()).toBeNull();
  });

  it('save button calls onEdit when values changed', () => {
    const { container, panel, onEdit } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const nameInput = container.querySelector('#pp-name-input') as HTMLInputElement;
    nameInput.value = 'Alice Updated';
    container.querySelector('.pp-save-btn')!.dispatchEvent(new Event('click'));
    expect(onEdit).toHaveBeenCalledWith('n1', 'Alice Updated', 'Engineer');
  });

  it('save button does NOT call onEdit when values unchanged', () => {
    const { container, panel, onEdit } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    container.querySelector('.pp-save-btn')!.dispatchEvent(new Event('click'));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('category change calls onCategoryChange', () => {
    const { container, panel, onCategoryChange } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    expect(onCategoryChange).toHaveBeenCalledWith('n1', 'c1');
  });

  it('category change to None passes null', () => {
    const { container, panel, onCategoryChange } = createPanel();
    panel.show(makeNode({ categoryId: 'c1' }), 'Boss', 0, 0, 0, cats);
    const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(onCategoryChange).toHaveBeenCalledWith('n1', null);
  });

  it('close button calls onClose', () => {
    const { container, panel, onClose } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    container.querySelector('.pp-close')!.dispatchEvent(new Event('click'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Move button disabled for root node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const moveBtn = Array.from(btns).find(b => b.textContent?.includes('Move'))!;
    expect(moveBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Remove button disabled for root node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const removeBtn = Array.from(btns).find(b => b.textContent?.includes('Remove'))!;
    expect(removeBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Focus button disabled for leaf node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const focusBtn = Array.from(btns).find(b => b.textContent?.includes('Focus'))!;
    expect(focusBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Focus button enabled for manager node', () => {
    const { container, panel } = createPanel();
    panel.show(makeManager(), 'CEO', 1, 2, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const focusBtn = Array.from(btns).find(b => b.textContent?.includes('Focus'))!;
    expect(focusBtn.getAttribute('aria-disabled')).toBeNull();
  });

  it('disabled buttons do not fire callbacks', () => {
    const { container, panel, onMove } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
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
    panel.show(makeNode(), 'Boss', 0, 5, 0, []);
    panel.update({ id: 'n1', name: 'Alice2', title: 'Sr Eng' }, 'NewBoss', 3, 10, 0, []);
    expect(container.querySelector('.pp-node-name')!.textContent).toBe('Alice2');
    expect(container.querySelector('.pp-node-title')!.textContent).toBe('Sr Eng');
  });

  it('destroy removes element', () => {
    const { container, panel } = createPanel();
    panel.destroy();
    expect(container.querySelector('.property-panel')).toBeNull();
  });

  it('Dotted button shows "Dotted" for normal node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const dottedBtn = Array.from(btns).find(b => b.textContent?.includes('Dotted'))!;
    expect(dottedBtn).toBeDefined();
    expect(dottedBtn.getAttribute('aria-disabled')).toBeNull();
  });

  it('Dotted button shows "Solid" when node has dottedLine', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode({ dottedLine: true }), 'Boss', 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const solidBtn = Array.from(btns).find(b => b.textContent?.includes('Solid'))!;
    expect(solidBtn).toBeDefined();
  });

  it('Dotted button disabled for root node', () => {
    const { container, panel } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const dottedBtn = Array.from(btns).find(b => b.textContent?.includes('Dotted'))!;
    expect(dottedBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Dotted button calls onToggleDottedLine', () => {
    const { container, panel, onToggleDottedLine } = createPanel();
    panel.show(makeNode(), 'Boss', 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const dottedBtn = Array.from(btns).find(b => b.textContent?.includes('Dotted'))!;
    (dottedBtn as HTMLElement).click();
    expect(onToggleDottedLine).toHaveBeenCalledWith('n1');
  });

  it('Disabled dotted button does not fire callback', () => {
    const { container, panel, onToggleDottedLine } = createPanel();
    panel.show(makeNode(), null, 0, 0, 0, []);
    const btns = container.querySelectorAll('.pp-action-btn');
    const dottedBtn = Array.from(btns).find(b => b.textContent?.includes('Dotted'))!;
    (dottedBtn as HTMLElement).click();
    expect(onToggleDottedLine).not.toHaveBeenCalled();
  });

  describe('category dropdown caching', () => {
    it('does not rebuild category dropdown when showing different nodes with same categories', () => {
      const { container, panel } = createPanel();
      const sharedCats = [
        { id: 'c1', label: 'Open Position', color: '#fbbf24' },
        { id: 'c2', label: 'New Hire', color: '#34d399' },
      ];
      panel.show(makeNode({ id: 'a1', name: 'Alice' }), 'Boss', 0, 0, 0, sharedCats);
      const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
      const originalOptions = Array.from(select.options);

      panel.show(makeNode({ id: 'b1', name: 'Bob' }), 'Boss', 0, 0, 0, sharedCats);
      const newOptions = Array.from(select.options);

      expect(newOptions.length).toBe(originalOptions.length);
      for (let i = 0; i < originalOptions.length; i++) {
        expect(newOptions[i]).toBe(originalOptions[i]);
      }
    });

    it('rebuilds category dropdown when categories change', () => {
      const { container, panel } = createPanel();
      const cats1 = [{ id: 'c1', label: 'Open Position', color: '#fbbf24' }];
      const cats2 = [{ id: 'c2', label: 'New Hire', color: '#34d399' }];

      panel.show(makeNode(), 'Boss', 0, 0, 0, cats1);
      const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
      expect(select.options.length).toBe(2);
      expect(select.options[1].value).toBe('c1');

      panel.show(makeNode({ id: 'n2' }), 'Boss', 0, 0, 0, cats2);
      expect(select.options.length).toBe(2);
      expect(select.options[1].value).toBe('c2');
      expect(select.options[1].textContent).toBe('New Hire');
    });

    it('uses DocumentFragment for batch DOM updates', () => {
      const { container, panel } = createPanel();
      const manyCats = [
        { id: 'c1', label: 'Cat1', color: '#111' },
        { id: 'c2', label: 'Cat2', color: '#222' },
        { id: 'c3', label: 'Cat3', color: '#333' },
      ];
      panel.show(makeNode(), 'Boss', 0, 0, 0, manyCats);
      const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
      expect(select.options.length).toBe(4); // None + 3 categories
      expect(select.options[0].value).toBe('');
      expect(select.options[1].value).toBe('c1');
      expect(select.options[2].value).toBe('c2');
      expect(select.options[3].value).toBe('c3');
    });

    it('updates selected value without rebuilding dropdown', () => {
      const { container, panel } = createPanel();
      panel.show(makeNode({ id: 'a1', categoryId: 'c1' }), 'Boss', 0, 0, 0, cats);
      const select = container.querySelector('#pp-category-select') as HTMLSelectElement;
      expect(select.value).toBe('c1');
      const originalOptions = Array.from(select.options);

      panel.show(makeNode({ id: 'b1', categoryId: undefined }), 'Boss', 0, 0, 0, cats);
      expect(select.value).toBe('');
      const newOptions = Array.from(select.options);
      for (let i = 0; i < originalOptions.length; i++) {
        expect(newOptions[i]).toBe(originalOptions[i]);
      }
    });
  });

  describe('pinned title indicator', () => {
    function createPanelWithResolve(resolveTitle?: PropertyPanelOptions['resolveTitle']) {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const callbacks = {
        onEdit: vi.fn(), onAddChild: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(),
        onFocus: vi.fn(), onCategoryChange: vi.fn(), onLevelChange: vi.fn(),
        onToggleDottedLine: vi.fn(), onClose: vi.fn(),
        onPinTitle: vi.fn(), onUnpinTitle: vi.fn(),
        resolveTitle,
      };
      const panel = new PropertyPanel({ container, ...callbacks });
      return { container, panel, ...callbacks };
    }

    it('shows pin button when a node is displayed', () => {
      const { container, panel } = createPanelWithResolve();
      panel.show(makeNode(), 'Boss', 0, 0, 0, []);
      const pinBtn = container.querySelector('[data-testid="pin-title-btn"]');
      expect(pinBtn).not.toBeNull();
    });

    it('shows high-opacity pin when title is pinned', () => {
      const { container, panel } = createPanelWithResolve();
      panel.show(makeNode({ pinnedTitle: true }), 'Boss', 0, 0, 0, []);
      const pinBtn = container.querySelector('[data-testid="pin-title-btn"]') as HTMLButtonElement;
      expect(pinBtn.style.opacity).toBe('0.9');
      expect(pinBtn.getAttribute('aria-label')).toBe(en['property_panel.unpin_title']);
    });

    it('shows low-opacity pin when title is not pinned', () => {
      const { container, panel } = createPanelWithResolve();
      panel.show(makeNode(), 'Boss', 0, 0, 0, []);
      const pinBtn = container.querySelector('[data-testid="pin-title-btn"]') as HTMLButtonElement;
      expect(pinBtn.style.opacity).toBe('0.3');
      expect(pinBtn.getAttribute('aria-label')).toBe(en['property_panel.pin_title']);
    });

    it('calls onPinTitle when clicking pin on unpinned node', () => {
      const { container, panel, onPinTitle } = createPanelWithResolve();
      panel.show(makeNode(), 'Boss', 0, 0, 0, []);
      const pinBtn = container.querySelector('[data-testid="pin-title-btn"]') as HTMLButtonElement;
      pinBtn.click();
      expect(onPinTitle).toHaveBeenCalledWith('n1');
    });

    it('calls onUnpinTitle when clicking pin on pinned node', () => {
      const { container, panel, onUnpinTitle } = createPanelWithResolve();
      panel.show(makeNode({ pinnedTitle: true }), 'Boss', 0, 0, 0, []);
      const pinBtn = container.querySelector('[data-testid="pin-title-btn"]') as HTMLButtonElement;
      pinBtn.click();
      expect(onUnpinTitle).toHaveBeenCalledWith('n1');
    });

    it('shows auto-resolved title when pinned node has different mapping', () => {
      const resolve = (orig: string, _lvl?: string, _mgr?: boolean, pinned?: boolean) =>
        pinned ? orig : 'Mapped Title';
      const { container, panel } = createPanelWithResolve(resolve);
      panel.show(makeNode({ pinnedTitle: true, level: 'L5' }), 'Boss', 0, 0, 0, []);
      const autoEl = container.querySelector('[data-testid="auto-title"]') as HTMLElement;
      expect(autoEl).not.toBeNull();
      expect(autoEl.style.display).not.toBe('none');
      expect(autoEl.textContent).toContain('Mapped Title');
    });

    it('hides auto-resolved title when not pinned', () => {
      const resolve = (orig: string) => orig;
      const { container, panel } = createPanelWithResolve(resolve);
      panel.show(makeNode(), 'Boss', 0, 0, 0, []);
      const autoEl = container.querySelector('[data-testid="auto-title"]') as HTMLElement;
      expect(autoEl.style.display).toBe('none');
    });

    it('hides auto-resolved title when pinned but mapping produces same title', () => {
      const resolve = (orig: string) => orig;
      const { container, panel } = createPanelWithResolve(resolve);
      panel.show(makeNode({ pinnedTitle: true }), 'Boss', 0, 0, 0, []);
      const autoEl = container.querySelector('[data-testid="auto-title"]') as HTMLElement;
      expect(autoEl.style.display).toBe('none');
    });
  });
});
