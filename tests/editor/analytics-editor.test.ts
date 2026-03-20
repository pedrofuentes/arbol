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

  it('renders KPI strip with cards', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const strip = container.querySelector('.analytics-kpi-strip');
    expect(strip).not.toBeNull();
    const cards = container.querySelectorAll('.analytics-kpi-card');
    expect(cards.length).toBe(5);
  });

  it('renders KPI cards with correct accents', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const accents = Array.from(container.querySelectorAll('.analytics-kpi-card'))
      .map(c => c.getAttribute('data-accent'));
    expect(accents).toEqual(['teal', 'blue', 'green', 'amber', 'rose']);
  });

  it('renders headcount in KPI card', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('7');
  });

  it('renders manager and IC counts in text', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('Managers');
    expect(text).toContain('Individual Contributors');
    expect(text).toContain('Advisors');
  });

  it('renders info icon on each KPI card', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const icons = container.querySelectorAll('.analytics-kpi-info');
    expect(icons.length).toBe(5);
  });

  it('info icons have title attribute with tooltip text', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const icons = container.querySelectorAll('.analytics-kpi-info');
    icons.forEach(icon => {
      expect(icon.getAttribute('title')).toBeTruthy();
    });
  });

  it('info icons have aria-label for accessibility', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const icons = container.querySelectorAll('.analytics-kpi-info');
    icons.forEach(icon => {
      expect(icon.getAttribute('aria-label')).toBeTruthy();
      expect(icon.getAttribute('role')).toBe('img');
    });
  });

  it('renders detail grid with sections', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const grid = container.querySelector('.analytics-detail-grid');
    expect(grid).not.toBeNull();
    const sections = container.querySelectorAll('.analytics-detail-section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('renders span of control stats', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('Average');
    expect(text).toContain('Minimum');
    expect(text).toContain('Maximum');
    expect(text).toContain('Median');
  });

  it('renders org depth', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const text = container.textContent!;
    expect(text).toContain('layers');
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
    expect(text).toContain('1 without level');
  });

  it('shows focus mode banner with class', () => {
    new AnalyticsEditor({
      container,
      orgStore: store,
      getFocusedTree: () => testTree.children![0],
      getFocusedName: () => 'VP Sales',
    });
    const banner = container.querySelector('.analytics-focus-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('VP Sales');
  });

  it('refreshes on store change', () => {
    const editor = new AnalyticsEditor({ container, orgStore: store });
    const textBefore = container.textContent!;
    expect(textBefore).toContain('7');

    store.addChild('ic1', { name: 'Dana', title: 'Junior' });
    const textAfter = container.textContent!;
    expect(textAfter).toContain('8');
  });

  it('clickable alert triggers onNodeSelect', () => {
    const onNodeSelect = vi.fn();
    new AnalyticsEditor({ container, orgStore: store, onNodeSelect });

    const buttons = container.querySelectorAll<HTMLButtonElement>('.analytics-alert-name');
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

  it('renders span health indicators', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const healthValues = container.querySelectorAll('.analytics-span-stat-value[data-health]');
    expect(healthValues.length).toBeGreaterThan(0);
  });

  it('renders layer bars', () => {
    new AnalyticsEditor({ container, orgStore: store });
    const bars = container.querySelectorAll('.analytics-bar-row');
    expect(bars.length).toBeGreaterThan(0);
  });

  describe('visualization sub-tabs', () => {
    it('renders viz tab bar', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const nav = container.querySelector('nav.analytics-viz-tabs');
      expect(nav).not.toBeNull();
      expect(nav!.getAttribute('role')).toBe('tablist');
    });

    it('renders four tab buttons', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const nav = container.querySelector('nav.analytics-viz-tabs');
      const buttons = nav!.querySelectorAll('button[role="tab"]');
      expect(buttons.length).toBe(4);
    });

    it('overview tab is active by default', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const overviewBtn = container.querySelector('#analytics-tab-overview') as HTMLButtonElement;
      expect(overviewBtn.getAttribute('aria-selected')).toBe('true');
      expect(overviewBtn.classList.contains('analytics-viz-tab-btn-active')).toBe(true);

      const overviewPanel = container.querySelector('#analytics-panel-overview') as HTMLDivElement;
      expect(overviewPanel.style.display).not.toBe('none');
    });

    it('other tab panels are hidden by default', () => {
      new AnalyticsEditor({ container, orgStore: store });
      for (const id of ['sunburst', 'span-chart', 'treemap']) {
        const panel = container.querySelector(`#analytics-panel-${id}`) as HTMLDivElement;
        expect(panel.style.display).toBe('none');
      }
    });

    it('clicking a tab button activates it', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const sunburstBtn = container.querySelector('#analytics-tab-sunburst') as HTMLButtonElement;
      sunburstBtn.click();

      expect(sunburstBtn.getAttribute('aria-selected')).toBe('true');
      expect(sunburstBtn.classList.contains('analytics-viz-tab-btn-active')).toBe(true);

      const overviewBtn = container.querySelector('#analytics-tab-overview') as HTMLButtonElement;
      expect(overviewBtn.getAttribute('aria-selected')).toBe('false');
      expect(overviewBtn.classList.contains('analytics-viz-tab-btn-active')).toBe(false);

      const sunburstPanel = container.querySelector('#analytics-panel-sunburst') as HTMLDivElement;
      expect(sunburstPanel.style.display).not.toBe('none');

      const overviewPanel = container.querySelector('#analytics-panel-overview') as HTMLDivElement;
      expect(overviewPanel.style.display).toBe('none');
    });

    it('overview tab contains detail grid', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const overviewPanel = container.querySelector('#analytics-panel-overview') as HTMLDivElement;
      const grid = overviewPanel.querySelector('.analytics-detail-grid');
      expect(grid).not.toBeNull();
    });

    it('tab panels have proper ARIA', () => {
      new AnalyticsEditor({ container, orgStore: store });
      const panels = container.querySelectorAll('.analytics-viz-panel');
      expect(panels.length).toBe(4);

      panels.forEach(panel => {
        expect(panel.getAttribute('role')).toBe('tabpanel');
        const labelledBy = panel.getAttribute('aria-labelledby');
        expect(labelledBy).not.toBeNull();
        const matchingBtn = container.querySelector(`#${labelledBy}`);
        expect(matchingBtn).not.toBeNull();
        expect(matchingBtn!.getAttribute('role')).toBe('tab');
      });
    });
  });
});
