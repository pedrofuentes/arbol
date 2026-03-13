import type { OrgNode } from '../types';
import { OrgStore } from '../store/org-store';
import { ChartRenderer } from '../renderer/chart-renderer';
import { findNodeById } from '../utils/tree';
import { showFocusBanner, dismissFocusBanner } from '../ui/focus-banner';

export class FocusModeController {
  private focusedNodeId: string | null = null;
  private exitCallback: (() => void) | null = null;

  constructor(
    private store: OrgStore,
    private renderer: ChartRenderer,
    private onRender: () => void,
  ) {}

  get focusedId(): string | null {
    return this.focusedNodeId;
  }

  get isFocused(): boolean {
    return this.focusedNodeId !== null;
  }

  /** Register a callback invoked after exiting focus mode. */
  onExit(cb: () => void): void {
    this.exitCallback = cb;
  }

  enter(nodeId: string): void {
    this.focusedNodeId = nodeId;
    this.onRender();
    this.renderer.getZoomManager()?.fitToContent();
  }

  exit(): void {
    this.focusedNodeId = null;
    dismissFocusBanner();
    this.onRender();
    this.renderer.getZoomManager()?.fitToContent();
    this.exitCallback?.();
  }

  /** Silently clear focus without re-rendering (for use when switching charts, imports, etc.) */
  clear(): void {
    this.focusedNodeId = null;
    dismissFocusBanner();
  }

  /**
   * Validate the focused node still exists in the tree.
   * If it was deleted, silently clears focus. Returns false if focus was cleared.
   */
  validate(): boolean {
    if (!this.focusedNodeId) return true;
    const node = findNodeById(this.store.getTree(), this.focusedNodeId);
    if (!node) {
      this.focusedNodeId = null;
      dismissFocusBanner();
      return false;
    }
    return true;
  }

  /** Returns the focused subtree, or the full tree when not focused. */
  getVisibleTree(): OrgNode {
    const fullTree = this.store.getTree();
    if (!this.focusedNodeId) return fullTree;
    return findNodeById(fullTree, this.focusedNodeId) ?? fullTree;
  }

  /** Show or dismiss the focus banner based on current state. */
  showBanner(container: HTMLElement): void {
    if (!this.focusedNodeId) {
      dismissFocusBanner();
      return;
    }
    const node = findNodeById(this.store.getTree(), this.focusedNodeId);
    if (node) {
      showFocusBanner({
        name: node.name,
        container,
        onExit: () => this.exit(),
      });
    }
  }
}
