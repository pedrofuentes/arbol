import { describe, it, expect, beforeEach } from 'vitest';
import { t, tp, setLocale, getLocale, getDirection } from '../../src/i18n';
import en from '../../src/i18n/en';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en', en);
  });

  describe('t()', () => {
    it('returns translation for known key', () => {
      expect(t('app.title')).toBe('Arbol');
    });

    it('returns key as fallback for unknown key', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('interpolates {param} placeholders', () => {
      expect(t('dialog.remove_person.message', { name: 'John' }))
        .toBe('Remove "John"? You can undo this with Ctrl+Z.');
    });

    it('interpolates multiple placeholders', () => {
      expect(t('announce.selected', { name: 'Alice', title: 'CEO' }))
        .toBe('Selected Alice, CEO');
    });

    it('interpolates numeric values', () => {
      expect(t('footer.managers', { count: 5 }))
        .toBe('5 managers');
    });

    it('returns key if translations are empty', () => {
      setLocale('empty', {});
      expect(t('app.title')).toBe('app.title');
    });

    it('handles params with no matching placeholders', () => {
      expect(t('app.title', { unused: 'value' })).toBe('Arbol');
    });
  });

  describe('tp()', () => {
    it('picks .one for count === 1', () => {
      expect(tp('people', 1)).toBe('1 person');
    });

    it('picks .other for count !== 1', () => {
      expect(tp('people', 5)).toBe('5 people');
    });

    it('picks .other for count === 0', () => {
      expect(tp('people', 0)).toBe('0 people');
    });

    it('passes additional params along with count', () => {
      setLocale('test', {
        'items.one': '{count} item in {location}',
        'items.other': '{count} items in {location}',
      });
      expect(tp('items', 3, { location: 'cart' })).toBe('3 items in cart');
    });

    it('falls back to key if plural form not found', () => {
      expect(tp('nonexistent', 1)).toBe('nonexistent.one');
    });
  });

  describe('setLocale() / getLocale()', () => {
    it('returns "en" as default locale', () => {
      expect(getLocale()).toBe('en');
    });

    it('switches active translations', () => {
      const es: Record<string, string> = { 'app.title': 'Árbol' };
      setLocale('es', es);
      expect(getLocale()).toBe('es');
      expect(t('app.title')).toBe('Árbol');
    });

    it('switching locale clears previous translations', () => {
      setLocale('fr', { 'app.title': 'Arbre' });
      expect(t('toolbar.undo_aria')).toBe('toolbar.undo_aria');
    });

    it('sets document.documentElement.dir to ltr for LTR locale', () => {
      setLocale('en', en);
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('sets document.documentElement.dir to rtl for RTL locale', () => {
      setLocale('ar', {});
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('sets document.documentElement.lang', () => {
      setLocale('fr', {});
      expect(document.documentElement.lang).toBe('fr');
    });
  });

  describe('getDirection()', () => {
    it('returns ltr for English', () => {
      expect(getDirection('en')).toBe('ltr');
    });

    it('returns rtl for Arabic', () => {
      expect(getDirection('ar')).toBe('rtl');
    });

    it('returns rtl for Hebrew with subtag', () => {
      expect(getDirection('he-IL')).toBe('rtl');
    });

    it('returns rtl for Farsi', () => {
      expect(getDirection('fa')).toBe('rtl');
    });

    it('returns rtl for Urdu', () => {
      expect(getDirection('ur')).toBe('rtl');
    });

    it('returns ltr for unknown locale', () => {
      expect(getDirection('de')).toBe('ltr');
    });

    it('uses current locale when no argument provided', () => {
      setLocale('ar', {});
      expect(getDirection()).toBe('rtl');
    });
  });

  describe('en.ts translations', () => {
    it('has all expected top-level areas', () => {
      const keys = Object.keys(en);
      const areas = new Set(keys.map((k) => k.split('.')[0]));
      expect(areas).toContain('app');
      expect(areas).toContain('toolbar');
      expect(areas).toContain('search');
      expect(areas).toContain('menu');
      expect(areas).toContain('dialog');
      expect(areas).toContain('footer');
      expect(areas).toContain('help');
      expect(areas).toContain('settings');
    });

    it('has no empty string values', () => {
      for (const [key, value] of Object.entries(en)) {
        expect(value, `Empty value for key "${key}"`).not.toBe('');
      }
    });

    it('has all values as strings', () => {
      for (const [key, value] of Object.entries(en)) {
        expect(typeof value, `Non-string value for key "${key}"`).toBe('string');
      }
    });

    it('search.placeholder tells users what is searchable', () => {
      expect(en['search.placeholder']).toBe('Search by name or title\u2026 (Ctrl+F)');
    });

    it('search.no_results gives helpful guidance', () => {
      expect(en['search.no_results']).toBe('No people found. Try different keywords.');
    });

    it('has form.required_indicator key', () => {
      expect(en['form.required_indicator']).toBe('*');
    });

    it('has loading indicator i18n keys', () => {
      expect(en['loading.switching_chart']).toBe('Switching chart\u2026');
      expect(en['loading.restoring_version']).toBe('Restoring version\u2026');
      expect(en['loading.deleting_chart']).toBe('Deleting chart\u2026');
      expect(en['loading.importing']).toBe('Importing\u2026');
    });

    it('welcome.dismiss hints at help recovery', () => {
      expect(en['welcome.dismiss']).toContain('Got it');
      expect(en['welcome.dismiss']).toContain('\u2753');
    });

    it('has footer.separator key for localization', () => {
      expect(en['footer.separator']).toBe(' \u00b7 ');
    });

    it('search.placeholder tells users what is searchable', () => {
      expect(en['search.placeholder']).toBe('Search by name or title\u2026 (Ctrl+F)');
    });

    it('search.no_results gives helpful guidance', () => {
      expect(en['search.no_results']).toBe('No people found. Try different keywords.');
    });

    it('has form.required_indicator key', () => {
      expect(en['form.required_indicator']).toBe('*');
    });

    it('has loading indicator i18n keys', () => {
      expect(en['loading.switching_chart']).toBe('Switching chart\u2026');
      expect(en['loading.restoring_version']).toBe('Restoring version\u2026');
      expect(en['loading.deleting_chart']).toBe('Deleting chart\u2026');
      expect(en['loading.importing']).toBe('Importing\u2026');
    });

    it('welcome.dismiss hints at help recovery', () => {
      expect(en['welcome.dismiss']).toContain('Got it');
      expect(en['welcome.dismiss']).toContain('\u2753');
    });

    it('has footer.separator key for localization', () => {
      expect(en['footer.separator']).toBe(' \u00b7 ');
    });
  });
});
