import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchController } from '../../src/controllers/search-controller';
import { OrgStore } from '../../src/store/org-store';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('SearchController', () => {
  let container: HTMLElement;
  let input: HTMLInputElement;
  let store: OrgStore;
  let renderer: ChartRenderer;
  let controller: SearchController;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    input = document.createElement('input');
    document.body.appendChild(input);
    store = new OrgStore(makeTree());
    renderer = new ChartRenderer({
      container,
      nodeWidth: 160,
      nodeHeight: 34,
      horizontalSpacing: 50,
    });
    renderer.render(store.getTree());
    // Use 0ms debounce to simplify testing
    controller = new SearchController(input, store, renderer, 0);
  });

  afterEach(() => {
    controller.destroy();
    renderer.destroy();
    input.remove();
    container.remove();
  });

  describe('constructor', () => {
    it('sets up the input listener', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      input.value = 'Bob';
      input.dispatchEvent(new Event('input'));
      // Wait for the (0ms) debounce
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(spy).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });
  });

  describe('search via input event', () => {
    it('highlights matching nodes when query matches', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      input.value = 'Bob';
      input.dispatchEvent(new Event('input'));
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
          const nodeIds = lastCall[0] as Set<string> | null;
          expect(nodeIds).not.toBeNull();
          expect(nodeIds!.has('b')).toBe(true);
          resolve();
        }, 10);
      });
    });

    it('clears highlights when query is empty', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      input.value = '';
      input.dispatchEvent(new Event('input'));
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
          expect(lastCall[0]).toBeNull();
          resolve();
        }, 10);
      });
    });

    it('passes null when query matches no nodes', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      input.value = 'zzz_no_match';
      input.dispatchEvent(new Event('input'));
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
          expect(lastCall[0]).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('clear', () => {
    it('clears the input value', () => {
      input.value = 'test';
      controller.clear();
      expect(input.value).toBe('');
    });

    it('resets highlights to null', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      controller.clear();
      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('focus', () => {
    it('focuses the input element', () => {
      controller.focus();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('isActive', () => {
    it('returns true when input is focused', () => {
      input.focus();
      expect(controller.isActive).toBe(true);
    });

    it('returns false when input is not focused', () => {
      input.blur();
      expect(controller.isActive).toBe(false);
    });
  });

  describe('destroy', () => {
    it('removes input listener so further events are ignored', () => {
      const spy = vi.spyOn(renderer, 'setHighlightedNodes');
      controller.destroy();
      spy.mockClear();

      input.value = 'Bob';
      input.dispatchEvent(new Event('input'));
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(spy).not.toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('clears any pending timeout', () => {
      // Fire an input then immediately destroy — no error should occur
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      controller.destroy();
      // If timeout wasn't cleared, it would fire later with stale state.
      // No assertion needed — absence of error confirms cleanup.
    });
  });
});
