import { describe, it, expect } from 'vitest';
import { parseCsvToTree } from '../../src/utils/csv-parser';

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
