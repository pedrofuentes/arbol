import { describe, it, expect } from 'vitest';
import { detectArbolFileType, type ArbolFileType } from '../../src/utils/file-type';

describe('detectArbolFileType', () => {
  // ── Backup format ──────────────────────────────────────────────────────────

  it('detects a full backup', () => {
    const backup = {
      formatVersion: 1,
      appVersion: '3.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      data: {
        charts: [],
        versions: [],
        settings: null,
        theme: null,
        csvMappings: null,
        customPresets: null,
        accordionState: null,
      },
    };
    expect(detectArbolFileType(backup)).toBe('backup');
  });

  it('detects backup even with non-empty data', () => {
    const backup = {
      formatVersion: 1,
      appVersion: '2.0.0',
      data: { charts: [{ id: '1' }], versions: [{ id: 'v1' }] },
    };
    expect(detectArbolFileType(backup)).toBe('backup');
  });

  // ── Settings format ────────────────────────────────────────────────────────

  it('detects a settings export', () => {
    const settings = {
      version: 1,
      name: 'my-chart-theme',
      timestamp: '2026-01-01T00:00:00.000Z',
      settings: { nodeWidth: 200, nodeHeight: 80 },
    };
    expect(detectArbolFileType(settings)).toBe('settings');
  });

  it('detects settings with minimal fields', () => {
    const settings = { version: 1, name: 'theme', settings: {} };
    expect(detectArbolFileType(settings)).toBe('settings');
  });

  // ── Chart bundle format ────────────────────────────────────────────────────

  it('detects a chart bundle', () => {
    const bundle = {
      format: 'arbol-chart',
      version: 1,
      chart: { name: 'My Org', workingTree: { id: '1', name: 'CEO', title: 'CEO' }, categories: [] },
      versions: [],
    };
    expect(detectArbolFileType(bundle)).toBe('chart-bundle');
  });

  it('detects chart bundle even with minimal fields', () => {
    const bundle = { format: 'arbol-chart' };
    expect(detectArbolFileType(bundle)).toBe('chart-bundle');
  });

  // ── Org tree format ────────────────────────────────────────────────────────

  it('detects a raw org tree', () => {
    const tree = {
      id: 'abc-123',
      name: 'Jane Smith',
      title: 'CEO',
      children: [{ id: 'def-456', name: 'John Doe', title: 'VP' }],
    };
    expect(detectArbolFileType(tree)).toBe('org-tree');
  });

  it('detects org tree leaf node', () => {
    const node = { id: '1', name: 'Alice', title: 'Engineer' };
    expect(detectArbolFileType(node)).toBe('org-tree');
  });

  // ── Unknown / invalid formats ──────────────────────────────────────────────

  it('returns unknown for null', () => {
    expect(detectArbolFileType(null)).toBe('unknown');
  });

  it('returns unknown for undefined', () => {
    expect(detectArbolFileType(undefined)).toBe('unknown');
  });

  it('returns unknown for arrays', () => {
    expect(detectArbolFileType([1, 2, 3])).toBe('unknown');
  });

  it('returns unknown for primitives', () => {
    expect(detectArbolFileType('hello')).toBe('unknown');
    expect(detectArbolFileType(42)).toBe('unknown');
    expect(detectArbolFileType(true)).toBe('unknown');
  });

  it('returns unknown for empty object', () => {
    expect(detectArbolFileType({})).toBe('unknown');
  });

  it('returns unknown for unrecognized JSON objects', () => {
    expect(detectArbolFileType({ foo: 'bar', baz: 123 })).toBe('unknown');
  });

  // ── Priority / edge cases ──────────────────────────────────────────────────

  it('chart-bundle takes priority over org-tree', () => {
    // A chart bundle with format field should be detected as bundle, not org-tree
    const ambiguous = {
      format: 'arbol-chart',
      id: '1',
      name: 'Test',
      title: 'Title',
    };
    expect(detectArbolFileType(ambiguous)).toBe('chart-bundle');
  });

  it('backup takes priority over org-tree', () => {
    // Object with both backup and org-tree fields
    const ambiguous = {
      formatVersion: 1,
      data: { charts: [], versions: [] },
      id: '1',
      name: 'Test',
      title: 'CEO',
    };
    expect(detectArbolFileType(ambiguous)).toBe('backup');
  });

  it('does not detect settings without name string', () => {
    // Missing name → not settings, could fall to unknown or org-tree
    const partial = { version: 1, settings: { nodeWidth: 200 } };
    expect(detectArbolFileType(partial)).toBe('unknown');
  });

  it('does not detect backup without data object', () => {
    const partial = { formatVersion: 1 };
    expect(detectArbolFileType(partial)).toBe('unknown');
  });
});
