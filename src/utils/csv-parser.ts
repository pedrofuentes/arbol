import type { OrgNode, ColumnMapping } from '../types';

export const MAX_NODES = 10_000;

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

/**
 * Splits CSV text into logical rows, handling multi-line quoted fields (RFC 4180).
 * Physical lines inside an open quoted field are joined into one logical row.
 */
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let currentRow = '';
  let quoteCount = 0;

  for (const line of text.split(/\r?\n/)) {
    if (currentRow !== '') {
      currentRow += '\n' + line;
    } else {
      currentRow = line;
    }

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') quoteCount++;
    }

    // Odd quote count means we're still inside a quoted field
    if (quoteCount % 2 === 0) {
      if (currentRow.trim() !== '') {
        rows.push(currentRow);
      }
      currentRow = '';
      quoteCount = 0;
    }
  }

  if (currentRow.trim() !== '') {
    rows.push(currentRow);
  }

  return rows;
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
  const lines = splitCsvRows(cleaned);

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

  const caseInsensitive = mapping?.caseInsensitive ?? true;

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
    if (!name.trim()) continue;
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

  if (nodes.length > MAX_NODES) {
    throw new Error(
      `CSV contains ${nodes.length} data rows, which exceeds the maximum of ${MAX_NODES}. Please reduce the dataset.`,
    );
  }

  // Detect circular references and orphans by building adjacency
  if (colMap.format === 'A') {
    return buildTreeById(nodes, caseInsensitive);
  } else {
    return buildTreeByName(nodes, caseInsensitive);
  }
}

function buildTreeById(
  nodes: { id: string; name: string; title: string; parentRef: string }[],
  caseInsensitive: boolean,
): CsvParseResult {
  const normalize = caseInsensitive ? (s: string) => s.toLowerCase() : (s: string) => s;
  const idMap = new Map<string, { id: string; name: string; title: string; parentRef: string }>();
  for (const node of nodes) {
    const key = normalize(node.id);
    const existing = idMap.get(key);
    if (existing) {
      throw new Error(
        `Duplicate ID "${node.id}": "${node.name}" and "${existing.name}" share the same identifier.`,
      );
    }
    idMap.set(key, node);
  }

  // Find roots and collect orphan references
  const roots: string[] = [];
  const missingParents = new Set<string>();
  for (const node of nodes) {
    if (!node.parentRef) {
      roots.push(normalize(node.id));
    } else if (!idMap.has(normalize(node.parentRef))) {
      missingParents.add(normalize(node.parentRef));
    }
  }

  // Auto-create missing root if all orphans reference the same parent
  if (roots.length === 0 && missingParents.size === 1) {
    const missingId = [...missingParents][0];
    const originalRef = nodes.find((n) => normalize(n.parentRef) === missingId)!.parentRef;
    const placeholder = { id: originalRef, name: originalRef, title: '\u2014', parentRef: '' };
    nodes.push(placeholder);
    idMap.set(missingId, placeholder);
    roots.push(missingId);
    missingParents.clear();
  }

  if (missingParents.size > 0) {
    const orphanNodes = nodes.filter((n) => n.parentRef && !idMap.has(normalize(n.parentRef)));
    throw new Error(
      `Orphan reference: node "${orphanNodes[0].name}" references parent_id "${orphanNodes[0].parentRef}" which does not exist.`,
    );
  }

  // Detect cycles before root checks so cycle errors are descriptive
  detectCycles(nodes, 'id', caseInsensitive);

  if (roots.length === 0) {
    throw new Error(
      'No root node found (every node has a parent reference — possible circular reference).',
    );
  }
  if (roots.length > 1) {
    throw new Error(
      `Multiple roots detected: ${roots.map((r) => `"${idMap.get(r)!.name}"`).join(', ')}. Only one root is allowed.`,
    );
  }

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentRef) {
      const parentKey = normalize(node.parentRef);
      const siblings = childrenMap.get(parentKey) ?? [];
      siblings.push(normalize(node.id));
      childrenMap.set(parentKey, siblings);
    }
  }

  let count = 0;
  function buildNode(normalizedId: string): OrgNode {
    const n = idMap.get(normalizedId)!;
    count++;
    const childIds = childrenMap.get(normalizedId);
    const result: OrgNode = { id: n.id, name: n.name, title: n.title };
    if (childIds && childIds.length > 0) {
      result.children = childIds.map(buildNode);
    }
    return result;
  }

  const tree = buildNode(roots[0]);
  return { tree, nodeCount: count };
}

function buildTreeByName(
  nodes: { id: string; name: string; title: string; parentRef: string }[],
  caseInsensitive: boolean,
): CsvParseResult {
  const normalize = caseInsensitive ? (s: string) => s.toLowerCase() : (s: string) => s;
  const nameMap = new Map<string, { id: string; name: string; title: string; parentRef: string }>();
  for (const node of nodes) {
    const key = normalize(node.name);
    const existing = nameMap.get(key);
    if (existing) {
      throw new Error(
        `Duplicate name "${node.name}": two people share the same name. Use ID-based import (with a unique alias column) to distinguish them.`,
      );
    }
    nameMap.set(key, node);
  }

  const roots: string[] = [];
  const missingParents = new Set<string>();
  for (const node of nodes) {
    if (!node.parentRef) {
      roots.push(normalize(node.name));
    } else if (!nameMap.has(normalize(node.parentRef))) {
      missingParents.add(normalize(node.parentRef));
    }
  }

  // Auto-create missing root if all orphans reference the same parent
  if (roots.length === 0 && missingParents.size === 1) {
    const missingName = [...missingParents][0];
    const originalRef = nodes.find((n) => normalize(n.parentRef) === missingName)!.parentRef;
    const placeholder = {
      id: crypto.randomUUID(),
      name: originalRef,
      title: '\u2014',
      parentRef: '',
    };
    nodes.push(placeholder);
    nameMap.set(missingName, placeholder);
    roots.push(missingName);
    missingParents.clear();
  }

  if (missingParents.size > 0) {
    const orphanNodes = nodes.filter((n) => n.parentRef && !nameMap.has(normalize(n.parentRef)));
    throw new Error(
      `Orphan reference: node "${orphanNodes[0].name}" references parent "${orphanNodes[0].parentRef}" which does not exist.`,
    );
  }

  // Detect cycles before root checks so cycle errors are descriptive
  detectCycles(nodes, 'name', caseInsensitive);

  if (roots.length === 0) {
    throw new Error(
      'No root node found (every node has a parent reference — possible circular reference).',
    );
  }
  if (roots.length > 1) {
    throw new Error(
      `Multiple roots detected: ${roots.map((r) => `"${r}"`).join(', ')}. Only one root is allowed.`,
    );
  }

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentRef) {
      const parentKey = normalize(node.parentRef);
      const siblings = childrenMap.get(parentKey) ?? [];
      siblings.push(normalize(node.name));
      childrenMap.set(parentKey, siblings);
    }
  }

  let count = 0;
  function buildNode(normalizedName: string): OrgNode {
    const n = nameMap.get(normalizedName)!;
    count++;
    const childNames = childrenMap.get(normalizedName);
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
  caseInsensitive: boolean,
): void {
  const normalize = caseInsensitive ? (s: string) => s.toLowerCase() : (s: string) => s;
  const parentMap = new Map<string, string>();
  for (const node of nodes) {
    const key = normalize(keyField === 'id' ? node.id : node.name);
    if (node.parentRef) {
      parentMap.set(key, normalize(node.parentRef));
    }
  }

  for (const node of nodes) {
    const key = normalize(keyField === 'id' ? node.id : node.name);
    const visited: string[] = [];
    const visitedSet = new Set<string>();
    let current: string | undefined = key;
    while (current && parentMap.has(current)) {
      if (visitedSet.has(current)) {
        const cycleStart = visited.indexOf(current);
        const cyclePath = visited.slice(cycleStart);
        cyclePath.push(current);
        const nameForKey = (k: string) => {
          const n = nodes.find((nd) => normalize(keyField === 'id' ? nd.id : nd.name) === k);
          return n ? n.name : k;
        };
        throw new Error(`Circular reference: ${cyclePath.map(nameForKey).join(' \u2192 ')}`);
      }
      visited.push(current);
      visitedSet.add(current);
      current = parentMap.get(current);
    }
  }
}
