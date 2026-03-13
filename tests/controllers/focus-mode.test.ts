import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FocusModeController } from '../../src/controllers/focus-mode';
import { OrgStore } from '../../src/store/org-store';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';
import { dismissFocusBanner } from '../../src/ui/focus-banner';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'eng',
        name: 'Bob',
        title: 'VP Eng',
        children: [
          { id: 'ic1', name: 'Carol', title: 'Engineer' },
          { id: 'ic2', name: 'Dan', title: 'Engineer' },
        ],
      },
      { id: 'sales', name: 'Eve', title: 'VP Sales' },
    ],
  };
}

describe('FocusModeController', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let renderer: ChartRenderer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onRender: any;
  let controller: FocusModeController;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeTree());
    renderer = new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
    renderer.render(store.getTree());
    onRender = vi.fn();
    controller = new FocusModeController(store, renderer, onRender);
  });

  afterEach(() => {
    dismissFocusBanner();
    renderer.destroy();
    container.remove();
  });

  describe('initial state', () => {
    it('is not focused initially', () => {
      expect(controller.isFocused).toBe(false);
    });

    it('focusedId is null initially', () => {
      expect(controller.focusedId).toBeNull();
    });
  });

  describe('enter', () => {
    it('sets focusedId to the given nodeId', () => {
      controller.enter('eng');
      expect(controller.focusedId).toBe('eng');
    });

    it('sets isFocused to true', () => {
      controller.enter('eng');
      expect(controller.isFocused).toBe(true);
    });

    it('calls onRender callback', () => {
      controller.enter('eng');
      expect(onRender).toHaveBeenCalledOnce();
    });

    it('can enter on a leaf node', () => {
      controller.enter('sales');
      expect(controller.focusedId).toBe('sales');
      expect(controller.isFocused).toBe(true);
    });
  });

  describe('exit', () => {
    it('clears focusedId', () => {
      controller.enter('eng');
      controller.exit();
      expect(controller.focusedId).toBeNull();
    });

    it('sets isFocused to false', () => {
      controller.enter('eng');
      controller.exit();
      expect(controller.isFocused).toBe(false);
    });

    it('calls onRender callback', () => {
      controller.enter('eng');
      onRender.mockClear();
      controller.exit();
      expect(onRender).toHaveBeenCalledOnce();
    });

    it('is a no-op when not focused (no onRender call beyond exit logic)', () => {
      // exit() still runs its logic but focusedId stays null
      controller.exit();
      expect(controller.focusedId).toBeNull();
      // onRender is called by exit() regardless, but state is unchanged
      expect(controller.isFocused).toBe(false);
    });
  });

  describe('clear', () => {
    it('silently clears focus without calling onRender', () => {
      controller.enter('eng');
      onRender.mockClear();
      controller.clear();
      expect(controller.focusedId).toBeNull();
      expect(controller.isFocused).toBe(false);
      expect(onRender).not.toHaveBeenCalled();
    });
  });

  describe('getVisibleTree', () => {
    it('returns full tree when not focused', () => {
      const tree = controller.getVisibleTree();
      expect(tree.id).toBe('root');
      expect(tree.children).toHaveLength(2);
    });

    it('returns focused subtree when focused on a manager', () => {
      controller.enter('eng');
      const tree = controller.getVisibleTree();
      expect(tree.id).toBe('eng');
      expect(tree.name).toBe('Bob');
      expect(tree.children).toHaveLength(2);
    });

    it('returns leaf node when focused on a leaf', () => {
      controller.enter('ic1');
      const tree = controller.getVisibleTree();
      expect(tree.id).toBe('ic1');
      expect(tree.name).toBe('Carol');
    });

    it('falls back to full tree if focused node was deleted', () => {
      controller.enter('sales');
      // Remove the focused node via the store
      store.removeNode('sales');
      const tree = controller.getVisibleTree();
      // findNodeById returns null, so fallback to full tree
      expect(tree.id).toBe('root');
    });
  });

  describe('validate', () => {
    it('returns true when not focused', () => {
      expect(controller.validate()).toBe(true);
    });

    it('returns true when focused node still exists', () => {
      controller.enter('eng');
      expect(controller.validate()).toBe(true);
    });

    it('returns false and clears focus when focused node is deleted', () => {
      controller.enter('sales');
      store.removeNode('sales');
      expect(controller.validate()).toBe(false);
      expect(controller.focusedId).toBeNull();
    });
  });

  describe('showBanner', () => {
    it('renders a focus banner when focused', () => {
      controller.enter('eng');
      controller.showBanner(container);
      const banner = container.querySelector('[data-testid="focus-banner"]');
      expect(banner).not.toBeNull();
    });

    it('banner shows the focused node name', () => {
      controller.enter('eng');
      controller.showBanner(container);
      const label = container.querySelector('[data-testid="focus-banner-label"]');
      expect(label?.textContent).toContain('Bob');
    });

    it('dismisses banner when not focused', () => {
      controller.enter('eng');
      controller.showBanner(container);
      controller.exit();
      controller.showBanner(container);
      const banner = container.querySelector('[data-testid="focus-banner"]');
      expect(banner).toBeNull();
    });
  });
});
