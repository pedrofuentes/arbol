import { OrgNode } from '../types';
import { findNodeById, findParent, flattenTree } from '../utils/tree';

export class KeyboardNav {
  private tree: OrgNode | null = null;
  private focusedId: string | null = null;
  private svg: SVGSVGElement;
  private onSelect: ((nodeId: string, event: KeyboardEvent) => void) | null = null;
  private onMultiSelect: ((nodeId: string, event: KeyboardEvent) => void) | null = null;
  private onContextMenu: ((nodeId: string, element: SVGGElement) => void) | null = null;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.boundHandler = this.handleKeyDown.bind(this);
    this.svg.addEventListener('keydown', this.boundHandler);
  }

  setTree(tree: OrgNode): void {
    this.tree = tree;
  }

  setSelectHandler(handler: (nodeId: string, event: KeyboardEvent) => void): void {
    this.onSelect = handler;
  }

  setMultiSelectHandler(handler: (nodeId: string, event: KeyboardEvent) => void): void {
    this.onMultiSelect = handler;
  }

  setContextMenuHandler(handler: (nodeId: string, element: SVGGElement) => void): void {
    this.onContextMenu = handler;
  }

  getFocusedNodeId(): string | null {
    return this.focusedId;
  }

  focusNode(nodeId: string): void {
    if (this.focusedId) {
      const old = this.findCard(this.focusedId);
      if (old) old.setAttribute('tabindex', '-1');
    }
    const el = this.findCard(nodeId);
    if (el) {
      el.setAttribute('tabindex', '0');
      el.focus();
      this.focusedId = nodeId;
    }
  }

  destroy(): void {
    this.svg.removeEventListener('keydown', this.boundHandler);
  }

  private findCard(nodeId: string): SVGGElement | null {
    return this.svg.querySelector(
      `g.node[data-id="${nodeId}"], g.ic-node[data-id="${nodeId}"], g.pal-node[data-id="${nodeId}"]`,
    );
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.tree || !this.focusedId) return;

    const targetId = this.computeNavigationTarget(event.key);
    if (targetId !== null) {
      event.preventDefault();
      this.focusNode(targetId);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.onSelect) this.onSelect(this.focusedId, event);
    } else if (event.key === ' ') {
      event.preventDefault();
      if (this.onMultiSelect) this.onMultiSelect(this.focusedId, event);
    } else if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
      event.preventDefault();
      const el = this.findCard(this.focusedId);
      if (el && this.onContextMenu) this.onContextMenu(this.focusedId, el);
    }
  }

  private computeNavigationTarget(key: string): string | null {
    if (!this.tree || !this.focusedId) return null;

    switch (key) {
      case 'ArrowDown': {
        const node = findNodeById(this.tree, this.focusedId);
        if (!node?.children?.length) return null;
        return node.children[0].id;
      }
      case 'ArrowUp': {
        const parent = findParent(this.tree, this.focusedId);
        return parent?.id ?? null;
      }
      case 'ArrowRight': {
        const parent = findParent(this.tree, this.focusedId);
        if (!parent?.children) return null;
        const idx = parent.children.findIndex((c) => c.id === this.focusedId);
        return idx >= 0 && idx < parent.children.length - 1
          ? parent.children[idx + 1].id
          : null;
      }
      case 'ArrowLeft': {
        const parent = findParent(this.tree, this.focusedId);
        if (!parent?.children) return null;
        const idx = parent.children.findIndex((c) => c.id === this.focusedId);
        return idx > 0 ? parent.children[idx - 1].id : null;
      }
      case 'Home':
        return this.tree.id;
      case 'End': {
        const all = flattenTree(this.tree);
        return all[all.length - 1].id;
      }
      default:
        return null;
    }
  }
}
