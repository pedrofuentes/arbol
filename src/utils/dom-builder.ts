/**
 * DOM builder utilities — lightweight helpers for creating common UI elements.
 * All text is set via textContent (never innerHTML).
 */

export interface ButtonOptions {
  label?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  dataAction?: string;
}

export interface IconButtonOptions {
  icon: string;
  tooltip?: string;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
  ariaKeyshortcuts?: string;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  if (options.className) btn.className = options.className;
  if (options.label) btn.textContent = options.label;
  if (options.onClick) btn.addEventListener('click', options.onClick);
  if (options.disabled) {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
  }
  if (options.ariaLabel) btn.setAttribute('aria-label', options.ariaLabel);
  if (options.title) btn.title = options.title;
  if (options.dataAction) btn.dataset.action = options.dataAction;
  return btn;
}

export function createIconButton(options: IconButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = options.className ?? 'icon-btn';
  if (options.tooltip) btn.setAttribute('data-tooltip', options.tooltip);
  if (options.ariaLabel) btn.setAttribute('aria-label', options.ariaLabel);
  if (options.ariaKeyshortcuts) btn.setAttribute('aria-keyshortcuts', options.ariaKeyshortcuts);
  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = options.icon;
  btn.appendChild(iconSpan);
  if (options.onClick) btn.addEventListener('click', options.onClick);
  return btn;
}

export function createFormGroup(label: string, inputId?: string): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  if (inputId) lbl.htmlFor = inputId;
  group.appendChild(lbl);
  return group;
}

export function createHeading(text: string, level: 'h2' | 'h3' | 'h4' = 'h3'): HTMLHeadingElement {
  const heading = document.createElement(level);
  heading.textContent = text;
  return heading;
}

export function createSection(heading: string, children: HTMLElement[]): HTMLElement {
  const section = document.createElement('section');
  const h = document.createElement('h3');
  h.textContent = heading;
  section.appendChild(h);
  for (const child of children) {
    section.appendChild(child);
  }
  return section;
}
