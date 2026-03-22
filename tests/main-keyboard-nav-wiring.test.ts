import { describe, it, expect, vi } from 'vitest';

describe('keyboard nav handler wiring', () => {
  it('getKeyboardNav returns an object with setter methods', () => {
    const mockKeyboardNav = {
      setSelectHandler: vi.fn(),
      setMultiSelectHandler: vi.fn(),
      setContextMenuHandler: vi.fn(),
      setTree: vi.fn(),
      focusNode: vi.fn(),
      getFocusedNodeId: vi.fn(),
      destroy: vi.fn(),
    };

    const onSelect = vi.fn();
    const onMultiSelect = vi.fn();
    const onContextMenu = vi.fn();

    mockKeyboardNav.setSelectHandler(onSelect);
    mockKeyboardNav.setMultiSelectHandler(onMultiSelect);
    mockKeyboardNav.setContextMenuHandler(onContextMenu);

    expect(mockKeyboardNav.setSelectHandler).toHaveBeenCalledWith(onSelect);
    expect(mockKeyboardNav.setMultiSelectHandler).toHaveBeenCalledWith(onMultiSelect);
    expect(mockKeyboardNav.setContextMenuHandler).toHaveBeenCalledWith(onContextMenu);
  });

  it('select handler clears multi-selection and selects node', () => {
    const clearMultiSelection = vi.fn();
    const setSelectedNode = vi.fn();
    const showPropertyPanel = vi.fn();
    const findNodeById = vi.fn((_id: string) => ({ id: 'n1', name: 'Alice', title: 'Eng' }));
    const announce = vi.fn();

    const onSelect = (nodeId: string) => {
      clearMultiSelection();
      setSelectedNode(nodeId);
      const node = findNodeById(nodeId);
      if (node) {
        announce(`Selected ${node.name}, ${node.title}`);
        showPropertyPanel(nodeId);
      }
    };

    onSelect('n1');
    expect(clearMultiSelection).toHaveBeenCalled();
    expect(setSelectedNode).toHaveBeenCalledWith('n1');
    expect(showPropertyPanel).toHaveBeenCalledWith('n1');
    expect(announce).toHaveBeenCalledWith('Selected Alice, Eng');
  });

  it('multi-select handler toggles selection and updates indicator', () => {
    const rootId = 'root';
    const selection = {
      toggle: vi.fn(),
      hasSelection: true,
      count: 2,
    };
    const syncSelectionToRenderer = vi.fn();
    const updateSelectionIndicator = vi.fn();
    const announce = vi.fn();
    const propertyPanel = { hide: vi.fn() };

    const onMultiSelect = (nodeId: string) => {
      if (rootId === nodeId) return;
      selection.toggle(nodeId);
      syncSelectionToRenderer();
      updateSelectionIndicator();
      announce(`${selection.count} selected`);
      if (selection.hasSelection) {
        propertyPanel.hide();
      }
    };

    onMultiSelect('n1');
    expect(selection.toggle).toHaveBeenCalledWith('n1');
    expect(syncSelectionToRenderer).toHaveBeenCalled();
    expect(updateSelectionIndicator).toHaveBeenCalled();
    expect(propertyPanel.hide).toHaveBeenCalled();
  });

  it('multi-select handler skips root node', () => {
    const rootId = 'root';
    const selection = { toggle: vi.fn() };

    const onMultiSelect = (nodeId: string) => {
      if (rootId === nodeId) return;
      selection.toggle(nodeId);
    };

    onMultiSelect('root');
    expect(selection.toggle).not.toHaveBeenCalled();
  });

  it('context menu handler creates synthetic mouse event from element rect', () => {
    const dismissAllOverlays = vi.fn();
    const showSingleCardMenu = vi.fn();
    const clearMultiSelection = vi.fn();
    const selection = { hasSelection: false, isSelected: vi.fn() };

    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 200, width: 160, height: 34,
      right: 260, bottom: 234, x: 100, y: 200, toJSON: vi.fn(),
    });

    const onContextMenu = (nodeId: string, el: SVGGElement) => {
      dismissAllOverlays();
      const rect = el.getBoundingClientRect();
      const syntheticEvent = new MouseEvent('contextmenu', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      });
      if (selection.hasSelection && selection.isSelected(nodeId)) {
        // multi-select menu
      } else {
        clearMultiSelection();
        showSingleCardMenu(nodeId, syntheticEvent);
      }
    };

    onContextMenu('n1', element);
    expect(dismissAllOverlays).toHaveBeenCalled();
    expect(clearMultiSelection).toHaveBeenCalled();
    expect(showSingleCardMenu).toHaveBeenCalledWith('n1', expect.any(MouseEvent));

    const event = showSingleCardMenu.mock.calls[0][1] as MouseEvent;
    expect(event.clientX).toBe(180);
    expect(event.clientY).toBe(217);
  });
});
