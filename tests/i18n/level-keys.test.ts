import { describe, it, expect } from 'vitest';
import en from '../../src/i18n/en';
import es from '../../src/i18n/es';

describe('i18n level menu keys', () => {
  const levelKeys = [
    'menu.level',
    'menu.level_icon',
    'menu.level_none',
    'menu.level_check',
    'menu.set_level',
    'menu.level_clear',
    'menu.multi_level',
  ];

  it.each(levelKeys)('en.ts contains key "%s"', (key) => {
    expect(key in en).toBe(true);
    expect(en[key]).toBeTruthy();
  });

  it.each(levelKeys)('es.ts contains key "%s"', (key) => {
    expect(key in es).toBe(true);
    expect(es[key]).toBeTruthy();
  });

  it('menu.multi_level contains {count} placeholder in en', () => {
    expect(en['menu.multi_level']).toContain('{count}');
  });

  it('menu.multi_level contains {count} placeholder in es', () => {
    expect(es['menu.multi_level']).toContain('{count}');
  });

  const settingsKeys = [
    'settings.group.level_badge',
    'settings.label.show_level',
    'settings.label.level_badge_font_size',
    'settings.label.level_badge_size',
    'settings.label.level_badge_color',
    'settings.label.level_badge_text_color',
    'settings.desc.show_level',
    'settings.desc.level_badge_font_size',
    'settings.desc.level_badge_size',
    'settings.desc.level_badge_color',
    'settings.desc.level_badge_text_color',
    'settings.section_desc.level_badge',
  ];

  it.each(settingsKeys)('en.ts contains settings key "%s"', (key) => {
    expect(en).toHaveProperty([key]);
    expect(en[key]).toBeTruthy();
  });

  it.each(settingsKeys)('es.ts contains settings key "%s"', (key) => {
    expect(es).toHaveProperty([key]);
    expect(es[key]).toBeTruthy();
  });

  const propertyPanelKeys = [
    'property_panel.level',
    'property_panel.level_none',
  ];

  it.each(propertyPanelKeys)('en.ts contains property panel key "%s"', (key) => {
    expect(key in en).toBe(true);
    expect(en[key]).toBeTruthy();
  });

  it.each(propertyPanelKeys)('es.ts contains property panel key "%s"', (key) => {
    expect(key in es).toBe(true);
    expect(es[key]).toBeTruthy();
  });

  const inlineEditorKeys = [
    'inline_editor.level_aria',
    'inline_editor.level_placeholder',
  ];

  it.each(inlineEditorKeys)('en.ts contains inline editor key "%s"', (key) => {
    expect(key in en).toBe(true);
    expect(en[key]).toBeTruthy();
  });

  it.each(inlineEditorKeys)('es.ts contains inline editor key "%s"', (key) => {
    expect(key in es).toBe(true);
    expect(es[key]).toBeTruthy();
  });
});
