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
