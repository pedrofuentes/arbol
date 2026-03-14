import en from './en';

type Translations = Record<string, string>;

// English is loaded by default so t() works at module-evaluation time
// (e.g. module-level constants that call t() before setLocale() runs).
let translations: Translations = en;
let currentLocale = 'en';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

/** Returns 'rtl' for RTL locales (Arabic, Hebrew, Farsi, Urdu), 'ltr' otherwise. */
export function getDirection(locale?: string): 'ltr' | 'rtl' {
  const l = (locale ?? currentLocale).split('-')[0];
  return RTL_LOCALES.has(l) ? 'rtl' : 'ltr';
}

/** Load a locale's translations and update document direction + lang. */
export function setLocale(locale: string, messages: Translations): void {
  currentLocale = locale;
  translations = messages;
  if (typeof document !== 'undefined') {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }
}

/** Get the current locale */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Translate a key with optional interpolation.
 * Usage: t('dialog.remove', { name: 'John' }) → "Remove "John"?"
 * Falls back to the key itself if not found.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/**
 * Pluralize based on count.
 * Usage: tp('people', count) looks up 'people.one' or 'people.other'
 */
export function tp(key: string, count: number, params?: Record<string, string | number>): string {
  const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
  return t(pluralKey, { count, ...params });
}
