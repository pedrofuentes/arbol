# Arbol D3 Visualization Study - Complete Analysis

## Overview
This document provides a detailed technical analysis of the Arbol codebase for building advanced D3 visualizations in an analytics tab. The codebase is a browser-based organizational chart editor using D3.js for rendering, TypeScript for type safety, and IndexedDB for persistence.

---

## 1. **src/types.ts** — Core Type Definitions

### OrgNode Interface (Full)
\\\	ypescript
export interface OrgNode {
  /** Unique identifier (UUID). */
  id: string;
  /** Person's display name. Max 500 characters. */
  name: string;
  /** Job title. Max 500 characters. */
  title: string;
  /** Reference to a ColorCategory.id for color-coded rendering. */
  categoryId?: string;
  /** When true, the link to this node's parent renders as a dotted line. */
  dottedLine?: boolean;
  /** Optional level/grade label (e.g., 'L5', 'E10'). */
  level?: string;
  /** Child nodes. Omit or set undefined for leaf nodes. */
  children?: OrgNode[];
}
\\\

### ColorCategory Interface (Full)
\\\	ypescript
export interface ColorCategory {
  /** Unique identifier (UUID or preset ID like 'open-position'). */
  id: string;
  /** Display name shown in legends and category pickers. */
  label: string;
  /** Background color as hex string (e.g., '#fbbf24'). */
  color: string;
  /** Text color for node name, auto-computed from background for WCAG contrast. */
  nameColor?: string;
  /** Text color for node title, slightly muted variant of nameColor. */
  titleColor?: string;
}
\\\

### Other Relevant Types
\\\	ypescript
export type TextNormalization = 'none' | 'titleCase' | 'uppercase' | 'lowercase';

export interface ColumnMapping {
  name: string;
  title: string;
  parentRef: string;
  id?: string;
  parentRefType: 'id' | 'name';
  caseInsensitive?: boolean;
  nameNormalization?: TextNormalization;
  titleNormalization?: TextNormalization;
}

export type DiffStatus = 'added' | 'removed' | 'moved' | 'modified' | 'unchanged';

export interface DiffEntry {
  status: DiffStatus;
  oldParentId?: string;
  newParentId?: string;
  oldName?: string;
  oldTitle?: string;
  oldCategoryId?: string;
}
\\\

**Key Points:**
- OrgNode is a recursive tree structure
- Categories link nodes to visual styling
- DiffEntry used for version comparison visualization

---

## 2. **src/renderer/chart-renderer.ts** — D3 Rendering Architecture

### Imports & D3 Usage
\\\	ypescript
import { select } from 'd3';
import type { Selection } from 'd3';
// D3 usage: select() for DOM selection, Selection type for typed selections
\\\

### RendererOptions Interface (Full)
\\\	ypescript
export interface RendererOptions {
  container: HTMLElement;
  // Card dimensions
  nodeWidth: number;
  nodeHeight: number;
  // Tree layout spacing
  horizontalSpacing: number;
  branchSpacing?: number;
  topVerticalSpacing?: number;
  bottomVerticalSpacing?: number;
  // IC (Individual Contributor) options
  icNodeWidth?: number;
  icGap?: number;
  icContainerPadding?: number;
  // Advisor options
  palTopGap?: number;
  palBottomGap?: number;
  palRowGap?: number;
  palCenterGap?: number;
  // Typography
  nameFontSize?: number;
  titleFontSize?: number;
  legendFontSize?: number;
  fontFamily?: string;
  textPaddingTop?: number;
  textGap?: number;
  nameColor?: string;
  titleColor?: string;
  // Link style
  linkColor?: string;
  linkWidth?: number;
  dottedLineDash?: string;
  // Card style
  cardFill?: string;
  cardStroke?: string;
  cardStrokeWidth?: number;
  cardBorderRadius?: number;
  icContainerFill?: string;
  icContainerBorderRadius?: number;
  // Text alignment
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  textPaddingHorizontal?: number;
  // Headcount badge
  showHeadcount?: boolean;
  headcountBadgeColor?: string;
  headcountBadgeTextColor?: string;
  headcountBadgeFontSize?: number;
  headcountBadgeRadius?: number;
  headcountBadgePadding?: number;
  headcountBadgeHeight?: number;
  // Level badge
  showLevel?: boolean;
  levelBadgeColor?: string;
  levelBadgeTextColor?: string;
  levelBadgeFontSize?: number;
  levelBadgeSize?: number;
  categories?: ColorCategory[];
  legendRows?: number;
  /** When true, disables zoom/keyboard/interactivity for static preview use. */
  preview?: boolean;
}

export type ResolvedOptions = Required<RendererOptions>;

export type NodeClickHandler = (nodeId: string, event: MouseEvent) => void;
export type NodeRightClickHandler = (nodeId: string, event: MouseEvent) => void;
\\\

### ChartRenderer Class — Key Structure
\\\	ypescript
export class ChartRenderer {
  private svg: Selection<SVGSVGElement, unknown, null, undefined>;
  private g: Selection<SVGGElement, unknown, null, undefined>;
  private opts: ResolvedOptions;
  private onNodeClick: NodeClickHandler | null = null;
  private onNodeRightClick: NodeRightClickHandler | null = null;
  private lastLayout: LayoutResult | null = null;
  private zoomManager: ZoomManager | null;
  private hasRendered = false;
  private highlightedNodes: Set<string> | null = null;
  private diffMap: Map<string, DiffEntry> | null = null;
  private dimUnchanged = true;
  private categoryMap: Map<string, ColorCategory> = new Map();
  private keyboardNav: KeyboardNav | null;

  constructor(options: RendererOptions);
  
  setNodeClickHandler(handler: NodeClickHandler): void;
  setNodeRightClickHandler(handler: NodeRightClickHandler): void;
  setHighlightedNodes(nodeIds: Set<string> | null): void;
  setDiffMap(diffMap: Map<string, DiffEntry> | null): void;
  getDiffMap(): Map<string, DiffEntry> | null;
  setDimUnchanged(enabled: boolean): void;
  
  render(root: OrgNode): void;
}
\\\

### D3 Selection Pattern Used
\\\	ypescript
// SVG and Group Creation (lines 151-163)
this.svg = select(options.container)
  .append('svg')
  .attr('width', '100%')
  .attr('height', '100%');

this.g = this.svg.append('g').attr('class', 'chart-group');

// Rendering Pattern (lines 214-231) - Links
const linksGroup = this.g.append('g').attr('class', 'links');
const treeLinks = layout.links.filter((l) => l.layer === 'tree');
linksGroup
  .selectAll<SVGPathElement, (typeof treeLinks)[number]>('path.link')
  .data(treeLinks)
  .join(
    (enter) =>
      enter
        .append('path')
        .attr('class', 'link')
        .attr('d', (d) => d.path)
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth)
        .attr('stroke-dasharray', (d) => (d.dottedLine ? dottedLineDash : null)),
    (update) => update,
    (exit) => exit.remove(),
  );

// Node Rendering Pattern (lines 254-291) - IC Nodes
icGroup
  .selectAll<SVGGElement, LayoutNode>('g.ic-node')
  .data(icNodes, (d: LayoutNode) => d.id)
  .join(
    (enter) => {
      const g = enter
        .append('g')
        .attr('class', 'node ic-node')
        .attr('data-id', (d) => d.id)
        .attr('aria-label', (d) => \\, \\)
        .attr('transform', (d) => \	ranslate(\,\)\);
      // Further content rendered via this.renderCardContent()
      return g;
    },
    (update) => update,
    (exit) => exit.remove(),
  );
\\\

**Key D3 Patterns:**
- **select()** for DOM selection
- **selectAll().data().join(enter, update, exit)** for data binding
- **attr()** for SVG attributes
- **append()** for creating elements
- Typed selections: Selection<SVGGElement, LayoutNode, null, undefined>
- Data keying by node ID: .data(nodes, (d: LayoutNode) => d.id)

---

## 3. **src/renderer/layout-engine.ts** — Layout Computation

### Core Interfaces
\\\	ypescript
export interface LayoutNode {
  id: string;
  name: string;
  title: string;
  x: number; // center X in pixels
  y: number; // top Y in pixels
  width: number;
  height: number;
  type: 'manager' | 'ic' | 'pal';
  collapsible?: boolean;
  categoryId?: string;
  descendantCount?: number;
  level?: string;
}

export interface LayoutLink {
  path: string; // SVG path d attribute "M... L..."
  layer: 'tree' | 'pal';
  dottedLine?: boolean;
}

export interface LayoutICContainer {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  icContainers: LayoutICContainer[];
  boundingBox: { minX: number; minY: number; width: number; height: number };
}
\\\

### computeLayout() Function Signature
\\\	ypescript
export function computeLayout(root: OrgNode, opts: ResolvedOptions): LayoutResult;

// Key computation steps (lines 62-100):
// 1. Pre-compute descendant counts in O(n) single pass
// 2. Filter visible tree (removes hidden nodes)
// 3. Strip M1 children (first-line managers' leaf children)
// 4. Use D3's hierarchy() and tree() for layout computation
// 5. Separate tree links (manager hierarchy) from advisor links
// 6. Compute IC container positions and bounds

export const ADVISORS_PER_ROW = 2;

export function precomputeDescendantCounts(root: OrgNode): Map<string, number>;
\\\

**D3 Integration in Layout:**
\\\	ypescript
import { hierarchy, tree } from 'd3';
import type { HierarchyPointNode } from 'd3';

// Example usage (lines 87-100)
const hier = hierarchy(layoutTree, (d) => d.children);

const treeLayout = tree<OrgNode>()
  .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + totalVerticalSpacing])
  .separation((a, b) => {
    const aHasPals = palMap.has(a.data.id);
    const bHasPals = palMap.has(b.data.id);
    const base = a.parent === b.parent ? 1 : 2;
    if (aHasPals || bHasPals) {
      return Math.max(base, palTotalWidth / (nodeWidth + horizontalSpacing) + 0.3);
    }
    return base;
  });
\\\

---

## 4. **src/utils/tree.ts** — Tree Utilities & Analysis

### Exported Functions
\\\	ypescript
export function findNodeById(root: OrgNode, id: string): OrgNode | null;
export function findParent(root: OrgNode, id: string): OrgNode | null;
export function cloneTree(node: OrgNode): OrgNode;
export function filterVisibleTree(node: OrgNode): OrgNode;
export function flattenTree(node: OrgNode): OrgNode[];
export function isLeaf(node: OrgNode): boolean;

/** 
 * A manager is M1 (first-line manager) if ALL children are leaf nodes.
 * M1 detection affects layout rendering (ICs vs. managers).
 */
export function isM1(node: OrgNode): boolean;

/**
 * Clones tree, stripping children from M1 nodes and leaf children 
 * from non-M1 managers. Returns:
 * - layoutTree: only non-leaf manager nodes
 * - icMap: M1 id → IC children (vertical stacks)
 * - palMap: manager id → Advisor children (leaf children)
 */
export function stripM1Children(node: OrgNode): {
  layoutTree: OrgNode;
  icMap: Map<string, OrgNode[]>;
  palMap: Map<string, OrgNode[]>;
};

export function countLeaves(root: OrgNode): number;
export function countDescendants(node: OrgNode): number;

/** Computes manager level: M1=1, M2=2, M3=3, etc. Returns 0 for leaves. */
export function managerLevel(node: OrgNode): number;

/** Returns map of manager level → count. E.g., {1: 5, 2: 3, 3: 1} */
export function countManagersByLevel(root: OrgNode): Map<number, number>;

/** Average span of control (direct reports) for all managers */
export function avgSpanOfControl(root: OrgNode): number;
\\\

---

## 5. **src/store/category-store.ts** — Category Management

### CategoryStore Class & API
\\\	ypescript
export class CategoryStore extends EventEmitter {
  private storage: IStorage;
  private cache: ColorCategory[] | null = null;

  constructor(storage: IStorage = browserStorage);

  /** Get all categories with fresh copies (internal caching). */
  getAll(): ColorCategory[];

  /** Get a specific category by ID. */
  getById(id: string): ColorCategory | undefined;

  /** Add a new category. Validates hex color format. */
  add(label: string, color: string): ColorCategory;

  /** Update category fields. Recomputes text colors if background changes. */
  update(
    id: string, 
    fields: { 
      label?: string; 
      color?: string; 
      nameColor?: string; 
      titleColor?: string; 
    }
  ): void;

  /** Remove a category by ID. */
  remove(id: string): void;

  /** Replace all categories. */
  replaceAll(categories: ColorCategory[]): void;

  /** Invalidate cache (force reload from storage). */
  invalidateCache(): void;
}
\\\

### Default Categories
\\\	ypescript
const DEFAULT_CATEGORIES: ColorCategory[] = [
  {
    id: 'open-position',
    label: t('category.open_position'),
    color: '#fbbf24',  // Amber
    nameColor: contrastingTextColor('#fbbf24'),
    titleColor: contrastingTitleColor('#fbbf24'),
  },
  {
    id: 'offer-pending',
    label: t('category.offer_pending'),
    color: '#60a5fa',  // Blue
    nameColor: contrastingTextColor('#60a5fa'),
    titleColor: contrastingTitleColor('#60a5fa'),
  },
  {
    id: 'future-start',
    label: t('category.future_start'),
    color: '#a78bfa',  // Purple
    nameColor: contrastingTextColor('#a78bfa'),
    titleColor: contrastingTitleColor('#a78bfa'),
  },
];
\\\

---

## 6. **src/store/settings-store.ts** — Appearance & Styling Settings

### PersistableSettings Interface (Full)
\\\	ypescript
export interface PersistableSettings {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  branchSpacing: number;
  topVerticalSpacing: number;
  bottomVerticalSpacing: number;
  icNodeWidth: number;
  icGap: number;
  icContainerPadding: number;
  palTopGap: number;
  palBottomGap: number;
  palRowGap: number;
  palCenterGap: number;
  nameFontSize: number;
  titleFontSize: number;
  textPaddingTop: number;
  textGap: number;
  textAlign: string;  // 'left' | 'center' | 'right' | 'start' | 'end'
  textPaddingHorizontal: number;
  fontFamily: string;  // 'Calibri' | 'Arial' | 'Verdana' | 'Georgia' | 'Tahoma' | 'Trebuchet MS' | 'Segoe UI' | 'Microsoft Sans Serif'
  nameColor: string;
  titleColor: string;
  linkColor: string;
  linkWidth: number;
  dottedLineDash: string;  // e.g., "6,4"
  cardFill: string;
  cardStroke: string;
  cardStrokeWidth: number;
  cardBorderRadius: number;
  icContainerFill: string;
  icContainerBorderRadius: number;
  showHeadcount: boolean;
  headcountBadgeColor: string;
  headcountBadgeTextColor: string;
  headcountBadgeFontSize: number;
  headcountBadgeRadius: number;
  headcountBadgePadding: number;
  headcountBadgeHeight: number;
  showLevel: boolean;
  levelBadgeColor: string;
  levelBadgeTextColor: string;
  levelBadgeFontSize: number;
  levelBadgeSize: number;
  legendRows: number;
}

export interface SettingsExport {
  version: number;
  name: string;
  timestamp: string;
  settings: PersistableSettings;
}
\\\

### SettingsStore API
\\\	ypescript
export class SettingsStore {
  constructor(storage: IStorage = browserStorage);

  /** Save settings with 300ms debounce. */
  save(settings: Partial<PersistableSettings>): void;

  /** Save settings immediately without debounce. */
  saveImmediate(settings: Partial<PersistableSettings>): void;

  /** Load settings, merging with defaults. */
  load(defaults: PersistableSettings): PersistableSettings;

  /** Check if settings have been saved. */
  hasSaved(): boolean;

  /** Clear all saved settings. */
  clear(): void;

  /** Export settings to file. */
  exportToFile(name?: string): void;

  /** Import settings from JSON content. */
  importFromFile(jsonContent: string): PersistableSettings;

  /** Create export object. */
  createExport(settings: PersistableSettings, name?: string): SettingsExport;

  /** Parse and validate import. */
  parseImport(jsonContent: string): PersistableSettings;
}
\\\

---

## 7. **src/store/theme-manager.ts** — Theme Management

### ThemeManager Class
\\\	ypescript
export type Theme = 'dark' | 'light';

export class ThemeManager extends EventEmitter {
  private static STORAGE_KEY = 'arbol-theme';
  private currentTheme: Theme;
  private storage: IStorage;

  constructor(storage: IStorage = browserStorage);

  /** Get current theme ('dark' or 'light'). */
  getTheme(): Theme;

  /** Set theme and persist. Emits change event. */
  setTheme(theme: Theme): void;

  /** Toggle between dark and light mode. */
  toggle(): void;

  private apply(): void;  // Applies theme by setting CSS classes on document.documentElement
}
\\\

**How it works:**
- Stores theme preference in localStorage
- Applies theme by adding/removing 'theme-light' class on <html>
- Default theme is 'dark'
- Emits event when theme changes

---

## 8. **src/utils/dom-builder.ts** — DOM Construction Helpers

### Available DOM Builders
\\\	ypescript
export interface ButtonOptions {
  label?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  dataAction?: string;
}

export function createButton(options: ButtonOptions): HTMLButtonElement;

export interface IconButtonOptions {
  icon: string;
  tooltip?: string;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
  ariaKeyshortcuts?: string;
}

export function createIconButton(options: IconButtonOptions): HTMLButtonElement;

export function createFormGroup(label: string, inputId?: string): HTMLDivElement;

export function createHeading(
  text: string, 
  level: 'h2' | 'h3' | 'h4' = 'h3'
): HTMLHeadingElement;

export function createSection(
  heading: string, 
  children: HTMLElement[]
): HTMLElement;
\\\

**Key Note:** All text is set via 	extContent (never innerHTML) for security.

---

## 9. **src/editor/chart-editor.ts** — Sidebar Editor Structure

### ChartEditor Class
\\\	ypescript
export interface ChartEditorOptions {
  container: HTMLElement;
  chartStore: ChartStore;
  onChartSwitch: (chart: ChartRecord) => void;
  onVersionRestore: (tree: OrgNode) => void;
  onVersionView: (version: VersionRecord) => void;
  onVersionCompare: (version: VersionRecord) => void;
  getCurrentTree: () => OrgNode;
  getCurrentCategories: () => ColorCategory[];
  onBeforeSwitch: () => Promise<boolean>;
}

export class ChartEditor {
  constructor(options: ChartEditorOptions);

  /** Refresh chart and version lists (idempotent, queues if in progress). */
  async refresh(): Promise<void>;

  /** Destroy editor and cleanup listeners. */
  destroy(): void;

  /** Set current version being viewed (null = working tree). */
  setViewingVersion(versionId: string | null): void;

  private build(): void;  // Builds initial DOM structure
  private renderChartList(): Promise<void>;
  private renderVersionList(): Promise<void>;
}
\\\

**Sidebar Structure:**
- Charts header with + button
- Search input (filters charts)
- Chart list (click to switch)
- Versions header with + Save button
- Versions list (click to view/restore)

---

## 10. **src/i18n/en.ts** — Internationalization Keys

### Analytics/Metrics Related Keys
\\\	ypescript
// Property Panel (org metrics display)
'property_panel.title': 'Properties',
'property_panel.direct_reports': 'Direct reports:',
'property_panel.total_org': 'Total org:',
'property_panel.span_of_control': 'Avg span of control:',

// Headcount Badge
'settings.group.headcount_badge': 'Headcount Badge',
'settings.label.show_headcount': 'Show Headcount',
'settings.desc.show_headcount': 'Show a badge on manager cards with their total report count',
'settings.desc.badge_font_size': 'Font size of the headcount badge number',
'settings.desc.badge_height': 'Height of the headcount badge pill',
'settings.desc.badge_radius': 'Corner rounding of the headcount badge',
'settings.desc.badge_padding': 'Horizontal padding inside the headcount badge',
'settings.desc.badge_color': 'Background color of the headcount badge',
'settings.desc.badge_text_color': 'Text color of the headcount badge number',

// Help content
'help.focus_mode.export': 'PowerPoint export and status bar stats automatically reflect the focused sub-org.',
'help.headcount.title': 'Headcount Badges',
'help.headcount.enable_1': 'Managers can display a badge showing their total headcount...',
'help.headcount.customize': 'Badge appearance (color, size, radius) can be customized...',
\\\

**Note:** No "analytics" prefix keys currently exist. You'll need to add new translation keys for analytics tab features.

---

## 11. **Current Editor Tabs Structure**

From **src/editor/tab-switcher.ts** and main.ts:

\\\	ypescript
// Current tabs (from i18n)
'tabs.charts': 'Charts',
'tabs.people': 'People',
'tabs.import': 'Import',
'tabs.settings': 'Settings',
'tabs.aria': 'Editor tabs',
\\\

Existing editors:
- ChartEditor — Charts tab
- FormEditor — People tab (add/edit individual nodes)
- ImportEditor — Import tab
- SettingsEditor — Settings tab

**To add Analytics tab**, you would:
1. Create AnalyticsEditor class in src/editor/analytics-editor.ts
2. Add it to the tab switcher in main.ts
3. Add i18n keys like 'tabs.analytics': 'Analytics'
4. Compute metrics via tree utilities and render D3 visualizations

---

## 12. **Data Flow & Architecture**

### State Management
\\\
IndexedDB (ChartDB)
    ↓
ChartStore (list of charts, versions)
    ↓
OrgStore (working tree)
    ↓
ChartRenderer (D3 visualization)

Settings:
  SettingsStore → PersistableSettings → ChartRenderer.opts

Categories:
  CategoryStore → ColorCategory[] → ChartRenderer.categoryMap
\\\

### Key Store Classes
\\\	ypescript
// OrgStore: Manages working tree and undo/redo
export class OrgStore extends EventEmitter {
  private tree: OrgNode;
  private undoStack: OrgNode[] = [];
  private redoStack: OrgNode[] = [];
  
  getTree(): OrgNode;
  setTree(tree: OrgNode): void;
  undo(): void;
  redo(): void;
  // ... mutation methods (addNode, removeNode, moveNode, etc.)
}

// ChartStore: Manages chart list and versions
export class ChartStore extends EventEmitter {
  async initialize(): Promise<ChartRecord>;
  getActiveChart(): ChartRecord;
  onChange(callback: () => void): () => void;
}

// CategoryStore: Manages color categories
export class CategoryStore extends EventEmitter {
  getAll(): ColorCategory[];
  getById(id: string): ColorCategory | undefined;
  // ... add/update/remove methods
}

// SettingsStore: Manages rendering settings
export class SettingsStore {
  load(defaults: PersistableSettings): PersistableSettings;
  save(settings: Partial<PersistableSettings>): void;
}

// ThemeManager: Manages dark/light mode
export class ThemeManager extends EventEmitter {
  getTheme(): Theme;
  setTheme(theme: Theme): void;
  toggle(): void;
}
\\\

---

## 13. **Building D3 Visualizations — Integration Points**

### Step 1: Create AnalyticsEditor
\\\	ypescript
import { OrgStore } from '../store/org-store';
import { OrgNode, ColorCategory } from '../types';
import { flattenTree, countManagersByLevel, avgSpanOfControl } from '../utils/tree';
import { select } from 'd3';
import type { Selection } from 'd3';

export class AnalyticsEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private svgContainer: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.build();
    this.unsubscribe = this.store.onChange(() => this.refresh());
  }

  private build(): void {
    this.container.innerHTML = '';
    // Create layout with tabs/sections
    // Create SVG container for D3 charts
  }

  private refresh(): void {
    const tree = this.store.getTree();
    this.computeAndRender(tree);
  }

  private computeAndRender(tree: OrgNode): void {
    // Use tree utilities to compute metrics
    const nodes = flattenTree(tree);
    const byLevel = countManagersByLevel(tree);
    const avgSpan = avgSpanOfControl(tree);

    // Build D3 visualizations
    const svg = select(this.svgContainer).selectAll('svg').data([null]).join('svg');
    // ... render charts
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container.innerHTML = '';
  }
}
\\\

### Step 2: Access Key Data
\\\	ypescript
// Get all nodes
const nodes = flattenTree(tree);

// Count managers by level
const byLevel: Map<number, number> = countManagersByLevel(tree);

// Average span of control
const avgSpan: number = avgSpanOfControl(tree);

// Count descendants
import { countDescendants } from '../utils/tree';
nodes.forEach(node => {
  const orgSize = countDescendants(node);
});

// Get categories for coloring
import { CategoryStore } from '../store/category-store';
const categoryStore = new CategoryStore();
const categories = categoryStore.getAll();
const categoryById = new Map(categories.map(c => [c.id, c]));
\\\

### Step 3: Use D3 Patterns
\\\	ypescript
// Bind data
const svg = select(container)
  .append('svg')
  .attr('width', 800)
  .attr('height', 600);

// Bar chart example
const bars = svg.selectAll('rect')
  .data(Array.from(byLevel.entries())) // [[1, 5], [2, 3], ...]
  .join('rect')
  .attr('x', (d, i) => i * 60)
  .attr('y', (d) => 600 - d[1] * 20)
  .attr('width', 50)
  .attr('height', (d) => d[1] * 20)
  .attr('fill', '#4f46e5');

// Add labels
svg.selectAll('text.label')
  .data(Array.from(byLevel.entries()))
  .join('text')
  .attr('class', 'label')
  .attr('x', (d, i) => i * 60 + 25)
  .attr('y', 620)
  .text((d) => \M\\);
\\\

---

## 14. **Available Utility Functions Summary**

### Tree Analysis
- lattenTree(root) — Returns all nodes as flat array
- indNodeById(root, id) — Search for node by ID
- indParent(root, id) — Get parent of a node
- isLeaf(node) — Check if node has no children
- isM1(node) — Check if node is first-line manager
- countDescendants(node) — Count all descendants
- managerLevel(node) — Get manager level (M1=1, M2=2, etc.)
- countManagersByLevel(root) — Get manager distribution by level
- vgSpanOfControl(root) — Average direct reports per manager

### Categories
- categoryStore.getAll() — Get all color categories
- categoryStore.getById(id) — Get category by ID

### Settings
- settingsStore.load(defaults) — Load user settings
- settingsStore.save(settings) — Save settings (debounced)

### Theme
- 	hemeManager.getTheme() — Get current theme ('dark' or 'light')
- 	hemeManager.setTheme(theme) — Set theme

### Contrast
- contrastingTextColor(hexColor) — Get black or white for text
- contrastingTitleColor(hexColor) — Get muted variant

---

## 15. **Example: Building an Organization Metrics Dashboard**

\\\	ypescript
import { Selection } from 'd3';
import { select, scaleLinear, scaleBand, axisBottom, axisLeft } from 'd3';

class OrganizationMetrics {
  compute(root: OrgNode) {
    const nodes = flattenTree(root);
    const managers = nodes.filter(n => !isLeaf(n));
    const icCount = nodes.filter(isLeaf).length;
    const depth = this.computeDepth(root);
    const byLevel = countManagersByLevel(root);
    const avgSpan = avgSpanOfControl(root);

    return {
      totalHeadcount: nodes.length,
      managerCount: managers.length,
      icCount,
      avgSpan,
      depth,
      distribution: Array.from(byLevel.entries()).map(([level, count]) => ({
        level: \M\\,
        count,
      })),
    };
  }

  renderChart(container: HTMLElement, metrics: any): void {
    const svg = select(container)
      .append('svg')
      .attr('width', 600)
      .attr('height', 400);

    const xScale = scaleBand()
      .domain(metrics.distribution.map(d => d.level))
      .range([60, 550])
      .padding(0.1);

    const yScale = scaleLinear()
      .domain([0, Math.max(...metrics.distribution.map(d => d.count))])
      .range([350, 50]);

    // Bars
    svg.selectAll('rect')
      .data(metrics.distribution)
      .join('rect')
      .attr('x', d => xScale(d.level))
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => 350 - yScale(d.count))
      .attr('fill', '#3b82f6');

    // X Axis
    svg.append('g')
      .attr('transform', 'translate(0,350)')
      .call(axisBottom(xScale));

    // Y Axis
    svg.append('g')
      .attr('transform', 'translate(60,0)')
      .call(axisLeft(yScale));
  }

  private computeDepth(node: OrgNode, depth = 0): number {
    if (!node.children || node.children.length === 0) return depth;
    return Math.max(...node.children.map(c => this.computeDepth(c, depth + 1)));
  }
}
\\\

---

## 16. **CSS Variables Available for Theming**

From the codebase:
\\\css
/* Light/Dark Mode Detection */
html.theme-light { /* light theme active */ }
html { /* dark theme (default) */ }

/* Common Variables (referenced in settings) */
--text-primary
--text-secondary
--text-tertiary
--font-sans
--font-mono

/* Card styling */
--bg-card
--border-card
\\\

---

## Summary — Key Takeaways for Building Analytics Tab

1. **Data Access**: Use tree utilities (lattenTree, countManagersByLevel, vgSpanOfControl, etc.)
2. **Rendering**: Use D3 patterns from ChartRenderer (selectAll().data().join() pattern)
3. **Colors**: Get categories from CategoryStore.getAll()
4. **Settings**: Get appearance from SettingsStore.load()
5. **Theming**: Use ThemeManager.getTheme() to respond to dark/light mode
6. **DOM Helpers**: Use createButton(), createHeading(), createSection() for UI
7. **i18n**: Add keys with 'analytics.' prefix to src/i18n/en.ts
8. **State**: Subscribe to OrgStore.onChange() for real-time updates
9. **TypeScript**: Leverage strict typing with imported types and interfaces
10. **Storage**: Persist analytics preferences if needed via SettingsStore pattern

---

*Document generated from codebase analysis — Arbol D3 Visualization Project*
