export interface OrgNode {
  id: string;
  name: string;
  title: string;
  children?: OrgNode[];
}

export interface ColumnMapping {
  name: string;
  title: string;
  parentRef: string;
  id?: string;
  parentRefType: 'id' | 'name';
}

export interface MappingPreset {
  name: string;
  mapping: ColumnMapping;
}
