import { describe, it, expect, beforeEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
describe('help-and-docs', () => {
  beforeEach(() => { setLocale('en', en); });
  describe('5a', () => {
    it('menu.category', () => { expect(en['menu.category']).toBe('Category'); });
    it('categories.title', () => { expect(en['help.categories.title']).toBe('Color Categories'); });
    it('aria_label', () => { expect(en['property_panel.aria_label']).toBe('Person properties panel'); });
    it('assign_strong', () => { expect(en['help.categories.assign_strong']).toBe('Category'); });
    it('assign_1', () => { expect(en['help.categories.assign_1']).toContain('color category'); });
    it('right_click', () => { expect(en['help.interactions.right_click_desc']).toContain('Category'); });
    it('shift_click', () => { expect(en['help.interactions.shift_click_desc']).toContain('Category'); });
    it('categories_section', () => { expect(en['settings.categories_section']).toBe('Color Categories'); });
    it('delete_msg', () => { expect(en['settings.category_confirm_delete_message']).toContain('People'); });
  });
  describe('5b', () => {
    it('dotted', () => { expect(en['help.interactions.dotted_label']).toBe('Dotted lines'); });
    it('comparison', () => { expect(en['help.comparison.title']).toBe('Version Comparison'); });
    it('advisor', () => { expect(en['help.chart_works.advisors_desc']).toContain('Chief of Staff'); });
  });
  describe('5c', () => {
    it('welcome', () => { expect(en['welcome.message']).toContain('sample chart'); });
    it('ref_help', () => { expect(en['column_mapper.parent_ref_help']).toContain('By Name'); });
  });
  describe('5d', () => {
    it('hint', () => { expect(en['export_dialog.versions_hint']).toContain('saved versions'); });
    it('tooltip', () => { expect(en['footer.ics_tooltip']).toContain('Individual Contributors'); });
  });
});
