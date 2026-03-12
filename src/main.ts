import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { TabSwitcher } from './editor/tab-switcher';
import { SettingsEditor } from './editor/settings-editor';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { ImportEditor } from './editor/import-editor';
import { UtilitiesEditor } from './editor/utilities-editor';
import { exportToPptx } from './export/pptx-exporter';
import { ThemeManager } from './store/theme-manager';
import { SettingsStore, PersistableSettings } from './store/settings-store';
import { CategoryStore } from './store/category-store';
import { getMatchingNodeIds } from './utils/search';
import { OrgNode } from './types';
import { flattenTree, findNodeById, isLeaf, countLeaves, countManagersByLevel } from './utils/tree';
import { showHelpDialog } from './ui/help-dialog';
import { ShortcutManager } from './utils/shortcuts';
import { APP_VERSION } from './version';
import { showContextMenu, dismissContextMenu, ContextMenuItem } from './ui/context-menu';
import { showInlineEditor, dismissInlineEditor } from './ui/inline-editor';
import { showAddPopover, dismissAddPopover } from './ui/add-popover';
import { showManagerPicker } from './ui/manager-picker';
import { showConfirmDialog } from './ui/confirm-dialog';
import { showFocusBanner, dismissFocusBanner } from './ui/focus-banner';
import { showCategoryLegend, dismissCategoryLegend } from './ui/category-legend';

const ORG_STORAGE_KEY = 'arbol-org-data';

const INITIAL_DATA: OrgNode = {
  id: 'root',
  name: 'Arbol',
  title: 'CEO',
};

function loadSavedOrg(): OrgNode {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted data — fall back to default
  }
  return INITIAL_DATA;
}

function main(): void {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  const store = new OrgStore(loadSavedOrg());

  // Settings persistence
  const settingsStore = new SettingsStore();
  const defaultSettings: PersistableSettings = {
    nodeWidth: 110,
    nodeHeight: 22,
    horizontalSpacing: 30,
    branchSpacing: 10,
    topVerticalSpacing: 5,
    bottomVerticalSpacing: 12,
    icNodeWidth: 99,
    icGap: 4,
    icContainerPadding: 6,
    palTopGap: 7,
    palBottomGap: 7,
    palRowGap: 4,
    palCenterGap: 50,
    nameFontSize: 8,
    titleFontSize: 7,
    textPaddingTop: 4,
    textGap: 1,
    linkColor: '#94a3b8',
    linkWidth: 1.5,
    cardFill: '#ffffff',
    cardStroke: '#22c55e',
    cardStrokeWidth: 1,
    icContainerFill: '#e5e7eb',
  };
  const savedSettings = settingsStore.load(defaultSettings);

  // Category store
  const categoryStore = new CategoryStore();

  const renderer = new ChartRenderer({
    container: chartArea,
    ...savedSettings,
    categories: categoryStore.getAll(),
  });

  let onSettingsSaved: (() => void) | null = null;

  // Focus mode: show only a subtree rooted at this node
  let focusedNodeId: string | null = null;

  const exitFocusMode = () => {
    focusedNodeId = null;
    dismissFocusBanner();
    rerender();
    renderer.getZoomManager()?.fitToContent();
  };

  const rerender = () => {
    const fullTree = store.getTree();

    // If focused, validate the node still exists; if not, exit focus mode
    if (focusedNodeId) {
      const focusedNode = findNodeById(fullTree, focusedNodeId);
      if (!focusedNode) {
        focusedNodeId = null;
        dismissFocusBanner();
      }
    }

    const treeToRender = focusedNodeId
      ? findNodeById(fullTree, focusedNodeId) ?? fullTree
      : fullTree;

    // Refresh categories so renderer picks up any changes
    renderer.updateOptions({ categories: categoryStore.getAll() });
    renderer.render(treeToRender);
    const opts = renderer.getOptions();
    settingsStore.save(opts as unknown as Partial<PersistableSettings>);
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(fullTree));

    if (focusedNodeId) {
      const focusedNode = findNodeById(fullTree, focusedNodeId)!;
      showFocusBanner({
        name: focusedNode.name,
        container: chartArea,
        onExit: exitFocusMode,
      });
    } else {
      dismissFocusBanner();
    }

    onSettingsSaved?.();

    // Update category legend on the chart
    const categories = categoryStore.getAll();
    if (categories.length > 0) {
      showCategoryLegend({ categories, container: chartArea });
    } else {
      dismissCategoryLegend();
    }
  };

  // Theme toggle
  const themeManager = new ThemeManager();
  const headerRight = document.getElementById('header-right')!;

  const themeBtn = document.createElement('button');
  themeBtn.className = 'icon-btn';
  themeBtn.setAttribute('data-tooltip', 'Toggle theme');
  themeBtn.setAttribute('aria-label', 'Toggle dark/light theme');
  themeBtn.textContent = themeManager.getTheme() === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    themeManager.toggle();
  });
  themeManager.onChange((theme) => {
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
  headerRight.appendChild(themeBtn);

  // Help button
  const helpBtn = document.createElement('button');
  helpBtn.className = 'icon-btn';
  helpBtn.setAttribute('data-tooltip', 'Help & shortcuts');
  helpBtn.setAttribute('aria-label', 'Show help');
  helpBtn.textContent = '?';
  helpBtn.style.fontWeight = '700';
  helpBtn.addEventListener('click', () => showHelpDialog());
  headerRight.appendChild(helpBtn);

  // Undo/Redo buttons (inserted before theme button)
  const undoBtn = document.createElement('button');
  undoBtn.className = 'icon-btn';
  undoBtn.setAttribute('data-tooltip', 'Undo (Ctrl+Z)');
  undoBtn.setAttribute('aria-label', 'Undo');
  undoBtn.textContent = '↩';
  undoBtn.disabled = true;
  undoBtn.addEventListener('click', () => {
    store.undo();
  });
  headerRight.insertBefore(undoBtn, themeBtn);

  const redoBtn = document.createElement('button');
  redoBtn.className = 'icon-btn';
  redoBtn.setAttribute('data-tooltip', 'Redo (Ctrl+Shift+Z)');
  redoBtn.setAttribute('aria-label', 'Redo');
  redoBtn.textContent = '↪';
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', () => {
    store.redo();
  });
  headerRight.insertBefore(redoBtn, themeBtn);

  // Visual divider between undo/redo and theme toggle
  const divider = document.createElement('span');
  divider.className = 'header-divider';
  headerRight.insertBefore(divider, themeBtn);

  const updateUndoRedoState= () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    undoBtn.style.opacity = store.canUndo() ? '1' : '0.4';
    redoBtn.style.opacity = store.canRedo() ? '1' : '0.4';
  };
  store.onChange(updateUndoRedoState);
  updateUndoRedoState();

  // Search UI
  const headerCenter = document.getElementById('header-center')!;

  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.setAttribute('role', 'searchbox');
  searchInput.setAttribute('aria-label', 'Search people by name or title');
  searchInput.placeholder = 'Search people... (Ctrl+F)';
  headerCenter.appendChild(searchInput);

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  searchInput.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length === 0) {
        renderer.setHighlightedNodes(null);
      } else {
        const matchIds = getMatchingNodeIds(store.getTree(), query);
        renderer.setHighlightedNodes(matchIds.size > 0 ? matchIds : null);
      }
    }, 200);
  });

  // Sidebar tabs
  const tabSwitcher = new TabSwitcher(sidebar, [
    { id: 'people', label: 'People' },
    { id: 'import', label: 'Import' },
    { id: 'settings', label: 'Settings' },
  ]);

  const peopleContainer = tabSwitcher.getContentContainer('people')!;
  const formEditor = new FormEditor(peopleContainer, store);

  const importContainer = tabSwitcher.getContentContainer('import')!;
  new ImportEditor(importContainer, store);

  // Text normalization section
  const normSeparator = document.createElement('hr');
  normSeparator.style.cssText = 'border:none;border-top:1px solid var(--border-subtle);margin:16px 0;';
  importContainer.appendChild(normSeparator);
  new UtilitiesEditor(importContainer, store);

  // JSON Editor as collapsible details
  const jsonSeparator = document.createElement('hr');
  jsonSeparator.style.cssText = 'border:none;border-top:1px solid var(--border-subtle);margin:16px 0;';
  importContainer.appendChild(jsonSeparator);

  const jsonDetails = document.createElement('details');
  jsonDetails.style.cssText = 'margin-bottom:14px;';

  const jsonSummary = document.createElement('summary');
  jsonSummary.style.cssText =
    'padding:6px 0;font-size:11px;font-weight:700;font-family:var(--font-sans);' +
    'color:var(--text-tertiary);cursor:pointer;user-select:none;text-transform:uppercase;letter-spacing:0.08em;' +
    'list-style:none;display:flex;align-items:center;gap:6px;';

  const jsonArrow = document.createElement('span');
  jsonArrow.style.cssText = 'font-size:8px;transition:transform 150ms ease;display:inline-block;';
  jsonArrow.textContent = '▶';
  jsonSummary.appendChild(jsonArrow);
  jsonSummary.appendChild(document.createTextNode('Edit JSON'));
  jsonDetails.appendChild(jsonSummary);

  jsonDetails.addEventListener('toggle', () => {
    jsonArrow.style.transform = jsonDetails.open ? 'rotate(90deg)' : '';
  });

  const jsonContent = document.createElement('div');
  jsonDetails.appendChild(jsonContent);
  importContainer.appendChild(jsonDetails);

  const jsonEditor = new JsonEditor(jsonContent, store);

  const settingsContainer = tabSwitcher.getContentContainer('settings')!;
  new SettingsEditor(settingsContainer, renderer, rerender, settingsStore, categoryStore);

  // Multi-select state
  const multiSelectedIds = new Set<string>();
  let onMultiSelectionChanged: (() => void) | null = null;

  const clearMultiSelection = () => {
    multiSelectedIds.clear();
    renderer.setMultiSelectedNodes(null);
    onMultiSelectionChanged?.();
  };

  store.onChange(() => {
    rerender();
    formEditor.refresh();
    jsonEditor.refresh();
    clearMultiSelection();
  });

  categoryStore.onChange(() => {
    rerender();
  });

  renderer.setNodeClickHandler((nodeId: string, event: MouseEvent) => {
    if (event.shiftKey) {
      // Shift+click: toggle multi-selection (root excluded)
      const tree = store.getTree();
      if (tree.id === nodeId) return;

      if (multiSelectedIds.has(nodeId)) {
        multiSelectedIds.delete(nodeId);
      } else {
        multiSelectedIds.add(nodeId);
      }
      renderer.setMultiSelectedNodes(multiSelectedIds.size > 0 ? multiSelectedIds : null);
      onMultiSelectionChanged?.();
    } else {
      // Regular click: clear multi-selection, highlight card only (no sidebar form)
      clearMultiSelection();
      renderer.setSelectedNode(nodeId);
    }
  });

  // Dismiss all floating UI on chart zoom/pan
  const dismissAllOverlays = () => {
    dismissContextMenu();
    dismissInlineEditor();
    dismissAddPopover();
  };
  renderer.getZoomManager().onZoom(dismissAllOverlays);

  // Helper: show single-card context menu
  const showSingleCardMenu = (nodeId: string, event: MouseEvent) => {
    const tree = store.getTree();
    const node = findNodeById(tree, nodeId);
    if (!node) return;

    const isRoot = tree.id === nodeId;
    const nodeIsLeaf = isLeaf(node);

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: 'Edit',
          icon: '✏️',
          action: () => {
            const rect = renderer.getNodeScreenRect(nodeId);
            if (!rect) return;
            showInlineEditor({
              rect,
              name: node.name,
              title: node.title,
              onSave: (name, title) => {
                store.updateNode(nodeId, { name, title });
              },
              onCancel: () => {},
            });
          },
        },
        {
          label: 'Add',
          icon: '➕',
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
          label: 'Focus on sub-org',
          icon: '🔎',
          disabled: nodeIsLeaf || (focusedNodeId === nodeId),
          action: () => {
            focusedNodeId = nodeId;
            rerender();
            renderer.getZoomManager()?.fitToContent();
          },
        },
        {
          label: 'Set Category',
          icon: '🏷️',
          submenu: [
            {
              label: 'None (default)',
              icon: node.categoryId ? ' ' : '✓',
              action: () => {
                store.setNodeCategory(nodeId, null);
              },
            },
            ...categoryStore.getAll().map((cat): ContextMenuItem => ({
              label: cat.label,
              icon: node.categoryId === cat.id ? '✓' : ' ',
              action: () => {
                store.setNodeCategory(nodeId, cat.id);
              },
            })),
          ],
        },
        {
          label: 'Move',
          icon: '↗️',
          disabled: isRoot,
          action: async () => {
            const allNodes = flattenTree(tree);
            const descendants = flattenTree(node);
            const descendantIds = new Set(descendants.map((n) => n.id));
            const managers = allNodes
              .filter((n) => !descendantIds.has(n.id))
              .map((n) => ({ id: n.id, name: n.name, title: n.title }));

            const targetId = await showManagerPicker({
              title: `Move "${node.name}" to…`,
              managers,
            });
            if (targetId) {
              store.moveNode(nodeId, targetId);
            }
          },
        },
        {
          label: 'Remove',
          icon: '🗑️',
          danger: true,
          disabled: isRoot,
          action: async () => {
            if (nodeIsLeaf) {
              const confirmed = await showConfirmDialog({
                title: 'Remove Person',
                message: `Remove "${node.name}"? This cannot be undone (but you can use Ctrl+Z to undo).`,
                confirmLabel: 'Remove',
                danger: true,
              });
              if (confirmed) store.removeNode(nodeId);
            } else {
              const allNodes = flattenTree(tree);
              const descendants = flattenTree(node);
              const descendantIds = new Set(descendants.map((n) => n.id));
              const managers = allNodes
                .filter((n) => !descendantIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const targetId = await showManagerPicker({
                title: `Reassign "${node.name}"'s reports to…`,
                managers,
              });
              if (targetId) {
                store.removeNodeWithReassign(nodeId, targetId);
              }
            }
          },
        },
      ],
    });
  };

  // Helper: show multi-select context menu
  const showMultiSelectMenu = (event: MouseEvent) => {
    const count = multiSelectedIds.size;
    const selectedArray = Array.from(multiSelectedIds);

    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: `Set Category (${count} people)`,
          icon: '🏷️',
          submenu: [
            {
              label: 'None (default)',
              action: () => {
                store.bulkSetCategory(selectedArray, null);
              },
            },
            ...categoryStore.getAll().map((cat): ContextMenuItem => ({
              label: cat.label,
              action: () => {
                store.bulkSetCategory(selectedArray, cat.id);
              },
            })),
          ],
        },
        {
          label: `Move all (${count} people)`,
          icon: '↗️',
          action: async () => {
            const tree = store.getTree();
            const allNodes = flattenTree(tree);
            // Exclude selected nodes and their descendants
            const excludeIds = new Set<string>();
            for (const id of selectedArray) {
              const n = findNodeById(tree, id);
              if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
            }
            const managers = allNodes
              .filter((n) => !excludeIds.has(n.id))
              .map((n) => ({ id: n.id, name: n.name, title: n.title }));

            const targetId = await showManagerPicker({
              title: `Move ${count} people to…`,
              managers,
            });
            if (targetId) {
              store.bulkMoveNodes(selectedArray, targetId);
            }
          },
        },
        {
          label: `Remove all (${count} people)`,
          icon: '🗑️',
          danger: true,
          action: async () => {
            const tree = store.getTree();
            // Check if any selected nodes have children
            const hasManagers = selectedArray.some((id) => {
              const n = findNodeById(tree, id);
              return n && !isLeaf(n);
            });

            if (hasManagers) {
              // Some are managers — ask where to reassign children
              const allNodes = flattenTree(tree);
              const excludeIds = new Set<string>();
              for (const id of selectedArray) {
                const n = findNodeById(tree, id);
                if (n) flattenTree(n).forEach((d) => excludeIds.add(d.id));
              }
              const managers = allNodes
                .filter((n) => !excludeIds.has(n.id))
                .map((n) => ({ id: n.id, name: n.name, title: n.title }));

              const targetId = await showManagerPicker({
                title: `Reassign children of selected managers to…`,
                managers,
              });
              if (targetId) {
                // Reassign children of managers first, then remove all
                for (const id of selectedArray) {
                  const n = findNodeById(store.getTree(), id);
                  if (n && !isLeaf(n)) {
                    store.removeNodeWithReassign(id, targetId);
                  } else if (n) {
                    store.removeNode(id);
                  }
                }
              }
            } else {
              // All leaves — simple confirm and bulk remove
              const confirmed = await showConfirmDialog({
                title: 'Remove Selected',
                message: `Remove ${count} people? You can use Ctrl+Z to undo.`,
                confirmLabel: 'Remove All',
                danger: true,
              });
              if (confirmed) {
                store.bulkRemoveNodes(selectedArray);
              }
            }
          },
        },
      ],
    });
  };

  // Right-click context menu
  renderer.setNodeRightClickHandler((nodeId: string, event: MouseEvent) => {
    dismissAllOverlays();

    if (multiSelectedIds.size > 0 && multiSelectedIds.has(nodeId)) {
      // Right-clicked on a multi-selected card → show bulk menu
      showMultiSelectMenu(event);
    } else {
      // Right-clicked on non-selected card → clear multi-selection, show single menu
      clearMultiSelection();
      showSingleCardMenu(nodeId, event);
    }
  });

  // Footer
  const footer = document.getElementById('footer')!;

  // Footer: Status area (left side)
  const footerLeft = document.createElement('div');
  footerLeft.className = 'footer-left';
  footerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:auto;';
  footer.appendChild(footerLeft);

  const versionLabel = document.createElement('span');
  versionLabel.className = 'footer-version';
  versionLabel.id = 'footer-version';
  versionLabel.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionLabel.textContent = `v${APP_VERSION}`;
  footerLeft.appendChild(versionLabel);

  const versionSeparator = document.createElement('span');
  versionSeparator.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  versionSeparator.textContent = '·';
  footerLeft.appendChild(versionSeparator);

  const statusText = document.createElement('span');
  statusText.className = 'footer-status';
  statusText.id = 'footer-status';
  statusText.style.cssText = 'font-size:11px;color:var(--text-tertiary);font-family:var(--font-sans);';
  footerLeft.appendChild(statusText);

  // Save indicator — flashes briefly when settings are persisted
  const saveIndicator = document.createElement('span');
  saveIndicator.style.cssText =
    'font-size:10px;color:var(--accent);font-family:var(--font-sans);font-weight:600;' +
    'opacity:0;transition:opacity 200ms ease;';
  saveIndicator.textContent = '✓ Saved';
  footerLeft.appendChild(saveIndicator);

  let saveFlashTimer: ReturnType<typeof setTimeout> | null = null;
  const flashSaved = () => {
    saveIndicator.style.opacity = '1';
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => {
      saveIndicator.style.opacity = '0';
    }, 1500);
  };
  onSettingsSaved = flashSaved;

  const updateStatus = () => {
    const fullTree = store.getTree();
    const tree = focusedNodeId
      ? findNodeById(fullTree, focusedNodeId) ?? fullTree
      : fullTree;
    const allNodes = flattenTree(tree);
    const total = allNodes.length;
    const managerCount = allNodes.filter((n) => !isLeaf(n)).length;
    const icCount = countLeaves(tree);
    const levels = countManagersByLevel(tree);

    const parts = [`${total} people`, `${managerCount} managers`, `${icCount} ICs`];
    const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
    for (const [depth, count] of sortedLevels) {
      parts.push(`${count} M${depth}`);
    }
    statusText.textContent = parts.join(' · ');
  };
  store.onChange(updateStatus);
  updateStatus();

  // Footer: Center area (selection count + zoom level)
  const footerCenter = document.createElement('div');
  footerCenter.className = 'footer-center';
  footerCenter.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;font-size:11px;font-family:var(--font-sans);';

  const selectionIndicator = document.createElement('span');
  selectionIndicator.style.cssText = 'color:var(--accent);font-weight:600;display:none;';
  footerCenter.appendChild(selectionIndicator);

  const zoomIndicator = document.createElement('span');
  zoomIndicator.style.cssText = 'color:var(--text-tertiary);';
  footerCenter.appendChild(zoomIndicator);

  footer.appendChild(footerCenter);

  // Update selection indicator when multi-select changes
  const updateSelectionIndicator = () => {
    if (multiSelectedIds.size > 0) {
      selectionIndicator.textContent = `${multiSelectedIds.size} selected`;
      selectionIndicator.style.display = '';
    } else {
      selectionIndicator.style.display = 'none';
    }
  };

  // Update zoom indicator
  const zoomManager = renderer.getZoomManager();
  const updateZoomIndicator = () => {
    const transform = zoomManager?.getCurrentTransform?.();
    if (transform) {
      const pct = Math.round(transform.k * 100);
      zoomIndicator.textContent = `${pct}%`;
    }
  };
  zoomManager?.onZoom(() => {
    updateZoomIndicator();
  });
  updateZoomIndicator();

  onMultiSelectionChanged = updateSelectionIndicator;

  // Footer: Buttons (right side)
  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'display:flex;align-items:center;gap:6px;';
  footer.appendChild(footerRight);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'footer-btn';
  exportBtn.dataset.action = 'export-pptx';
  exportBtn.textContent = '📊 Export PPTX';
  exportBtn.setAttribute('aria-label', 'Export to PowerPoint');
  exportBtn.setAttribute('data-tooltip', 'Export to PowerPoint (Ctrl+E)');
  footerRight.appendChild(exportBtn);

  exportBtn.addEventListener('click', async () => {
    const layout = renderer.getLastLayout();
    if (layout) {
      await exportToPptx(layout, { categories: categoryStore.getAll() });
    }
  });

  const fitBtn = document.createElement('button');
  fitBtn.className = 'footer-btn';
  fitBtn.dataset.action = 'fit';
  fitBtn.textContent = '⊞ Fit';
  fitBtn.setAttribute('aria-label', 'Fit chart to screen');
  fitBtn.setAttribute('data-tooltip', 'Fit chart to screen');
  footerRight.appendChild(fitBtn);

  fitBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.fitToContent();
  });

  const resetZoomBtn = document.createElement('button');
  resetZoomBtn.className = 'footer-btn';
  resetZoomBtn.dataset.action = 'reset-zoom';
  resetZoomBtn.textContent = '⟲ Reset';
  resetZoomBtn.setAttribute('aria-label', 'Reset zoom');
  resetZoomBtn.setAttribute('data-tooltip', 'Reset zoom to 100%');
  footerRight.appendChild(resetZoomBtn);

  resetZoomBtn.addEventListener('click', () => {
    renderer.getZoomManager()?.resetZoom();
  });

  // Keyboard shortcuts
  const shortcuts = new ShortcutManager();

  shortcuts.register({
    key: 'z', ctrl: true,
    handler: () => store.undo(),
    description: 'Undo',
  });

  shortcuts.register({
    key: 'z', ctrl: true, shift: true,
    handler: () => store.redo(),
    description: 'Redo',
  });

  shortcuts.register({
    key: 'y', ctrl: true,
    handler: () => store.redo(),
    description: 'Redo (alt)',
  });

  shortcuts.register({
    key: 'e', ctrl: true,
    handler: async () => {
      const layout = renderer.getLastLayout();
      if (layout) await exportToPptx(layout, { categories: categoryStore.getAll() });
    },
    description: 'Export PPTX',
  });

  shortcuts.register({
    key: 'f', ctrl: true,
    handler: () => {
      searchInput.focus();
    },
    description: 'Search',
  });

  shortcuts.register({
    key: 'Escape',
    handler: () => {
      // Clear search if active
      if (document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        renderer.setHighlightedNodes(null);
        return;
      }
      // Exit focus mode if active
      if (focusedNodeId) {
        exitFocusMode();
        return;
      }
      // Clear multi-selection
      clearMultiSelection();
      // Deselect node
      formEditor.selectNode(null);
      renderer.setSelectedNode(null);
    },
    description: 'Deselect / Clear search',
  });

  rerender();
}

document.addEventListener('DOMContentLoaded', main);
