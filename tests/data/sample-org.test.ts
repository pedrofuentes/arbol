import { describe, it, expect } from 'vitest';
import { SAMPLE_ORG } from '../../src/data/sample-org';
import { flattenTree } from '../../src/utils/tree';

describe('SAMPLE_ORG', () => {
  it('has a root node with expected fields', () => {
    expect(SAMPLE_ORG.id).toBe('sample-root');
    expect(SAMPLE_ORG.name).toBe('Root');
    expect(SAMPLE_ORG.title).toBe('CEO');
    expect(SAMPLE_ORG.children).toBeDefined();
    expect(SAMPLE_ORG.children!.length).toBeGreaterThan(0);
  });

  it('contains ~20 nodes', () => {
    const nodes = flattenTree(SAMPLE_ORG);
    expect(nodes.length).toBeGreaterThanOrEqual(15);
    expect(nodes.length).toBeLessThanOrEqual(25);
  });

  it('includes an advisor (leaf under non-M1 manager)', () => {
    const advisor = SAMPLE_ORG.children!.find((c) => c.id === 'sample-advisor');
    expect(advisor).toBeDefined();
    expect(advisor!.children).toBeUndefined();
  });

  it('includes a dotted-line node', () => {
    const nodes = flattenTree(SAMPLE_ORG);
    const dotted = nodes.find((n) => n.dottedLine === true);
    expect(dotted).toBeDefined();
  });

  it('all nodes have non-empty id, name, and title', () => {
    const nodes = flattenTree(SAMPLE_ORG);
    for (const node of nodes) {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(node.title).toBeTruthy();
    }
  });

  it('all node ids are unique', () => {
    const nodes = flattenTree(SAMPLE_ORG);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not contain any personal names', () => {
    const nodes = flattenTree(SAMPLE_ORG);
    for (const node of nodes) {
      expect(node.name).toMatch(/^(Root|Manager [A-Z]|IC \d+|Advisor [A-Z])$/);
    }
  });
});
