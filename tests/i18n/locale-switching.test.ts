import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { setLocale, getLocale, getSavedLocale, saveLocalePreference } from '../../src/i18n';
import en from '../../src/i18n/en';
import { SettingsModal } from '../../src/ui/settings-modal';

beforeAll(() => { setLocale('en', en); });

describe('locale persistence', () => {
  beforeEach(() => {
    setLocale('en', en);
    localStorage.removeItem('arbol-locale');
  });

  it('getSavedLocale returns null when no preference saved', () => {
    expect(getSavedLocale()).toBeNull();
  });

  it('saveLocalePreference stores to localStorage', () => {
    saveLocalePreference('es');
    expect(localStorage.getItem('arbol-locale')).toBe('es');
  });

  it('getSavedLocale returns saved locale', () => {
    localStorage.setItem('arbol-locale', 'es');
    expect(getSavedLocale()).toBe('es');
  });

  it('setLocale persists the locale choice', () => {
    setLocale('es', { 'app.title': 'Árbol' });
    expect(localStorage.getItem('arbol-locale')).toBe('es');
  });
});

describe('locale picker in settings modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.removeItem('arbol-locale');
    setLocale('en', en);
  });

  it('renders a language select dropdown', () => {
    const modal = new SettingsModal({ onClose: () => {}, onApply: () => {} });
    modal.open();
    const select = document.getElementById('locale-select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
    modal.destroy();
  });

  it('shows current locale as selected', () => {
    const modal = new SettingsModal({ onClose: () => {}, onApply: () => {} });
    modal.open();
    const select = document.getElementById('locale-select') as HTMLSelectElement;
    expect(select.value).toBe('en');
    modal.destroy();
  });

  it('has English and Español options', () => {
    const modal = new SettingsModal({ onClose: () => {}, onApply: () => {} });
    modal.open();
    const select = document.getElementById('locale-select') as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('en');
    expect(options[0].textContent).toBe('English');
    expect(options[1].value).toBe('es');
    expect(options[1].textContent).toBe('Español');
    modal.destroy();
  });
});
