import type { ColorCategory } from '../types';

export interface CategoryLegendOptions {
  categories: ColorCategory[];
  container: HTMLElement;
}

let activeLegend: HTMLDivElement | null = null;

export function dismissCategoryLegend(): void {
  if (activeLegend && activeLegend.parentElement) {
    activeLegend.parentElement.removeChild(activeLegend);
  }
  activeLegend = null;
}

export function showCategoryLegend(options: CategoryLegendOptions): void {
  dismissCategoryLegend();

  if (options.categories.length === 0) return;

  const legend = document.createElement('div');
  legend.setAttribute('data-testid', 'category-legend');
  legend.setAttribute('data-collapsed', 'false');

  legend.setAttribute('style', [
    'position:absolute',
    'bottom:var(--space-3, 12px)',
    'left:var(--space-3, 12px)',
    'z-index:50',
    'display:flex',
    'flex-direction:column',
    'gap:0',
    'padding:var(--space-2, 8px) var(--space-3, 12px)',
    'background:var(--bg-surface)',
    'border:1px solid var(--border-subtle)',
    'border-radius:var(--radius-md, 6px)',
    'box-shadow:var(--shadow-sm)',
    'font-family:var(--font-sans)',
    'font-size:11px',
    'color:var(--text-secondary)',
    'pointer-events:auto',
    'max-width:200px',
    'opacity:0.9',
    'transition:opacity var(--transition-fast, 100ms ease)',
  ].join(';'));

  legend.addEventListener('mouseenter', () => {
    legend.style.opacity = '1';
  });
  legend.addEventListener('mouseleave', () => {
    legend.style.opacity = '0.9';
  });

  // Header row with toggle
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;';

  const headerLabel = document.createElement('span');
  headerLabel.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary);';
  headerLabel.textContent = 'Categories';
  headerRow.appendChild(headerLabel);

  const toggleBtn = document.createElement('button');
  toggleBtn.setAttribute('data-testid', 'category-legend-toggle');
  toggleBtn.setAttribute('aria-label', 'Toggle category legend');
  toggleBtn.style.cssText = [
    'border:none',
    'background:transparent',
    'color:var(--text-tertiary)',
    'cursor:pointer',
    'padding:0 2px',
    'font-size:8px',
    'line-height:1',
    'transition:transform 150ms ease',
  ].join(';');
  toggleBtn.textContent = '▾';

  headerRow.appendChild(toggleBtn);
  legend.appendChild(headerRow);

  // Items container
  const itemsContainer = document.createElement('div');
  itemsContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:6px;';

  for (const cat of options.categories) {
    const item = document.createElement('div');
    item.setAttribute('data-testid', 'category-legend-item');
    item.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const dot = document.createElement('span');
    dot.setAttribute('data-testid', 'category-dot');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex-shrink:0;background-color:${cat.color};`;
    item.appendChild(dot);

    const label = document.createElement('span');
    label.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    label.textContent = cat.label;
    item.appendChild(label);

    itemsContainer.appendChild(item);
  }

  legend.appendChild(itemsContainer);

  // Toggle behavior
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = legend.getAttribute('data-collapsed') === 'true';
    legend.setAttribute('data-collapsed', String(!isCollapsed));
    itemsContainer.style.display = isCollapsed ? 'flex' : 'none';
    toggleBtn.textContent = isCollapsed ? '▾' : '▸';
  });

  options.container.appendChild(legend);
  activeLegend = legend;
}
