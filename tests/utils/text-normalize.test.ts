import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeTreeText } from '../../src/utils/text-normalize';
import type { OrgNode } from '../../src/types';

describe('normalizeText', () => {
  describe('none mode', () => {
    it('returns input unchanged', () => {
      expect(normalizeText('John Smith', 'none')).toBe('John Smith');
    });

    it('preserves all-caps input', () => {
      expect(normalizeText('JOHN SMITH', 'none')).toBe('JOHN SMITH');
    });

    it('preserves lowercase input', () => {
      expect(normalizeText('john smith', 'none')).toBe('john smith');
    });

    it('handles empty string', () => {
      expect(normalizeText('', 'none')).toBe('');
    });
  });

  describe('titleCase mode', () => {
    it('capitalizes first letter of each word', () => {
      expect(normalizeText('john smith', 'titleCase')).toBe('John Smith');
    });

    it('converts all-caps to title case', () => {
      expect(normalizeText('JANE DOE', 'titleCase')).toBe('Jane Doe');
    });

    it('handles mixed case', () => {
      expect(normalizeText('jOHN sMITH', 'titleCase')).toBe('John Smith');
    });

    it('handles hyphenated names', () => {
      expect(normalizeText('mary-jane watson', 'titleCase')).toBe('Mary-Jane Watson');
    });

    it('handles single character', () => {
      expect(normalizeText('a', 'titleCase')).toBe('A');
    });

    it('handles empty string', () => {
      expect(normalizeText('', 'titleCase')).toBe('');
    });

    it('handles multiple spaces', () => {
      expect(normalizeText('john   smith', 'titleCase')).toBe('John   Smith');
    });

    it('handles leading/trailing spaces', () => {
      expect(normalizeText('  john smith  ', 'titleCase')).toBe('  John Smith  ');
    });

    it('handles apostrophes in names', () => {
      expect(normalizeText("o'brien", 'titleCase')).toBe("O'Brien");
    });

    it('handles single word', () => {
      expect(normalizeText('engineering', 'titleCase')).toBe('Engineering');
    });

    it('already correct casing is unchanged', () => {
      expect(normalizeText('John Smith', 'titleCase')).toBe('John Smith');
    });
  });

  describe('uppercase mode', () => {
    it('converts to uppercase', () => {
      expect(normalizeText('John Smith', 'uppercase')).toBe('JOHN SMITH');
    });

    it('handles already uppercase', () => {
      expect(normalizeText('JOHN SMITH', 'uppercase')).toBe('JOHN SMITH');
    });

    it('handles empty string', () => {
      expect(normalizeText('', 'uppercase')).toBe('');
    });
  });

  describe('lowercase mode', () => {
    it('converts to lowercase', () => {
      expect(normalizeText('John Smith', 'lowercase')).toBe('john smith');
    });

    it('handles already lowercase', () => {
      expect(normalizeText('john smith', 'lowercase')).toBe('john smith');
    });

    it('handles empty string', () => {
      expect(normalizeText('', 'lowercase')).toBe('');
    });
  });
});

describe('normalizeTreeText', () => {
  const makeTree = (): OrgNode => ({
    id: 'root',
    name: 'JANE DOE',
    title: 'chief executive officer',
    children: [
      {
        id: 'child1',
        name: 'john smith',
        title: 'VP ENGINEERING',
        children: [{ id: 'grandchild', name: 'BOB JONES', title: 'senior engineer' }],
      },
      { id: 'child2', name: 'alice BROWN', title: 'vp SALES' },
    ],
  });

  it('applies name and title modes independently', () => {
    const tree = makeTree();
    const result = normalizeTreeText(tree, 'titleCase', 'uppercase');

    expect(result.name).toBe('Jane Doe');
    expect(result.title).toBe('CHIEF EXECUTIVE OFFICER');
    expect(result.children![0].name).toBe('John Smith');
    expect(result.children![0].title).toBe('VP ENGINEERING');
    expect(result.children![0].children![0].name).toBe('Bob Jones');
    expect(result.children![0].children![0].title).toBe('SENIOR ENGINEER');
    expect(result.children![1].name).toBe('Alice Brown');
    expect(result.children![1].title).toBe('VP SALES');
  });

  it('processes all nodes recursively', () => {
    const tree = makeTree();
    const result = normalizeTreeText(tree, 'lowercase', 'lowercase');

    expect(result.name).toBe('jane doe');
    expect(result.children![0].name).toBe('john smith');
    expect(result.children![0].children![0].name).toBe('bob jones');
    expect(result.children![1].name).toBe('alice brown');
  });

  it('returns new tree without mutating original', () => {
    const tree = makeTree();
    const original = JSON.parse(JSON.stringify(tree));
    const result = normalizeTreeText(tree, 'titleCase', 'uppercase');

    expect(tree).toEqual(original);
    expect(result).not.toBe(tree);
  });

  it('handles none/none as a no-op clone', () => {
    const tree = makeTree();
    const result = normalizeTreeText(tree, 'none', 'none');

    expect(result).toEqual(tree);
    expect(result).not.toBe(tree);
  });

  it('preserves node id and categoryId', () => {
    const tree: OrgNode = {
      id: 'abc-123',
      name: 'JOHN',
      title: 'CEO',
      categoryId: 'cat-1',
    };
    const result = normalizeTreeText(tree, 'lowercase', 'lowercase');

    expect(result.id).toBe('abc-123');
    expect(result.categoryId).toBe('cat-1');
    expect(result.name).toBe('john');
    expect(result.title).toBe('ceo');
  });

  it('handles leaf node with no children', () => {
    const tree: OrgNode = { id: '1', name: 'TEST', title: 'ROLE' };
    const result = normalizeTreeText(tree, 'titleCase', 'titleCase');

    expect(result.name).toBe('Test');
    expect(result.title).toBe('Role');
    expect(result.children).toBeUndefined();
  });

  it('preserves level field on all nodes', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'JANE DOE',
      title: 'CEO',
      level: 'E10',
      children: [
        { id: 'c1', name: 'john smith', title: 'VP', level: 'L8' },
        { id: 'c2', name: 'alice', title: 'IC' },
      ],
    };
    const result = normalizeTreeText(tree, 'titleCase', 'uppercase');

    expect(result.level).toBe('E10');
    expect(result.children![0].level).toBe('L8');
    expect(result.children![1].level).toBeUndefined();
  });

  it('preserves dottedLine field on all nodes', () => {
    const tree: OrgNode = {
      id: 'root',
      name: 'JANE',
      title: 'CEO',
      children: [
        { id: 'c1', name: 'john', title: 'VP', dottedLine: true },
        { id: 'c2', name: 'alice', title: 'IC', dottedLine: false },
        { id: 'c3', name: 'bob', title: 'PM' },
      ],
    };
    const result = normalizeTreeText(tree, 'lowercase', 'lowercase');

    expect(result.dottedLine).toBeUndefined();
    expect(result.children![0].dottedLine).toBe(true);
    expect(result.children![1].dottedLine).toBe(false);
    expect(result.children![2].dottedLine).toBeUndefined();
  });

  it('preserves level and dottedLine together', () => {
    const tree: OrgNode = {
      id: '1',
      name: 'TEST',
      title: 'ROLE',
      level: 'L5',
      dottedLine: true,
      categoryId: 'cat-1',
    };
    const result = normalizeTreeText(tree, 'lowercase', 'lowercase');

    expect(result.level).toBe('L5');
    expect(result.dottedLine).toBe(true);
    expect(result.categoryId).toBe('cat-1');
    expect(result.name).toBe('test');
    expect(result.title).toBe('role');
  });
});
