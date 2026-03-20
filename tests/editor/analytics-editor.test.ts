import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsEditor } from '../../src/editor/analytics-editor';
import { OrgStore } from '../../src/store/org-store';
import { CategoryStore } from '../../src/store/category-store';
import { LevelStore } from '../../src/store/level-store';
import type { OrgNode } from '../../src/types';

const testTree: OrgNode = {
  id: 'root', name: 'CEO', title: 'Chief Executive Officer', level: 'L1',
  children: [
    {
      id: 'm1', name: 'VP Sales', title: 'VP', level: 'L2', children: [
        { id: 'ic1', name: 'Alice', title: 'Rep', level: 'L5' },
        { id: 'ic2', name: 'Bob', title: 'Rep', level: 'L5' },
      ],
    },
    {
      id: 'm2', name: 'VP Eng', title: 'VP', level: 'L2', children: [
        { id: 'ic3', name: 'Charlie', title: 'Dev' },
      ],
    },
  ],
};

describe('AnalyticsEditor', () => {
  let container: HTMLDivElement;
  let store: OrgStore;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(structuredClone(testTree));
  });

  afterEach(() => {
    container.remove();
  });

  it('renders analytics title', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const heading = container.querySelector('h3');
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe('Org Analytics');
  });

  it('renders headcount section', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('7');
    expect(text).toContain('people');
  });

  it('renders manager and IC counts', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    // Tree: CEO (manager with manager children), VP Sales (M1 with 2 ICs), VP Eng (M1 with 1 IC)
    // Managers: CEO, VP Sales, VP Eng = 3
    // ICs: Alice, Bob, Charlie = 3
    // Advisors: 0 (all children of M1 managers are ICs)
    expect(text).toContain('Managers');
    expect(text).toContain('Individual Contributors');
    expect(text).toContain('Advisors');
  });

  it('renders org depth', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    // Root -> VP Sales -> Alice = depth 2
    expect(text).toContain('layers');
  });

  it('renders span of control stats', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('Average');
    expect(text).toContain('Minimum');
    expect(text).toContain('Maximum');
    expect(text).toContain('Median');
  });

  it('renders level distribution', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('L1');
    expect(text).toContain('L2');
    expect(text).toContain('L5');
  });

  it('renders nodes without level note', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    // Charlie has no level
    expect(text).toContain('1 without level');
  });

  it('shows focus mode banner', () => {
    new AnalyticsEditor({
      container,
      orgStore: store,
      getFocusedTree: () => testTree.children![0],
      getFocusedName: () => 'VP Sales',
    });
    const text = container.textContent!;
    expect(text).toContain('VP Sales');
    expect(text).toContain('metrics');
  });

  it('refreshes on store change', () => {
    const editor = new AnalyticsEditor({ container, orgStore: store });
    const textBefore = container.textContent!;
    expect(textBefore).toContain('7');

    // Add a child — headcount should change
    store.addChild('ic1', { name: 'Dana', title: 'Junior' });
    const textAfter = container.textContent!;
    expect(textAfter).toContain('8');
  });

  it('clickable alert triggers onNodeSelect', () => {
    const onNodeSelect = vi.fn();
    // VP Eng has 1 direct report → single-child manager alert
    new AnalyticsEditor({ container, orgStore: store, onNodeSelect });

    // Find alert buttons — single-child manager "VP Eng"
    const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-node-id]');
    const vpEngBtn = Array.from(buttons).find(b => b.textContent?.includes('VP Eng'));
    expect(vpEngBtn).toBeDefined();
    vpEngBtn!.click();
    expect(onNodeSelect).toHaveBeenCalledWith('m2');
  });

  it('destroy cleans up DOM and listeners', () => {
    const editor = new AnalyticsEditor({ container, orgStore: store });
    expect(container.children.length).toBeGreaterThan(0);

    editor.destroy();
    expect(container.innerHTML).toBe('');

    // Verify store listener is removed — changes shouldn't re-render
    store.addChild('ic1', { name: 'Eve', title: 'IC' });
    expect(container.innerHTML).toBe('');
  });

  it('works with CategoryStore', () => {
    const categoryStore = new CategoryStore();
    const engineeringCat = categoryStore.add('Engineering', '#0000ff');

    const tree = structuredClone(testTree);
    tree.children![1].categoryId = engineeringCat.id;
    const catStore = new OrgStore(tree);

    new AnalyticsEditor({
      container,
      orgStore: catStore,
      categoryStore,
    });
    const text = container.textContent!;
    expect(text).toContain('Engineering');
  });

  it('works with LevelStore', () => {
    const levelStore = new LevelStore();
    levelStore.addMapping('L1', 'Executive');
    levelStore.addMapping('L2', 'Vice President');
    levelStore.setDisplayMode('mapped');

    new AnalyticsEditor({
      container,
      orgStore: store,
      levelStore,
    });
    const text = container.textContent!;
    // With mapped display mode, levels should resolve
    expect(text).toContain('Executive');
    expect(text).toContain('Vice President');
  });

  it('shows no-levels message for tree without levels', () => {
    const noLevelTree: OrgNode = {
      id: 'r', name: 'Root', title: 'Boss',
      children: [{ id: 'c1', name: 'Child', title: 'IC' }],
    };
    const s = new OrgStore(noLevelTree);
    new AnalyticsEditor({ container, orgStore: s });
    expect(container.textContent).toContain('No levels assigned');
  });

  it('shows no-categories message when none in use', () => {
    new AnalyticsEditor({ container, orgStore: store });
    expect(container.textContent).toContain('No categories in use');
  });
});
