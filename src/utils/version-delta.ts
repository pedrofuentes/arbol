import type { VersionRecord } from '../types';
import { compareTrees, getDiffStats } from './tree-diff';

export interface VersionDelta {
  added: number;
  removed: number;
}

/**
 * Memoizes deltas by adjacent immutable version IDs so sidebar refreshes do not
 * repeat tree comparisons. The oldest version has no predecessor and uses a
 * zero baseline.
 */
export class VersionDeltaCache {
  private readonly deltas = new Map<string, VersionDelta>();

  get size(): number {
    return this.deltas.size;
  }

  get(current: VersionRecord, previous?: VersionRecord): VersionDelta {
    const key = `${current.id}:${previous?.id ?? 'baseline'}`;
    const cached = this.deltas.get(key);
    if (cached) return cached;

    const delta = previous
      ? (() => {
          const stats = getDiffStats(compareTrees(previous.tree, current.tree));
          return { added: stats.added, removed: stats.removed };
        })()
      : { added: 0, removed: 0 };

    this.deltas.set(key, delta);
    return delta;
  }

  retain(versions: readonly VersionRecord[]): void {
    const validKeys = new Set(
      versions.map((version, index) => `${version.id}:${versions[index + 1]?.id ?? 'baseline'}`),
    );
    for (const key of this.deltas.keys()) {
      if (!validKeys.has(key)) this.deltas.delete(key);
    }
  }
}
