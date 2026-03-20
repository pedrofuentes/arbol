# Quick Reference: D3 Visualizations in Arbol

## Essential Imports
\\\	ypescript
import { select } from 'd3';
import type { Selection } from 'd3';
import { hierarchy, tree, scaleLinear, scaleBand } from 'd3';

import { OrgStore } from '../store/org-store';
import { CategoryStore } from '../store/category-store';
import { SettingsStore } from '../store/settings-store';
import { ThemeManager } from '../store/theme-manager';

import { flattenTree, countManagersByLevel, avgSpanOfControl, countDescendants } from '../utils/tree';
import { OrgNode, ColorCategory } from '../types';
\\\

## Quick Data Access Patterns

### Get All Nodes
\\\	ypescript
const nodes: OrgNode[] = flattenTree(this.orgStore.getTree());
console.log(nodes.length); // Total headcount
\\\

### Get Manager Distribution
\\\	ypescript
const byLevel: Map<number, number> = countManagersByLevel(root);
// byLevel.get(1) = number of M1 managers
// byLevel.get(2) = number of M2 managers (managers of M1s)
// etc.
\\\

### Get Average Span of Control
\\\	ypescript
const avgSpan: number = avgSpanOfControl(root);
console.log(avgSpan.toFixed(2)); // e.g., "5.3"
\\\

### Get Node's Direct Report Count
\\\	ypescript
const directReports = node.children?.length ?? 0;
\\\

### Get Node's Total Org Size
\\\	ypescript
const totalOrg: number = countDescendants(node) + 1; // +1 for self
\\\

## Quick D3 Patterns

### Create SVG Container
\\\	ypescript
const svg: Selection<SVGSVGElement, unknown, null, undefined> = 
  select(this.svgContainer)
    .append('svg')
    .attr('width', 800)
    .attr('height', 600);
\\\

### Render Bars (Count by Category)
\\\	ypescript
const data = Array.from(countManagersByLevel(root).entries()); // [[1, 5], [2, 3]]

svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', (d, i) => i * 60)
  .attr('y', (d) => 600 - d[1] * 20)
  .attr('width', 50)
  .attr('height', (d) => d[1] * 20)
  .attr('fill', '#3b82f6');
\\\

### Render Circles (Node Distribution)
\\\	ypescript
svg.selectAll('circle')
  .data(nodes)
  .join('circle')
  .attr('cx', (d, i) => (i % 10) * 80)
  .attr('cy', (d, i) => Math.floor(i / 10) * 80)
  .attr('r', (d) => countDescendants(d) + 1) // Size by org size
  .attr('fill', (d) => categoryStore.getById(d.categoryId!)?.color ?? '#e5e7eb');
\\\

### Render Boxes with Text
\\\	ypescript
const g = svg.selectAll('g.stat-box')
  .data([{ label: 'Total', value: nodes.length }])
  .join('g')
  .attr('class', 'stat-box')
  .attr('transform', (d, i) => \	ranslate(\, 0)\);

g.append('rect')
  .attr('x', 0).attr('y', 0)
  .attr('width', 140).attr('height', 100)
  .attr('fill', '#f0f0f0')
  .attr('stroke', '#ccc');

g.append('text')
  .attr('class', 'label')
  .attr('x', 70).attr('y', 30)
  .attr('text-anchor', 'middle')
  .text(d => d.label);

g.append('text')
  .attr('class', 'value')
  .attr('x', 70).attr('y', 70)
  .attr('text-anchor', 'middle')
  .attr('font-size', 28)
  .text(d => d.value);
\\\

## Theme Aware Rendering

### Detect Dark/Light Mode
\\\	ypescript
const themeManager = new ThemeManager();
const isDarkMode = themeManager.getTheme() === 'dark';

const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
const bgColor = isDarkMode ? '#1f2937' : '#f9fafb';

svg.attr('color', textColor).style('background-color', bgColor);
\\\

### Listen for Theme Changes
\\\	ypescript
const themeManager = new ThemeManager();
const unsubscribe = themeManager.onChange(() => {
  // Re-render with new theme
  this.refresh();
});

// Later: unsubscribe();
\\\

## Category Colors

### Get All Categories
\\\	ypescript
const categoryStore = new CategoryStore();
const categories = categoryStore.getAll();
// [{id: 'open-position', label: 'Open Position', color: '#fbbf24', ...}]
\\\

### Build Color Map
\\\	ypescript
const colorMap = new Map(
  categoryStore.getAll().map(cat => [cat.id, cat.color])
);

svg.selectAll('rect')
  .data(nodes)
  .join('rect')
  .attr('fill', (d) => 
    d.categoryId ? colorMap.get(d.categoryId) : '#e5e7eb'
  );
\\\

## Real-Time Updates

### Subscribe to Tree Changes
\\\	ypescript
const orgStore = new OrgStore(initialTree);

orgStore.onChange(() => {
  // Automatically called when tree updates
  const updatedTree = orgStore.getTree();
  this.computeAndRender(updatedTree);
});
\\\

## Metrics to Track

\\\	ypescript
// Key metrics for analytics
{
  totalHeadcount: nodes.length,
  managerCount: nodes.filter(n => !isLeaf(n)).length,
  icCount: nodes.filter(isLeaf).length,
  avgSpanOfControl: avgSpanOfControl(root),
  depthOfOrg: computeDepth(root),
  managersByLevel: countManagersByLevel(root),
  openPositions: nodes.filter(n => n.categoryId === 'open-position').length,
  futureStarts: nodes.filter(n => n.categoryId === 'future-start').length,
  byLevel: nodes.reduce((acc, n) => {
    const lv = n.level || 'unset';
    acc[lv] = (acc[lv] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>),
}
\\\

## Common Visualization Ideas

### 1. Organization Pyramid
\\\	ypescript
const byLevel = countManagersByLevel(root);
// Render bars from M1 to M5, decreasing in height
\\\

### 2. Headcount by Category
\\\	ypescript
const byCat = new Map<string, number>();
nodes.forEach(n => {
  const catId = n.categoryId || 'default';
  byCat.set(catId, (byCat.get(catId) ?? 0) + 1);
});
// Pie or bar chart
\\\

### 3. Span of Control Distribution
\\\	ypescript
const spans = nodes
  .filter(n => !isLeaf(n))
  .map(n => (n.children?.length ?? 0));
// Histogram: bucket by span (0-5, 6-10, 11-15, etc.)
\\\

### 4. Headcount Growth (by version)
\\\	ypescript
// Compare multiple VersionRecords over time
// Plot total headcount on Y, version date on X
\\\

### 5. Organization Depth
\\\	ypescript
function computeDepth(node: OrgNode): number {
  if (!node.children) return 0;
  return 1 + Math.max(...node.children.map(computeDepth));
}
// Display as single metric card
\\\

### 6. Manager Distribution by Level
\\\	ypescript
const byLevel = countManagersByLevel(root);
// Stacked bar chart or horizontal bars
\\\

## Common DOM Patterns

### Create Metrics Card
\\\	ypescript
import { createHeading, createButton } from '../utils/dom-builder';

const card = document.createElement('div');
card.className = 'stat-card';

const heading = createHeading('Total Headcount', 'h3');
card.appendChild(heading);

const value = document.createElement('div');
value.className = 'stat-value';
value.textContent = nodes.length.toString();
card.appendChild(value);

const btn = createButton({
  label: 'View Details',
  onClick: () => console.log('clicked'),
});
card.appendChild(btn);
\\\

### Create Collapsible Section
\\\	ypescript
const section = document.createElement('section');
const header = document.createElement('button');
header.textContent = 'Organization Metrics ▼';
let expanded = true;

header.addEventListener('click', () => {
  expanded = !expanded;
  content.style.display = expanded ? 'block' : 'none';
  header.textContent = \Organization Metrics \\;
});

const content = document.createElement('div');
section.appendChild(header);
section.appendChild(content);
\\\

## TypeScript Tips

### Type Safe Node Array
\\\	ypescript
const nodes: OrgNode[] = flattenTree(tree);
const managers: OrgNode[] = nodes.filter(n => n.children && n.children.length > 0);
const ics: OrgNode[] = nodes.filter(n => !n.children || n.children.length === 0);
\\\

### Type Safe D3 Selections
\\\	ypescript
// Explicitly typed
type MetricDatum = { label: string; value: number };

const svg: Selection<SVGSVGElement, unknown, null, undefined> = 
  select(container).append('svg');

const g: Selection<SVGGElement, MetricDatum, null, undefined> = 
  svg.selectAll('g').data(data as MetricDatum[]);
\\\

## Avoid Common Mistakes

❌ **Wrong:** Mutating nodes directly
\\\	ypescript
const node = findNodeById(root, id);
node.name = 'New Name'; // Won't update UI
\\\

✅ **Right:** Use OrgStore methods
\\\	ypescript
orgStore.updateNode(id, { name: 'New Name' });
\\\

---

❌ **Wrong:** Using innerHTML
\\\	ypescript
div.innerHTML = userInput; // XSS vulnerability!
\\\

✅ **Right:** Using textContent
\\\	ypescript
div.textContent = userInput; // Safe
\\\

---

❌ **Wrong:** Hardcoding colors
\\\	ypescript
rect.attr('fill', '#3b82f6'); // Won't change with theme
\\\

✅ **Right:** Using category colors or theme-aware defaults
\\\	ypescript
rect.attr('fill', (d) => categoryMap.get(d.categoryId) || '#e5e7eb');
\\\

---

## File Organization

`
src/
  editor/
    analytics-editor.ts          ← Create this for analytics tab
  renderer/
    chart-renderer.ts            ← Reference for D3 patterns
    layout-engine.ts             ← Learn from layout computation
  store/
    org-store.ts                 ← Subscribe to tree changes
    category-store.ts            ← Get colors
    settings-store.ts            ← Get UI settings
    theme-manager.ts             ← Detect dark/light mode
  utils/
    tree.ts                       ← Tree analysis functions
    dom-builder.ts               ← Create UI elements
  i18n/
    en.ts                        ← Add analytics.* keys
`

---

*Generated from Arbol codebase analysis — Quick D3 Reference*
