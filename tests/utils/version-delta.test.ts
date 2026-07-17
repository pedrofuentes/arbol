import { describe, expect, it } from 'vitest';
import type { VersionRecord } from '../../src/types';
import { VersionDeltaCache } from '../../src/utils/version-delta';

function version(
  id: string,
  children: { id: string; name: string; title: string }[],
): VersionRecord {
  return {
    id,
    chartId: 'chart-1',
    name: id,
    createdAt: `2026-01-0${id === 'new' ? '2' : '1'}T00:00:00.000Z`,
    tree: { id: 'root', name: 'Alice', title: 'CEO', children },
  };
}

describe('VersionDeltaCache', () => {
  it('counts people added and removed with tree-diff semantics', () => {
    const previous = version('old', [{ id: 'removed', name: 'Bob', title: 'VP' }]);
    const current = version('new', [
      { id: 'added-1', name: 'Carol', title: 'VP' },
      { id: 'added-2', name: 'Drew', title: 'Director' },
    ]);

    expect(new VersionDeltaCache().get(current, previous)).toEqual({ added: 2, removed: 1 });
  });

  it('uses zero deltas for the oldest version without a previous version', () => {
    const oldest = version('old', [{ id: 'existing', name: 'Bob', title: 'VP' }]);

    expect(new VersionDeltaCache().get(oldest)).toEqual({ added: 0, removed: 0 });
  });

  it('memoizes by immutable adjacent version IDs', () => {
    const previous = version('old', []);
    const current = version('new', [{ id: 'added', name: 'Bob', title: 'VP' }]);
    const cache = new VersionDeltaCache();

    const first = cache.get(current, previous);
    const second = cache.get(structuredClone(current), structuredClone(previous));

    expect(second).toBe(first);
    expect(cache.size).toBe(1);
  });
});
