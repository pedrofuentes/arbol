import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { createShowSingleCardMenu, createShowMultiSelectMenu } from '../../src/init/context-menu-handler';
import type { ContextMenuDeps } from '../../src/init/context-menu-handler';
import * as treeUtils from '../../src/utils/tree';
import type { OrgNode } from '../../src/types';
import { showContextMenu } from '../../src/ui/context-menu';
import { showManagerPicker } from '../../src/ui/manager-picker';
import { showConfirmDialog } from '../../src/ui/confirm-dialog';

vi.mock('../../src/ui/context-menu', () => ({
  showContextMenu: vi.fn(),
}));
vi.mock('../../src/ui/inline-editor', () => ({ showInlineEditor: vi.fn() }));
vi.mock('../../src/ui/add-popover', () => ({ showAddPopover: vi.fn() }));
vi.mock('../../src/ui/manager-picker', () => ({ showManagerPicker: vi.fn() }));
vi.mock('../../src/ui/confirm-dialog', () => ({ showConfirmDialog: vi.fn() }));
vi.mock('../../src/ui/toast', () => ({ showToast: vi.fn() }));
vi.mock('../../src/ui/announcer', () => ({ announce: vi.fn() }));

beforeAll(() => {
  setLocale('en', en);
});

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'CEO',
    title: 'Chief Executive',
    children: [
      {
        id: 'mgr1',
        name: 'Manager One',
        title: 'VP',
        children: [
          { id: 'ic1', name: 'Alice', title: 'Engineer' },
          { id: 'ic2', name: 'Bob', title: 'Engineer' },
        ],
      },
      {
        id: 'mgr2',
        name: 'Manager Two',
        title: 'VP',
        children: [
          { id: 'ic3', name: 'Carol', title: 'Designer' },
        ],
      },
    ],
  };
}

function makeDeps(treeOverride?: OrgNode): ContextMenuDeps {
  const tree = treeOverride ?? makeTree();
  return {
    store: {
      getTree: vi.fn(() => tree),
      addChild: vi.fn(),
      removeNode: vi.fn(),
      removeNodeWithReassign: vi.fn(),
      moveNode: vi.fn(),
      bulkMoveNodes: vi.fn(),
      bulkRemoveNodes: vi.fn(),
      updateNode: vi.fn(),
      setNodeCategory: vi.fn(),
      bulkSetCategory: vi.fn(),
      setDottedLine: vi.fn(),
      setNodeLevel: vi.fn(),
      bulkSetLevel: vi.fn(),
    } as unknown as ContextMenuDeps['store'],
    categoryStore: {
      getAll: vi.fn(() => []),
    } as unknown as ContextMenuDeps['categoryStore'],
    renderer: {
      getNodeScreenRect: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50 })),
    } as unknown as ContextMenuDeps['renderer'],
    focusMode: {
      focusedId: null,
      enter: vi.fn(),
    } as unknown as ContextMenuDeps['focusMode'],
    selection: {
      count: 2,
      toArray: vi.fn(() => ['mgr1', 'mgr2']),
    } as unknown as ContextMenuDeps['selection'],
  };
}

function captureMenuItems(): ReturnType<typeof vi.fn> {
  const mock = vi.mocked(showContextMenu);
  mock.mockClear();
  return mock;
}

function getItemByLabel(items: Array<{ label: string; action?: () => void | Promise<void> }>, label: string) {
  return items.find((item) => item.label.includes(label));
}

describe('createShowSingleCardMenu', () => {
  let flattenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    flattenSpy = vi.spyOn(treeUtils, 'flattenTree');
  });

  it('caches flattenTree(tree) across move and remove actions', async () => {
    const deps = makeDeps();
    const tree = (deps.store.getTree as Mock)();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    // Show context menu for a manager node (non-leaf, non-root)
    showMenu('mgr1', new MouseEvent('contextmenu'));

    expect(menuMock).toHaveBeenCalledOnce();
    const items = menuMock.mock.calls[0][0].items;

    // Mock manager picker to resolve (so move action runs through)
    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });

    // Trigger move action
    const moveItem = getItemByLabel(items, en['menu.move']);
    expect(moveItem).toBeDefined();
    await moveItem!.action!();

    // Count how many times flattenTree was called with the FULL tree
    const fullTreeCalls = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === tree);
    const fullTreeCallCountAfterMove = fullTreeCalls.length;
    expect(fullTreeCallCountAfterMove).toBe(1);

    // Now trigger remove action (manager branch — needs reassignment)
    vi.mocked(showConfirmDialog).mockResolvedValueOnce(true); // reassign=true
    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });

    const removeItem = getItemByLabel(items, en['menu.remove']);
    expect(removeItem).toBeDefined();
    await removeItem!.action!();

    // flattenTree(tree) should NOT have been called again — cached value reused
    const fullTreeCallsAfterRemove = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === tree);
    expect(fullTreeCallsAfterRemove.length).toBe(1);
  });

  it('move action still filters out descendants correctly', async () => {
    const deps = makeDeps();
    const tree = (deps.store.getTree as Mock)();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    let pickerManagers: Array<{ id: string }> = [];
    vi.mocked(showManagerPicker).mockImplementationOnce(async (opts) => {
      pickerManagers = opts.managers as Array<{ id: string }>;
      return { managerId: 'root', dottedLine: false };
    });

    const moveItem = getItemByLabel(items, en['menu.move']);
    await moveItem!.action!();

    // mgr1 and its descendants (ic1, ic2) should be excluded
    const pickerIds = pickerManagers.map((m) => m.id);
    expect(pickerIds).not.toContain('mgr1');
    expect(pickerIds).not.toContain('ic1');
    expect(pickerIds).not.toContain('ic2');
    // root and other subtree nodes should be present
    expect(pickerIds).toContain('root');
    expect(pickerIds).toContain('mgr2');
    expect(pickerIds).toContain('ic3');
  });

  it('remove with reassign uses cached allNodes', async () => {
    const deps = makeDeps();
    const tree = (deps.store.getTree as Mock)();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    // First trigger move to populate the cache
    vi.mocked(showManagerPicker).mockResolvedValueOnce(null); // user cancels
    const moveItem = getItemByLabel(items, en['menu.move']);
    await moveItem!.action!();

    // Now trigger remove → reassign
    vi.mocked(showConfirmDialog).mockResolvedValueOnce(true);
    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });

    const removeItem = getItemByLabel(items, en['menu.remove']);
    await removeItem!.action!();

    // flattenTree should have been called with the full tree only ONCE total
    const fullTreeCalls = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === tree);
    expect(fullTreeCalls.length).toBe(1);
  });

  it('subtree flattenTree calls are still made for descendants', async () => {
    const deps = makeDeps();
    const tree = (deps.store.getTree as Mock)();
    const mgr1Node = treeUtils.findNodeById(tree, 'mgr1')!;
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });

    const moveItem = getItemByLabel(items, en['menu.move']);
    await moveItem!.action!();

    // flattenTree should still be called with the subtree node
    const subtreeCalls = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === mgr1Node);
    expect(subtreeCalls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('createShowMultiSelectMenu', () => {
  let flattenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    flattenSpy = vi.spyOn(treeUtils, 'flattenTree');
  });

  it('caches flattenTree(tree) across move and remove actions', async () => {
    const deps = makeDeps();
    const tree = (deps.store.getTree as Mock)();
    const showMenu = createShowMultiSelectMenu(deps);
    const menuMock = captureMenuItems();

    showMenu(new MouseEvent('contextmenu'));

    expect(menuMock).toHaveBeenCalledOnce();
    const items = menuMock.mock.calls[0][0].items;

    // Trigger move action
    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });
    const moveItem = getItemByLabel(items, en['menu.multi_move'].replace('{count}', '2'));
    expect(moveItem).toBeDefined();
    await moveItem!.action!();

    const fullTreeCallsAfterMove = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === tree);
    expect(fullTreeCallsAfterMove.length).toBe(1);

    // Trigger remove action (has managers branch)
    vi.mocked(showManagerPicker).mockResolvedValueOnce({ managerId: 'root', dottedLine: false });
    const removeItem = getItemByLabel(items, en['menu.multi_remove'].replace('{count}', '2'));
    expect(removeItem).toBeDefined();
    await removeItem!.action!();

    // flattenTree(tree) should have been called only ONCE total
    const fullTreeCallsAfterRemove = flattenSpy.mock.calls.filter((args: unknown[]) => args[0] === tree);
    expect(fullTreeCallsAfterRemove.length).toBe(1);
  });

  it('multi-select move filters out selected nodes and descendants', async () => {
    const deps = makeDeps();
    const showMenu = createShowMultiSelectMenu(deps);
    const menuMock = captureMenuItems();

    showMenu(new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    let pickerManagers: Array<{ id: string }> = [];
    vi.mocked(showManagerPicker).mockImplementationOnce(async (opts) => {
      pickerManagers = opts.managers as Array<{ id: string }>;
      return { managerId: 'root', dottedLine: false };
    });

    const moveItem = getItemByLabel(items, en['menu.multi_move'].replace('{count}', '2'));
    await moveItem!.action!();

    // mgr1, mgr2, and all their descendants should be excluded
    const pickerIds = pickerManagers.map((m) => m.id);
    expect(pickerIds).not.toContain('mgr1');
    expect(pickerIds).not.toContain('ic1');
    expect(pickerIds).not.toContain('ic2');
    expect(pickerIds).not.toContain('mgr2');
    expect(pickerIds).not.toContain('ic3');
    // Only root remains
    expect(pickerIds).toContain('root');
  });
});

describe('single card menu – level submenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getLevelSubmenu(items: Array<{ label: string; submenu?: Array<{ label: string; action?: () => void }> }>) {
    return items.find((item) => item.label === en['menu.level']);
  }

  it('single card menu has level submenu', () => {
    const deps = makeDeps();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    const levelItem = getLevelSubmenu(items);
    expect(levelItem).toBeDefined();
    expect(levelItem!.submenu).toBeDefined();
    expect(levelItem!.submenu!.length).toBe(2);
  });

  it('level None clears level', () => {
    const tree = makeTree();
    tree.children![0].level = 'L3';
    const deps = makeDeps(tree);
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getLevelSubmenu(items);
    const noneItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.level_none']);
    noneItem!.action!();

    expect(deps.store.setNodeLevel).toHaveBeenCalledWith('mgr1', null);
  });

  it('level None shows checkmark when no level', () => {
    const deps = makeDeps();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getLevelSubmenu(items);
    const noneItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.level_none']);
    expect(noneItem!.icon).toBe(en['menu.level_check']);
  });

  it('Set Level calls setNodeLevel with prompt value', () => {
    const deps = makeDeps();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();
    vi.spyOn(window, 'prompt').mockReturnValueOnce('L5');

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getLevelSubmenu(items);
    const setItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.set_level']);
    setItem!.action!();

    expect(window.prompt).toHaveBeenCalled();
    expect(deps.store.setNodeLevel).toHaveBeenCalledWith('mgr1', 'L5');
  });

  it('Set Level cancelled does nothing', () => {
    const deps = makeDeps();
    const showMenu = createShowSingleCardMenu(deps);
    const menuMock = captureMenuItems();
    vi.spyOn(window, 'prompt').mockReturnValueOnce(null);

    showMenu('mgr1', new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getLevelSubmenu(items);
    const setItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.set_level']);
    setItem!.action!();

    expect(deps.store.setNodeLevel).not.toHaveBeenCalled();
  });
});

describe('multi-select menu – level submenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getMultiLevelSubmenu(items: Array<{ label: string; submenu?: Array<{ label: string; action?: () => void }> }>) {
    return items.find((item) => item.label === en['menu.multi_level'].replace('{count}', '2'));
  }

  it('multi-select menu has level submenu', () => {
    const deps = makeDeps();
    const showMenu = createShowMultiSelectMenu(deps);
    const menuMock = captureMenuItems();

    showMenu(new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;

    const levelItem = getMultiLevelSubmenu(items);
    expect(levelItem).toBeDefined();
    expect(levelItem!.submenu).toBeDefined();
    expect(levelItem!.submenu!.length).toBe(2);
  });

  it('multi-select level None calls bulkSetLevel', () => {
    const deps = makeDeps();
    const showMenu = createShowMultiSelectMenu(deps);
    const menuMock = captureMenuItems();

    showMenu(new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getMultiLevelSubmenu(items);
    const noneItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.level_none']);
    noneItem!.action!();

    expect(deps.store.bulkSetLevel).toHaveBeenCalledWith(['mgr1', 'mgr2'], null);
  });

  it('multi-select Set Level calls bulkSetLevel with prompt value', () => {
    const deps = makeDeps();
    const showMenu = createShowMultiSelectMenu(deps);
    const menuMock = captureMenuItems();
    vi.spyOn(window, 'prompt').mockReturnValueOnce('L7');

    showMenu(new MouseEvent('contextmenu'));
    const items = menuMock.mock.calls[0][0].items;
    const levelItem = getMultiLevelSubmenu(items);
    const setItem = levelItem!.submenu!.find((s: { label: string }) => s.label === en['menu.set_level']);
    setItem!.action!();

    expect(window.prompt).toHaveBeenCalled();
    expect(deps.store.bulkSetLevel).toHaveBeenCalledWith(['mgr1', 'mgr2'], 'L7');
  });
});
