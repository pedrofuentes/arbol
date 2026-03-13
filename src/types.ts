export interface OrgNode {
  id: string;
  name: string;
  title: string;
  categoryId?: string;
  dottedLine?: boolean;
  children?: OrgNode[];
}

export interface ColorCategory {
  id: string;
  label: string;
  color: string;
  nameColor?: string;
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

export interface ChartRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workingTree: OrgNode;
  categories: ColorCategory[];
}

export interface VersionRecord {
  id: string;
  chartId: string;
  name: string;
  createdAt: string;
  tree: OrgNode;
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
