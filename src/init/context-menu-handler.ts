import { t } from '../i18n';
import { flattenTree, findNodeById, findParent, isLeaf, isM1 } from '../utils/tree';
import { showContextMenu, type ContextMenuItem } from '../ui/context-menu';
import { showInlineEditor } from '../ui/inline-editor';
import { showAddPopover } from '../ui/add-popover';
import { showManagerPicker } from '../ui/manager-picker';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { showToast } from '../ui/toast';
import { announce } from '../ui/announcer';
import type { OrgNode } from '../types';
import type { OrgStore } from '../store/org-store';
import type { CategoryStore } from '../store/category-store';
import type { ChartRenderer } from '../renderer/chart-renderer';
import type { FocusModeController } from '../controllers/focus-mode';
import type { SelectionManager } from '../controllers/selection-manager';

export interface ContextMenuDeps {
  store: OrgStore;
  categoryStore: CategoryStore;
  renderer: ChartRenderer;
  focusMode: FocusModeController;
  selection: SelectionManager;
}

export function createShowSingleCardMenu(deps: ContextMenuDeps): (nodeId: string, event: MouseEvent) => void {
  return (nodeId: string, event: MouseEvent) => {
    const { store, categoryStore, renderer, focusMode } = deps;
    const tree = store.getTree();
    const node = findNodeById(tree, nodeId);
    if (!node) return;

    const isRoot = tree.id === nodeId;
    const nodeIsLeaf = isLeaf(node);
    const parent = findParent(tree, nodeId);
    const nodeIsIC = nodeIsLeaf && parent !== null && isM1(parent);

    let cachedAllNodes: OrgNode[] | null = null;
    const getAllNodes = (): OrgNode[] => {
      if (!cachedAllNodes) cachedAllNodes = flattenTree(tree);
      return cachedAllNodes;
    };

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: t('menu.edit'),
          icon: t('menu.edit_icon'),
          action: () => {
            const rect = renderer.getNodeScreenRect(nodeId);
            if (!rect) return;
            showInlineEditor({
              rect,
              name: node.name,
              title: node.title,
              level: node.level,
              onSave: (name, title, level) => {
                store.updateNode(nodeId, { name, title, level: level ?? null });
              },
              onCancel: () => {},
            });
          },
        },
        {
          label: t('menu.add'),
          icon: t('menu.add_icon'),
          action: () => {
            const rect = renderer.getNodeScreenRect(nodeId);
            if (!rect) return;
            showAddPopover({
              anchor: rect,
              parentName: node.name,
              onAdd: (name, title) => {
                store.addChild(nodeId, { name, title });
              },
              onCancel: () => {},
            });
          },
        },
        {
          label: t('menu.focus'),
          icon: t('menu.focus_icon'),
          disabled: nodeIsLeaf || focusMode.focusedId === nodeId,
          action: () => {
            focusMode.enter(nodeId);
            announce(t('focus.entered', { name: node.name }));
          },
        },
        {
          label: t('menu.category'),
          icon: t('menu.category_icon'),
          submenu: [
            {
              label: t('menu.category_none'),
              icon: node.categoryId ? ' ' : t('menu.category_check'),
              action: () => {
                store.setNodeCategory(nodeId, null);
              },
            },
            ...categoryStore.getAll().map(
              (cat): ContextMenuItem => ({
                label: cat.label,
                icon: node.categoryId === cat.id ? t('menu.category_check') : ' ',
                swatch: cat.color,
                action: () => {
                  store.setNodeCategory(nodeId, cat.id);
                },
              }),
            ),
          ],
        },
        {
          label: node.dottedLine ? t('menu.dotted_line_remove') : t('menu.dotted_line_set'),
          icon: t('menu.dotted_line_icon'),
          disabled: isRoot || nodeIsIC,
          action: () => {
            store.setDottedLine(nodeId, !node.dottedLine);
          },
        },
        {
          label: t('menu.move'),
          icon: t('menu.move_icon'),
          disabled: isRoot,
          action: async () => {
            try {
              const allNodes = getAllNodes();
              const descendants = flattenTree(node);
              const descendantIds = new Set(descendants.map((n) => n.id));
              const managers = allNodes
                .filter((n) => !descendantIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const result = await showManagerPicker({
                title: t('picker.move_to', { name: node.name }),
                managers,
                showDottedLineOption: true,
              });
              if (result) {
                const targetNode = findNodeById(tree, result.managerId);
                store.moveNode(nodeId, result.managerId, result.dottedLine);
                announce(t('announce.moved', { name: node.name, target: targetNode?.name ?? t('announce.move_fallback_target') }));
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
        {
          label: t('menu.remove'),
          icon: t('menu.remove_icon'),
          danger: true,
          disabled: isRoot,
          action: async () => {
            try {
              if (nodeIsLeaf) {
                const confirmed = await showConfirmDialog({
                  title: t('dialog.remove_person.title'),
                  message: t('dialog.remove_person.message', { name: node.name }),
                  confirmLabel: t('dialog.remove_person.confirm'),
                  danger: true,
                });
                if (confirmed) {
                  store.removeNode(nodeId);
                  announce(t('announce.removed', { name: node.name }));
                }
              } else {
                const descendants = flattenTree(node);
                const descendantCount = descendants.length - 1;

                const reassign = await showConfirmDialog({
                  title: t('dialog.remove_manager.title'),
                  message: t('dialog.remove_manager.message', { name: node.name, count: String(descendantCount) }),
                  confirmLabel: t('dialog.remove_manager.reassign'),
                  cancelLabel: t('dialog.remove_manager.remove_all', { count: String(descendantCount) }),
                  danger: false,
                });

                if (reassign) {
                  const allNodes = getAllNodes();
                  const descendantIds = new Set(descendants.map((n) => n.id));
                  const managers = allNodes
                    .filter((n) => !descendantIds.has(n.id))
                    .map((n) => ({ id: n.id, name: n.name, title: n.title }));

                  const result = await showManagerPicker({
                    title: t('picker.reassign_to', { name: node.name }),
                    managers,
                  });
                  if (result) {
                    store.removeNodeWithReassign(nodeId, result.managerId);
                    announce(t('announce.removed', { name: node.name }));
                  }
                } else {
                  const confirmed = await showConfirmDialog({
                    title: t('dialog.remove_manager.remove_all_confirm_title'),
                    message: t('dialog.remove_manager.remove_all_confirm_message', { name: node.name, count: String(descendantCount) }),
                    confirmLabel: t('dialog.remove_manager.remove_all_confirm'),
                    danger: true,
                  });
                  if (confirmed) {
                    store.removeNode(nodeId);
                    announce(t('announce.removed_with_org', { name: node.name, count: String(descendantCount) }));
                  }
                }
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
      ],
    });
  };
}

export function createShowMultiSelectMenu(deps: ContextMenuDeps): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    const { store, categoryStore, selection } = deps;
    const count = selection.count;
    const selectedArray = selection.toArray();
    const tree = store.getTree();

    let cachedAllNodes: OrgNode[] | null = null;
    const getAllNodes = (): OrgNode[] => {
      if (!cachedAllNodes) cachedAllNodes = flattenTree(tree);
      return cachedAllNodes;
    };

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: t('menu.multi_category', { count }),
          icon: '🏷️',
          submenu: [
            {
              label: t('menu.category_none'),
              action: () => {
                store.bulkSetCategory(selectedArray, null);
              },
            },
            ...categoryStore.getAll().map(
              (cat): ContextMenuItem => ({
                label: cat.label,
                swatch: cat.color,
                action: () => {
                  store.bulkSetCategory(selectedArray, cat.id);
                },
              }),
            ),
          ],
        },
        {
          label: t('menu.multi_move', { count }),
          icon: '↗️',
          action: async () => {
            try {
              const allNodes = getAllNodes();
              // Exclude selected nodes and their descendants
              const excludeIds = new Set<string>();
              for (const id of selectedArray) {
                const n = findNodeById(tree, id);
                if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
              }
              const managers = allNodes
                .filter((n) => !excludeIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const result = await showManagerPicker({
                title: t('picker.multi_move_to', { count }),
                managers,
              });
              if (result) {
                store.bulkMoveNodes(selectedArray, result.managerId);
                const targetNode = findNodeById(store.getTree(), result.managerId);
                announce(t('announce.multi_moved', { count, target: targetNode?.name ?? t('announce.move_fallback_target') }));
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
        {
          label: t('menu.multi_remove', { count }),
          icon: '🗑️',
          danger: true,
          action: async () => {
            try {
              // Check if any selected nodes have children
              const hasManagers = selectedArray.some((id) => {
                const n = findNodeById(tree, id);
                return n && !isLeaf(n);
              });

              if (hasManagers) {
                // Some are managers — ask where to reassign children
                const allNodes = getAllNodes();
                const excludeIds = new Set<string>();
                for (const id of selectedArray) {
                  const n = findNodeById(tree, id);
                  if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
                }
                const managers = allNodes
                  .filter((n) => !excludeIds.has(n.id))
                  .map((n) => ({ id: n.id, name: n.name, title: n.title }));

                const result = await showManagerPicker({
                  title: t('picker.reassign_managers'),
                  managers,
                });
                if (result) {
                  // Reassign children of managers first, then remove all
                  for (const id of selectedArray) {
                    const n = findNodeById(store.getTree(), id);
                    if (n && !isLeaf(n)) {
                      store.removeNodeWithReassign(id, result.managerId);
                    } else if (n) {
                      store.removeNode(id);
                    }
                  }
                  announce(t('announce.multi_removed', { count }));
                }
              } else {
                // All leaves — simple confirm and bulk remove
                const confirmed = await showConfirmDialog({
                  title: t('dialog.remove_selected.title'),
                  message: t('dialog.remove_selected.message', { count }),
                  confirmLabel: t('dialog.remove_selected.confirm'),
                  danger: true,
                });
                if (confirmed) {
                  store.bulkRemoveNodes(selectedArray);
                  announce(t('announce.multi_removed', { count }));
                }
              }
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('footer.operation_failed'), 'error');
            }
          },
        },
      ],
    });
  };
}
