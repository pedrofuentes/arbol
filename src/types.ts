/** A node in the organizational chart tree hierarchy. */
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
  /** Child nodes. Omit or set undefined for leaf nodes. */
  children?: OrgNode[];
}

/** A color category for visually tagging org chart nodes. */
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

export interface MappingPreset {
  name: string;
  mapping: ColumnMapping;
}

/** Persistent chart record stored in IndexedDB. */
export interface ChartRecord {
  /** Unique identifier (UUID). */
  id: string;
  /** User-assigned chart name. Must be unique across all charts. */
  name: string;
  /** ISO 8601 timestamp of chart creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last working tree modification. */
  updatedAt: string;
  /** Current live org tree for this chart. */
  workingTree: OrgNode;
  /** Color categories specific to this chart. */
  categories: ColorCategory[];
}

/** Immutable point-in-time snapshot of a chart's tree. */
export interface VersionRecord {
  /** Unique identifier (UUID). */
  id: string;
  /** Foreign key to ChartRecord.id. */
  chartId: string;
  /** User-assigned version name. */
  name: string;
  /** ISO 8601 timestamp of when the snapshot was taken. */
  createdAt: string;
  /** Frozen copy of the org tree at snapshot time. */
  tree: OrgNode;
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

export interface ComparisonState {
  oldTree: OrgNode;
  newTree: OrgNode;
  oldLabel: string;
  newLabel: string;
  diff: Map<string, DiffEntry>;
  viewMode: 'merged' | 'side-by-side';
}

export interface ChartBundleVersion {
  name: string;
  createdAt: string;
  tree: OrgNode;
}

export interface ChartBundle {
  format: 'arbol-chart';
  version: 1;
  chart: {
    name: string;
    workingTree: OrgNode;
    categories: ColorCategory[];
  };
  versions: ChartBundleVersion[];
}
