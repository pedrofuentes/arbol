import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendIconLabel,
  createIcon,
  isIconName,
  setIcon,
  type IconName,
} from '../../src/ui/icon';

const styles = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');

const REQUIRED_ICON_NAMES = [
  'add',
  'analytics',
  'backup',
  'badge',
  'cards',
  'chart',
  'check',
  'chevron-down',
  'close',
  'compare',
  'copy',
  'edit',
  'export',
  'eye',
  'file',
  'fit',
  'focus',
  'folder-open',
  'help',
  'hierarchy',
  'import',
  'info',
  'layout',
  'link',
  'menu',
  'merge',
  'moon',
  'move',
  'palette',
  'paperclip',
  'person',
  'pin',
  'redo',
  'remove',
  'replace',
  'reset',
  'restore',
  'ruler',
  'save',
  'search',
  'settings',
  'star',
  'sun',
  'tag',
  'tree',
  'type',
  'undo',
  'upload',
  'users',
] as const;

describe('semantic SVG icons', () => {
  it('creates an inert currentColor SVG identified by semantic name', () => {
    const icon = createIcon('settings');

    expect(icon.tagName.toLowerCase()).toBe('svg');
    expect(icon.dataset.icon).toBe('settings');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
    expect(icon.getAttribute('fill')).toBe('none');
    expect(icon.getAttribute('stroke')).toBe('currentColor');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(icon.textContent).toBe('');
  });

  it('renders every chrome icon required by the migration plan', () => {
    for (const name of REQUIRED_ICON_NAMES) {
      const icon = createIcon(name);
      expect(icon.dataset.icon).toBe(name);
      expect(icon.querySelectorAll('path').length, name).toBeGreaterThan(0);
    }
  });

  it('applies a custom class without dropping the shared icon class', () => {
    const icon = createIcon('search', 'search-icon');

    expect(icon.classList.contains('ui-icon')).toBe(true);
    expect(icon.classList.contains('search-icon')).toBe(true);
  });

  it('sets explicit dimensions using the compact default size', () => {
    const icon = createIcon('search');

    expect(icon.getAttribute('width')).toBe('16');
    expect(icon.getAttribute('height')).toBe('16');
  });

  it('sets explicit dimensions using a requested size', () => {
    const icon = createIcon('search', 'search-icon', 18);

    expect(icon.getAttribute('width')).toBe('18');
    expect(icon.getAttribute('height')).toBe('18');
  });

  it('updates an existing SVG in place', () => {
    const icon = createIcon('sun');
    const original = icon;

    setIcon(icon, 'moon');

    expect(icon).toBe(original);
    expect(icon.dataset.icon).toBe('moon');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('does not register prototype-chain property names as icons', () => {
    expect(isIconName('constructor')).toBe(false);
  });

  it('leaves an empty SVG when an invalid icon name reaches path rendering', () => {
    const icon = createIcon('constructor' as IconName);

    expect(icon.dataset.icon).toBe('constructor');
    expect(icon.querySelectorAll('path')).toHaveLength(0);
  });

  it('appends an SVG beside a clean text label', () => {
    const button = document.createElement('button');

    appendIconLabel(button, 'save', 'Create Backup');

    expect(button.querySelector('svg')?.dataset.icon).toBe('save');
    expect(button.textContent).toBe('Create Backup');
  });
});

describe('icon layout styles', () => {
  it('limits full-canvas SVG sizing to the chart root', () => {
    expect(styles).toMatch(/#chart-area\s*>\s*svg\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
  });

  it('spaces footer icons from their labels', () => {
    expect(styles).toMatch(
      /\.footer-btn\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*gap:\s*var\(--space-1\);/s,
    );
  });
});
