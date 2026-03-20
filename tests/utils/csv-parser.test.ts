import { describe, it, expect } from 'vitest';
import { parseCsvToTree, extractHeaders, MAX_NODES } from '../../src/utils/csv-parser';
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
    const csv = ['name,title,reports_to', 'Alice,CEO,', 'Bob,CTO,Alice', 'Carol,Engineer,Bob'].join(
      '\n',
    );

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
    const csv =
      '\uFEFF' +
      ['name,title,manager_name', 'Alice,CEO,', 'Bob,CTO,Alice', 'Carol,Engineer,Bob'].join('\n');

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
    const csv = ['foo,bar,baz', 'a,b,c', 'd,e,f'].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/unrecognizable/i);
  });

  it('throws on fewer than 2 data rows', () => {
    const csv = ['name,title,manager_name', 'Alice,CEO,'].join('\n');

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
    expect(extractHeaders(csv)).toEqual(['First, Name', 'Job Title', 'Reports To']);
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
    const csv = ['col_a,col_b,col_c', 'Jane,CEO,', 'John,VP,Jane', 'Alice,Mgr,John'].join('\n');

    expect(() => parseCsvToTree(csv, nameMapping)).toThrow(/column mapping error/i);
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

describe('missing root auto-creation', () => {
  it('auto-creates placeholder root when all orphans reference same missing ID', () => {
    const csv = [
      'id,name,title,parent_id',
      'alice,Alice,Director,vp_boss',
      'bob,Bob,Manager,alice',
      'carol,Carol,Engineer,bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.id).toBe('vp_boss');
    expect(result.tree.name).toBe('vp_boss');
    expect(result.tree.title).toBe('\u2014');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Alice');
    expect(result.nodeCount).toBe(4);
  });

  it('auto-creates placeholder root when all orphans reference same missing name', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,Director,Big Boss',
      'Bob,Manager,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Big Boss');
    expect(result.tree.title).toBe('\u2014');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Alice');
    expect(result.nodeCount).toBe(4);
  });

  it('still throws when orphans reference multiple different missing parents', () => {
    const csv = [
      'id,name,title,parent_id',
      'alice,Alice,Director,boss1',
      'bob,Bob,Manager,boss2',
      'carol,Carol,Engineer,bob',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/orphan/i);
  });

  it('handles missing root with case-insensitive matching', () => {
    const csv = [
      'id,name,title,parent_id',
      'alice,Alice,Director,VP_BOSS',
      'bob,Bob,Manager,alice',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('VP_BOSS');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Alice');
  });

  it('auto-creates missing root with explicit ID-based mapping', () => {
    const csv = [
      'alias,full_name,role,boss_alias',
      'jsmith,Jane Smith,Director,vp_boss',
      'blee,Bob Lee,Manager,jsmith',
      'cwong,Carol Wong,Engineer,blee',
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
    expect(result.tree.id).toBe('vp_boss');
    expect(result.tree.name).toBe('vp_boss');
    expect(result.tree.title).toBe('\u2014');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Jane Smith');
    expect(result.nodeCount).toBe(4);
  });

  it('auto-creates missing root with explicit name-based mapping', () => {
    const csv = ['employee,job,supervisor', 'Alice,Director,Big Boss', 'Bob,Manager,Alice'].join(
      '\n',
    );

    const mapping: ColumnMapping = {
      name: 'employee',
      title: 'job',
      parentRef: 'supervisor',
      parentRefType: 'name',
      caseInsensitive: true,
    };

    const result = parseCsvToTree(csv, mapping);
    expect(result.tree.name).toBe('Big Boss');
    expect(result.tree.children).toHaveLength(1);
    expect(result.tree.children![0].name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });
});

describe('multi-line quoted fields', () => {
  it('handles a quoted field spanning multiple lines', () => {
    const csv = [
      'name,title,manager_name',
      '"Alice\nSmith",CEO,',
      'Bob,CTO,"Alice\nSmith"',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice\nSmith');
    expect(result.tree.children![0].name).toBe('Bob');
    expect(result.nodeCount).toBe(3);
  });

  it('handles escaped quotes inside multi-line fields', () => {
    const csv = [
      'name,title,manager_name',
      '"Alice ""The Boss""",CEO,',
      'Bob,CTO,"Alice ""The Boss"""',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice "The Boss"');
    expect(result.nodeCount).toBe(3);
  });
});

describe('trailing metadata handling', () => {
  it('ignores trailing separator row and metadata from HR export (Format A)', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,1',
      '3,Carol,Engineer,2',
      ',,,',
      '"Applied filters:',
      'Some filter detail, with commas, and more, info',
      'Another filter line',
      'Last filter line",,,',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('ignores trailing metadata with explicit mapping and auto-creates missing root', () => {
    const csv = [
      'Alias,Full Name,Reports To Alias,Address Book Title',
      'ADSMITH,Adam Smith,pedrofuentes,Partner Software Eng Manager',
      'BHAGRAWAL,Bhurvi Agrawal,pedrofuentes,Principal Group Eng Manager',
      'JDOE,Jane Doe,adsmith,Software Engineer',
      ',,,',
      '"Applied filters:',
      'Included (4)  1. Person (Detail Parameter Group) + Alias (Detail_Parameter),  1. Person (Detail Parameter Group) + Full Name (Detail_Parameter),  2. Reporting Hierarchy',
      'Company Reporting Exclusion Ind is N',
      'Position Type Group is Regular Position",,,',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'Full Name',
      title: 'Address Book Title',
      parentRef: 'Reports To Alias',
      id: 'Alias',
      parentRefType: 'id',
      caseInsensitive: true,
    };

    const result = parseCsvToTree(csv, mapping);
    expect(result.tree.name).toBe('pedrofuentes');
    expect(result.tree.title).toBe('\u2014');
    expect(result.tree.children).toHaveLength(2);
    const adam = result.tree.children!.find((c) => c.name === 'Adam Smith')!;
    expect(adam.children).toHaveLength(1);
    expect(adam.children![0].name).toBe('Jane Doe');
    expect(result.nodeCount).toBe(4);
  });

  it('ignores rows with empty name field (Format B)', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      ',Garbage Title,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });

  it('handles trailing empty lines after metadata', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,1',
      '3,Carol,Engineer,2',
      '',
      '',
      '',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.name).toBe('Alice');
    expect(result.nodeCount).toBe(3);
  });
});

describe('duplicate detection', () => {
  it('throws on duplicate IDs in Format A', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '1,Bob,CTO,1',
      '2,Carol,Engineer,1',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/duplicate id "1"/i);
  });

  it('throws on duplicate IDs with case-insensitive matching', () => {
    const csv = [
      'id,name,title,parent_id',
      'jsmith,Alice,CEO,',
      'JSMITH,Bob,CTO,jsmith',
      'blee,Carol,Engineer,jsmith',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/duplicate id/i);
  });

  it('throws on duplicate names in Format B', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'Bob,CTO,Alice',
      'Bob,Engineer,Alice',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/duplicate name "Bob"/i);
  });

  it('throws on duplicate names with case-insensitive matching', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,',
      'bob,CTO,Alice',
      'BOB,Engineer,Alice',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/duplicate name/i);
  });

  it('duplicate IDs with explicit mapping are detected', () => {
    const csv = [
      'alias,full_name,role,boss_alias',
      'a1,Alice,CEO,',
      'a1,Bob,CTO,a1',
      'a2,Carol,Engineer,a1',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'full_name',
      title: 'role',
      parentRef: 'boss_alias',
      id: 'alias',
      parentRefType: 'id',
    };

    expect(() => parseCsvToTree(csv, mapping)).toThrow(/duplicate id/i);
  });
});

describe('node count limit', () => {
  it('exports MAX_NODES constant', () => {
    expect(MAX_NODES).toBe(10_000);
  });

  it('throws when node count exceeds MAX_NODES', () => {
    const header = 'id,name,title,parent_id';
    const root = '0,Root,CEO,';
    const rows = [header, root];
    for (let i = 1; i <= MAX_NODES; i++) {
      rows.push(`${i},Person ${i},Title,0`);
    }
    const csv = rows.join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/exceeds the maximum/i);
  });
});

describe('circular reference detection', () => {
  it('detects self-referencing node', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,',
      '2,Bob,CTO,2',
      '3,Carol,Engineer,1',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/circular reference/i);
  });

  it('includes cycle path in error message (Format A)', () => {
    const csv = [
      'id,name,title,parent_id',
      '1,Alice,CEO,3',
      '2,Bob,Manager,1',
      '3,Carol,Engineer,2',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/Alice.*→.*Carol.*→.*Bob.*→.*Alice/);
  });

  it('includes cycle path in error message (Format B)', () => {
    const csv = [
      'name,title,manager_name',
      'Alice,CEO,Carol',
      'Bob,Manager,Alice',
      'Carol,Engineer,Bob',
    ].join('\n');

    expect(() => parseCsvToTree(csv)).toThrow(/Alice.*→.*Carol.*→.*Bob.*→.*Alice/);
  });
});

describe('level column support', () => {
  it('parses CSV with level column (format A with id)', () => {
    const csv = [
      'id,name,title,parent_id,level',
      '1,Alice,CEO,,E10',
      '2,Bob,CTO,1,E9',
      '3,Carol,Engineer,2,E7',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBe('E10');
    expect(result.tree.children![0].level).toBe('E9');
    expect(result.tree.children![0].children![0].level).toBe('E7');
  });

  it('parses CSV with level column (format B with manager_name)', () => {
    const csv = [
      'name,title,manager_name,level',
      'Alice,CEO,,L8',
      'Bob,CTO,Alice,L7',
      'Carol,Engineer,Bob,L5',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBe('L8');
    expect(result.tree.children![0].level).toBe('L7');
    expect(result.tree.children![0].children![0].level).toBe('L5');
  });

  it('auto-detects level column header', () => {
    const csv = [
      'id,name,title,parent_id,level',
      '1,Alice,CEO,,Senior',
      '2,Bob,VP,1,Mid',
      '3,Carol,Eng,2,Junior',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBe('Senior');
  });

  it('auto-detects grade column header', () => {
    const csv = [
      'id,name,title,parent_id,grade',
      '1,Alice,CEO,,G15',
      '2,Bob,VP,1,G12',
      '3,Carol,Eng,2,G9',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBe('G15');
    expect(result.tree.children![0].level).toBe('G12');
  });

  it('auto-detects band column header', () => {
    const csv = [
      'id,name,title,parent_id,band',
      '1,Alice,CEO,,Band A',
      '2,Bob,VP,1,Band B',
      '3,Carol,Eng,2,Band C',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBe('Band A');
    expect(result.tree.children![0].level).toBe('Band B');
  });

  it('level column via mapping', () => {
    const csv = [
      'emp_id,emp_name,emp_title,boss_id,emp_grade',
      '100,Alice,CEO,,Senior',
      '200,Bob,VP,100,Mid',
      '300,Carol,Eng,200,Junior',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'emp_name',
      title: 'emp_title',
      parentRef: 'boss_id',
      id: 'emp_id',
      parentRefType: 'id',
      level: 'emp_grade',
    };

    const result = parseCsvToTree(csv, mapping);
    expect(result.tree.level).toBe('Senior');
    expect(result.tree.children![0].level).toBe('Mid');
    expect(result.tree.children![0].children![0].level).toBe('Junior');
  });

  it('missing level column in mapping is ignored', () => {
    const csv = [
      'emp_id,emp_name,emp_title,boss_id',
      '100,Alice,CEO,',
      '200,Bob,VP,100',
      '300,Carol,Eng,200',
    ].join('\n');

    const mapping: ColumnMapping = {
      name: 'emp_name',
      title: 'emp_title',
      parentRef: 'boss_id',
      id: 'emp_id',
      parentRefType: 'id',
      level: 'nonexistent_column',
    };

    // Should not throw — level is optional
    const result = parseCsvToTree(csv, mapping);
    expect(result.tree.level).toBeUndefined();
    expect(result.tree.children![0].level).toBeUndefined();
  });

  it('empty level values result in undefined', () => {
    const csv = [
      'id,name,title,parent_id,level',
      '1,Alice,CEO,,',
      '2,Bob,VP,1,L5',
      '3,Carol,Eng,2,',
    ].join('\n');

    const result = parseCsvToTree(csv);
    expect(result.tree.level).toBeUndefined();
    expect(result.tree.children![0].level).toBe('L5');
    expect(result.tree.children![0].children![0].level).toBeUndefined();
  });
});
