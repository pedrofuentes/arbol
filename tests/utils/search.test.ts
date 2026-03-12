import { describe, it, expect, beforeEach } from 'vitest';
import { searchTree, getMatchingNodeIds, getVisibleNodesForMatches, clearSearchCache } from '../../src/utils/search';
import { OrgNode } from '../../src/types';

const SAMPLE_TREE: OrgNode = {
  id: 'ceo',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    {
      id: 'cto',
      name: 'Marcus Johnson',
      title: 'CTO',
      children: [
        { id: 'eng1', name: 'Ana Torres', title: 'EM Frontend' },
        { id: 'eng2', name: 'Leo Martins', title: 'EM Backend' },
      ],
    },
    {
      id: 'cfo',
      name: 'Lisa Park',
      title: 'CFO',
      children: [
        { id: 'acct1', name: 'Amy Chen', title: 'Sr Accountant' },
      ],
    },
  ],
};

describe('searchTree', () => {
  beforeEach(() => {
    clearSearchCache();
  });

  it('finds nodes by name substring (case-insensitive)', () => {
    const results = searchTree(SAMPLE_TREE, 'chen');
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain('ceo');
    expect(results.map(r => r.id)).toContain('acct1');
  });

  it('finds nodes by title substring', () => {
    const results = searchTree(SAMPLE_TREE, 'EM');
    expect(results).toHaveLength(2);
  });

  it('returns matchField correctly', () => {
    // name-only match
    const nameResults = searchTree(SAMPLE_TREE, 'marcus');
    expect(nameResults).toHaveLength(1);
    expect(nameResults[0].matchField).toBe('name');

    // title-only match
    const titleResults = searchTree(SAMPLE_TREE, 'accountant');
    expect(titleResults).toHaveLength(1);
    expect(titleResults[0].matchField).toBe('title');

    // both match: "CEO" appears in Sarah Chen's title,
    // and "Chen" appears in name — use a custom tree for 'both'
    const bothTree: OrgNode = { id: 'x', name: 'Test Test', title: 'Test Manager' };
    const bothResults = searchTree(bothTree, 'test');
    expect(bothResults).toHaveLength(1);
    expect(bothResults[0].matchField).toBe('both');
  });

  it('returns empty array for empty query', () => {
    expect(searchTree(SAMPLE_TREE, '')).toHaveLength(0);
    expect(searchTree(SAMPLE_TREE, '   ')).toHaveLength(0);
  });

  it('returns empty array for no matches', () => {
    expect(searchTree(SAMPLE_TREE, 'zzzzz')).toHaveLength(0);
  });

  it('handles single-node tree', () => {
    const single: OrgNode = { id: 'a', name: 'Alice', title: 'CEO' };
    expect(searchTree(single, 'Alice')).toHaveLength(1);
  });
});

describe('clearSearchCache', () => {
  beforeEach(() => {
    clearSearchCache();
  });

  it('returns cached results for same root and query', () => {
    const results1 = searchTree(SAMPLE_TREE, 'chen');
    const results2 = searchTree(SAMPLE_TREE, 'chen');
    expect(results2).toBe(results1); // same reference = cache hit
  });

  it('invalidates cache when query changes', () => {
    const results1 = searchTree(SAMPLE_TREE, 'chen');
    const results2 = searchTree(SAMPLE_TREE, 'marcus');
    expect(results2).not.toBe(results1);
    expect(results2).toHaveLength(1);
  });

  it('invalidates cache when root id changes', () => {
    const results1 = searchTree(SAMPLE_TREE, 'chen');
    const altTree: OrgNode = { ...SAMPLE_TREE, id: 'alt-ceo' };
    const results2 = searchTree(altTree, 'chen');
    expect(results2).not.toBe(results1);
  });

  it('clearSearchCache forces fresh results', () => {
    const results1 = searchTree(SAMPLE_TREE, 'chen');
    clearSearchCache();
    const results2 = searchTree(SAMPLE_TREE, 'chen');
    expect(results2).not.toBe(results1); // different reference after cache clear
    expect(results2).toEqual(results1);  // same data
  });
});

describe('getMatchingNodeIds', () => {
  it('returns Set of matching IDs', () => {
    const ids = getMatchingNodeIds(SAMPLE_TREE, 'chen');
    expect(ids.size).toBe(2);
    expect(ids.has('ceo')).toBe(true);
    expect(ids.has('acct1')).toBe(true);
  });
});

describe('getVisibleNodesForMatches', () => {
  it('includes ancestors of matched nodes', () => {
    const matchIds = new Set(['acct1']);
    const visible = getVisibleNodesForMatches(SAMPLE_TREE, matchIds);
    expect(visible.has('ceo')).toBe(true);
    expect(visible.has('cfo')).toBe(true);
    expect(visible.has('acct1')).toBe(true);
    expect(visible.has('cto')).toBe(false);
  });

  it('returns empty set for empty matchIds', () => {
    const visible = getVisibleNodesForMatches(SAMPLE_TREE, new Set());
    expect(visible.size).toBe(0);
  });

  it('includes root when any descendant matches', () => {
    const matchIds = new Set(['eng1']);
    const visible = getVisibleNodesForMatches(SAMPLE_TREE, matchIds);
    expect(visible.has('ceo')).toBe(true);
    expect(visible.has('cto')).toBe(true);
    expect(visible.has('eng1')).toBe(true);
  });
});
