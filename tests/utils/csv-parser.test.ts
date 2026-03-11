import { describe, it, expect } from 'vitest';
import { parseCsvToTree, extractHeaders } from '../../src/utils/csv-parser';
import type { ColumnMapping } from '../../src/types';

describe('parseCsvToTree', () => {
  // Format A tests
  it('parses id,name,title,parent_id format', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,1',
      '3,Carol,Engineer,2',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.title).toBe('CEO');
    expect(result.tree.id).toBe('1');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.tree.children![0].children).toHaveLength(1);
    expect(result.tree.children![0].children![0].name).toBe('Carol');
    expect(result.nodeCount).toBe(3);
  });

  it('handles Format A with different column order', () => {
    const csv = [
      'parent_id,title,name,id',
      ',CEO,Alice,1',
      '1,CTO,Bob,2',
      '2,Engineer,Carol,3',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.nodeCount).toBe(3);
  });

  // Format B tests
  it('parses name,title,manager_name format', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.title).toBe('CEO');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.tree.children![0].children![0].name).toBe('Carol');
    expect(result.nodeCount).toBe(3);
  });

  // Format C tests
  it('parses name,title,reports_to format', () => {
    const csv = [
      'name,title,reports_to',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.nodeCount).toBe(3);
  });

  // Column detection
  it('is case-insensitive for column names', () => {
    const csv = [
      'NAME,TITLE,MANAGER_NAME',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('trims whitespace from column names', () => {
    const csv = [
      '  name , title , manager_name ',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  // Edge cases
  it('handles BOM at start of file', () => {
    const csv = '\uFEFF' + [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('handles \\r\\n line endings', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\r\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('handles quoted fields with commas', () => {
    const csv = [
      'name,title,manager_name',
      '"Smith, Alice","CEO, Chief Executive",',
      'Bob,CTO,"Smith, Alice"',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Smith, Alice');
    expect(result.tree.title).toBe('CEO, Chief Executive');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.nodeCount).toBe(3);
  });

  it('skips empty rows', () => {
    const csv = [
      'name,title,manager_name',
      '',
      'Alice,CEO,',
      '',
      'Bob,CTO,Alice',
      '   ',
      'Carol,Engineer,Bob',
      '',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('trims whitespace from values', () => {
    const csv = [
      'name,title,manager_name',
      '  Alice  ,  CEO  ,',
      '  Bob  ,  CTO  ,  Alice  ',
      '  Carol  ,  Engineer  ,  Bob  ',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.nodeCount).toBe(3);
  });

  // Tree building
  it('builds correct parent-child relationships', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,VP Sales,1',
      '3,Carol,VP Eng,1',
      '4,Dave,Engineer,3',
      '5,Eve,Engineer,3',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.children).toHaveLength(2);
    const vpEng = result.tree.children!.find((c) => c.name === 'Carol')!;
    expect(vpEng.children).toHaveLength(2);
    expect(vpEng.children!.map((c) => c.name).sort()).toEqual(['Dave', 'Eve']);
  });

  it('returns correct nodeCount', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,VP Sales,1',
      '3,Carol,VP Eng,1',
      '4,Dave,Engineer,3',
      '5,Eve,Engineer,3',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.nodeCount).toBe(5);
  });

  // Error handling
  it('throws on unrecognizable columns', () => {
    const csv = [
      'foo,bar,baz',
      'a,b,c',
      'd,e,f',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/unrecognizable/i);
  });

  it('throws on fewer than 2 data rows', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/at least 2/i);
  });

  it('throws on orphan parent references', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,999',
      '3,Carol,Engineer,2',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/orphan/i);
  });

  it('throws on multiple roots', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,',
      '3,Carol,Engineer,2',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/multiple roots/i);
  });
});

describe('extractHeaders', () => {
  it('returns headers from a CSV string', () => {
    const csv = 'name,title,manager_name\nAlice,CEO,';
    expect(extractHeaders(csv)).toEqual(['name', 'title', 'manager_name']);
  });

  it('handles BOM', () => {
    const csv = '\uFEFFname,title,manager_name\nAlice,CEO,';
    expect(extractHeaders(csv)).toEqual(['name', 'title', 'manager_name']);
  });

  it('returns empty array for empty string', () => {
    expect(extractHeaders('')).toEqual([]);
  });

  it('handles quoted headers with commas', () => {
    const csv = '"First, Name","Job Title","Reports To"\nAlice,CEO,';
    expect(extractHeaders(csv)).toEqual([
      'First, Name',
      'Job Title',
      'Reports To',
    ]);
  });
});

describe('parseCsvToTree with explicit ColumnMapping', () => {
  const customCsv = [
    'employee_name,job_title,supervisor',
    'Jane Doe,CEO,',
    'John Smith,VP Engineering,Jane Doe',
    'Alice Lee,Manager,John Smith',
  ].join('\n');

  const nameMapping: ColumnMapping = {
    name: 'employee_name',
    title: 'job_title',
    parentRef: 'supervisor',
    parentRefType: 'name',
  };

  it('parses CSV with custom column names using provided mapping', () => {
    const result = parseCsvToTree(customCsv, nameMapping);
    expect(result.tree.name).toBe('Jane Doe');
    expect(result.tree.title).toBe('CEO');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('John Smith');
    expect(result.tree.children![0].children![0].name).toBe('Alice Lee');
    expect(result.nodeCount).toBe(3);
  });

  it('parses CSV with id-based mapping', () => {
    const csv = [
      'emp_id,emp_name,emp_title,boss_id',
      '100,Jane Doe,CEO,',
      '200,John Smith,VP Eng,100',
      '300,Alice Lee,Manager,200',
    ].join('\n');

    const idMapping: ColumnMapping = {
      name: 'emp_name',
      title: 'emp_title',
      parentRef: 'boss_id',
      id: 'emp_id',
      parentRefType: 'id',
    };

    const result = parseCsvToTree(csv, idMapping);
    expect(result.tree.name).toBe('Jane Doe');
    expect(result.tree.id).toBe('100');
    expect(result.tree.children![0].name).toBe('John Smith');
    expect(result.nodeCount).toBe(3);
  });

  it('throws when a mapped column does not exist in headers', () => {
    const csv = [
      'col_a,col_b,col_c',
      'Jane,CEO,',
      'John,VP,Jane',
      'Alice,Mgr,John',
    ].join('\n');

    expect(() => parseCsvToTree(csv, nameMapping)).toThrow(
      /column mapping error/i,
    );
  });

  it('performs case-insensitive header matching with mapping', () => {
    const csv = [
      'EMPLOYEE_NAME,JOB_TITLE,SUPERVISOR',
      'Jane Doe,CEO,',
      'John Smith,VP Engineering,Jane Doe',
      'Alice Lee,Manager,John Smith',
    ].join('\n');

    const result = parseCsvToTree(csv, nameMapping);
    expect(result.tree.name).toBe('Jane Doe');
    expect(result.nodeCount).toBe(3);
  });

  it('still works without mapping (backward compat)', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });
});

describe('case-insensitive matching', () => {
  it('matches IDs case-insensitively by default', () => {
    const csv = [
      'id,name,title,parent_id',
      'jsmith,Jane Smith,CEO,',
      'blee,Bob Lee,CTO,JSMITH',
      'cwong,Carol Wong,Engineer,BLEE',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Jane Smith');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Bob Lee');
    expect(result.tree.children![0].children![0].name).toBe('Carol Wong');
    expect(result.nodeCount).toBe(3);
  });

  it('matches names case-insensitively by default', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,ALICE',
      'Carol,Engineer,bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.tree.children![0].children![0].name).toBe('Carol');
    expect(result.nodeCount).toBe(3);
  });

  it('matches IDs case-insensitively with explicit mapping', () => {
    const csv = [
      'alias,full_name,role,boss_alias',
      'jsmith,Jane Smith,CEO,',
      'blee,Bob Lee,CTO,JSMITH',
      'cwong,Carol Wong,Engineer,BLee',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'full_name',
      title: 'role',
      parentRef: 'boss_alias',
      id: 'alias',
      parentRefType: 'id',
      caseInsensitive: true,
    };

    const result = parseCsvToTree(csv, mapping);
    expect(result.tree.name).toBe('Jane Smith');
    expect(result.tree.children![0].children![0].name).toBe('Carol Wong');
    expect(result.nodeCount).toBe(3);
  });

  it('fails on case mismatch when caseInsensitive is false', () => {
    const csv = [
      'alias,full_name,role,boss_alias',
      'jsmith,Jane Smith,CEO,',
      'blee,Bob Lee,CTO,JSMITH',
      'cwong,Carol Wong,Engineer,BLEE',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'full_name',
      title: 'role',
      parentRef: 'boss_alias',
      id: 'alias',
      parentRefType: 'id',
      caseInsensitive: false,
    };

    expect(() => parseCsvToTree(csv, mapping)).toThrow(/orphan/i);
  });
});
