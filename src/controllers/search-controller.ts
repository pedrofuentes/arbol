import { OrgStore } from '../store/org-store';
import { ChartRenderer } from '../renderer/chart-renderer';
import { getMatchingNodeIds } from '../utils/search';

export class SearchController {
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private onResults: ((count: number) => void) | null;

  constructor(
    private input: HTMLInputElement,
    private store: OrgStore,
    private renderer: ChartRenderer,
    private debounceMs: number = 200,
    onResults?: (count: number) => void,
  ) {
    this.onResults = onResults ?? null;
    this.setup();
  }

  private setup(): void {
    this.input.addEventListener('input', this.handleInput);
  }

  private handleInput = (): void => {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      const query = this.input.value.trim();
      if (query.length === 0) {
        this.renderer.setHighlightedNodes(null);
      } else {
        const matchIds = getMatchingNodeIds(this.store.getTree(), query);
        this.renderer.setHighlightedNodes(matchIds.size > 0 ? matchIds : null);
        this.onResults?.(matchIds.size);
      }
    }, this.debounceMs);
  };

  get isActive(): boolean {
    return document.activeElement === this.input;
  }

  focus(): void {
    this.input.focus();
    this.input.select();
  }

  clear(): void {
    this.input.value = '';
    this.renderer.setHighlightedNodes(null);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  destroy(): void {
    this.input.removeEventListener('input', this.handleInput);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }
}
