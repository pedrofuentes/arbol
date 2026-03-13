import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionManager } from '../../src/controllers/selection-manager';

describe('SelectionManager', () => {
  let sm: SelectionManager;

  beforeEach(() => {
    sm = new SelectionManager();
  });

  describe('initial state', () => {
    it('starts with zero count', () => {
      expect(sm.count).toBe(0);
    });

    it('has no selection', () => {
      expect(sm.hasSelection).toBe(false);
    });

    it('toArray returns empty array', () => {
      expect(sm.toArray()).toEqual([]);
    });
  });

  describe('toggle', () => {
    it('adds an id when not present', () => {
      sm.toggle('a');
      expect(sm.isSelected('a')).toBe(true);
      expect(sm.count).toBe(1);
    });

    it('removes an id when already present', () => {
      sm.toggle('a');
      sm.toggle('a');
      expect(sm.isSelected('a')).toBe(false);
      expect(sm.count).toBe(0);
    });

    it('handles multiple distinct ids', () => {
      sm.toggle('a');
      sm.toggle('b');
      sm.toggle('c');
      expect(sm.count).toBe(3);
      expect(sm.isSelected('a')).toBe(true);
      expect(sm.isSelected('b')).toBe(true);
      expect(sm.isSelected('c')).toBe(true);
    });

    it('removes only the toggled id from a multi-selection', () => {
      sm.toggle('a');
      sm.toggle('b');
      sm.toggle('a');
      expect(sm.isSelected('a')).toBe(false);
      expect(sm.isSelected('b')).toBe(true);
      expect(sm.count).toBe(1);
    });
  });

  describe('clear', () => {
    it('empties all selections', () => {
      sm.toggle('a');
      sm.toggle('b');
      sm.clear();
      expect(sm.count).toBe(0);
      expect(sm.hasSelection).toBe(false);
    });

    it('is safe to call when already empty', () => {
      sm.clear();
      expect(sm.count).toBe(0);
    });
  });

  describe('isSelected', () => {
    it('returns false for unknown id', () => {
      expect(sm.isSelected('unknown')).toBe(false);
    });

    it('returns true for selected id', () => {
      sm.toggle('x');
      expect(sm.isSelected('x')).toBe(true);
    });
  });

  describe('ids', () => {
    it('returns a copy, not the internal set', () => {
      sm.toggle('a');
      const copy = sm.ids;
      copy.add('injected');
      expect(sm.isSelected('injected')).toBe(false);
      expect(sm.count).toBe(1);
    });

    it('contains all selected ids', () => {
      sm.toggle('a');
      sm.toggle('b');
      const ids = sm.ids;
      expect(ids.has('a')).toBe(true);
      expect(ids.has('b')).toBe(true);
      expect(ids.size).toBe(2);
    });
  });

  describe('toArray', () => {
    it('returns array of selected ids', () => {
      sm.toggle('x');
      sm.toggle('y');
      const arr = sm.toArray();
      expect(arr).toHaveLength(2);
      expect(arr).toContain('x');
      expect(arr).toContain('y');
    });

    it('returns a new array each call', () => {
      sm.toggle('a');
      const arr1 = sm.toArray();
      const arr2 = sm.toArray();
      expect(arr1).not.toBe(arr2);
      expect(arr1).toEqual(arr2);
    });
  });

  describe('hasSelection', () => {
    it('is true when at least one id is selected', () => {
      sm.toggle('a');
      expect(sm.hasSelection).toBe(true);
    });

    it('is false after clearing', () => {
      sm.toggle('a');
      sm.clear();
      expect(sm.hasSelection).toBe(false);
    });
  });
});
