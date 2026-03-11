import type { OrgNode, ColumnMapping } from '../types';

export interface CsvParseResult {
  tree: OrgNode;
  nodeCount: number;
}

type Format = 'A' | 'B' | 'C';

interface ColumnMap {
  format: Format;
  name: number;
  title: number;
  id?: number;
  parent?: number;
}

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectFormat(headers: string[]): ColumnMap {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const nameIdx = normalized.findIndex((h) => h === 'name');
  const titleIdx = normalized.findIndex((h) => h === 'title');

  if (nameIdx === -1 || titleIdx === -1) {
    throw new Error(
      'Unrecognizable CSV format: could not find required "name" and "title" columns.',
    );
  }

  const idIdx = normalized.findIndex((h) => h === 'id');
  const parentIdIdx = normalized.findIndex((h) => h === 'parent_id');
  const managerIdx = normalized.findIndex((h) => h === 'manager_name');
  const reportsToIdx = normalized.findIndex((h) => h === 'reports_to');

  if (idIdx !== -1 && parentIdIdx !== -1) {
    return { format: 'A', name: nameIdx, title: titleIdx, id: idIdx, parent: parentIdIdx };
  }
  if (managerIdx !== -1) {
    return { format: 'B', name: nameIdx, title: titleIdx, parent: managerIdx };
  }
  if (reportsToIdx !== -1) {
    return { format: 'C', name: nameIdx, title: titleIdx, parent: reportsToIdx };
  }

  throw new Error(
    'Unrecognizable CSV format: could not find parent reference column (parent_id, manager_name, or reports_to).',
  );
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function extractHeaders(csvText: string): string[] {
  const cleaned = stripBom(csvText);
  const firstLine = cleaned.split(/\r?\n/).find((line) => line.trim() !== '');
  if (!firstLine) {
    return [];
  }
  return parseRow(firstLine);
}

export function parseCsvToTree(csvText: string, mapping?: ColumnMapping): CsvParseResult {
  const cleaned = stripBom(csvText);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 1) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headers = parseRow(lines[0]);

  let colMap: ColumnMap;
  if (mapping) {
    const normalized = headers.map((h) => h.toLowerCase().trim());

    const nameIdx = normalized.indexOf(mapping.name.toLowerCase().trim());
    const titleIdx = normalized.indexOf(mapping.title.toLowerCase().trim());
    const parentIdx = normalized.indexOf(mapping.parentRef.toLowerCase().trim());

    const missing: string[] = [];
    if (nameIdx === -1) missing.push(`name ("${mapping.name}")`);
    if (titleIdx === -1) missing.push(`title ("${mapping.title}")`);
    if (parentIdx === -1) missing.push(`parentRef ("${mapping.parentRef}")`);

    let idIdx: number | undefined;
    if (mapping.id) {
      idIdx = normalized.indexOf(mapping.id.toLowerCase().trim());
      if (idIdx === -1) missing.push(`id ("${mapping.id}")`);
    }

    if (missing.length > 0) {
      throw new Error(
        `Column mapping error: the following columns were not found in the CSV headers: ${missing.join(', ')}. Available headers: ${headers.join(', ')}`,
      );
    }

    const format: Format = mapping.parentRefType === 'id' ? 'A' : 'B';
    colMap = { format, name: nameIdx, title: titleIdx, parent: parentIdx };
    if (idIdx !== undefined) {
      colMap.id = idIdx;
    }
  } else {
    colMap = detectFormat(headers);
  }

  const dataLines = lines.slice(1);
  if (dataLines.length < 1) {
    throw new Error('CSV must contain at least 1 data row (need at least a root node).');
  }

  interface FlatNode {
    id: string;
    name: string;
    title: string;
    parentRef: string;
  }

  const nodes: FlatNode[] = [];

  for (const line of dataLines) {
    const fields = parseRow(line);
    const name = fields[colMap.name] ?? '';
    const title = fields[colMap.title] ?? '';
    const parentRef = colMap.parent !== undefined ? (fields[colMap.parent] ?? '') : '';
    const id =
      colMap.format === 'A' && colMap.id !== undefined
        ? (fields[colMap.id] ?? '')
        : crypto.randomUUID();

    nodes.push({ id, name, title, parentRef });
  }

  if (nodes.length < 2) {
    throw new Error('CSV must contain at least 2 data rows.');
  }

  // Detect circular references and orphans by building adjacency
  if (colMap.format === 'A') {
    return buildTreeById(nodes);
  } else {
    return buildTreeByName(nodes);
  }
}

function buildTreeById(nodes: { id: string; name: string; title: string; parentRef: string }[]): CsvParseResult {
  const idMap = new Map<string, { id: string; name: string; title: string; parentRef: string }>();
  for (const node of nodes) {
    idMap.set(node.id, node);
  }

  // Find roots
  const roots: string[] = [];
  for (const node of nodes) {
    if (!node.parentRef) {
      roots.push(node.id);
    } else if (!idMap.has(node.parentRef)) {
      throw new Error(`Orphan reference: node "${node.name}" references parent_id "${node.parentRef}" which does not exist.`);
    }
  }

  if (roots.length === 0) {
    throw new Error('No root node found (every node has a parent reference — possible circular reference).');
  }
  if (roots.length > 1) {
    throw new Error(`Multiple roots detected: ${roots.map((r) => `"${idMap.get(r)!.name}"`).join(', ')}. Only one root is allowed.`);
  }

  // Detect cycles
  detectCycles(nodes, 'id');

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentRef) {
      const siblings = childrenMap.get(node.parentRef) ?? [];
      siblings.push(node.id);
      childrenMap.set(node.parentRef, siblings);
    }
  }

  let count = 0;
  function buildNode(id: string): OrgNode {
    const n = idMap.get(id)!;
    count++;
    const childIds = childrenMap.get(id);
    const result: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (childIds && childIds.length > 0) {
      result.children = childIds.map(buildNode);
    }
    return result;
  }

  const tree = buildNode(roots[0]);
  return { tree, nodeCount: count };
}

function buildTreeByName(nodes: { id: string; name: string; title: string; parentRef: string }[]): CsvParseResult {
  const nameMap = new Map<string, { id: string; name: string; title: string; parentRef: string }>();
  for (const node of nodes) {
    nameMap.set(node.name, node);
  }

  const roots: string[] = [];
  for (const node of nodes) {
    if (!node.parentRef) {
      roots.push(node.name);
    } else if (!nameMap.has(node.parentRef)) {
      throw new Error(`Orphan reference: node "${node.name}" references parent "${node.parentRef}" which does not exist.`);
    }
  }

  if (roots.length === 0) {
    throw new Error('No root node found (every node has a parent reference — possible circular reference).');
  }
  if (roots.length > 1) {
    throw new Error(`Multiple roots detected: ${roots.map((r) => `"${r}"`).join(', ')}. Only one root is allowed.`);
  }

  detectCycles(nodes, 'name');

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentRef) {
      const siblings = childrenMap.get(node.parentRef) ?? [];
      siblings.push(node.name);
      childrenMap.set(node.parentRef, siblings);
    }
  }

  let count = 0;
  function buildNode(name: string): OrgNode {
    const n = nameMap.get(name)!;
    count++;
    const childNames = childrenMap.get(name);
    const result: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (childNames && childNames.length > 0) {
      result.children = childNames.map(buildNode);
    }
    return result;
  }

  const tree = buildNode(roots[0]);
  return { tree, nodeCount: count };
}

function detectCycles(
  nodes: { id: string; name: string; title: string; parentRef: string }[],
  keyField: 'id' | 'name',
): void {
  const parentMap = new Map<string, string>();
  for (const node of nodes) {
    const key = keyField === 'id' ? node.id : node.name;
    if (node.parentRef) {
      parentMap.set(key, node.parentRef);
    }
  }

  for (const node of nodes) {
    const key = keyField === 'id' ? node.id : node.name;
    const visited = new Set<string>();
    let current: string | undefined = key;
    while (current && parentMap.has(current)) {
      if (visited.has(current)) {
        throw new Error(`Circular reference detected involving node "${node.name}".`);
      }
      visited.add(current);
      current = parentMap.get(current);
    }
  }
}
